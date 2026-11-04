"""Placeholder handler for the ApiStack (API Gateway CDK, option 1b).

Each route is wired to this handler with a ROUTE env var. It returns a canned,
schema-valid response from the merged contract fixtures, tagged source:"stub" so a
placeholder can never be mistaken for a real implementation (architecture 1.8).

Python (PYTHON_3_12) to match the backend tier (ADR-015), so the real handlers
(Task 6 invoke, Task 7 submit orchestration) replace this per route without changing the
runtime. No store access, no model calls, no business logic here. CDK stays TypeScript
(ADR-010).
"""

import itertools
import json
import os
from datetime import datetime, timezone
from pathlib import Path

_FIXTURES = json.loads((Path(__file__).parent / "responses.json").read_text(encoding="utf-8"))
_SEQ = itertools.count(1)


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _canned(route: str):
    """Canned response for a route, or None if the route has no fixture."""
    submit = _FIXTURES["submit"]
    if route == "submitStep":
        return dict(submit["recorded"])  # safe default shape; real logic picks scored/blocked/fallback
    if route == "askTutor":
        return dict(_FIXTURES["tutor"])
    if route == "verifyPrompt":
        return dict(_FIXTURES["verify"]["ok"])
    if route == "generate":
        return dict(_FIXTURES["generate"])
    if route == "getTeacherRoster":
        return dict(_FIXTURES["roster"])
    if route == "setTeacherInput":
        return dict(_FIXTURES["routingDecision"])
    if route == "health":
        return {**_FIXTURES["health"]["ok"], "checkedAt": _now()}
    return None


def handler(event, context):
    route = os.environ.get("ROUTE", "unknown")
    body = _canned(route)

    # Health is the one route honestly implementable as a placeholder. Everything else is
    # explicitly "not implemented yet" (501) so no caller mistakes the canned shape for real
    # behaviour, while still returning the real shape for wiring.
    not_implemented = route != "health"

    if body is None:
        payload = {"error": {"code": "INTERNAL", "message": f"No placeholder for route {route}"}}
        status = 500
    else:
        corr = f"{route}-ph-{next(_SEQ):04d}"
        payload = {**body, "correlationId": corr}
        status = 501 if not_implemented else 200

    return {
        "statusCode": status,
        "headers": {
            "content-type": "application/json",
            "x-codeai-placeholder": str(not_implemented).lower(),
        },
        "body": json.dumps(payload),
    }
