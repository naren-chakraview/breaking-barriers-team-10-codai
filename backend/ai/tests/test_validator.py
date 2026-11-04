"""Validator LLM-judge tests (C-14, C-16). A fake `invoke` returns canned model text; every
ValidateResult is checked against the contract. Covers valid, low-confidence, invalid-JSON
with repair, invalid-twice, out-of-range level, and model-call failure.
"""

import json

import pytest

from backend.ai.validator import validate_project, build_judge_prompt, CONFIDENCE_MIN

# build: 0..2
DESCRIPTORS = {
    "0": "Vague one-line prompts, accepts whatever comes back.",
    "1": "States a basic goal, revises broadly.",
    "2": "Names a goal, a constraint and an edge case; revises precisely.",
}


def _request(skill="build"):
    return {
        "stepId": "steer-it-project",
        "skillId": skill,
        "condition": "The project changed to match a prompt with two or more specific details.",
        "prompts": ["Make the heading say Robotics Club and keep the layout."],
        "projectBefore": {"html": "<h1>Hi</h1>", "css": "", "js": ""},
        "projectAfter": {"html": "<h1>Robotics Club</h1>", "css": "h1{color:navy}", "js": ""},
        "correlationId": "corr-val-0001",
    }


def _ok_invoke(text, source="bedrock"):
    """A fake invoke returning a successful InvokeResult carrying `text`."""
    calls = []

    def fake(req):
        calls.append(req)
        return {
            "ok": True, "task": "validate", "source": source, "modelId": "m-fast",
            "promptVersion": req["opts"].get("promptVersion", "validate@1"),
            "text": text, "latencyMs": 5, "usage": {"inputTokens": 1, "outputTokens": 1},
            "guardrail": {"version": "1", "action": "none"},
            "correlationId": req["opts"]["correlationId"],
        }

    fake.calls = calls
    return fake


def _seq_invoke(*texts):
    """A fake invoke returning a different text on each successive call (for repair retry)."""
    seq = list(texts)
    calls = []

    def fake(req):
        calls.append(req)
        text = seq[min(len(calls) - 1, len(seq) - 1)]
        return {
            "ok": True, "task": "validate", "source": "bedrock", "modelId": "m-fast",
            "promptVersion": req["opts"].get("promptVersion", "validate@1"),
            "text": text, "latencyMs": 5, "usage": {"inputTokens": 1, "outputTokens": 1},
            "guardrail": {"version": "1", "action": "none"},
            "correlationId": req["opts"]["correlationId"],
        }

    fake.calls = calls
    return fake


def _run(fake):
    return validate_project(_request(), invoke=fake, evidence_descriptors=DESCRIPTORS)


# ---- prompt building ----

def test_prompt_puts_student_text_in_untrusted():
    p = build_judge_prompt(
        "cond", "build", DESCRIPTORS, ["student said make it blue"], "before", "after"
    )
    assert "rubric grader" in p["system"].lower()
    assert "cond" in p["system"]
    # Student prompt and project summaries are untrusted (wrapped in guardContent downstream).
    joined = " ".join(p["untrusted"])
    assert "student said make it blue" in joined
    # The rubric/condition is trusted (system), not duplicated into untrusted.
    assert "make it blue" not in p["system"]


# ---- valid ----

def test_valid_pass(validate_against):
    out = {"skillId": "build", "evidenceLevel": 2, "conditionMet": True,
           "confidence": 0.88, "evidence": "Named a goal and a change; project matched."}
    r = _run(_ok_invoke(json.dumps(out)))
    assert r["ok"] is True
    assert r["result"]["evidenceLevel"] == 2
    assert r["source"] == "bedrock"
    assert validate_against(r, "model", "ValidateResult") == []


def test_valid_with_surrounding_prose_is_parsed(validate_against):
    out = {"skillId": "build", "evidenceLevel": 1, "conditionMet": False,
           "confidence": 0.7, "evidence": "Basic goal only."}
    r = _run(_ok_invoke("Sure! Here you go:\n" + json.dumps(out) + "\nHope that helps."))
    assert r["ok"] is True
    assert r["result"]["evidenceLevel"] == 1
    assert validate_against(r, "model", "ValidateResult") == []


def test_extra_model_keys_are_dropped():
    out = {"skillId": "build", "evidenceLevel": 2, "conditionMet": True, "confidence": 0.9,
           "evidence": "ok", "rationale": "model added this", "debug": 123}
    r = _run(_ok_invoke(json.dumps(out)))
    assert set(r["result"].keys()) == {"skillId", "evidenceLevel", "conditionMet", "confidence", "evidence"}


# ---- fallback paths (C-16) ----

def test_low_confidence_falls_back(validate_against):
    out = {"skillId": "build", "evidenceLevel": 1, "conditionMet": True,
           "confidence": 0.41, "evidence": "unsure"}
    r = _run(_ok_invoke(json.dumps(out)))
    assert r["ok"] is False
    assert r["fallback"]["component"] == "validation"
    assert "low confidence" in r["fallback"]["reason"]
    assert validate_against(r, "model", "ValidateResult") == []


def test_out_of_range_level_falls_back():
    out = {"skillId": "build", "evidenceLevel": 5, "conditionMet": True,
           "confidence": 0.9, "evidence": "above max"}
    r = _run(_ok_invoke(json.dumps(out)))
    assert r["ok"] is False
    assert "out of range" in r["fallback"]["reason"]


def test_invalid_json_then_repair_succeeds(validate_against):
    good = {"skillId": "build", "evidenceLevel": 2, "conditionMet": True,
            "confidence": 0.9, "evidence": "matched"}
    fake = _seq_invoke("I cannot produce JSON.", json.dumps(good))
    r = validate_project(_request(), invoke=fake, evidence_descriptors=DESCRIPTORS)
    assert r["ok"] is True
    assert len(fake.calls) == 2                       # one repair retry happened
    assert fake.calls[1]["opts"]["promptVersion"] == "validate@1-repair"
    assert validate_against(r, "model", "ValidateResult") == []


def test_invalid_json_twice_falls_back():
    fake = _seq_invoke("nope", "still not json")
    r = validate_project(_request(), invoke=fake, evidence_descriptors=DESCRIPTORS)
    assert r["ok"] is False
    assert len(fake.calls) == 2
    assert "after repair" in r["fallback"]["reason"]


def test_model_call_failure_falls_back():
    def fake(req):
        return {"ok": False, "task": "validate",
                "error": {"code": "TIMEOUT", "message": "x"}, "correlationId": "c"}
    r = validate_project(_request(), invoke=fake, evidence_descriptors=DESCRIPTORS)
    assert r["ok"] is False
    assert "model call failed" in r["fallback"]["reason"]


def test_never_raises_on_garbage():
    r = _run(_ok_invoke(""))  # empty text
    assert r["ok"] is False   # falls back, does not raise


# ---- confidence boundary ----

def test_confidence_exactly_at_gate_passes():
    out = {"skillId": "build", "evidenceLevel": 1, "conditionMet": True,
           "confidence": CONFIDENCE_MIN, "evidence": "ok"}
    r = _run(_ok_invoke(json.dumps(out)))
    assert r["ok"] is True
