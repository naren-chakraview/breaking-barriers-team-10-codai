"""Project-step validator: the LLM judge (C-14, C-16, P-19).

Scores a student's project submission against the step's condition and the skill's evidence
descriptors, producing a `ValidatorOutput` (skillId, evidenceLevel, conditionMet, confidence,
evidence). Deterministic multiple-choice scoring (C-13) is NOT here — that's a direct map in
the submit flow with no model call. This module is only the model-judged project steps.

Flow (C-16):
  build prompt -> invoke(task="validate") -> parse JSON as ValidatorOutput
    - invalid JSON: one repair retry, then fallback
    - evidenceLevel outside the skill's 0..max: fallback
    - confidence < 0.6: fallback (unreliable, P-19.4)
    - otherwise: ok + result

Returns a `ValidateResult` (ok+result | fallback). Never raises — a failure becomes a
fallback the caller acts on (writes fallback_event, takes the non-adaptive path, C-21/C-22).
"""

from __future__ import annotations

import json
from typing import Any, Callable, Mapping, Optional, Sequence

CONFIDENCE_MIN = 0.6  # C-16 / P-19.4

# The contract caps evidence at 240 (C-16); the success path truncates to it. This is a
# much larger sanity ceiling: past it the output is garbage (the model dumped the project),
# which is a real validity failure rather than a chatty-but-usable judgment.
_EVIDENCE_HARD_MAX = 4000

_FALLBACK_COMPONENT = "validation"


def _fallback(reason: str) -> dict[str, Any]:
    return {"ok": False, "fallback": {"component": _FALLBACK_COMPONENT, "reason": reason}}


def build_judge_prompt(
    condition: str,
    skill_id: str,
    evidence_descriptors: Mapping[str, str],
    prompts: Sequence[str],
    project_before_summary: str,
    project_after_summary: str,
) -> dict[str, Any]:
    """Build the judge Prompt (model.schema.json#/$defs/Prompt). Pure.

    The rubric (condition + evidence descriptors) is trusted and goes in `system`. The
    student's prompts and the project summaries are untrusted and go in `untrusted` so the
    safety layer wraps them in guardContent (architecture 2.3, C-25). The model is told to
    return only the JSON object.
    """
    rubric_lines = [f"  level {lvl}: {desc}" for lvl, desc in sorted(evidence_descriptors.items())]
    max_level = max(int(lvl) for lvl in evidence_descriptors)
    system = (
        "You are a strict rubric grader for a K-12 coding lesson. Judge the student's work "
        f"on the skill '{skill_id}'.\n"
        f"Condition to meet: {condition}\n"
        "Evidence levels:\n" + "\n".join(rubric_lines) + "\n"
        "Return ONLY a JSON object with exactly these keys and no prose:\n"
        '{"skillId": string, "evidenceLevel": integer 0..' + str(max_level) + ", "
        '"conditionMet": boolean, "confidence": number 0..1, "evidence": string <=240 chars}\n'
        "Base the level on the evidence descriptors. Set confidence to how sure you are. "
        "Keep \"evidence\" to one short sentence, well under 240 characters."
    )
    user = "Grade the submission described in the provided material."
    untrusted: list[str] = []
    for i, p in enumerate(prompts, 1):
        untrusted.append(f"Student prompt {i}: {p}")
    untrusted.append(f"Project before: {project_before_summary}")
    untrusted.append(f"Project after: {project_after_summary}")
    return {"system": system, "user": user, "untrusted": untrusted}


def _summarize(project: Optional[Mapping[str, Any]]) -> str:
    """A short, structural summary of a project. Not the raw code — keeps the prompt small."""
    if not project:
        return "(empty)"
    html = project.get("html", "") or ""
    css = project.get("css", "") or ""
    js = project.get("js", "") or ""
    return f"html {len(html)} chars, css {len(css)} chars, js {len(js)} chars"


def _parse_output(text: str) -> Optional[dict[str, Any]]:
    """Extract the first JSON object from the model text. None if unparseable."""
    if not text:
        return None
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        parsed = json.loads(text[start : end + 1])
        return parsed if isinstance(parsed, dict) else None
    except (json.JSONDecodeError, ValueError):
        return None


