"""HTTP layer for the services API (Task 7, P-11, P-1.4, C-29).

Transport-agnostic: it works over a normalized request dict so the same router serves API
Gateway/Lambda and a local server. It:
  - reads the P-1.4 headers (Authorization: Bearer, X-User-Id, X-Role) into a context;
  - routes the C-29 endpoints to the eight service functions;
  - enforces a per-student call cap (C-24 / spend protection);
  - validates request bodies against the schemas before a handler runs;
  - serializes every error as the C-29 shape {"error": {"code", "message"}}.
"""

from __future__ import annotations

import re
from typing import Any, Callable, Mapping

from .schema_validate import problems
from .util import ContractError, as_contract_error
from .auth import read_context

# (method, compiled path pattern, service fn name, args builder, args schema def)
_ROUTES = [
    ("GET", re.compile(r"^/courses/([^/]+)$"), "getTree", lambda m, b, q: {"courseId": m.group(1)}, "GetTreeArgs"),
    ("POST", re.compile(r"^/steps/([^/]+)/submit$"), "submitStep", lambda m, b, q: {**b, "stepId": m.group(1)}, "SubmitStepArgs"),
    ("POST", re.compile(r"^/tutor/ask$"), "askTutor", lambda m, b, q: b, "AskTutorArgs"),
    ("POST", re.compile(r"^/prompts/verify$"), "verifyPrompt", lambda m, b, q: b, "VerifyPromptArgs"),
    ("POST", re.compile(r"^/prompts/generate$"), "generate", lambda m, b, q: b, "GenerateArgs"),
    ("GET", re.compile(r"^/teacher/students$"), "getTeacherRoster", lambda m, b, q: {"courseId": q.get("courseId")}, "GetTeacherRosterArgs"),
    ("POST", re.compile(r"^/teacher/students/([^/]+)/routing$"), "setTeacherInput", lambda m, b, q: {"studentId": m.group(1), "input": b.get("input", b)}, "SetTeacherInputArgs"),
    ("GET", re.compile(r"^/health$"), "health", lambda m, b, q: {}, "HealthArgs"),
]


def create_router(services: Mapping[str, Callable[..., dict[str, Any]]], per_student_cap: int = 500) -> Callable[[Mapping[str, Any]], dict[str, Any]]:
    """Build an HTTP router over the eight service functions.

    A request is a dict: {method, path, headers (lower-cased), body?, query?}.
    A response is a dict: {status, headers, body}.
    """
    call_counts: dict[str, int] = {}

    def handle(req: Mapping[str, Any]) -> dict[str, Any]:
        try:
            method = req.get("method", "GET")
            path = req.get("path", "/")
            route = next(((fn, build, defn, m) for (meth, pat, fn, build, defn) in _ROUTES if meth == method and (m := pat.match(path))), None)
            if not route:
                raise ContractError("NOT_FOUND", "No such endpoint.")
            fn_name, build, args_def, match = route

            ctx = {} if fn_name == "health" else read_context(req.get("headers", {}))

            if ctx.get("studentId"):
                n = call_counts.get(ctx["studentId"], 0) + 1
                call_counts[ctx["studentId"]] = n
                if n > per_student_cap:
                    raise ContractError("RATE_LIMITED", "Request limit reached for this session.")

            args = build(match, req.get("body") or {}, req.get("query") or {})
            errs = problems("services", args_def, args)
            if errs:
                raise ContractError("VALIDATION_ERROR", f"Invalid request: {errs[0]}")

            result = services[fn_name](args, ctx)
            return {"status": 200, "headers": _json_headers(), "body": result}
        except Exception as err:  # noqa: BLE001 - everything becomes a C-29 error
            ce = as_contract_error(err)
            return {"status": _status_for(ce.code), "headers": _json_headers(), "body": {"error": ce.error}}

    return handle


def _json_headers() -> dict[str, str]:
    return {"content-type": "application/json"}


def _status_for(code: str) -> int:
    return {
        "UNAUTHORIZED": 401,
        "FORBIDDEN": 403,
        "NOT_FOUND": 404,
        "VALIDATION_ERROR": 400,
        "CONTENT_BLOCKED": 400,
        "RATE_LIMITED": 429,
        "TIMEOUT": 504,
        "UPSTREAM_ERROR": 502,
        "CONFIG_ERROR": 500,
        "INTERNAL": 500,
    }.get(code, 500)
