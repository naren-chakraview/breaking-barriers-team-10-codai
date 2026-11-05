"""Persona-replay integration tests.

The persona fixtures (shared/contracts/fixtures/personas/*.json) encode a realistic multi-
attempt history and the end-state the adaptive engine should reach (`expected`). Replaying
them exercises the real `shared.core` routing and the Passive rule baseline together with the
store, against the real skill tree — the strongest integration signal available without AWS.

These assert the deterministic parts the engine owns today (routing proposal after intro, the
rule signal, and the remediation flag from repeated misses). The Haiku reasoner (Task 8b) and
the exact hint-angle wording are Track B/C/G and out of scope here.

RESOLVED (issue #24): the three routing discrepancies this suite originally surfaced are
fixed on main. #26 fixed the quick None-routing bug (proposal selection dropped a valid
available list to None); #27 switched C-19.3 to stay-on-current and corrected the
distracted-detail persona (capped its steer-it-project evidence so steer-it no longer tests
out). All four personas now route to their `expected.nextAfterIntro`, so the routing test
asserts directly rather than xfailing.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

import shared.core as core
from shared.core.tree import load_tree
from shared.core.evidence import reduce_evidence
from shared.core.features import extract_features, rule_signal
from backend.store import JsonRepository
from backend.api.schema_validate import problems

_PERSONA_DIR = Path(__file__).resolve().parents[3] / "shared" / "contracts" / "fixtures" / "personas"
_PERSONAS = ["quick", "slow", "distracted-detail", "distracted-inattentive"]

# Per-skill targets used by extract_features to decide a "miss" (steer-it build target is 2).
_TARGETS = {"build": 2, "language": 2, "debug": 2}


def _load(name):
    return json.loads((_PERSONA_DIR / f"{name}.json").read_text())


_TREE = load_tree()


def _diagnostic_skill_and_level(step, input_text):
    """A diagnostic MCQ attempt encodes `q<id>:<choice>` in inputText; each question measures
    its own skill (103=build, 104=language, 105=debug). Resolve the skill and the level."""
    if not input_text or not input_text.startswith("q"):
        return None, None
    try:
        q_part, choice = input_text[1:].split(":")
        question_id = int(q_part)
    except ValueError:
        return None, None
    for q in step.get("questions", []):
        if q.get("id") == question_id and q.get("measures"):
            m = q["measures"]
            return m["skillId"], m["evidenceLevels"].get(choice, 0)
    return None, None


def _skill_for_step(step_id):
    """The skill a non-diagnostic step measures: validation.measures.skillId, else the
    checkpoint's first skillId."""
    for cp in _TREE.checkpoints:
        for step in cp["steps"]:
            if step["id"] == step_id:
                measured = (step.get("validation") or {}).get("measures", {}).get("skillId")
                if measured:
                    return measured
                skills = cp.get("skillIds", [])
                return skills[0] if skills else None
    return None


def _step_obj(step_id):
    for cp in _TREE.checkpoints:
        for step in cp["steps"]:
            if step["id"] == step_id:
                return step
    return None


def _seed_repo(persona) -> JsonRepository:
    """Load a persona's attempts into a fresh store, as the backend would have persisted them.

    Diagnostic MCQ attempts measure a per-question skill; project attempts measure the
    checkpoint's skill. Evidence is appended with the right skill so getEvidence reflects the
    full diagnostic (build/language/debug), which is what routing tests out against."""
    repo = JsonRepository()
    repo.put_student(persona["student"])
    for a in persona["attempts"]:
        repo.save_attempt(a)
        if a.get("evidenceLevel") is None:
            continue
        step = _step_obj(a["stepId"])
        skill, level = (None, None)
        if step and step.get("kind") == "questions":
            skill, level = _diagnostic_skill_and_level(step, a.get("inputText"))
        if skill is None:
            skill, level = _skill_for_step(a["stepId"]), a["evidenceLevel"]
        if skill:
            repo.append_evidence({"studentId": a["studentId"], "skillId": skill, "level": level, "sourceStepId": a["stepId"], "createdAt": a["createdAt"]})
    for h in persona.get("hints", []):
        repo.write_hint_event(h)
    return repo


def _progress_after_intro(persona, evidence):
    """The progress map the personas assume: the diagnostics (intro + skill-check) completed,
    plus any skippable checkpoint whose target the diagnostic already meets marked tested_out
    (C-19.2). Taught checkpoints require skill-check in the authoritative curriculum."""
    progress = {"intro": "completed", "skill-check": "completed"}
    for cid in persona["expected"].get("testedOut", []):
        progress[cid] = "tested_out"
    return progress


