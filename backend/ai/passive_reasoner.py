"""Passive reasoner: the model-backed stage of Passive (C-27, architecture 2.7).

Stage 1 (deterministic feature extraction + the rule baseline) lives in
`shared/core/features.py`. This is stage 2: one `invoke(task="passive")` call that reads the
features, recent attempts and the hint log, and returns a schema-validated `PassiveSignal`
(a pacing signal + hint style, NOT a checkpoint id — routing is not a model decision, C-18).

Degrade, never break (architecture 2.7):
  - cache hit (features_hash + prompt_version) -> source "cache"
  - model ok, schema-valid, confidence >= 0.6 -> source "bedrock"
  - low confidence / invalid output / model failure -> the deterministic rule signal, source
    "rules", AND the caller writes a fallback_event (component "passive")

Passive always yields a usable signal; the only `Fallback` return is if even the rule
baseline cannot run (it always can, so that path is defensive).
"""

from __future__ import annotations

import hashlib
import json
from typing import Any, Callable, Mapping, Optional

from shared.core.features import Features, rule_signal

CONFIDENCE_MIN = 0.6
PROMPT_VERSION = "passive@1"

_SIGNALS = {"speed_up", "slow_down", "redirect", "reengage", "steady"}
_HINT_STYLES = {"guiding_question", "example", "analogy", "step_by_step"}


def features_hash(features_contract: Mapping[str, Any]) -> str:
    """Stable hash of the contract Features dict, for the cache key (architecture 2.7)."""
    blob = json.dumps(features_contract, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:32]


def build_passive_prompt(
    features_contract: Mapping[str, Any],
    recent_attempts: list[Mapping[str, Any]],
    hint_log: list[Mapping[str, Any]],
) -> dict[str, Any]:
    """Build the reasoner Prompt. Features/attempts/hints are the student's data -> untrusted."""
    system = (
        "You are a pacing evaluator for a K-12 coding lesson. From the student's recent "
        "activity, choose ONE pacing signal and a hint style. You never pick the next "
        "lesson or checkpoint. Return ONLY a JSON object with keys: "
        '{"signal": one of speed_up|slow_down|redirect|reengage|steady, '
        '"hintStyle": one of guiding_question|example|analogy|step_by_step, '
        '"angleToTry": short string (optional), "reason": string <=240 chars, '
        '"evidenceRefs": array of attempt/hint ids, "confidence": number 0..1}. '
        "speed_up: mastering fast; slow_down: repeated misses; redirect: stuck on a "
        "non-essential detail; reengage: disengaged; steady: on track."
    )
    user = "Evaluate the student's pacing from the provided activity."
    untrusted = [
        "Features: " + json.dumps(features_contract, sort_keys=True),
        "Recent attempts: " + json.dumps(recent_attempts),
        "Hint log: " + json.dumps(hint_log),
    ]
    return {"system": system, "user": user, "untrusted": untrusted}


def _parse(text: str) -> Optional[dict[str, Any]]:
    if not text:
        return None
    i, j = text.find("{"), text.rfind("}")
    if i == -1 or j == -1 or j < i:
        return None
    try:
        out = json.loads(text[i : j + 1])
        return out if isinstance(out, dict) else None
    except (json.JSONDecodeError, ValueError):
        return None


def _well_formed(sig: Mapping[str, Any]) -> Optional[str]:
    """Return a reason if `sig` is not a valid PassiveSignal, else None."""
    for field in ("signal", "hintStyle", "reason", "evidenceRefs", "confidence"):
        if field not in sig:
            return f"missing {field}"
    if sig["signal"] not in _SIGNALS:
        return f"bad signal {sig['signal']!r}"
    if sig["hintStyle"] not in _HINT_STYLES:
        return f"bad hintStyle {sig['hintStyle']!r}"
    if "checkpointId" in sig or "checkpoint_id" in sig:
        return "signal must not contain a checkpoint id (C-18)"
    conf = sig["confidence"]
    if not isinstance(conf, (int, float)) or isinstance(conf, bool) or not (0 <= conf <= 1):
        return "confidence not in 0..1"
    if not isinstance(sig["reason"], str) or len(sig["reason"]) > 240:
        return "reason missing or too long"
    if not isinstance(sig["evidenceRefs"], list) or len(sig["evidenceRefs"]) > 10:
        return "evidenceRefs missing or too long"
    return None


def _normalise(sig: Mapping[str, Any]) -> dict[str, Any]:
    """Keep exactly the PassiveSignal fields (drop extras the model added)."""
    out = {
        "signal": sig["signal"],
        "hintStyle": sig["hintStyle"],
        "reason": sig["reason"][:240],
        "evidenceRefs": list(sig["evidenceRefs"])[:10],
        "confidence": sig["confidence"],
    }
    if sig.get("angleToTry"):
        out["angleToTry"] = str(sig["angleToTry"])[:120]
    return out


def reason_passive(
    features: Features,
    invoke: Callable[[Mapping[str, Any]], dict[str, Any]],
    recent_attempts: Optional[list[Mapping[str, Any]]] = None,
    hint_log: Optional[list[Mapping[str, Any]]] = None,
    cache_get: Optional[Callable[[str, str], Optional[Mapping[str, Any]]]] = None,
    correlation_id: str = "",
    max_tokens: int = 256,
) -> dict[str, Any]:
    """Produce a PassiveResult. Degrades to the rule signal on failure; never raises.

    @param features: the Features dataclass from shared.core.extract_features (used for both
                     the cache key via its contract form and the rule fallback).
    @param invoke: the model wrapper (backend.ai.invoke.invoke, partially applied).
    @param cache_get(features_hash, prompt_version) -> a stored PassiveSignal dict or None.
    """
    recent_attempts = recent_attempts or []
    hint_log = hint_log or []
    contract = features.to_contract()
    fhash = features_hash(contract)

    # 1) Cache.
    if cache_get is not None:
        cached = cache_get(fhash, PROMPT_VERSION)
        if cached is not None:
            problem = _well_formed(cached)
            if problem is None:
                return {"ok": True, "signal": _normalise(cached), "source": "cache"}
            # A corrupt cache entry is ignored, not trusted.

    # 2) Model.
    def _rule_result() -> dict[str, Any]:
        # The deterministic baseline always produces a valid signal.
        return {"ok": True, "signal": _normalise(rule_signal(features)), "source": "rules"}

    prompt = build_passive_prompt(contract, recent_attempts, hint_log)
    res = invoke({
        "task": "passive",
        "prompt": prompt,
        "opts": {
            "maxTokens": max_tokens,
            "temperature": 0,
            "correlationId": correlation_id,
            "promptVersion": PROMPT_VERSION,
        },
    })

    if not res.get("ok"):
        return _rule_result()  # model failure -> rule baseline (caller logs fallback_event)

    parsed = _parse(res["text"])
    problem = _well_formed(parsed) if parsed else "unparseable"
    if problem:
        return _rule_result()  # invalid output -> rule baseline

    if parsed["confidence"] < CONFIDENCE_MIN:
        return _rule_result()  # low confidence -> rule baseline (P-19.4 spirit)

    return {"ok": True, "signal": _normalise(parsed), "source": "bedrock"}


def is_rule_fallback(result: Mapping[str, Any]) -> bool:
    """True when the caller should write a fallback_event (component 'passive')."""
    return result.get("ok") is True and result.get("source") == "rules"
