"""End-to-end integration tests for the backend stack (Task 7, post-PR #21 merge).

Unlike the per-function contract and unit tests, these drive the whole stack together through
the HTTP router: the real `shared.core` (route/evidence/tree), the real `JsonRepository`
store, and the stub model and safety port. They exercise multi-step student journeys and
cross-component invariants (evidence accumulates monotonically across calls, routing advances,
the teacher roster reflects persisted state, hold/assign changes routing, completion persists).

Store mode is `json` and model mode is `stub` — the deployed default after PR #21 (Aurora
adapter unbuilt; schema reconciled by Task 4.6 / ADR-017). Everything is validated against the
shared JSON Schemas so the integrated output stays contract-correct.
"""

from __future__ import annotations

import json

from backend.api.app import build_app
from backend.store import JsonRepository
from backend.api.schema_validate import problems


def _student_headers(student_id="stu-int", role="student"):
    return {"authorization": "Bearer demo", "x-user-id": student_id, "x-role": role}


def _teacher_headers():
    return {"authorization": "Bearer demo", "x-user-id": "teacher-1", "x-role": "teacher"}


def _app(repo=None):
    # A shared repo lets a test seed students and inspect persisted rows after HTTP calls.
    return build_app(env={"STORE_MODE": "json", "MODEL_MODE": "stub"}, repo=repo or JsonRepository())


def _post(app, path, headers, body):
    return app["router"]({"method": "POST", "path": path, "headers": headers, "body": body})


def _get(app, path, headers, query=None):
    return app["router"]({"method": "GET", "path": path, "headers": headers, "query": query or {}})


# ---------------------------------------------------------------------------
# A full student journey through one checkpoint, end to end over HTTP.
# ---------------------------------------------------------------------------

