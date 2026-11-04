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
new ApiStack(app, 'CodeAI-ApiStack', {
  env,
  description:
    'CodeAI REST API (C-29): routes, throttling, usage plan, placeholder handlers until Tasks 6/7.',
  clusterArn: dataStack.cluster.clusterArn,
  databaseName: dataStack.dbName,
  secretArn: dataStack.cluster.secret!.secretArn,
  dataApiAccessPolicy: dataStack.dataApiAccessPolicy,
})

new GuardrailStack(app, 'CodeAI-GuardrailStack', {
  env,
  description: 'CodeAI Bedrock Guardrail for K-12 content safety (C-25, P-18).',
})

// cdk-nag runs on every synth (architecture 2.11). Findings are surfaced, not silently passed.
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))

app.synth()
