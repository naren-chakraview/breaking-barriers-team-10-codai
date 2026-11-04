# backend/store (Python)

The store seam (seam 4, ADR-016). A storage-agnostic repository interface with two adapters:

| Adapter | `STORE_MODE` | Use |
|---|---|---|
| `JsonRepository` | `json` (default) | Demo mode. In-memory, optional JSON-file persistence. No AWS. |
| `AuroraRepository` | `aurora` | Deployed. Aurora Serverless v2 (PostgreSQL) via the RDS Data API. |

Both implement `repository.py` and both must pass the same contract (`tests/contract.py`),
so switching `STORE_MODE` is a config change, not a rewrite.

## Records

Methods take and return the camelCase records in
`shared/contracts/schemas/records.schema.json`. The Aurora adapter maps them to the
snake_case SQL columns in `infra/schema.sql` (C-29).

## Aurora via the Data API

`AuroraRepository` calls the `rds-data` client: a secure HTTPS endpoint, so there is no
connection pool, no VPC attachment for Lambdas, and no DB password in code. It needs the
cluster ARN, the Secrets Manager secret ARN, and the database name — read from the
`DataStack` outputs / SSM parameters (`docs/aws-access.md`), never hard-coded.

boto3 is imported lazily, so this module imports without boto3 installed. The unit tests
use a fake Data API client (no AWS).

## Tests

```bash
. .venv/bin/activate && pip install -r requirements-dev.txt
pytest backend/store
```

- `test_json_repository.py` runs the full contract suite against the JSON adapter and
  checks file persistence.
- `test_aurora_repository.py` checks SQL statements, parameter typing, and result
  unwrapping with a fake client.

**Not run in CI:** the full behavioral contract against a *live* Aurora cluster. After a
deploy, point `check_repository` at an `AuroraRepository` wired to the real cluster to
confirm parity end to end.
