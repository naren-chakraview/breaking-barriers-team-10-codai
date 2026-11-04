#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { Aspects } from 'aws-cdk-lib'
import { AwsSolutionsChecks } from 'cdk-nag'
import { DataStack } from '../lib/data-stack'
import { ApiStack } from '../lib/api-stack'

// Account and region come from the environment at synth time, never the repo (ADR-013).
// Set CDK_DEFAULT_ACCOUNT / CDK_DEFAULT_REGION (the CLI does this from your AWS session),
// or AWS_DEFAULT_REGION=us-west-2.
const app = new cdk.App()

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-west-2',
}

new DataStack(app, 'CodeAI-DataStack', {
  env,
  description:
    'CodeAI student-state store: Aurora Serverless v2 (PostgreSQL, scale-to-zero, Data API) + KMS (ADR-016).',
})

new ApiStack(app, 'CodeAI-ApiStack', {
  env,
  description:
    'CodeAI REST API (C-29): routes, throttling, usage plan, placeholder handlers until Tasks 6/7.',
})

// cdk-nag runs on every synth (architecture 2.11). Findings are surfaced, not silently passed.
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))

app.synth()