def test_student_journey_panels_then_project_completes_and_routes():
    repo = JsonRepository()
    app = _app(repo)
    h = _student_headers("stu-journey")

    # 1. getTree: a fresh student starts with empty progress/evidence.
    tree_res = _get(app, "/courses/hoai2026-adaptive", h)
    assert tree_res["status"] == 200
    assert problems("services", "TreeResponse", tree_res["body"]) == []
    assert tree_res["body"]["progress"] == {}
    assert tree_res["body"]["evidence"] == {}

    # 2. Complete a panels step (completion only, no evidence).
    panels = _post(app, "/steps/steer-it-video/submit", h, {"courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "kind": "complete"})
    assert panels["status"] == 200
    assert panels["body"]["outcome"] == "recorded"
    assert panels["body"]["evidence"] is None

    # 3. Submit the project step: the stub validator scores build=2 (target met).
    proj = _post(
        app,
        "/steps/steer-it-project/submit",
        h,
        {"courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "kind": "prompt",
         "text": "Make the heading say Robotics Club and add a blue sign-up button, keep the layout.",
         "project": {"html": "<h1>Hi</h1>", "css": "", "js": ""}},
    )
    assert proj["status"] == 200
    body = proj["body"]
    assert problems("services", "SubmitResponse", body) == []
    assert body["outcome"] == "scored"
    assert body["completed"] is True
    assert body["next"] is not None and body["next"]["reason"]

    # 4. The journey is persisted: evidence, progress, attempts, a routing decision.
    assert repo.get_evidence("stu-journey") == {"build": 2}
    assert repo.get_progress("stu-journey")["steer-it"] == "completed"
    assert len(repo.get_history("stu-journey")) == 2  # panels + project
    assert len(repo.list_routing_decisions("stu-journey")) >= 1

    # 5. getTree now reflects the persisted state.
    after = _get(app, "/courses/hoai2026-adaptive", h)
    assert after["body"]["progress"]["steer-it"] == "completed"
    assert after["body"]["evidence"]["build"] == 2


# ---------------------------------------------------------------------------
# Evidence is monotonic across separate HTTP calls (C-10), even on a weaker retry.
# ---------------------------------------------------------------------------

def test_evidence_never_decreases_across_calls():
    repo = JsonRepository()
    app = build_app(env={"STORE_MODE": "json", "MODEL_MODE": "stub"}, repo=repo)
    h = _student_headers("stu-mono")

    # First an MCQ answer worth 2, then one worth 0 on the same skill.
    r1 = _post(app, "/steps/skill-check-web-dev/submit", h, {"courseId": "hoai2026-adaptive", "checkpointId": "skill-check", "kind": "answer", "questionId": 103, "choiceId": "b"})
    assert r1["body"]["evidence"]["level"] == 2
    r2 = _post(app, "/steps/skill-check-web-dev/submit", h, {"courseId": "hoai2026-adaptive", "checkpointId": "skill-check", "kind": "answer", "questionId": 103, "choiceId": "c"})
    assert r2["body"]["evidence"]["level"] == 0  # this attempt scored 0
    # ...but the stored skill level stays at the max observed.
    assert repo.get_evidence("stu-mono")["build"] == 2


# ---------------------------------------------------------------------------
# Safety block mid-journey keeps the lesson running (C-25) and does not score.
# ---------------------------------------------------------------------------

class _BlockingModel:
    """Stub model that blocks all input but is otherwise a valid port."""

    def screen_input(self, text, correlation_id):
        return {"allowed": False, "action": "blocked", "replacement": "That message was not sent. Try describing a change to your page.", "categories": ["safety"], "guardrailVersion": "v1"}

    def screen_output(self, text, correlation_id):
        return {"allowed": True, "action": "none", "replacement": None, "categories": [], "guardrailVersion": "v1"}

    def validate_project(self, request):
        return {"ok": True, "source": "stub", "result": {"skillId": request["skillId"], "evidenceLevel": 2, "conditionMet": True, "confidence": 0.9, "evidence": "ok"}}

    def invoke(self, request):
        return {"ok": True, "task": request["task"], "source": "stub", "modelId": "m", "promptVersion": "v", "text": "ok", "latencyMs": 1, "usage": {"inputTokens": 1, "outputTokens": 1}, "guardrail": {"version": "v1", "action": "none"}, "correlationId": request["opts"]["correlationId"]}


def test_blocked_input_keeps_lesson_running_and_records_no_evidence():
    repo = JsonRepository()
    app = build_app(env={"STORE_MODE": "json", "MODEL_MODE": "stub"}, repo=repo, model=_BlockingModel())
    h = _student_headers("stu-block")
    res = _post(app, "/steps/steer-it-project/submit", h, {"courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "kind": "prompt", "text": "something unsafe", "project": {"html": "", "css": "", "js": ""}})
    assert res["status"] == 200  # lesson continues; not an error
    assert problems("services", "SubmitResponse", res["body"]) == []
    assert res["body"]["outcome"] == "blocked"
    assert res["body"]["notice"]["code"] == "CONTENT_BLOCKED"
    assert repo.get_evidence("stu-block") == {}  # nothing scored


# ---------------------------------------------------------------------------
# Teacher roster reflects real persisted state, and hold/assign change routing.
# ---------------------------------------------------------------------------

def test_teacher_roster_reflects_persisted_journey():
    repo = JsonRepository()
    repo.put_student({"studentId": "stu-r", "displayName": "Rosa", "synthetic": True})
    app = _app(repo)

    # Student scores on a project step.
    _post(app, "/steps/steer-it-project/submit", _student_headers("stu-r"), {"courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "kind": "prompt", "text": "Make the heading say Robotics Club, keep the layout.", "project": {"html": "<h1>Hi</h1>", "css": "", "js": ""}})

    roster = _get(app, "/teacher/students", _teacher_headers(), {"courseId": "hoai2026-adaptive"})
    assert roster["status"] == 200
    assert problems("services", "RosterResponse", roster["body"]) == []
    row = next(s for s in roster["body"]["students"] if s["studentId"] == "stu-r")
    build = next(m for m in row["mastery"] if m["skillId"] == "build")
    assert build["level"] == 2 and build["display"] == 100


def test_teacher_assign_changes_routing_and_is_recorded():
    repo = JsonRepository()
    repo.put_student({"studentId": "stu-a", "displayName": "Al", "synthetic": True})
    app = _app(repo)

    res = _post(
        app,
        "/teacher/students/stu-a/routing",
        _teacher_headers(),
        {"input": {"mode": "assign", "checkpointId": "intro"}},
    )
    assert res["status"] == 200
    assert problems("services", "SetTeacherInputResponse", res["body"]) == []
    decision = res["body"]["decision"]
    assert decision["teacherInput"]["mode"] == "assign"
    # The decision is persisted, and the teacher input is stored for the next route.
    assert repo.get_teacher_input("stu-a")["mode"] == "assign"
    assert len(repo.list_routing_decisions("stu-a")) == 1


# ---------------------------------------------------------------------------
# Fallback (validator unreliable) surfaces the notice, writes an event, and the
# health endpoint stays reportable for the UI's recovery poll (C-21..C-23).
# ---------------------------------------------------------------------------

class _FallbackModel(_BlockingModel):
    def screen_input(self, text, correlation_id):
        return {"allowed": True, "action": "none", "replacement": None, "categories": [], "guardrailVersion": "v1"}

    def validate_project(self, request):
        return {"ok": False, "fallback": {"component": "validation", "reason": "low_confidence"}}


def test_validator_fallback_surfaces_notice_and_health_still_ok():
    repo = JsonRepository()
    app = build_app(env={"STORE_MODE": "json", "MODEL_MODE": "stub"}, repo=repo, model=_FallbackModel())
    h = _student_headers("stu-fb")
    res = _post(app, "/steps/steer-it-project/submit", h, {"courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "kind": "prompt", "text": "change the heading", "project": {"html": "", "css": "", "js": ""}})
    assert res["body"]["outcome"] == "fallback"
    assert res["body"]["notice"]["code"] == "ADAPTIVE_UNAVAILABLE"
    assert res["body"]["next"] is not None  # linear path still advances
    assert repo.list_fallback_events("stu-fb")[-1]["component"] == "validation"

    health = _get(app, "/health", {})
    assert health["status"] == 200
    assert problems("services", "HealthResponse", health["body"]) == []


# ---------------------------------------------------------------------------
# The Lambda proxy entrypoint runs the same journey (deploy-shaped path).
# ---------------------------------------------------------------------------

def test_lambda_handler_proxy_end_to_end(monkeypatch):
    monkeypatch.setenv("STORE_MODE", "json")
    monkeypatch.setenv("MODEL_MODE", "stub")
    # Import after env is set so the module-scope app builds in json/stub mode.
    import importlib
    import backend.api.lambda_handler as lh
    importlib.reload(lh)

    event = {
        "httpMethod": "POST",
        "path": "/steps/steer-it-project/submit",
        "headers": {"Authorization": "Bearer demo", "X-User-Id": "stu-lam", "X-Role": "student"},
        "body": json.dumps({"courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "kind": "prompt", "text": "Make the heading say Robotics Club, keep the layout.", "project": {"html": "<h1>Hi</h1>", "css": "", "js": ""}}),
    }
    out = lh.handler(event, None)
    assert out["statusCode"] == 200
    body = json.loads(out["body"])
    assert problems("services", "SubmitResponse", body) == []
    assert body["outcome"] == "scored"
    assert body["source"] == "stub"
