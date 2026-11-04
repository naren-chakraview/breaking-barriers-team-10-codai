"""Behavioral tests for the submit orchestration (Task 7): scoring, persistence, fallback,
safety and remediation, plus SubmitResponse schema-validity on every path.
"""

from __future__ import annotations

from shared.core.tree import load_tree
from backend.store import JsonRepository
from backend.api.submit import submit_step
from backend.api.model import StubModel
from backend.api.schema_validate import problems
from backend.api.tests.conftest import make_deps


CTX = {"studentId": "stu-1"}
PROJECT_ARGS = {
    "stepId": "steer-it-project",
    "courseId": "hoai2026-adaptive",
    "checkpointId": "steer-it",
    "kind": "prompt",
    "text": "Make the heading say Robotics Club and keep the layout the same.",
    "project": {"html": "<h1>Robotics Club</h1>", "css": "", "js": ""},
}


class _FallbackModel(StubModel):
    def validate_project(self, request):
        return {"ok": False, "fallback": {"component": "validation", "reason": "low_confidence"}}


class _BlockModel(StubModel):
    def screen_input(self, text, correlation_id):
        return {"allowed": False, "action": "blocked", "replacement": "That message was not sent. Try describing a change to your page.", "categories": ["safety"], "guardrailVersion": "v1"}


class _MissModel(StubModel):
    def validate_project(self, request):
        return {"ok": True, "source": "stub", "result": {"skillId": request["skillId"], "evidenceLevel": 0, "conditionMet": False, "confidence": 0.82, "evidence": "No clear change."}}


def _deps(model=None):
    tree = load_tree()
    repo = JsonRepository()
    return make_deps(tree, repo, model=model), repo


def _valid(res):
    return problems("services", "SubmitResponse", res)


def test_scores_a_project_step_via_validator():
    deps, _ = _deps()
    res = submit_step(deps, dict(PROJECT_ARGS), CTX)
    assert _valid(res) == []
    assert res["outcome"] == "scored"
    assert res["evidence"]["skillId"] == "build"
    assert res["evidence"]["level"] == 2
    assert res["masteryDisplay"] == 100
    assert res["source"] == "stub"


def test_persists_attempt_before_returning():
    deps, repo = _deps()
    submit_step(deps, dict(PROJECT_ARGS), CTX)
    history = repo.get_history("stu-1")
    assert len(history) == 1
    assert history[0]["stepId"] == "steer-it-project"
    assert history[0]["evidenceLevel"] == 2


def test_completes_checkpoint_at_target():
    deps, repo = _deps()
    res = submit_step(deps, dict(PROJECT_ARGS), CTX)
    assert res["completed"] is True
    assert repo.get_progress("stu-1")["steer-it"] == "completed"
    assert repo.get_evidence("stu-1")["build"] == 2


def test_writes_routing_decision_with_reason():
    deps, repo = _deps()
    res = submit_step(deps, dict(PROJECT_ARGS), CTX)
    decisions = repo.list_routing_decisions("stu-1")
    assert len(decisions) == 1
    assert decisions[0]["reason"]
    assert res["next"]["reason"] == decisions[0]["reason"]


def test_maps_multiple_choice_answer_without_model():
    deps, _ = _deps()
    res = submit_step(
        deps,
        {"stepId": "intro-web-dev", "courseId": "hoai2026-adaptive", "checkpointId": "intro", "kind": "answer", "questionId": 103, "choiceId": "b"},
        CTX,
    )
    assert _valid(res) == []
    assert res["outcome"] == "scored"
    assert res["evidence"]["skillId"] == "build"
    assert res["evidence"]["level"] == 2  # choice b -> 2 in the tree
    assert res["source"] == "rules"


def test_records_completion_only_for_panels_step():
    deps, _ = _deps()
    res = submit_step(deps, {"stepId": "steer-it-video", "courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "kind": "complete"}, CTX)
    assert _valid(res) == []
    assert res["outcome"] == "recorded"
    assert res["evidence"] is None


def test_blocks_unsafe_input_and_keeps_lesson_running():
    deps, repo = _deps(model=_BlockModel())
    res = submit_step(deps, dict(PROJECT_ARGS), CTX)
    assert _valid(res) == []
    assert res["outcome"] == "blocked"
    assert res["notice"]["code"] == "CONTENT_BLOCKED"
    history = repo.get_history("stu-1")
    assert len(history) == 1
    assert history[0]["inputText"] is None


def test_falls_back_and_writes_event_on_validator_fallback():
    deps, repo = _deps(model=_FallbackModel())
    res = submit_step(deps, dict(PROJECT_ARGS), CTX)
    assert _valid(res) == []
    assert res["outcome"] == "fallback"
    assert res["notice"]["code"] == "ADAPTIVE_UNAVAILABLE"
    events = repo.list_fallback_events("stu-1")
    assert len(events) == 1
    assert events[0]["component"] == "validation"


def test_raises_remediation_flag_after_two_consecutive_misses():
    deps, repo = _deps(model=_MissModel())
    submit_step(deps, dict(PROJECT_ARGS), CTX)
    submit_step(deps, dict(PROJECT_ARGS), CTX)
    flags = repo.list_open_flags("stu-1")
    assert len(flags) >= 1
    assert flags[0]["skillId"] == "build"
