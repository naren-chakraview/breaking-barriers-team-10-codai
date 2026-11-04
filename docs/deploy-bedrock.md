# Deploy runbook: live Bedrock agents (Task 6)

This is the hand-off for turning the deployed API from stubbed responses to the **real AI
agents** on Bedrock. The code wiring landed in the "Wire the real Bedrock models" PR
(Task 6, C-27); this runbook is the deploy side, which is done by whoever owns the target
account — it is **not** run from CI.

Account/region come from your AWS session at synth time (`CDK_DEFAULT_ACCOUNT`,
`CDK_DEFAULT_REGION`), never the repo (ADR-013). No account id is written here on purpose.

## What flips

- `ApiStack` Lambda env `MODEL_MODE` → `bedrock`: `build_app` constructs the real
  `BedrockModelPort` instead of `StubModel`.
- The Lambda gets scoped IAM: `bedrock:InvokeModel` (+ stream) on `foundation-model/*` and
  this account/region `inference-profile/*`, `bedrock:ApplyGuardrail` on `guardrail/*`, and
  `ssm:GetParameter` on `parameter/codeai/*`.
- Lambda timeout is 29 s (outlasts the 10 s adaptive budget + one retry).
- `GuardrailStack` publishes `/codeai/model/fast` (Haiku) and `/codeai/model/strong`
  (Sonnet) to SSM, alongside the existing `/codeai/guardrail/{id,version}`.

Agent → model tier (fixed in `backend/ai/invoke.py` `TASK_TIER`, P-7.2 / C-27):

| Task | Tier | Model (SSM param) |
|---|---|---|
| verify, validate, passive | fast | `/codeai/model/fast` → Claude Haiku 4.5 |
| codegen (generate), tutor | strong | `/codeai/model/strong` → Claude Sonnet 4.5 |

## Single-account rule (important)

The Lambda reads `/codeai/*` from SSM **in its own account/region**. So the `GuardrailStack`
(which owns those params) and the `ApiStack` must be deployed in the **same account and
region**. Deploy both in the account that also holds the Aurora cluster the API points at
(`STORE_MODE=aurora`), so models, guardrail config and the store are all in-account — no
cross-account calls.

> The Guardrail was first deployed in the workshop account for the smoke test. For the live
> API, deploy a Guardrail in the API's account too; its id/version/model params come from
> that account's SSM.

## Prerequisites

- An AWS session for the target account/region with permission to deploy the stacks
  (CloudFormation, IAM, Lambda, API Gateway, Bedrock guardrail, SSM, KMS).
- The account bootstrapped for CDK (`cdk bootstrap aws://<account>/<region>`).
- Bedrock model access enabled for Claude Haiku 4.5 and Sonnet 4.5 in the region
  (on-demand via the `us.` cross-region inference profiles). Verified working in us-west-2
  on 2026-11-04 (see `backend/ai/scripts/README.md`).

## Steps

```bash
cd infra
# Your session sets CDK_DEFAULT_ACCOUNT/REGION; or export them explicitly.

# 1. Guardrail + model/config SSM params (additive, low risk). Deploy first so the
#    params the API reads exist before the API points at them.
npx cdk deploy CodeAI-GuardrailStack

# 2. Confirm the four params are present in this account/region.
aws ssm get-parameters --names \
  /codeai/guardrail/id /codeai/guardrail/version \
  /codeai/model/fast /codeai/model/strong \
  --query 'Parameters[].Name' --output text

# 3. The API: flips the Lambda to bedrock + grants IAM. Depends on DataStack
#    (Aurora) being deployed in this account already.
npx cdk deploy CodeAI-ApiStack
```

## Verify after deploy

- **Pipeline, independent of the API** (fastest signal): from a checkout with an AWS session
  for this account, `python -m backend.ai.scripts.smoke_test --live`. Expect: clean input
  allowed, unsafe blocked, verify (Haiku) + generate (Sonnet) + validate return real output
  inside the 10 s budget.
- **Through the API**: submit a project step and confirm the response `source` is `bedrock`
  (not `stub`) and the SourceBadge no longer shows "Sample data". A tutor/verify call should
  return model text, not a canned fixture.
- **Logs**: the decision log records model id, latency and token counts per call — never
  student text (ADR-011).

## Cost + guardrails

- Every student action becomes a billable Converse call. Bounded by the API Gateway usage
  plan (20 rps, 50k/day) and the per-student call cap in the handler (ADR-012).
- Haiku for verify/validate/passive keeps the high-frequency calls cheap; Sonnet only for
  codegen/tutor.

## Rollback

Redeploy `CodeAI-ApiStack` with the Lambda env `MODEL_MODE=stub` (revert the one line in
`infra/lib/api-stack.ts`, or override at deploy). The API returns to stubbed, `source: stub`
responses with no model spend. The SSM params and guardrail can stay; they are harmless when
unused.
