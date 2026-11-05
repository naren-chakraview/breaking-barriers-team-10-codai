# backend/store (Python)

The store seam (seam 4, ADR-016/017). A storage-agnostic repository interface
(`repository.py`) with adapters selected by `STORE_MODE` via `create_repository`
(`factory.py`).

| Adapter | `STORE_MODE` | Status |
|---|---|---|
| `JsonRepository` | `json` (default) | Built. Demo mode: in-memory, optional JSON-file persistence. No AWS. |
| `AuroraRepository` | `aurora` | Built. Aurora Serverless v2 (PostgreSQL) via the RDS Data API. |

Both pass the same contract (`tests/contract.py`), so switching `STORE_MODE` is a config
change, not a rewrite.

## Records and the schema (ADR-017)

Methods take and return the camelCase records in
`shared/contracts/schemas/records.schema.json`. Task 4.6 aligned `database/schema.sql` to
those records: **string ids, skill slugs, `TEACHER_INPUT` table, JSONB `TeacherInput` on
`ROUTING_DECISION`, evidence levels 0..3.** The DDL column names are PascalCase
(`StudentId`), which Postgres folds to lowercase in result sets (`studentid`);
`AuroraRepository` maps each back through `_CAMEL` and lowercases the first letter to the
camelCase record key (`studentId`), so reads match the JSON adapter and the schemas exactly.
No id translation anywhere — the persona fixtures load as-is.

Two Postgres realities the adapter handles explicitly (both surfaced by the live contract
test, which a fake client cannot catch):

- **Timestamps.** ISO-8601 strings are bound as text and cast in SQL (`:ts::timestamptz`),
  because Postgres will not implicitly cast text into a `TIMESTAMPTZ` column on insert.
- **Referential integrity.** Student-state tables carry foreign keys to `STUDENT_PROFILE`
  (and skills/steps/checkpoints), which the JSON adapter does not. A student must exist
  before its child rows — the contract seeds the synthetic student through `put_student`.

## Aurora via the Data API

`AuroraRepository` calls the `rds-data` client: a secure HTTPS endpoint, so no connection
pool, no VPC attachment, no DB password in code. `create_repository` reads
`AURORA_CLUSTER_ARN`, `AURORA_SECRET_ARN`, and `AURORA_DATABASE_NAME` from the env (the
`DataStack` outputs / SSM, see `docs/aws-access.md`). boto3 is imported lazily, so the
module imports without it; the unit tests use a fake Data API client (no AWS).

## Tests

```bash
. .venv/bin/activate && pip install -r requirements-dev.txt
pytest backend/store   # JSON adapter + the fake-client Aurora tests; no AWS
```

- `test_json_repository.py` — full contract suite against the JSON adapter + persistence.
- `test_aurora_repository.py` — SQL, parameter typing, lowercase→camelCase mapping, JSONB
  round-trip, factory wiring, with a fake client.
- `test_aurora_live.py` — the **same** contract suite against a real cluster. Skipped unless
  `AURORA_CLUSTER_ARN`/`AURORA_SECRET_ARN` are set; run post-deploy against a scratch DB.

To run the live suite (needs `boto3` and the shared cluster's ARNs):

```bash
pip install boto3
AWS_DEFAULT_REGION=us-west-2 \
AURORA_CLUSTER_ARN=<CodeAI-DataStack ClusterArn> \
AURORA_SECRET_ARN=<CodeAI-DataStack SecretArn> \
AURORA_DATABASE_NAME=codeai \
pytest backend/store/tests/test_aurora_live.py
```

The suite writes under the synthetic id `stu-x` and its autouse fixture deletes that student
(cascading to all child tables) before and after the run — scoped to `stu-x` only. Note the
cluster scales to zero when idle, so the first call may return `DatabaseResumingException`;
re-run once it has resumed (a few seconds).
