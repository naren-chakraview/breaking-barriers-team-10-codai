# Local demo services API

A Python stdlib HTTP server that wraps the real services router (backend/api/app.py) so the
frontend HTTP client can reach a real backend during local development, with no AWS.

It runs the actual C-29 routing, validation, evidence and progress logic against the JSON
store, with the model stubbed (MODEL_MODE=stub). It is NOT the production path; production
is API Gateway + Lambda in infra/. It exists so the student view can be exercised fully on a
laptop.

## Start the backend

    npm run dev:api

First run creates .venv-api/ (gitignored) with the backend's pinned deps (jsonschema,
referencing) and serves on http://127.0.0.1:8787.

Overrides: PORT (default 8787), STORE_MODE (json), MODEL_MODE (stub), STORE_PATH (JSON file;
in-memory if unset).

## Point the frontend at it

The repo ships .env.local wired to the local backend:

    VITE_SERVICE_MODE=http
    VITE_API_BASE_URL=http://127.0.0.1:8787
    VITE_DEMO_TOKEN=demo-token
    VITE_DEMO_USER_ID=stu-quick
    VITE_DEMO_ROLE=student

Run the backend in one terminal and the Vite app in another. The student view then reads
tree/progress from the live backend and sends submit / tutor / verify / generate through it.
Set VITE_SERVICE_MODE=mock (or delete .env.local) to return to canned stub data.

## Against the deployed API

Deploy infra/ and set VITE_API_BASE_URL to the API Gateway stage URL. No frontend code
changes, only the env value. That path uses real Bedrock and (when built) Aurora.
