"""Passive stage wiring for the submit flow (Track D; C-27, architecture 2.7).

Stage 1 (features + rule baseline) is `shared.core.features`; stage 2 (the model reasoner
with cache/degrade) is `backend.ai.passive_reasoner`. This module is the glue that runs
them inside `submit_step`: build features from the student's cumulative attempts + hints,
produce a `PassiveSignal`, persist it (`passive_signal`), log a `fallback_event` when the
signal degraded to the deterministic rule baseline (C-22), and hand the student-safe part
(`{signal, hintStyle, reason}`) back for the `SubmitResponse.passive` field.

Design points:
  - Passive NEVER blocks or breaks a submit (C-24). Any failure here is swallowed and the
    caller simply gets `None` for `passive` — the student's work and routing are untouched.
  - The model reasoner (`reason_passive`) is NOT on the `ModelPort` protocol (Passive is
    produced out-of-band, not request/response). So we call it only when the injected port
    exposes it (the Bedrock port does); under MODEL_MODE=stub we run the pure rule baseline
    directly, so the demo still shows a real, explainable signal with no AWS.
  - Routing is never a Passive decision (C-18): the signal is a pacing hint only.
"""

from __future__ import annotations

from typing import Any, Mapping, Optional

from shared.core import extract_features, rule_signal
from shared.core.tree import Tree

from backend.ai.passive_reasoner import PROMPT_VERSION, features_hash

from .util import new_record_id, now_iso


def _targets_by_skill(tree: Tree) -> dict[str, int]:
    """A skill -> target evidence level map, from every checkpoint's targetEvidenceLevels.

    Used to decide what counts as a "miss" in feature extraction. The default when a skill
    has no explicit target is 1 (C-12); extract_features applies that default itself, so we
    only pass the explicit ones here, taking the max target seen for a skill.
    """
    targets: dict[str, int] = {}
    for cp in tree.checkpoints:
        for skill_id, level in (cp.get("targetEvidenceLevels") or {}).items():
            targets[skill_id] = max(targets.get(skill_id, 0), int(level))
    return targets


def _safe_signal(signal: Mapping[str, Any]) -> dict[str, Any]:
    """The student-safe trio the SubmitResponse exposes (services.schema SubmitResponse.passive)."""
    return {
        "signal": signal["signal"],
        "hintStyle": signal["hintStyle"],
        "reason": signal["reason"],
    }


def _model_id_for(source: str, model: Any) -> str:
    """The modelId to persist. 'rules' for the baseline; otherwise the configured passive
    model id if the port exposes one, else the source tag."""
    if source == "rules":
        return "rules"
    ids = getattr(model, "_model_ids", None)
    if isinstance(ids, Mapping) and ids.get("fast"):
        return str(ids["fast"])  # verify/validate/passive run on the fast tier (C-27)
    return source


def run_passive(
    deps: "Any",
    student_id: str,
    correlation_id: str,
) -> Optional[dict[str, Any]]:
    """Produce, persist and return the student-safe Passive signal. Never raises.

    Returns `{signal, hintStyle, reason}` for SubmitResponse.passive, or None if Passive
    could not run (in which case the submit response simply carries passive=None).
    """
    try:
        return _run(deps, student_id, correlation_id)
    except Exception:
        # Passive is best-effort: a failure here must not affect the submit outcome (C-24).
        return None


def _run(deps: "Any", student_id: str, correlation_id: str) -> Optional[dict[str, Any]]:
    tree: Tree = deps.tree
    repo = deps.repo
    model = deps.model

    attempts = repo.get_history(student_id)
    if not attempts:
        return None  # nothing to reason about yet
    hints = repo.list_hint_events(student_id)

    features = extract_features(
        tree,
        attempts,
        hints,
        cohort_median_seconds_per_step=None,  # no cohort aggregate in the store (MVP)
        target_by_skill=_targets_by_skill(tree),
    )

    source = "rules"
    reason_passive = getattr(model, "reason_passive", None)
    if callable(reason_passive):
        # The Bedrock port is available: reason with cache + model, degrade to rules inside.
        def cache_get(fhash: str, prompt_version: str):
            return repo.get_cached_passive_signal(student_id, fhash, prompt_version)

        result = reason_passive(
            features,
            recent_attempts=attempts[-5:],
            hint_log=hints[-5:],
            cache_get=cache_get,
            correlation_id=correlation_id,
        )
        if not result.get("ok"):
            return None  # defensive: reason_passive only fails if even rules cannot run
        signal = result["signal"]
        source = result.get("source", "rules")
    else:
        # MODEL_MODE=stub (or any port without passive): the deterministic baseline.
        signal = rule_signal(features)

    # Persist the full signal (passive_signal row shape; see store contract).
    fhash = features_hash(features.to_contract())
    row = {
        "signalId": new_record_id("sig"),
        "studentId": student_id,
        "signal": signal["signal"],
        "hintStyle": signal["hintStyle"],
        "angleToTry": signal.get("angleToTry"),
        "reason": signal["reason"],
        "evidenceRefs": list(signal.get("evidenceRefs", [])),
        "confidence": float(signal.get("confidence", 0.0)),
        "featuresHash": fhash,
        "modelId": _model_id_for(source, model),
        "promptVersion": PROMPT_VERSION,
        "createdAt": now_iso(),
    }
    try:
        repo.write_passive_signal(row)
    except Exception:
        # If persistence fails we still return the signal for this response — the student's
        # flow is unaffected; only the teacher's historical view misses this row.
        return _safe_signal(signal)

    # A rule-baseline signal when the model path was expected is a Passive fallback (C-22).
    if source == "rules" and callable(reason_passive):
        try:
            repo.write_fallback_event({
                "studentId": student_id,
                "stepId": None,
                "component": "passive",
                "error": "passive_degraded_to_rules",
                "createdAt": now_iso(),
            })
        except Exception:
            pass  # best-effort

    return _safe_signal(signal)
