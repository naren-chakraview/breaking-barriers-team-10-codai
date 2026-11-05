#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { Aspects } from 'aws-cdk-lib'
import { AwsSolutionsChecks } from 'cdk-nag'
import { DataStack } from '../lib/data-stack'
import { ApiStack } from '../lib/api-stack'
import { GuardrailStack } from '../lib/guardrail-stack'

// Account and region come from the environment at synth time, never the repo (ADR-013).
// Set CDK_DEFAULT_ACCOUNT / CDK_DEFAULT_REGION (the CLI does this from your AWS session),
// or AWS_DEFAULT_REGION=us-west-2.
const app = new cdk.App()

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-west-2',
}

const dataStack = new DataStack(app, 'CodeAI-DataStack', {
  env,
  description:
    'CodeAI student-state store: Aurora Serverless v2 (PostgreSQL, scale-to-zero, Data API) + KMS (ADR-016).',
})

// Pass the data-tier resources to the API by reference (CloudFormation exports/imports),
// never as literal ARNs in the repo (ADR-013). CDK adds the cross-stack dependency so
// DataStack deploys first.
const guardrailStack = new GuardrailStack(app, 'CodeAI-GuardrailStack', {
  env,
  description: 'CodeAI Bedrock Guardrail for K-12 content safety (C-25, P-18).',
})

const apiStack = new ApiStack(app, 'CodeAI-ApiStack', {
  env,
  description:
    'CodeAI REST API (C-29): routes, throttling, usage plan, Python router on Bedrock + Aurora.',
  clusterArn: dataStack.cluster.clusterArn,
  databaseName: dataStack.dbName,
  secretArn: dataStack.cluster.secret!.secretArn,
  dataApiAccessPolicy: dataStack.dataApiAccessPolicy,
})

// The API Lambda reads the Guardrail + model ids from SSM (/codeai/*) at cold start. That is
// a runtime read, not a CloudFormation reference, so CDK would not otherwise order the stacks.
// Declare it explicitly so `cdk deploy --all` always lands GuardrailStack (which writes those
// params) before the API that reads them. (DataStack ordering is already handled by the
// cross-stack refs above.)
apiStack.addDependency(guardrailStack)

// cdk-nag runs on every synth (architecture 2.11). Findings are surfaced, not silently passed.
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))

app.synth()
