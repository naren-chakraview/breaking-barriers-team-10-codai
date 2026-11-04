# infra

CDK app (TypeScript) for CodeAI. Track A owns this directory (architecture 1.8). Entry point:
`bin/codeai.ts`. One stack so far: `CodeAI-DataStack` (`lib/data-stack.ts`).

## CodeAI-DataStack

| Piece | Detail |
|---|---|
| Cluster | Aurora Serverless v2, PostgreSQL 16, scale-to-zero (0 to 2 ACU, auto-pause 5 min), KMS-encrypted, Data API on (ADR-016) |
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

## Commands

Run from `infra/`. The account and region come from your shell credentials, never from the repo.
`cdk.context.json` is gitignored for the same reason.

```
npm ci
npx tsc --noEmit     # type-check
npx cdk synth        # includes cdk-nag; fails on any unsuppressed finding
npx cdk bootstrap    # once per account and region; creates IAM roles and a bucket
npx cdk diff
npx cdk deploy
```
