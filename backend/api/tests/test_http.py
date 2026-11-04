"""HTTP router tests: routing, P-1.4 auth, the C-29 error envelope, body validation, and the
per-student call cap."""

from __future__ import annotations

from shared.core.tree import load_tree
from backend.store import JsonRepository
from backend.api.services import create_services
from backend.api.http import create_router
from backend.api.schema_validate import problems
from backend.api.tests.conftest import make_deps

AUTH = {"authorization": "Bearer demo-token", "x-user-id": "stu-1", "x-role": "student"}


def _router(per_student_cap=500):
    tree = load_tree()
    repo = JsonRepository()
    repo.put_student({"studentId": "stu-1", "displayName": "Sam", "synthetic": True})
    services = create_services(make_deps(tree, repo))
    return create_router(services, per_student_cap=per_student_cap)


def test_routes_get_courses_to_get_tree():
    handle = _router()
    res = handle({"method": "GET", "path": "/courses/hoai2026-adaptive", "headers": AUTH})
    assert res["status"] == 200
    assert problems("services", "TreeResponse", res["body"]) == []


def test_routes_submit_and_injects_step_id_from_path():
    handle = _router()
    res = handle({"method": "POST", "path": "/steps/steer-it-video/submit", "headers": AUTH, "body": {"courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "kind": "complete"}})
    assert res["status"] == 200
    assert res["body"]["stepId"] == "steer-it-video"
    assert problems("services", "SubmitResponse", res["body"]) == []


def test_missing_token_is_401_with_c29_shape():
    handle = _router()
    res = handle({"method": "GET", "path": "/courses/hoai2026-adaptive", "headers": {"x-user-id": "stu-1", "x-role": "student"}})
    assert res["status"] == 401
    assert problems("error", None, res["body"]) == []
    assert res["body"]["error"]["code"] == "UNAUTHORIZED"


def test_unknown_role_is_403():
    handle = _router()
    res = handle({"method": "GET", "path": "/courses/x", "headers": {**AUTH, "x-role": "wizard"}})
    assert res["status"] == 403
    assert res["body"]["error"]["code"] == "FORBIDDEN"


def test_malformed_body_is_validation_error():
    handle = _router()
    res = handle({"method": "POST", "path": "/steps/steer-it-project/submit", "headers": AUTH, "body": {"courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "kind": "prompt"}})
    assert res["status"] == 400
    assert res["body"]["error"]["code"] == "VALIDATION_ERROR"


def test_unknown_endpoint_is_404():
    handle = _router()
    res = handle({"method": "GET", "path": "/nope", "headers": AUTH})
    assert res["status"] == 404
    assert res["body"]["error"]["code"] == "NOT_FOUND"


def test_health_needs_no_auth():
    handle = _router()
    res = handle({"method": "GET", "path": "/health", "headers": {}})
    assert res["status"] == 200
    assert problems("services", "HealthResponse", res["body"]) == []


def test_per_student_call_cap():
    handle = _router(per_student_cap=1)
    first = handle({"method": "GET", "path": "/courses/hoai2026-adaptive", "headers": AUTH})
    assert first["status"] == 200
    second = handle({"method": "GET", "path": "/courses/hoai2026-adaptive", "headers": AUTH})
    assert second["status"] == 429
    assert second["body"]["error"]["code"] == "RATE_LIMITED"