@pytest.mark.parametrize("name", _PERSONAS)
def test_persona_fixture_is_well_formed(name):
    persona = _load(name)
    assert persona["student"]["studentId"].startswith("stu-")
    assert "expected" in persona
    # Every attempt references a real step in the tree.
    for a in persona["attempts"]:
        assert _step_obj(a["stepId"]) is not None, a["stepId"]


@pytest.mark.parametrize("name", _PERSONAS)
def test_persona_routing_after_intro(name):
    """With intro complete (and the tested-out skippables), route() proposes the persona's
    expected next checkpoint — exercising the real evidence + routing path against the
    persona's history.

    The three cross-track discrepancies originally filed in issue #24 are now resolved on
    main (#26 fixed the quick None-routing bug; #27 switched C-19.3 to stay-on-current and
    corrected the distracted-detail persona), so all four personas assert directly."""
    persona = _load(name)
    repo = _seed_repo(persona)
    evidence = repo.get_evidence(persona["student"]["studentId"])
    progress = _progress_after_intro(persona, evidence)

    result = core.route(_TREE, progress, evidence, persona.get("teacherInput", {"mode": "auto"}))
    assert result.reason  # routing is always explainable (C-19.5)

    expected_next = persona["expected"].get("nextAfterIntro")
    if not expected_next:
        return
    assert result.checkpoint_id == expected_next, (
        f"{name}: expected next {expected_next!r}, got {result.checkpoint_id!r} "
        f"(evidence={evidence}, progress={progress}, reason={result.reason!r})"
    )


@pytest.mark.parametrize("name", _PERSONAS)
def test_persona_rule_signal(name):
    """The deterministic Passive rule signal matches the persona's expected signal."""
    persona = _load(name)
    repo = _seed_repo(persona)
    sid = persona["student"]["studentId"]

    features = extract_features(_TREE, repo.get_history(sid), repo.list_hint_events(sid), target_by_skill=_TARGETS)
    signal = rule_signal(features)

    assert problems("model", "PassiveSignal", signal) == [], f"{name}: signal not schema-valid: {signal}"

    expected_signal = persona["expected"].get("signal")
    if expected_signal:
        assert signal["signal"] == expected_signal, (
            f"{name}: expected signal {expected_signal!r}, got {signal['signal']!r} "
            f"(features per-skill={ {k: vars(v) for k, v in features.per_skill.items()} })"
        )


def test_slow_persona_accumulates_a_remediation_flag_in_full_flow():
    """Replaying the slow persona's repeated misses through the submit flow raises a flag (C-10)."""
    from backend.api.app import build_app

    persona = _load("slow")
    repo = JsonRepository()
    repo.put_student(persona["student"])

    # A model whose validator mirrors each attempt's recorded evidence level, so the submit
    # flow reproduces the persona's scoring deterministically.
    class _ScriptedModel:
        def __init__(self, levels):
            self._levels = iter(levels)

        def screen_input(self, text, correlation_id):
            return {"allowed": True, "action": "none", "replacement": None, "categories": [], "guardrailVersion": "v1"}

        def screen_output(self, text, correlation_id):
            return {"allowed": True, "action": "none", "replacement": None, "categories": [], "guardrailVersion": "v1"}

        def validate_project(self, request):
            level = next(self._levels, 0)
            return {"ok": True, "source": "stub", "result": {"skillId": request["skillId"], "evidenceLevel": level, "conditionMet": level >= 2, "confidence": 0.85, "evidence": "scripted"}}

        def invoke(self, request):
            return {"ok": True, "task": request["task"], "source": "stub", "modelId": "m", "promptVersion": "v", "text": "ok", "latencyMs": 1, "usage": {"inputTokens": 1, "outputTokens": 1}, "guardrail": {"version": "v1", "action": "none"}, "correlationId": request["opts"]["correlationId"]}

    project_levels = [a["evidenceLevel"] for a in persona["attempts"] if a["stepId"] == "steer-it-project"]
    app = build_app(env={"STORE_MODE": "json", "MODEL_MODE": "stub"}, repo=repo, model=_ScriptedModel(project_levels))
    h = {"authorization": "Bearer demo", "x-user-id": "stu-slow", "x-role": "student"}

    last = None
    for _ in project_levels:
        last = app["router"]({"method": "POST", "path": "/steps/steer-it-project/submit", "headers": h, "body": {"courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "kind": "prompt", "text": "make it better", "project": {"html": "", "css": "", "js": ""}}})
        assert problems("services", "SubmitResponse", last["body"]) == []

    flags = repo.list_open_flags("stu-slow")
    assert any(f["skillId"] == "build" for f in flags), f"expected a build remediation flag, got {flags}"
    # The persona expects it to reach high severity after enough misses.
    assert any(f["severity"] == "high" for f in flags), f"expected a high-severity flag, got {flags}"
