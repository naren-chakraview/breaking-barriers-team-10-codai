# backend/store (Python)

The store seam (seam 4, ADR-016). A storage-agnostic repository interface
(`repository.py`) with adapters selected by `STORE_MODE`.

| Adapter | `STORE_MODE` | Status |
|---|---|---|
| `JsonRepository` | `json` (default) | **Built.** Demo mode: in-memory, optional JSON-file persistence. No AWS. Passes the contract suite. |
| Aurora adapter | `aurora` | **Deferred** (see below). |

Both adapters must pass the same contract (`tests/contract.py`), so switching
`STORE_MODE` is a config change, not a rewrite.

## Records

Methods take and return the camelCase records in
`shared/contracts/schemas/records.schema.json`.

## Why the Aurora adapter is deferred

The schema of record is now `database/schema.sql` (merged via PR #13, owned by the data
track). It differs from the contract records in ways that need a team decision, not a
unilateral mapping:

- **Student id type.** The contracts use a string `studentId` (e.g. `stu-quick`); the
  schema uses an INTEGER `StudentId` with an FK to `STUDENT_PROFILE`. An adapter must
  resolve string ids to integer ids (or the contract must change).
- **Column case.** Postgres folds the unquoted identifiers to lowercase (`studentid`,
  `createdat`), so result-set mapping is lowercase-to-camelCase, not snake_case.
- **Teacher input.** The contracts assume a `teacher_input` record; the schema models it
  as `ROUTING_DECISION.TeacherInput` (enum) plus a `TeacherId` FK. These need reconciling.
- **No `synthetic` column** on the student tables, which the demo personas rely on.
- **Evidence range.** The schema allows `Level` 0–4 (a 5-point competence scale); the skill
  rubric maxima are 2/3/3.

Until these are agreed, the backend runs on `JsonRepository`, which satisfies the whole
contract and needs no AWS. See the PR notes for the proposed reconciliation.

## Tests

```bash
. .venv/bin/activate && pip install -r requirements-dev.txt
pytest backend/store
```

`test_json_repository.py` runs the full contract suite against the JSON adapter and checks
file persistence.
