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
`ROUTING_DECISION`, evidence levels 0..3.** Column names are the camelCase record keys,
which Postgres folds to lowercase in result sets; `AuroraRepository` maps them back with a
column-name table (`_CAMEL`). No id translation anywhere — the persona fixtures load as-is.

## Aurora via the Data API

`AuroraRepository` calls the `rds-data` client: a secure HTTPS endpoint, so no connection
pool, no VPC attachment, no DB password in code. `create_repository` reads
`AURORA_CLUSTER_ARN`, `AURORA_SECRET_ARN`, and `AURORA_DATABASE_NAME` from the env (the
`DataStack` outputs / SSM, see `docs/aws-access.md`). boto3 is imported lazily, so the
module imports without it; the unit tests use a fake Data API client (no AWS).

## Tests

```bash
. .venv/bin/activate && pip install -r requirements-dev.txt
pytest backend/store
```

- `test_json_repository.py` — full contract suite against the JSON adapter + persistence.
- `test_aurora_repository.py` — SQL, parameter typing, lowercase→camelCase mapping, JSONB
  round-trip, factory wiring, with a fake client.
- `test_aurora_live.py` — the **same** contract suite against a real cluster. Skipped unless
  `AURORA_CLUSTER_ARN`/`AURORA_SECRET_ARN` are set; run post-deploy against a scratch DB.
