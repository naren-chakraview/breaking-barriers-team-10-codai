"""Passive reasoner tests (C-27, architecture 2.7). A fake `invoke` drives the model path;
the rule baseline (shared.core) is the degrade target. Every PassiveResult is checked against
the contract, and the model can never leak a checkpoint id (C-18).
"""

import json
from pathlib import Path

import pytest

from shared.core import load_tree, extract_features
from backend.ai.passive_reasoner import (
    reason_passive,
    build_passive_prompt,
    features_hash,
    is_rule_fallback,
    PROMPT_VERSION,
)

PERSONA_DIR = Path(__file__).resolve().parents[3] / "shared" / "contracts" / "fixtures" / "personas"
TARGETS = {"build": 2, "language": 2, "debug": 2}


@pytest.fixture(scope="module")
def tree():
    return load_tree()


def _features(tree, persona_name):
    p = json.loads((PERSONA_DIR / f"{persona_name}.json").read_text())
    return extract_features(tree, p["attempts"], p.get("hints", []), target_by_skill=TARGETS), p


def _ok_invoke(signal_dict):
    def fake(req):
        return {
            "ok": True, "task": "passive", "source": "bedrock", "modelId": "m-fast",
            "promptVersion": req["opts"].get("promptVersion", PROMPT_VERSION),
            "text": json.dumps(signal_dict), "latencyMs": 4,
            "usage": {"inputTokens": 1, "outputTokens": 1},
            "guardrail": {"version": "1", "action": "none"},
            "correlationId": req["opts"]["correlationId"],
        }
    return fake


def _good_signal(signal="steady", conf=0.8):
    return {"signal": signal, "hintStyle": "guiding_question", "reason": "on track",
            "evidenceRefs": [], "confidence": conf}


# ---- cache ----

def test_cache_hit_short_circuits(tree, validate_against):
    f, _ = _features(tree, "slow")
    cached = _good_signal("slow_down", 0.9)
    calls = []

    def invoke(req):
        calls.append(req)
        return {"ok": False, "task": "passive", "error": {"code": "TIMEOUT", "message": "x"},
                "correlationId": "c"}

    r = reason_passive(f, invoke=invoke, cache_get=lambda h, pv: cached, correlation_id="c-1")
    assert r["ok"] is True
    assert r["source"] == "cache"
    assert r["signal"]["signal"] == "slow_down"
    assert calls == []                       # never called the model
    assert validate_against(r, "model", "PassiveResult") == []


def test_cache_key_is_stable():
    a = features_hash({"x": 1, "y": [1, 2]})
    b = features_hash({"y": [1, 2], "x": 1})  # key order must not matter
    assert a == b


# ---- model success ----

def test_model_success_is_bedrock(tree, validate_against):
    f, _ = _features(tree, "quick")
    r = reason_passive(f, invoke=_ok_invoke(_good_signal("speed_up", 0.85)), correlation_id="c-2")
    assert r["ok"] is True
    assert r["source"] == "bedrock"
    assert r["signal"]["signal"] == "speed_up"
    assert validate_against(r, "model", "PassiveResult") == []


def test_extra_model_keys_dropped(tree):
    f, _ = _features(tree, "quick")
    sig = _good_signal("steady", 0.8)
    sig["debug"] = "model noise"
    r = reason_passive(f, invoke=_ok_invoke(sig), correlation_id="c")
    assert "debug" not in r["signal"]


# ---- degrade to rules ----

def test_low_confidence_degrades_to_rules(tree, validate_against):
    f, _ = _features(tree, "slow")
    r = reason_passive(f, invoke=_ok_invoke(_good_signal("steady", 0.4)), correlation_id="c")
    assert r["ok"] is True
    assert r["source"] == "rules"
    assert is_rule_fallback(r)               # caller writes fallback_event (passive)
    # The rule baseline for the slow persona is slow_down.
    assert r["signal"]["signal"] == "slow_down"
    assert validate_against(r, "model", "PassiveResult") == []


def test_invalid_json_degrades_to_rules(tree):
    f, _ = _features(tree, "slow")
    def invoke(req):
        return {"ok": True, "task": "passive", "source": "bedrock", "modelId": "m",
                "promptVersion": PROMPT_VERSION, "text": "not json", "latencyMs": 1,
                "usage": {"inputTokens": 1, "outputTokens": 1},
                "guardrail": {"version": "1", "action": "none"}, "correlationId": "c"}
    r = reason_passive(f, invoke=invoke, correlation_id="c")
    assert r["source"] == "rules"


def test_model_failure_degrades_to_rules(tree):
    f, _ = _features(tree, "distracted-detail")
    def invoke(req):
        return {"ok": False, "task": "passive", "error": {"code": "RATE_LIMITED", "message": "x"},
                "correlationId": "c"}
    r = reason_passive(f, invoke=invoke, correlation_id="c")
    assert r["source"] == "rules"
    assert r["signal"]["signal"] == "redirect"   # the distracted-detail rule signal


def test_checkpoint_id_in_model_output_is_rejected(tree):
    # C-18: the model must not pick a checkpoint. A signal carrying one is treated as invalid
    # and degrades to rules.
    f, _ = _features(tree, "quick")
    sig = _good_signal("speed_up", 0.9)
    sig["checkpointId"] = "keep-or-redirect"
    r = reason_passive(f, invoke=_ok_invoke(sig), correlation_id="c")
    assert r["source"] == "rules"              # rejected, not trusted
    assert "checkpointId" not in r["signal"]


def test_result_never_contains_checkpoint_id(tree):
    f, _ = _features(tree, "quick")
    r = reason_passive(f, invoke=_ok_invoke(_good_signal("speed_up", 0.9)), correlation_id="c")
    assert "checkpointId" not in json.dumps(r)


# ---- prompt ----

def test_prompt_puts_student_data_in_untrusted(tree):
    f, _ = _features(tree, "slow")
    p = build_passive_prompt(f.to_contract(), [], [])
    assert "pacing evaluator" in p["system"].lower()
    assert "never pick the next" in p["system"].lower()
    assert any("Features:" in u for u in p["untrusted"])
