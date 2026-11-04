"""Local dev HTTP server for the services API (demo only; no AWS).

Wraps the transport-agnostic router from backend/api/app.py in Python's stdlib
http.server so the frontend HTTP client (VITE_SERVICE_MODE=http) can talk to a
real backend during local development: real routing, validation, evidence and
progress against the JSON store, with the model stubbed (MODEL_MODE=stub) and no
Bedrock/Aurora. This is NOT the production path — production is the API Gateway +
Lambda in infra/. It exists so the student view can be exercised end to end on a
laptop without deploying.

Run:  python -m backend.local.server            # binds 127.0.0.1:8787
Env:  PORT (default 8787), STORE_PATH (JSON store file; in-memory if unset),
      STORE_MODE=json (default), MODEL_MODE=stub (default).

CORS: permissive for local dev only, so the Vite dev origin can call it.
"""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from backend.api.app import build_app

_APP = build_app(
    env={
        "VITE_SERVICE_MODE": "http",
        "MODEL_MODE": os.environ.get("MODEL_MODE", "stub"),
        "STORE_MODE": os.environ.get("STORE_MODE", "json"),
    },
    store_path=os.environ.get("STORE_PATH") or None,
)
_ROUTER = _APP["router"]


class Handler(BaseHTTPRequestHandler):
    # Quieter logs: one line per request is enough for a dev server.
    def log_message(self, fmt, *args):  # noqa: A003
        pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-User-Id, X-Role, X-Correlation-Id",
        )

    def do_OPTIONS(self):  # noqa: N802 - preflight
        self.send_response(204)
        self._cors()
        self.end_headers()

    def _dispatch(self, method):
        parsed = urlparse(self.path)
        length = int(self.headers.get("content-length") or 0)
        raw = self.rfile.read(length).decode("utf-8") if length else ""
        try:
            body = json.loads(raw) if raw else {}
        except (ValueError, TypeError):
            body = {}
        query = {k: v[0] for k, v in parse_qs(parsed.query).items()}
        headers = {str(k).lower(): v for k, v in self.headers.items()}

        res = _ROUTER({
            "method": method,
            "path": parsed.path,
            "headers": headers,
            "query": query,
            "body": body,
        })
        payload = json.dumps(res["body"]).encode("utf-8")
        self.send_response(res["status"])
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):  # noqa: N802
        self._dispatch("GET")

    def do_POST(self):  # noqa: N802
        self._dispatch("POST")


def main():
    port = int(os.environ.get("PORT", "8787"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Services API (demo, model={_APP['modes']['modelMode']}, store={_APP['modes']['storeMode']}) "
          f"listening on http://127.0.0.1:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    main()
