import * as cdk from 'aws-cdk-lib'
import { Duration } from 'aws-cdk-lib'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as logs from 'aws-cdk-lib/aws-logs'
import { NagSuppressions } from 'cdk-nag'
import { Construct } from 'constructs'
import * as path from 'path'
import { execSync } from 'child_process'
import * as fs from 'fs'

/**
 * The data-tier resources the API needs to reach the store, passed in by reference (not as
 * literal ARNs) so nothing sensitive lands in the repo (ADR-013). `bin/codeai.ts` wires
 * these from `DataStack`.
 */
export interface ApiStackProps extends cdk.StackProps {
  /** Aurora cluster ARN, database name, and secret ARN the Data API calls need. */
  readonly clusterArn: string
  readonly databaseName: string
  readonly secretArn: string
  /** The DataStack managed policy granting rds-data:*, GetSecretValue, kms:Decrypt. */
  readonly dataApiAccessPolicy: iam.IManagedPolicy
  /** ARN of the GuardrailStack KMS key. A Converse call with the guardrail needs
   *  kms:Decrypt on it, or Bedrock returns "You do not have access to the guardrail's KMS key". */
  readonly guardrailKeyArn: string
}

/**
 * The one Python runtime for the API: the Lambda runtime, the Docker bundling image, and the
 * wheels the local bundler fetches all follow it, so the bundle always matches the runtime.
 */
const PYTHON_RUNTIME = lambda.Runtime.PYTHON_3_14
const PYTHON_VERSION = PYTHON_RUNTIME.name.replace('python', '') // e.g. "3.14"

/**
 * CodeAI REST API (architecture 2.2, C-29).
 *
 * Wires API Gateway to the Track D Python backend (`backend/api/lambda_handler.handler`),
 * which is a single proxy-integration router that dispatches the C-29 routes internally
 * (Task 7). This stack owns the API infrastructure: the REST API, a prod stage with
 * throttling and a usage plan (spend protection, ADR-012), a {proxy+} catch-all so the
 * router sees every path, the P-1.4 CORS headers, and the Lambda's log group / env.
 *
 * Runtime wiring (Task 6): MODEL_MODE=bedrock and STORE_MODE=aurora, so the deployed API
 * runs the real AI agents (Converse via the invoke wrapper, behind the deployed Guardrail)
 * against the shared Aurora cluster. Model ids and the guardrail id/version are read from
 * SSM at cold start (architecture 2.14); the Lambda is granted scoped Bedrock + SSM access
 * below. verify/validate/passive run on the fast (Haiku) tier, codegen/tutor on the strong
 * (Sonnet) tier (P-7.2, C-27).
 */