def _well_formed(output: Mapping[str, Any], skill_id: str, max_level: int) -> Optional[str]:
    """Return a reason string if the output is NOT a valid ValidatorOutput, else None."""
    required = {"skillId", "evidenceLevel", "conditionMet", "confidence", "evidence"}
    missing = required - set(output)
    if missing:
        return f"missing fields: {sorted(missing)}"
    if not isinstance(output["evidenceLevel"], int) or isinstance(output["evidenceLevel"], bool):
        return "evidenceLevel not an integer"
    if not (0 <= output["evidenceLevel"] <= max_level):
        return f"evidenceLevel {output['evidenceLevel']} out of range 0..{max_level}"
    if not isinstance(output["conditionMet"], bool):
        return "conditionMet not a boolean"
    conf = output["confidence"]
    if not isinstance(conf, (int, float)) or isinstance(conf, bool) or not (0 <= conf <= 1):
        return "confidence not in 0..1"
    # Evidence must be a string. Length is NOT a validity gate: the contract caps it at 240
    # (C-16) and the success path truncates to 240, so a slightly chatty justification is
    # trimmed, not thrown away. Only a pathological blob (e.g. the model echoed the whole
    # project) is rejected, which also guards the repair path.
    if not isinstance(output["evidence"], str):
        return "evidence missing"
    if len(output["evidence"]) > _EVIDENCE_HARD_MAX:
        return "evidence absurdly long"
    return None


def validate_project(
    request: Mapping[str, Any],
    invoke: Callable[[Mapping[str, Any]], dict[str, Any]],
    evidence_descriptors: Mapping[str, str],
    max_tokens: int = 512,
) -> dict[str, Any]:
    """Judge a project step. Returns a ValidateResult; never raises (C-14, C-16).

    @param request: a ValidateRequest (stepId, skillId, condition, prompts, projects, correlationId).
    @param invoke: the model wrapper (backend.ai.invoke.invoke, partially applied with client/
                   config). Called with an InvokeRequest; returns an InvokeResult.
    @param evidence_descriptors: {level: descriptor} for the skill, from the tree (C-14).
    """
    skill_id = request["skillId"]
    correlation_id = request["correlationId"]
    max_level = max(int(lvl) for lvl in evidence_descriptors)

    prompt = build_judge_prompt(
        condition=request["condition"],
        skill_id=skill_id,
        evidence_descriptors=evidence_descriptors,
        prompts=request["prompts"],
        project_before_summary=_summarize(request.get("projectBefore")),
        project_after_summary=_summarize(request["projectAfter"]),
    )

    def _call(attempt_prompt: Mapping[str, Any], prompt_version: str) -> dict[str, Any]:
        return invoke({
            "task": "validate",
            "prompt": attempt_prompt,
            "opts": {
                "maxTokens": max_tokens,
                "temperature": 0,
                "correlationId": correlation_id,
                "promptVersion": prompt_version,
            },
        })

    # First attempt.
    res = _call(prompt, "validate@1")
    if not res.get("ok"):
        # The model call itself failed (timeout/throttle/etc.) — fall back (C-22).
        err = res.get("error", {}).get("code", "model_error")
        return _fallback(f"model call failed: {err}")

    output = _parse_output(res["text"])
    problem = _well_formed(output, skill_id, max_level) if output else "unparseable JSON"

    if problem:
        # One repair retry (C-16): ask again, nudging for valid JSON only.
        repair_prompt = dict(prompt)
        repair_prompt["user"] = (
            "Your previous reply was not valid. Return ONLY the JSON object with the required "
            "keys and nothing else. Keep the \"evidence\" value to one short sentence, "
            "well under 240 characters."
        )
        res2 = _call(repair_prompt, "validate@1-repair")
        if not res2.get("ok"):
            return _fallback("model call failed on repair retry")
        output = _parse_output(res2["text"])
        problem = _well_formed(output, skill_id, max_level) if output else "unparseable JSON after repair"
        if problem:
            return _fallback(f"invalid validator output: {problem}")
        source = res2["source"]
    else:
        source = res["source"]

    # Confidence gate (C-16, P-19.4).
    if output["confidence"] < CONFIDENCE_MIN:
        return _fallback(f"low confidence {output['confidence']:.2f} < {CONFIDENCE_MIN}")

    # Normalise to exactly the ValidatorOutput fields (drop any extras the model added).
    result = {
        "skillId": output["skillId"],
        "evidenceLevel": output["evidenceLevel"],
        "conditionMet": output["conditionMet"],
        "confidence": output["confidence"],
        "evidence": output["evidence"][:240],
    }
    return {"ok": True, "result": result, "source": source}
