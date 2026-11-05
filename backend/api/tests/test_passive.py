"""Behavioral tests for the Passive stage in the submit flow (Track D, C-27, C-22, C-24).

Covers: the signal is produced, persisted and surfaced on a scored/recorded submit; the
stub path uses the deterministic rule baseline; a port whose reasoner degrades to rules
writes a fallback_event (component 'passive'); and Passive never breaks a submit.
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


def _deps(model=None, repo=None):
    tree = load_tree()
    repo = repo or JsonRepository()
    return make_deps(tree, repo, model=model), repo


def _valid(res):
    return problems("services", "SubmitResponse", res)


def test_scored_submit_surfaces_and_persists_a_passive_signal():
    deps, repo = _deps()
    res = submit_step(deps, dict(PROJECT_ARGS), CTX)

    # Response carries the student-safe trio (and only that).
    assert _valid(res) == []
    assert res["passive"] is not None
    assert set(res["passive"]) == {"signal", "hintStyle", "reason"}
    assert res["passive"]["signal"] in {"speed_up", "slow_down", "redirect", "reengage", "steady"}

    # A full passive_signal row is persisted and is the latest for the student.
    latest = repo.get_latest_passive_signal("stu-1")
    assert latest is not None
    assert latest["signal"] == res["passive"]["signal"]
    assert latest["promptVersion"] == "passive@1"
    # featuresHash matches the schema's ^[a-f0-9]{8,64}$.
    assert latest["featuresHash"] and all(c in "0123456789abcdef" for c in latest["featuresHash"])


def test_stub_path_uses_the_rule_baseline():
    # StubModel has no reason_passive, so the deterministic baseline runs: modelId == 'rules'.
    deps, repo = _deps()
    submit_step(deps, dict(PROJECT_ARGS), CTX)
    latest = repo.get_latest_passive_signal("stu-1")
    assert latest["modelId"] == "rules"


def test_no_passive_fallback_event_on_the_stub_path():
    # Rules on the stub path is the normal, expected signal — NOT a degraded model call,
    # so it must not write a passive fallback_event (that would be a false reliability alarm).
    deps, repo = _deps()
    submit_step(deps, dict(PROJECT_ARGS), CTX)
    passive_events = [e for e in repo.list_fallback_events("stu-1") if e["component"] == "passive"]
    assert passive_events == []


class _DegradingPassiveModel(StubModel):
    """A port that exposes reason_passive but always degrades to the rule baseline."""

    def reason_passive(self, features, recent_attempts=None, hint_log=None, cache_get=None, correlation_id=""):
        from shared.core import rule_signal
        sig = rule_signal(features)
        return {"ok": True, "signal": sig, "source": "rules"}


def test_degraded_reasoner_writes_a_passive_fallback_event():
    deps, repo = _deps(model=_DegradingPassiveModel())
    res = submit_step(deps, dict(PROJECT_ARGS), CTX)
    assert _valid(res) == []
    assert res["passive"] is not None
    passive_events = [e for e in repo.list_fallback_events("stu-1") if e["component"] == "passive"]
    assert len(passive_events) == 1
    assert passive_events[0]["error"] == "passive_degraded_to_rules"
    assert passive_events[0]["stepId"] is None


class _ExplodingPassiveRepo(JsonRepository):
    def write_passive_signal(self, signal):
        raise RuntimeError("store down")


def test_passive_never_breaks_the_submit_when_persistence_fails():
    # Even if writing the signal throws, the submit still succeeds and stays schema-valid.
    deps, repo = _deps(repo=_ExplodingPassiveRepo())
    res = submit_step(deps, dict(PROJECT_ARGS), CTX)
    assert _valid(res) == []
    assert res["outcome"] == "scored"
    # The signal could not be stored, but the response still carries the safe trio.
    assert res["passive"] is not None


def test_recorded_step_also_carries_a_passive_signal():
    deps, _ = _deps()
    # First score a project step so there is history to reason about, then a completion-only step.
    submit_step(deps, dict(PROJECT_ARGS), CTX)
    res = submit_step(
        deps,
        {"stepId": "steer-it-video", "courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "kind": "complete"},
        CTX,
    )
    assert _valid(res) == []
    assert res["outcome"] == "recorded"
    assert res["passive"] is not None
