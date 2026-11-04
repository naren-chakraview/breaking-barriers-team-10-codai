# infra (AWS CDK, TypeScript)

Infrastructure as code for CodeAI (ADR-010: CDK in TypeScript). The application tier it deploys is
Python (ADR-015); only the IaC is TypeScript. Track A owns this directory (architecture 1.8).
Entry point: `bin/codeai.ts`.

## Stacks

| Stack | What | Status |
|---|---|---|
| `CodeAI-DataStack` | Aurora Serverless v2 (PostgreSQL 16.13, scale-to-zero, Data API) + KMS (ADR-016), with the schema and master data loaded (`lib/data-stack.ts`) | **Deployed** in `us-west-2` (2026-11-04) |
| `CodeAI-ApiStack` | REST API (C-29): a `{proxy+}` catch-all to the Track D Python router, `prod` stage throttling, usage plan (ADR-012), P-1.4 CORS headers (`lib/api-stack.ts`) | Synth-verified; not deployed |

The two stacks are independent today. The API runs with `STORE_MODE=json` and does not read Aurora
until the Aurora store adapter exists (see "API handler" below).

## CodeAI-DataStack

| Piece | Detail |
|---|---|
| Cluster | Aurora Serverless v2, PostgreSQL 16.13, scale-to-zero (0 to 2 ACU, auto-pause 5 min), KMS-encrypted, Data API on |
| Network | Isolated subnets, no NAT, VPC flow log. Callers need no VPC |
| Loader | `DbLoader` custom resource (`lambda/db-loader/`) loads `database/schema.sql` then `database/seed.sql` in one transaction |
| Access | Managed policy for the API and agent roles: Data API on this cluster, read the secret, decrypt with the key |
| Discovery | SSM `/codeai/data/cluster-arn`, `/codeai/data/secret-arn`, `/codeai/data/database-name`, `/codeai/data/access-policy-arn`, and the same values as stack outputs |

The loader only loads an **empty** database. `schema.sql` begins with `DROP TABLE`, so when the tables
already exist the loader skips and leaves the data alone. Change the schema later with a migration, never
by re-running `schema.sql`. It retries while a paused cluster resumes. `seed.sql` includes synthetic
sample students; remove that section before real student data goes in.

### Use from the API or an agent

1. Attach the policy in `/codeai/data/access-policy-arn` to the Lambda role.
2. Read the cluster ARN, secret ARN and database name from SSM.
3. Query with the Data API. Always pass values as `parameters`, never by string concatenation. Column
   names come back in lower case; the record mapping is in `backend/store/README.md` (ADR-017).

```python
import boto3
rds = boto3.client("rds-data")
res = rds.execute_statement(
    resourceArn=cluster_arn, secretArn=secret_arn, database=database,
    sql="SELECT checkpointid, title FROM checkpoint WHERE courseid = :c ORDER BY sequence",
    parameters=[{"name": "c", "value": {"longValue": 2}}],
    formatRecordsAs="JSON",
)
```

The first call after an idle period can raise `DatabaseResumingException` while the cluster wakes.
Retry it.

## CodeAI-ApiStack: API handler

`CodeAI-ApiStack` proxies every route to the Track D backend
(`backend/api/lambda_handler.handler`, Python 3.12), a single router that dispatches the
C-29 and P-11 routes internally (Task 7). The CDK asset bundles `backend/`, `shared/`, and
the handler's pip deps (`jsonschema`, `referencing`, see `lambda/api/requirements.txt`).

Runtime defaults are safe for a deploy with no external dependencies:

- `MODEL_MODE=stub`: no Bedrock; `StubModel` serves canned model output (Task 6 adds the
  real model port).
- `STORE_MODE=json`: the Aurora adapter is not built yet. Its schema is reconciled (Task 4.6,
  ADR-017) and the database is deployed, so it is unblocked. The handler fails fast if asked for
  `aurora`/`bedrock` before those land.

Switching the API to Aurora means building the adapter, setting `STORE_MODE=aurora`, attaching the
DataStack's access policy to the handler role, and passing the SSM parameter names (not values) to
the handler.

Bundling prefers Docker (`bundlingImage`); it falls back to a local `pip install` when a
compatible `python3`/`pip` is on PATH and Docker is unavailable.

## Commands

Run from `infra/`. The account and region come from your AWS session, never from the repo
(ADR-013). `cdk.context.json` is gitignored for the same reason.

```bash
npm ci
npx tsc --noEmit                     # type-check
npx cdk synth                        # all stacks, includes cdk-nag; fails on any unsuppressed finding
npx cdk diff CodeAI-ApiStack
npx cdk deploy CodeAI-ApiStack       # needs the team's go-ahead (aws-access.md section 5)
```

`cdk bootstrap` for `us-west-2` is already done (2026-11-04); do not run it again. Deploy only the
stack you own, and agree who deploys what (aws-access.md section 5).
