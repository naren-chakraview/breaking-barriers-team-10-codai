import * as cdk from 'aws-cdk-lib'
import { RemovalPolicy } from 'aws-cdk-lib'
import * as bedrock from 'aws-cdk-lib/aws-bedrock'
import * as kms from 'aws-cdk-lib/aws-kms'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import { Construct } from 'constructs'

/**
 * Bedrock Guardrail for content safety (C-25, P-18, architecture 2.3).
 *
 * K-12 audience, so content filters are set to the strongest tier. A pinned numbered
 * version is published (never DRAFT, C-25); the id and version are written to SSM so the
 * backend reads them at runtime without hard-coding (architecture 2.14). The guardrail
 * config is KMS-encrypted (defense in depth; the config holds the PII/topic policy).
 *
 * This stack creates the Guardrail only. The Safety module (backend/ai/safety.py) calls it
 * via ApplyGuardrail; the backend's IAM gets scoped guardrail permissions when the model
 * Lambda role is wired (invoke task).
 */
export class GuardrailStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const key = new kms.Key(this, 'GuardrailKey', {
      description: 'CodeAI Guardrail configuration encryption key.',
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.DESTROY, // hackathon teardown
    })

    // HIGH strength on every harmful category for both input and output — a minors'
    // audience warrants the strictest content filtering (P-18.4). PROMPT_ATTACK is
    // input-only (AWS requires output strength NONE for it).
    const harmful = ['SEXUAL', 'VIOLENCE', 'HATE', 'INSULTS', 'MISCONDUCT'] as const
    const contentFilters: bedrock.CfnGuardrail.ContentFilterConfigProperty[] = [
      ...harmful.map((type) => ({
        type,
        inputStrength: 'HIGH',
        outputStrength: 'HIGH',
      })),
      { type: 'PROMPT_ATTACK', inputStrength: 'HIGH', outputStrength: 'NONE' },
    ]

    // Block common PII in both student input and model output. BLOCK (not anonymize):
    // for K-12 we do not want PII flowing through at all (architecture 2.3).
    const piiTypes = [
      'EMAIL',
      'PHONE',
      'NAME',
      'ADDRESS',
      'AGE',
      'USERNAME',
      'PASSWORD',
      'CREDIT_DEBIT_CARD_NUMBER',
      'US_SOCIAL_SECURITY_NUMBER',
    ]

    const guardrail = new bedrock.CfnGuardrail(this, 'Guardrail', {
      name: 'codeai-k12-safety',
      description: 'CodeAI content safety for a K-12 audience (C-25, P-18).',
      // Shown to the student when content is blocked. The Safety module overrides the
      // student-facing copy; these are the Guardrail-level fallbacks.
      blockedInputMessaging: "Let's keep this about building your website.",
      blockedOutputsMessaging: 'That response was held back by our safety check.',
      kmsKeyArn: key.keyArn,
      contentPolicyConfig: { filtersConfig: contentFilters },
      sensitiveInformationPolicyConfig: {
        piiEntitiesConfig: piiTypes.map((type) => ({ type, action: 'BLOCK' })),
      },
    })

    // Publish a pinned, numbered version. The DRAFT is mutable; never used at runtime (C-25).
    const version = new bedrock.CfnGuardrailVersion(this, 'Version', {
      guardrailIdentifier: guardrail.attrGuardrailId,
      description: 'Initial pinned version for the demo.',
    })

    // Config discovery for the backend (architecture 2.14). The Safety module reads these.
    new ssm.StringParameter(this, 'GuardrailIdParam', {
      parameterName: '/codeai/guardrail/id',
      stringValue: guardrail.attrGuardrailId,
    })
    new ssm.StringParameter(this, 'GuardrailVersionParam', {
      parameterName: '/codeai/guardrail/version',
      stringValue: version.attrVersion,
    })

    new cdk.CfnOutput(this, 'GuardrailId', { value: guardrail.attrGuardrailId })
    new cdk.CfnOutput(this, 'GuardrailVersion', { value: version.attrVersion })
  }
}
