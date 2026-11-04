import * as cdk from 'aws-cdk-lib'
import { Duration, RemovalPolicy } from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as kms from 'aws-cdk-lib/aws-kms'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import { NagSuppressions } from 'cdk-nag'
import { Construct } from 'constructs'

/**
 * CodeAI student-state store (ADR-016, architecture 2.9).
 *
 * Aurora Serverless v2 (PostgreSQL), scale-to-zero, reached through the RDS Data API.
 * The Data API means Lambdas call a secure HTTP endpoint (no connection pooling, no VPC
 * attachment, no DB password in code). The admin credential lives in a KMS-encrypted
 * Secrets Manager secret; callers use IAM + the secret ARN.
 *
 * The C-8 tables are created as SQL (see schema.sql), applied by a one-off migration the
 * backend runs on first deploy — not by CDK, so schema changes do not require a stack update.
 */
export class DataStack extends cdk.Stack {
  public readonly cluster: rds.DatabaseCluster
  public readonly dbName = 'codeai'

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

    const cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        // A version that supports Serverless v2 auto-pause (scale to zero).
        version: rds.AuroraPostgresEngineVersion.VER_16_6,
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
      storageEncryptionKey: key,
      // Admin credential: generated in AWS, stored in Secrets Manager, never in code (ADR-013).
      credentials: rds.Credentials.fromGeneratedSecret('codeai_admin', { encryptionKey: key }),
      removalPolicy: RemovalPolicy.DESTROY, // hackathon teardown; NOT for production
    })
    this.cluster = cluster

    // SSM parameters so the backend discovers the store without hard-coding (architecture 2.14).
    new ssm.StringParameter(this, 'ClusterArnParam', {
      parameterName: '/codeai/data/cluster-arn',
      stringValue: cluster.clusterArn,
    })
    new ssm.StringParameter(this, 'DbNameParam', {
      parameterName: '/codeai/data/database-name',
      stringValue: this.dbName,
    })
    if (cluster.secret) {
      new ssm.StringParameter(this, 'SecretArnParam', {
        parameterName: '/codeai/data/secret-arn',
        stringValue: cluster.secret.secretArn,
      })
    }

    // Stack outputs: the first-deploy handoff the team reads (docs/aws-access.md).
    new cdk.CfnOutput(this, 'ClusterArn', { value: cluster.clusterArn })
    new cdk.CfnOutput(this, 'DatabaseName', { value: this.dbName })
    if (cluster.secret) {
      new cdk.CfnOutput(this, 'SecretArn', { value: cluster.secret.secretArn })
    }

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
      ],
      true,
    )
  }
}
