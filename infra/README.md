# infra (AWS CDK, TypeScript)

Infrastructure as code for CodeAI (ADR-010: CDK in TypeScript). The application tier it
deploys is Python (ADR-015); only the IaC is TypeScript.

## Stacks

| Stack | What | Status |
|---|---|---|
| `CodeAI-DataStack` | Aurora Serverless v2 (PostgreSQL, scale-to-zero, Data API) + KMS (ADR-016). Cluster only; schema of record is `database/schema.sql`. | Synth-verified; not deployed. |
| `CodeAI-ApiStack` | REST API (C-29): routes, `prod` stage throttling, usage plan (ADR-012), P-1.4 CORS headers. Every route is a **placeholder** Python Lambda returning a canned contract fixture tagged `source:"stub"`. | Synth-verified; not deployed. |

## Placeholder handlers

`lambda/placeholder/handler.py` (Python 3.12) serves canned responses from the merged
contract fixtures (`shared/contracts/fixtures/services/responses.json`, copied in at
bundle time). Each route sets a `ROUTE` env var. Responses carry `x-codeai-placeholder:
true` and status `501` for everything except `/health`, so a stub can never be mistaken
for a real implementation. The real handlers (Task 6 `invoke`, Task 7 submit
orchestration) replace the placeholder per route without reshaping the stack.

Not here, by design: submit orchestration, store access, model calls. Those are blocked
on the schema reconciliation (Task 4.6) and the AI track.

## Commands

```bash
cd infra && npm install
# Account/region come from your AWS session (ADR-013); nothing hard-coded.
CDK_DEFAULT_ACCOUNT=<acct> CDK_DEFAULT_REGION=us-west-2 npx cdk synth
```

`cdk bootstrap` and `cdk deploy` are intentionally not run yet (held pending go-ahead;
Aurora is the priciest item in the account).
