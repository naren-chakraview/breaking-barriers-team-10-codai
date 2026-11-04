# shared/contracts

The frozen interfaces between components (architecture 1.8, ADR-014). Owned by everyone
through the contract-change rule, not by one track. This is Task 0.5 in the
[implementation plan](../../docs/architecture/implementation-plan.md).

Why it exists: so several people build different components at the same time. Each seam
has a **schema** (the shape), a **stub** (so the consuming side can work before the real
thing exists), and a **contract test** (one suite that both the stub and the real
implementation must pass). Swapping a stub for the real implementation is then a mode
switch plus a green test run, not a rewrite.

## Layout

| Path | What |
|---|---|
| `seams.js` | The vocabulary: function names, enums, limits, config keys, table columns. Start here. |
| `schemas/*.schema.json` | JSON Schemas (draft 2020-12) for every shape that crosses a seam. |
| `validate.js` | Node-side Ajv helpers: `getValidator`, `problems`, `isValid`. |
| `errors.js` | `ContractError`, whose `.error` is the C-29 wire shape. |
| `modes.js` | `resolveModes` for the three mode switches. |
| `fixtures/` | Canned data: three persona histories, model outputs, service responses. `index.js` is the import point. |
| `stubs/` | `createStubServices` (seam 1) and `createStubRepository` (seam 4). |
| `harness.js` | `runServicesContract` and `runRepositoryContract`: reusable suites a track runs against its own implementation. |
| `tests/` | The suites that run in CI. |

JSDoc typedefs for the services layer live in `src/services/types.js` (C-30), mirroring
`schemas/services.schema.json`.

## The five seams

1. **Services** (UI and backend): `schemas/services.schema.json`, `stubs/services.stub.js`.
2. **Domain core** (pure): `CORE_FUNCTIONS` in `seams.js`. Built first in `shared/core/`.
3. **Model access** (models and safety): `schemas/model.schema.json`.
4. **Store** (repository): `REPOSITORY_METHODS`, `schemas/records.schema.json`, `stubs/repository.stub.js`.
5. **Config and secrets**: `CONFIG_FUNCTIONS` in `seams.js`, detailed in architecture 2.14.

## Run the tests

```bash
npm run test:contracts   # just the contract suites
npm test                 # everything
```

## When you implement a real component

Make it match the stub's signatures, then run the matching harness against it:

```js
import { runRepositoryContract } from '../../shared/contracts/harness.js'
import { createAuroraRepository } from './aurora-repository.js'
runRepositoryContract('aurora', () => createAuroraRepository(testConfig))
```

When it is green, flip the mode switch (`STORE_MODE`, `MODEL_MODE`, or
`VITE_SERVICE_MODE`) and the rest of the system uses it unchanged.

## Changing a contract

One PR edits the schema, the stub and the contract test together, names the consuming
tracks, and is announced before it merges. Never change a shape on one side only. The
drift test (`tests/seams-drift.test.js`) catches an enum or column that moves in `seams.js`
but not in a schema, or the reverse.

## Proposed, not yet in the constraints

- A `passive_signal` table and a `passive` value for `fallback_event.component` (C-8).
- `hint_event`, `student`, and `teacher_input` tables, needed by Passive and the roster
  but absent from C-8.

These are marked `proposed` in `seams.js` (`TABLES`) and in the record schemas. They need a
C-8 edit, made in the PR for Task 8a or sooner if the team agrees.

## Open question for the team

`SubmitResponse` and the routing fixtures assume that a teacher `assign` to an unavailable
checkpoint keeps the proposal and records why. C-19 does not specify this. Confirm the
behavior and fold it into C-19 or an ADR.