export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)

    const fn = new lambda.Function(this, 'ApiFn', {
      runtime: PYTHON_RUNTIME, // backend tier is Python (ADR-015); latest runtime (cdk-nag L1)
      handler: 'backend.api.lambda_handler.handler',
      code: this.bundleBackend(),
      // The model budget is 10 s per adaptive call (C-22) with one retry inside the invoke
      // wrapper; the Lambda must outlast that so it never kills a call mid-retry. 29 s is the
      // API Gateway integration ceiling, which gives the needed headroom.
      timeout: Duration.seconds(29),
      memorySize: 512,
      environment: {
        MODEL_MODE: 'bedrock', // real AI agents via the invoke wrapper (Task 6, C-27)
        // The Aurora adapter is built (ADR-017); the API runs on the deployed shared cluster.
        // The AURORA_* coordinates below are what backend/store/factory.py reads.
        STORE_MODE: 'aurora',
        AURORA_CLUSTER_ARN: props.clusterArn,
        AURORA_SECRET_ARN: props.secretArn,
        AURORA_DATABASE_NAME: props.databaseName,
        PYTHONPATH: '/var/task',
      },
      logGroup: new logs.LogGroup(this, 'ApiFnLogs', {
        retention: logs.RetentionDays.TWO_WEEKS, // no student text in logs (ADR-011)
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    })

    // Let the API reach the store through the RDS Data API: attach the DataStack managed
    // policy (rds-data:*, secretsmanager:GetSecretValue on the secret, kms:Decrypt). One
    // source of truth for data-tier access, so the API and agents stay in sync.
    fn.role!.addManagedPolicy(props.dataApiAccessPolicy)

    this.grantModelAccess(fn, props.guardrailKeyArn)

    // Access log: request metadata only (standard fields: ip, method, path, status, latency).
    // API Gateway access logs never include request or response bodies, so no student text
    // lands here (ADR-011).
    const accessLogs = new logs.LogGroup(this, 'ApiAccessLogs', {
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const api = new apigw.RestApi(this, 'Api', {
      restApiName: 'codeai-api',
      description: 'CodeAI REST API (C-29), proxied to the Track D Python router.',
      deployOptions: {
        stageName: 'prod',
        // Spend protection: cap request rate/burst at the stage (ADR-012).
        throttlingRateLimit: 20,
        throttlingBurstLimit: 10,
        loggingLevel: apigw.MethodLoggingLevel.ERROR,
        metricsEnabled: true,
        accessLogDestination: new apigw.LogGroupLogDestination(accessLogs),
        accessLogFormat: apigw.AccessLogFormat.jsonWithStandardFields(),
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS, // demo mode; tighten with real auth (Task 19)
        allowHeaders: [...apigw.Cors.DEFAULT_HEADERS, 'X-User-Id', 'X-Role', 'X-Correlation-Id'], // P-1.4 + correlation
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    })

    // Proxy integration: the Python router owns dispatch for every C-29 and P-11 route,
    // so the stack does not duplicate the route table (single source of truth is http.py).
    const proxy = new apigw.LambdaIntegration(fn, { proxy: true })
    api.root.addMethod('ANY', proxy) // root (e.g. unknown -> router's 404)
    api.root.addProxy({ defaultIntegration: proxy, anyMethod: true })

    // Usage plan: one more spend guard (ADR-012). A demo API key is an identifier, not a
    // secret (it ships in the browser); protection is the rate cap + per-student cap (handler).
    const plan = api.addUsagePlan('DemoUsagePlan', {
      throttle: { rateLimit: 20, burstLimit: 10 },
      quota: { limit: 50_000, period: apigw.Period.DAY },
    })
    plan.addApiStage({ stage: api.deploymentStage })

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url })

    this.addNagSuppressions(api)
  }

  /**
   * Grant the API Lambda the runtime permissions the real AI agents need (Task 6, C-27):
   *   - Bedrock Converse/invoke on the Claude models and the cross-region inference profiles
   *     the models resolve to (the `us.` ids are system-defined inference profiles, so both
   *     the profile ARN and the underlying foundation-model ARNs must be allowed).
   *   - ApplyGuardrail on this account's guardrails (the deployed K-12 Guardrail, C-25).
   *   - Read the model ids + guardrail id/version from SSM at cold start (architecture 2.14).
   * Account/region come from the stack env, never the repo (ADR-013).
   */
  private grantModelAccess(fn: lambda.Function, guardrailKeyArn: string): void {
    const { account, region } = cdk.Stack.of(this)

    fn.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'BedrockInvoke',
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          // Foundation models are account-less and can be invoked in any region the profile spans.
          `arn:aws:bedrock:*::foundation-model/*`,
          // System-defined cross-region inference profiles (the `us.anthropic...` ids).
          `arn:aws:bedrock:${region}:${account}:inference-profile/*`,
        ],
      }),
    )
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'BedrockApplyGuardrail',
        actions: ['bedrock:ApplyGuardrail'],
        resources: [`arn:aws:bedrock:${region}:${account}:guardrail/*`],
      }),
    )
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'ReadCodeAiConfig',
        actions: ['ssm:GetParameter'],
        resources: [`arn:aws:ssm:${region}:${account}:parameter/codeai/*`],
      }),
    )
    // A Converse call that applies the guardrail makes Bedrock decrypt the guardrail config
    // with the GuardrailStack KMS key; without this the call fails with "You do not have
    // access to the guardrail's KMS key" (ValidationException).
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'DecryptGuardrailKey',
        actions: ['kms:Decrypt', 'kms:DescribeKey'],
        resources: [guardrailKeyArn],
      }),
    )
  }

  /**
   * Bundle the Python backend into a Lambda asset: the `backend/` and `shared/` packages
   * (handler, router, domain core, store, contracts schemas + fixtures), the lesson tree
   * `database/sample-skilltree.json`, plus the pip deps
   * the handler imports (`jsonschema`, `referencing`).
   *
   * Prefers Docker (`bundlingImage`) for a clean, reproducible build. Falls back to a local
   * build when Docker is unavailable and a compatible `pip`/`python3` is on PATH, so a dev
   * box without Docker can still `cdk synth`/`deploy`.
   */
  private bundleBackend(): lambda.Code {
    const repoRoot = path.join(__dirname, '..', '..')
    const reqFile = path.join(__dirname, '..', 'lambda', 'api', 'requirements.txt')

    const copyPackages = (outputDir: string) => {
      for (const pkg of ['backend', 'shared']) {
        fs.cpSync(path.join(repoRoot, pkg), path.join(outputDir, pkg), {
          recursive: true,
          filter: (s) => !s.includes('__pycache__') && !s.endsWith('.pyc'),
        })
      }
      // The lesson content the router loads (shared/core/tree.py). Only the tree JSON; the SQL
      // files are for the database, not the API.
      fs.mkdirSync(path.join(outputDir, 'database'), { recursive: true })
      fs.copyFileSync(
        path.join(repoRoot, 'database', 'sample-skilltree.json'),
        path.join(outputDir, 'database', 'sample-skilltree.json'),
      )
    }

    return lambda.Code.fromAsset(repoRoot, {
      bundling: {
        image: PYTHON_RUNTIME.bundlingImage,
        command: [
          'bash',
          '-c',
          [
            'cp -r /asset-input/backend /asset-output/backend',
            'cp -r /asset-input/shared /asset-output/shared',
            'mkdir -p /asset-output/database',
            'cp /asset-input/database/sample-skilltree.json /asset-output/database/',
            `pip install -r /asset-input/infra/lambda/api/requirements.txt -t /asset-output -q`,
            'find /asset-output -name __pycache__ -type d -prune -exec rm -rf {} +',
          ].join(' && '),
        ],
        local: {
          tryBundle(outputDir: string): boolean {
            try {
              copyPackages(outputDir)
              // Fetch Linux wheels built for the Lambda runtime, not for the local Python.
              // jsonschema pulls in rpds-py, a compiled extension: a wheel for the wrong
              // Python version or OS installs fine here but fails to import on Lambda.
              execSync(
                `pip install -r "${reqFile}" -t "${outputDir}" -q ` +
                  `--platform manylinux2014_x86_64 --implementation cp ` +
                  `--python-version ${PYTHON_VERSION} --only-binary=:all:`,
                { stdio: 'ignore' },
              )
              // Match the Docker path: drop __pycache__ so the asset hash is deterministic.
              execSync(
                `find "${outputDir}" -name __pycache__ -type d -prune -exec rm -rf {} +`,
                { stdio: 'ignore' },
              )
              return true
            } catch {
              // No local pip/python compatible — let CDK fall back to Docker bundling.
              return false
            }
          },
        },
      },
    })
  }

  private addNagSuppressions(api: apigw.RestApi): void {
    NagSuppressions.addResourceSuppressions(
      api,
      [
        {
          id: 'AwsSolutions-APIG2',
          reason:
            'Request validation is in the Python router against the merged JSON Schemas (seam 1, schema_validate.py), not at the API Gateway model layer.',
        },
        {
          id: 'AwsSolutions-APIG4',
          reason:
            'Demo mode has no real authorizer (C-33); routes are gated by the usage plan and rate caps (ADR-012). Cognito authorizer is Task 19.',
        },
        {
          id: 'AwsSolutions-COG4',
          reason:
            'No Cognito user pool in demo mode (C-33). Authorization is out of scope until Task 19.',
        },
      ],
      true,
    )
    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'The API Lambda uses AWSLambdaBasicExecutionRole for CloudWatch Logs. Aurora Data API access is granted via the scoped DataStack DataApiAccessPolicy (rds-data:*, GetSecretValue, kms:Decrypt on the specific resources).',
      },
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'Bedrock model access (Task 6, C-27) is scoped by service and resource type but keeps a resource wildcard within it: bedrock:InvokeModel on foundation-model/* and this account/region inference-profile/* (the models are chosen at runtime from SSM, so the exact id is not known at synth), ApplyGuardrail on this account/region guardrail/*, and ssm:GetParameter on parameter/codeai/* (the config namespace this app owns). No cross-account or cross-service wildcard.',
      },
    ])
  }
}
