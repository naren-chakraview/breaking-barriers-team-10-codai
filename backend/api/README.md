# backend/api (Python)

Track D: the services API (seam 1) and HTTP layer (Task 7, ADR-015). Python, matching the
backend language decision; consumes the pure domain core (`shared/core`, Track B) and the
store seam (`backend/store`, seam 4).

| File | What |
|---|---|
| `submit.py` | `POST /steps/{id}/submit` orchestration (screen → persist → score → evidence → route). |
| `services.py` | The eight C-28 functions (`create_services`, `Deps`). |
| `http.py` | Transport-agnostic router: P-1.4 auth, C-29 errors, per-student cap, body validation. |
| `model.py` | The seam-3 `ModelPort` protocol and `StubModel` (MODEL_MODE=stub, from the fixtures). |
| `schema_validate.py` | Validates data against the JSON Schemas in `shared/contracts/schemas/`. |
| `app.py` | `build_app`: wires modes → store/model/core → services + router. |
| `lambda_handler.py` | API Gateway (REST, proxy) entrypoint. |

## Boundaries

- Routing is `shared.core.route` (C-18); the API never decides routing itself.
- The model/safety seam (Track C) is injected via `ModelPort`. Until Bedrock lands,
  `MODEL_MODE=stub` uses `StubModel`; `MODEL_MODE=bedrock` requires an injected port and fails
  fast otherwise. Model-derived output carries `source` so a stub can never pass as live.
- The store is chosen by `STORE_MODE` (`json` default; `aurora` adapter built, schema reconciled per
  ADR-017, see `../store/README.md`). Student work is persisted before any model result is used (C-24).
- Request/response shapes are the contract schemas; the HTTP layer rejects malformed bodies
  with `VALIDATION_ERROR` and emits the C-29 `{ "error": { "code", "message" } }` envelope.

## Run the tests

```bash
python -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt
pytest backend/api
```

## Local invocation

`build_app()["router"]` takes a normalized request dict
(`{method, path, headers, body?, query?}`) and returns `{status, headers, body}`. The same
router backs `lambda_handler.handler` for API Gateway. Example (Python):

```python
from backend.api.app import build_app
app = build_app(env={"STORE_MODE": "json", "MODEL_MODE": "stub"})
res = app["router"]({
    "method": "POST", "path": "/steps/steer-it-project/submit",
    "headers": {"authorization": "Bearer demo", "x-user-id": "stu-1", "x-role": "student"},
    "body": {"courseId": "hoai2026-adaptive", "checkpointId": "steer-it",
             "kind": "prompt", "text": "Make the heading say Robotics Club.",
             "project": {"html": "<h1>Hi</h1>", "css": "", "js": ""}},
})
```
