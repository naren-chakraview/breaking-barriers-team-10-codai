# backend/store (Python)

The store seam (seam 4, ADR-016). A storage-agnostic repository interface
(`repository.py`) with adapters selected by `STORE_MODE`.

| Adapter | `STORE_MODE` | Status |
|---|---|---|
| `JsonRepository` | `json` (default) | **Built.** Demo mode: in-memory, optional JSON-file persistence. No AWS. Passes the contract suite. |
| Aurora adapter | `aurora` | **Not built yet, unblocked** by Task 4.6 (see below). |

Both adapters must pass the same contract (`tests/contract.py`), so switching
`STORE_MODE` is a config change, not a rewrite.

## Records

Methods take and return the camelCase records in
`shared/contracts/schemas/records.schema.json`.

## Aurora adapter: the agreed shape (Task 4.6, ADR-017)

`database/schema.sql` now matches the contract records, so the adapter needs no id
translation:

- Student and teacher ids are strings (`stu-quick`); skills are referenced by slug (`build`).
- Every student-state column is its record key in lower case. Map a result row to a record
  with `row[key.lower()]` for each key in the record schema, and format `TIMESTAMPTZ` values
  as ISO 8601 UTC (`2026-11-04T09:10:00Z`).
- Teacher input: `TEACHER_INPUT` holds the standing hold or assign (no row means `auto`), and
  `ROUTING_DECISION.TeacherInput` is a JSONB snapshot of `{mode, checkpointId}`.
- `EvidenceId`, `FlagId` and `FallbackEventId` are internal surrogate keys. Do not return them.
- Use Data API `parameters` for every value. Never build SQL by string concatenation.

The seeded rows already validate against `records.schema.json` with this mapping. The adapter
still has to pass the store contract suite against a live cluster.

## Tests

```bash
. .venv/bin/activate && pip install -r requirements-dev.txt
pytest backend/store
```

`test_json_repository.py` runs the full contract suite against the JSON adapter and checks
file persistence.
