# infra (AWS CDK, TypeScript)

Infrastructure as code for CodeAI (ADR-010: CDK in TypeScript). The application tier it
deploys is Python (ADR-015); only the IaC is TypeScript.

## Stacks

| Stack | What | Status |
|---|---|---|
| `CodeAI-DataStack` | Aurora Serverless v2 (PostgreSQL, scale-to-zero, Data API) + KMS (ADR-016). Cluster only; schema of record is `database/schema.sql`. | Synth-verified; not deployed. |
| `CodeAI-ApiStack` | REST API (C-29): a `{proxy+}` catch-all to the Track D Python router, `prod` stage throttling, usage plan (ADR-012), P-1.4 CORS headers. | Synth-verified; not deployed. |

## API handler

`CodeAI-ApiStack` proxies every route to the Track D backend
(`backend/api/lambda_handler.handler`, Python 3.12), a single router that dispatches the
C-29 and P-11 routes internally (Task 7). The CDK asset bundles `backend/`, `shared/`, and
the handler's pip deps (`jsonschema`, `referencing`, see `lambda/api/requirements.txt`).

Runtime defaults are safe for a deploy with no external dependencies:
- `MODEL_MODE=stub` — no Bedrock; `StubModel` serves canned model output (Task 6 adds the
  real model port).
- `STORE_MODE=json` — the Aurora adapter is deferred (Task 4.6); the handler fails fast if
  asked for `aurora`/`bedrock` before those land.

Bundling prefers Docker (`bundlingImage`); it falls back to a local `pip install` when a
compatible `python3`/`pip` is on PATH and Docker is unavailable.

## Commands

```bash
cd infra && npm install
# Account/region come from your AWS session (ADR-013); nothing hard-coded.
CDK_DEFAULT_ACCOUNT=<acct> CDK_DEFAULT_REGION=us-west-2 npx cdk synth
```

`cdk bootstrap` and `cdk deploy` are intentionally not run yet (held pending go-ahead;
Aurora is the priciest item in the account).
