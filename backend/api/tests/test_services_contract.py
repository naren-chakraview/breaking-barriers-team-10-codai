"""Services seam (seam 1) contract: the Python mirror of harness.js:runServicesContract.

The real services implementation must produce schema-valid responses for every C-28 function,
echo a correlationId, and honor the panels-step -> recorded rule. Validated against the
language-neutral JSON Schemas in shared/contracts/schemas/.
"""

from __future__ import annotations

import pytest

from shared.core.tree import load_tree
from backend.store import JsonRepository
from backend.api.services import create_services
from backend.api.schema_validate import problems
from backend.api.tests.conftest import make_deps

SERVICE_FUNCTIONS = ["getTree", "submitStep", "askTutor", "verifyPrompt", "generate", "getTeacherRoster", "setTeacherInput", "health"]

RESPONSE_DEF = {
    "getTree": "TreeResponse",
    "submitStep": "SubmitResponse",
    "askTutor": "TutorResponse",
    "verifyPrompt": "VerifyResponse",
    "generate": "GenerateResponse",
    "getTeacherRoster": "RosterResponse",
    "setTeacherInput": "SetTeacherInputResponse",
    "health": "HealthResponse",
}

SAMPLE_ARGS = {
    "getTree": {"courseId": "hoai2026-adaptive"},
    "submitStep": {"stepId": "steer-it-video", "courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "kind": "complete"},
    "askTutor": {"courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "stepId": "steer-it-widget", "question": "How do I start?"},
    "verifyPrompt": {"courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "stepId": "steer-it-project", "prompt": "Make the heading bigger and keep the layout."},
    "generate": {"courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "stepId": "steer-it-project", "prompt": "Add a sign-up button.", "project": {"html": "<h1>Hi</h1>", "css": "", "js": ""}},
    "getTeacherRoster": {"courseId": "hoai2026-adaptive"},
    "setTeacherInput": {"studentId": "stu-slow", "input": {"mode": "hold"}},
    "health": {},
}


def _services():
    tree = load_tree()
    repo = JsonRepository()
    repo.put_student({"studentId": "stu-slow", "displayName": "Steady Sam", "synthetic": True})
    repo.put_student({"studentId": "demo-student", "displayName": "Demo", "synthetic": True})
    return create_services(make_deps(tree, repo))


def test_exposes_exactly_the_eight_functions():
    svc = _services()
    assert sorted(svc.keys()) == sorted(SERVICE_FUNCTIONS)


@pytest.mark.parametrize("name", SERVICE_FUNCTIONS)
def test_response_matches_schema(name):
    svc = _services()
    out = svc[name](SAMPLE_ARGS[name], {"studentId": "stu-slow", "role": "teacher"})
    assert problems("services", RESPONSE_DEF[name], out) == []


@pytest.mark.parametrize("name", SERVICE_FUNCTIONS)
def test_echoes_correlation_id(name):
    svc = _services()
    out = svc[name](SAMPLE_ARGS[name], {"studentId": "stu-slow", "role": "teacher"})
    assert isinstance(out["correlationId"], str) and len(out["correlationId"]) >= 8


def test_panels_submit_records_completion_with_no_evidence():
    svc = _services()
    out = svc["submitStep"](SAMPLE_ARGS["submitStep"], {"studentId": "stu-x"})
    assert out["outcome"] == "recorded"
    assert out["evidence"] is None
    assert out["masteryDisplay"] is None
