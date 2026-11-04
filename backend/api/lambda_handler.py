"""AWS Lambda handler for API Gateway (REST, proxy integration).

Normalizes the API Gateway event into the router's request shape and serializes the router's
response back. The app is built once per cold start (module scope) so the tree parse, store
client and config reads are reused across invocations.
"""

from __future__ import annotations

import base64
import json
from typing import Any

from .app import build_app

# Built once per cold start.
_APP = build_app()


def handler(event: dict[str, Any], context: Any = None) -> dict[str, Any]:
    """API Gateway REST proxy handler."""
    method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "GET")
    path = event.get("path") or event.get("rawPath", "/")
    req = {
        "method": method,
        "path": path,
        "headers": _lower(event.get("headers") or {}),
        "query": event.get("queryStringParameters") or {},
        "body": _parse_body(event),
    }
    res = _APP["router"](req)
    return {"statusCode": res["status"], "headers": res["headers"], "body": json.dumps(res["body"])}


def _lower(headers: dict[str, Any]) -> dict[str, Any]:
    return {str(k).lower(): v for k, v in headers.items()}


def _parse_body(event: dict[str, Any]) -> dict[str, Any]:
    raw = event.get("body")
    if not raw:
        return {}
    if event.get("isBase64Encoded"):
        raw = base64.b64decode(raw).decode("utf-8")
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return {}
