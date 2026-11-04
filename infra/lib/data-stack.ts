import * as path from 'path'
import * as cdk from 'aws-cdk-lib'
import { Duration, RemovalPolicy } from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as kms from 'aws-cdk-lib/aws-kms'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import * as cr from 'aws-cdk-lib/custom-resources'
import { NagSuppressions } from 'cdk-nag'
import { Construct } from 'constructs'

/** The SQL files of record (data track). The loader bundles them; they are never copied by hand. */
const DATABASE_DIR = path.join(__dirname, '..', '..', 'database')

/**
 * CodeAI student-state store (ADR-016, architecture 2.9).
 *
 * Aurora Serverless v2 (PostgreSQL), scale-to-zero, reached through the RDS Data API.
 * The Data API means Lambdas call a secure HTTP endpoint (no connection pooling, no VPC
 * attachment, no DB password in code). The admin credential lives in a KMS-encrypted
 * Secrets Manager secret; callers use IAM + the secret ARN.
 *
 * The schema of record is `database/schema.sql` and the master data is `database/seed.sql`
 * (both owned by the data track). The `DbLoader` custom resource is the one-off first-deploy
 * migration: it loads both files into an EMPTY database and never touches a database that
 * already has tables, so editing the SQL does not drop or reload data. Later schema changes
 * are migrations, not stack updates.
 *
 * The API and the agents get access by attaching `dataApiAccessPolicy` to their role and
 * reading the ARNs from the SSM parameters under /codeai/data/.
 */
export class DataStack extends cdk.Stack {
  public readonly cluster: rds.DatabaseCluster
  public readonly dbName = 'codeai'
  /** Attach to any Lambda role (API, agents) that queries the database. */
  public readonly dataApiAccessPolicy: iam.ManagedPolicy

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // One customer-managed key for the cluster, its secret and (later) logs. Rotation on.
    const key = new kms.Key(this, 'DataKey', {
      description: 'CodeAI data encryption key (Aurora + secret).',
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.DESTROY, // hackathon: allow clean teardown
    })

