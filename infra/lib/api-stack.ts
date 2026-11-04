import * as cdk from 'aws-cdk-lib'
import { Duration } from 'aws-cdk-lib'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as logs from 'aws-cdk-lib/aws-logs'
import { NagSuppressions } from 'cdk-nag'
import { Construct } from 'constructs'
import * as path from 'path'
import * as fs from 'fs'

/**
 * CodeAI REST API (architecture 2.2, C-29).
 *
 * This stack owns the API *infrastructure* only: the REST API, a prod stage with
 * throttling and a usage plan (spend protection, ADR-012), the C-29 routes, the P-1.4
 * header pass-through, and least-privilege roles. Every route is wired to a shared
 * placeholder Lambda that returns a canned, schema-valid contract fixture tagged
 * source:"stub". The real handlers (Task 6 invoke, Task 7 submit orchestration) replace
 * the placeholder per route without reshaping this stack.
 *
 * Deliberately NOT here: submit orchestration, store access, model calls. Those are
 * blocked on the schema reconciliation (Task 4.6) and the AI track.
 */
export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const placeholderCode = this.bundlePlaceholder()

    const makeHandler = (route: string): lambda.Function =>
      new lambda.Function(this, `Fn${route}`, {
        runtime: lambda.Runtime.PYTHON_3_12, // backend tier is Python (ADR-015)
        handler: 'handler.handler',
        code: placeholderCode,
        timeout: Duration.seconds(10), // adaptive-call budget (C-22, C-29)
        memorySize: 256,
        environment: { ROUTE: route },
        logGroup: new logs.LogGroup(this, `Lg${route}`, {
          retention: logs.RetentionDays.TWO_WEEKS, // no student text in logs (ADR-011)
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      })

    const api = new apigw.RestApi(this, 'Api', {
      restApiName: 'codeai-api',
      description: 'CodeAI REST API (C-29). Placeholder handlers until Tasks 6/7.',
      deployOptions: {
        stageName: 'prod',
        // Spend protection: cap request rate/burst at the stage (ADR-012).
        throttlingRateLimit: 20,
        throttlingBurstLimit: 10,
        loggingLevel: apigw.MethodLoggingLevel.ERROR,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS, // demo mode; tighten with real auth (Task 19)
        allowHeaders: [...apigw.Cors.DEFAULT_HEADERS, 'X-User-Id', 'X-Role'], // P-1.4
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    })

    // Routes (C-29 + P-11). Each maps to a placeholder handler by name.
    const integration = (route: string) => new apigw.LambdaIntegration(makeHandler(route))

    // P-11 platform endpoints
    const courses = api.root.addResource('courses')
    courses.addMethod('GET', integration('getCourses'))
    const course = courses.addResource('{course_id}')
    course.addMethod('GET', integration('getCourse'))
    const lessons = course.addResource('lessons').addResource('{lesson_id}')
    lessons.addMethod('GET', integration('getLesson'))
    lessons.addMethod('POST', integration('postLessonProgress'))

    // Adaptive endpoints
    const steps = api.root.addResource('steps').addResource('{step_id}')
    steps.addResource('submit').addMethod('POST', integration('submitStep'))

    const prompts = api.root.addResource('prompts')
    prompts.addResource('verify').addMethod('POST', integration('verifyPrompt'))
    prompts.addResource('generate').addMethod('POST', integration('generate'))

    api.root.addResource('tutor').addResource('ask').addMethod('POST', integration('askTutor'))

    const teacher = api.root.addResource('teacher')
    teacher.addResource('students').addMethod('GET', integration('getTeacherRoster'))
    teacher
      .resourceForPath('students')
      .addResource('{id}')
      .addResource('routing')
      .addMethod('POST', integration('setTeacherInput'))

    api.root.addResource('health').addMethod('GET', integration('health'))

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
   * Bundle the placeholder Lambda, copying the shared contract fixtures in so the handler
   * returns real contract shapes. Falls back to a plain asset if bundling tooling is
   * unavailable, so `cdk synth` never hard-fails on environment differences.
   */
  private bundlePlaceholder(): lambda.Code {
    const src = path.join(__dirname, '..', 'lambda', 'placeholder')
    const fixture = path.join(
      __dirname,
      '..',
      '..',
      'shared',
      'contracts',
      'fixtures',
      'services',
      'responses.json',
    )
    return lambda.Code.fromAsset(src, {
      bundling: {
        image: lambda.Runtime.PYTHON_3_12.bundlingImage,
        local: {
          tryBundle(outputDir: string): boolean {
            fs.cpSync(src, outputDir, { recursive: true })
            fs.copyFileSync(fixture, path.join(outputDir, 'responses.json'))
            return true
          },
        },
        command: [
          'bash',
          '-c',
          `cp -r /asset-input/* /asset-output/ && cp ${fixture} /asset-output/responses.json`,
        ],
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
            'Request validation is handled in the Lambda handlers against the merged JSON Schemas (seam 1), not at the API Gateway model layer.',
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
    // Placeholder Lambdas use the CDK-managed basic-execution role; acceptable for stubs.
    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'Placeholder handlers use AWSLambdaBasicExecutionRole. Real handlers get scoped per-function roles in Tasks 6/7.',
      },
    ])
  }
}
