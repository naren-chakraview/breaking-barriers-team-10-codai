# backend

Track D: the backend API and store (architecture 2.2, 2.9). **Owner: Track D.**

Node.js (ESM), the same runtime the Lambdas use. The backend implements the real versions
of the frozen seams in `../shared/contracts/` and must pass the same contract suites the
stubs pass (`runServicesContract`, `runRepositoryContract`).

| Directory | What | Seam |
|---|---|---|
| `store/` | Repository adapters: JSON file (demo) and DynamoDB (Task 7). | 4 |
| `api/`   | HTTP handlers and the submit orchestration (validate → persist → route). | 1 |

Boundaries:
- The browser never calls a model or the store directly; it only calls the services API
  (C-26). Student work is persisted before any model result is used (C-24).
- Model access goes through the Seam 3 `invoke`/validator/safety functions (Track C). Until
  `MODEL_MODE=bedrock` is wired at IC3, the backend runs against the model stubs and labels
  model-derived output `source: "stub"`.
- Routing is the pure `route()` in `../shared/core` (Track B / C-18); the backend never
  decides routing itself.

Mode switches (`../shared/contracts/modes.js`): `STORE_MODE` (`json` | `dynamodb`),
`MODEL_MODE` (`stub` | `bedrock`). The services layer also has `VITE_SERVICE_MODE`.