    // Minimal VPC. The Data API endpoint is regional/HTTPS, so Lambdas need no VPC access;
    // isolated subnets keep the cluster off the internet with no NAT gateway (cost).
    const vpc = new ec2.Vpc(this, 'DataVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    })
    vpc.addFlowLog('FlowLog', {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(
        new logs.LogGroup(this, 'FlowLogGroup', {
          retention: logs.RetentionDays.TWO_WEEKS,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
      ),
    })

    const cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        // 16.13 supports Serverless v2 auto-pause (scale to zero). 16.6 is no longer offered in us-west-2.
        version: rds.AuroraPostgresEngineVersion.VER_16_13,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      writer: rds.ClusterInstance.serverlessV2('writer'),
      // Scale to zero when idle; resume on the next Data API call (ADR-016 tradeoff).
      serverlessV2MinCapacity: 0,
      serverlessV2MaxCapacity: 2,
      serverlessV2AutoPauseDuration: Duration.minutes(5),
      defaultDatabaseName: this.dbName,
      enableDataApi: true,
      // Lets a future least-privilege DB role use IAM tokens instead of a password.
      iamAuthentication: true,
      storageEncryptionKey: key,
      // Admin credential: generated in AWS, stored in Secrets Manager, never in code (ADR-013).
      credentials: rds.Credentials.fromGeneratedSecret('codeai_admin', { encryptionKey: key }),
      removalPolicy: RemovalPolicy.DESTROY, // hackathon teardown; NOT for production
    })
    this.cluster = cluster
    const secret = cluster.secret!

    // --- Schema and master data: first-deploy migration ---------------------------------------
    const loader = new NodejsFunction(this, 'DbLoader', {
      entry: path.join(__dirname, '..', 'lambda', 'db-loader', 'index.mjs'),
      runtime: lambda.Runtime.NODEJS_22_X,
      // Long enough to wait out a scale-to-zero resume and run ~360 statements.
      timeout: Duration.minutes(10),
      memorySize: 512,
      logGroup: new logs.LogGroup(this, 'DbLoaderLogs', {
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      environment: {
        CLUSTER_ARN: cluster.clusterArn,
        SECRET_ARN: secret.secretArn,
        DATABASE: this.dbName,
      },
      bundling: {
        format: OutputFormat.ESM,
        // Copy the SQL files of record next to the handler.
        commandHooks: {
          beforeBundling: () => [],
          beforeInstall: () => [],
          afterBundling: (_inputDir: string, outputDir: string) => [
            `cp "${path.join(DATABASE_DIR, 'schema.sql')}" "${outputDir}/schema.sql"`,
            `cp "${path.join(DATABASE_DIR, 'seed.sql')}" "${outputDir}/seed.sql"`,
          ],
        },
      },
    })
    loader.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'rds-data:ExecuteStatement',
          'rds-data:BeginTransaction',
          'rds-data:CommitTransaction',
          'rds-data:RollbackTransaction',
        ],
        resources: [cluster.clusterArn],
      }),
    )
    secret.grantRead(loader)

    const provider = new cr.Provider(this, 'DbLoaderProvider', {
      onEventHandler: loader,
      logGroup: new logs.LogGroup(this, 'DbLoaderProviderLogs', {
        retention: logs.RetentionDays.TWO_WEEKS,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
    })
    const load = new cdk.CustomResource(this, 'DbLoad', {
      serviceToken: provider.serviceToken,
      properties: {
        // Informational: shows which SQL version a deploy saw. The loader still skips if tables exist.
        SqlVersion: `${cdk.FileSystem.fingerprint(path.join(DATABASE_DIR, 'schema.sql'))}-${cdk.FileSystem.fingerprint(path.join(DATABASE_DIR, 'seed.sql'))}`,
      },
    })
    // The writer instance and the Data API must exist before the loader runs.
    load.node.addDependency(cluster)

    // --- Access for the API and the agents ----------------------------------------------------
    this.dataApiAccessPolicy = new iam.ManagedPolicy(this, 'DataApiAccessPolicy', {
      description: 'Query the CodeAI database through the RDS Data API',
      statements: [
        new iam.PolicyStatement({
          actions: [
            'rds-data:ExecuteStatement',
            'rds-data:BatchExecuteStatement',
            'rds-data:BeginTransaction',
            'rds-data:CommitTransaction',
            'rds-data:RollbackTransaction',
          ],
          resources: [cluster.clusterArn],
        }),
        new iam.PolicyStatement({ actions: ['secretsmanager:GetSecretValue'], resources: [secret.secretArn] }),
        new iam.PolicyStatement({ actions: ['kms:Decrypt'], resources: [key.keyArn] }),
      ],
    })

    // SSM parameters so the backend discovers the store without hard-coding (architecture 2.14).
    new ssm.StringParameter(this, 'ClusterArnParam', {
      parameterName: '/codeai/data/cluster-arn',
      stringValue: cluster.clusterArn,
    })
    new ssm.StringParameter(this, 'DbNameParam', {
      parameterName: '/codeai/data/database-name',
      stringValue: this.dbName,
    })
    new ssm.StringParameter(this, 'SecretArnParam', {
      parameterName: '/codeai/data/secret-arn',
      stringValue: secret.secretArn,
    })
    new ssm.StringParameter(this, 'AccessPolicyArnParam', {
      parameterName: '/codeai/data/access-policy-arn',
      stringValue: this.dataApiAccessPolicy.managedPolicyArn,
    })

    // Stack outputs: the first-deploy handoff the team reads (docs/aws-access.md).
    new cdk.CfnOutput(this, 'ClusterArn', { value: cluster.clusterArn })
    new cdk.CfnOutput(this, 'DatabaseName', { value: this.dbName })
    new cdk.CfnOutput(this, 'SecretArn', { value: secret.secretArn })
    new cdk.CfnOutput(this, 'AccessPolicyArn', { value: this.dataApiAccessPolicy.managedPolicyArn })
    new cdk.CfnOutput(this, 'DbLoadResult', { value: load.getAttString('Message') })

    this.addNagSuppressions(cluster)
  }

  /**
   * cdk-nag suppressions, each with a written reason. Suppressing a finding is a decision,
   * so it is explicit and reviewable, not silent.
   */
  private addNagSuppressions(cluster: rds.DatabaseCluster): void {
    NagSuppressions.addResourceSuppressions(
      cluster,
      [
        {
          id: 'AwsSolutions-RDS10',
          reason:
            'Deletion protection is intentionally off for the hackathon so the cluster can be torn down to control cost (ADR-016). Turn on for production.',
        },
        {
          id: 'AwsSolutions-RDS11',
          reason:
            'Default Postgres port is acceptable: the cluster is in isolated subnets and reached only via the Data API, not a direct connection.',
        },
        {
          id: 'AwsSolutions-RDS14',
          reason:
            'Backtrack is MySQL-only; this is Aurora PostgreSQL. Point-in-time recovery covers recovery needs for the demo.',
        },
        {
          id: 'AwsSolutions-SMG4',
          reason:
            'Rotation needs a VPC Lambda and a Secrets Manager endpoint. Hackathon scope; add before real student data (Task 19).',
        },
      ],
      true,
    )
    // Findings on the loader and its CDK provider framework.
    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'AWSLambdaBasicExecutionRole on the loader and the CDK provider framework (logs only).',
        appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Wildcards come from CDK-generated provider-framework and KMS grant permissions, scoped to this stack.',
      },
      {
        id: 'AwsSolutions-L1',
        reason: 'The CDK provider framework pins its own runtime; the loader uses Node.js 22.',
      },
    ])
  }
}
