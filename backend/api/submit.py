"""Submit orchestration: POST /steps/{step_id}/submit (Task 7, C-24, C-29).

Flow, in order:
  1. Look up the step; an unknown step records nothing.
  2. Screen student free text server-side before any model call (C-25). Blocked -> a
     CONTENT_BLOCKED response; the lesson continues.
  3. Score: a choice->level answer maps deterministically (C-13); a project step uses the
     validator (C-14); everything else is completion only (C-15). A validator fallback
     yields an ADAPTIVE_UNAVAILABLE response (C-21, C-22).
  4. Persist the attempt (C-24), apply monotonic evidence (C-10), update completion (C-12),
     raise remediation flags (C-10).
  5. Route with the pure shared.core.route and persist a routing_decision with a reason (C-19).
  6. Assemble a SubmitResponse that satisfies the outcome<->field conditionals.

All I/O goes through the injected core, model and repo. The student id comes from the request
context (P-1.4 headers), never the body.
"""

from __future__ import annotations

from typing import Any, Mapping, Optional

from shared.core import apply_evidence, route, skill_max
from shared.core.tree import Tree

from .tree_read import find_step, step_skill_id, step_condition, is_project_step, question_measure
from .util import new_correlation_id, new_record_id, now_iso

CONSECUTIVE_MISS_FLAG = 2  # C-10: 2nd consecutive miss raises a flag
HIGH_SEVERITY_AFTER = 4  # C-10: high after four


def submit_step(deps: "Deps", args: Mapping[str, Any], ctx: Mapping[str, Any]) -> dict[str, Any]:
    """Run the submit orchestration and return a SubmitResponse dict.

    `deps` has: core (module), model (ModelPort), repo (Repository), tree (shared.core.Tree).
    """
    tree: Tree = deps.tree
    model = deps.model
    repo = deps.repo

    correlation_id = new_correlation_id("submit")
    student_id = ctx.get("studentId")
    step_id = args.get("stepId")
    if not student_id:
        return _fallback_response(step_id, correlation_id)

    found = find_step(tree, step_id)
    if not found:
        return _recorded_response(step_id, correlation_id, next_=None, source="none")
    step, checkpoint = found

    kind = args.get("kind")
    student_text = args.get("text") if kind in ("prompt", "answer") else None

    # 2. Safety screen on student free text (C-25). Fail closed.
    if student_text:
        screen = _safe_screen_input(model, student_text, correlation_id)
        if not screen["allowed"]:
            repo.save_attempt(_attempt_row(student_id, step, input_text=None, level=None, confidence=None))
            message = screen.get("replacement") or "That message was not sent. Try describing a change to your page."
            return _blocked_response(step_id, correlation_id, message)

    # 3. Score.
    evidence: Optional[dict[str, Any]] = None
    outcome = "recorded"
    source = "none"
    fallback: Optional[dict[str, Any]] = None

    if kind == "answer" and isinstance(args.get("questionId"), int):
        measure = question_measure(step, args["questionId"])
        if measure and args.get("choiceId"):
            level = int(measure["evidenceLevels"].get(args["choiceId"], 0))
            max_level = skill_max(tree, measure["skillId"])
            evidence = {
                "skillId": measure["skillId"],
                "level": level,
                "max": max_level,
                "confidence": 1,
                "conditionMet": level > 0,
                "note": "Answer mapped to an evidence level.",
            }
            outcome, source = "scored", "rules"
    elif kind == "prompt" and is_project_step(step):
        skill_id = step_skill_id(step, checkpoint)
        result = _safe_validate(
            model,
            {
                "stepId": step["id"],
                "skillId": skill_id,
                "condition": step_condition(step),
                "prompts": [args.get("text", "")],
                "projectBefore": None,
                "projectAfter": args.get("project") or {"html": "", "css": "", "js": ""},
                "correlationId": correlation_id,
            },
        )
        if result.get("ok"):
            out = result["result"]
            evidence = {
                "skillId": out["skillId"],
                "level": out["evidenceLevel"],
                "max": skill_max(tree, out["skillId"]),
                "confidence": out["confidence"],
                "conditionMet": out["conditionMet"],
                "note": out["evidence"],
            }
            outcome, source = "scored", result["source"]
        else:
            fallback = result.get("fallback")

    # 4. Persist the attempt (C-24).
    repo.save_attempt(
        _attempt_row(
            student_id,
            step,
            input_text=student_text,
            level=evidence["level"] if evidence else None,
            confidence=evidence["confidence"] if evidence else None,
        )
    )

    # Fallback path: adaptivity failed, follow the linear order (C-21).
    if fallback:
        repo.write_fallback_event(
            {
                "studentId": student_id,
                "stepId": step["id"],
                "component": fallback.get("component", "validation"),
                "error": fallback.get("reason", "validator_fallback"),
                "createdAt": now_iso(),
            }
        )
        return _fallback_response(step["id"], correlation_id, _linear_next(tree, checkpoint, step))

    # 5. Apply evidence + completion.
    mastery_display: Optional[int] = None
    completed = False
    progress = repo.get_progress(student_id)
    evidence_map = repo.get_evidence(student_id)

    if evidence:
        repo.append_evidence(
            {
                "studentId": student_id,
                "skillId": evidence["skillId"],
                "level": evidence["level"],
                "sourceStepId": step["id"],
                "createdAt": now_iso(),
            }
        )
        evidence_map = apply_evidence(evidence_map, evidence["skillId"], evidence["level"])
        mastery_display = round(100 * evidence["level"] / evidence["max"]) if evidence["max"] > 0 else 0
        completed = _maybe_complete(repo, checkpoint, evidence_map, student_id, progress)
        _maybe_flag(repo, student_id, step, checkpoint, evidence)
    else:
        status = "completed" if progress.get(checkpoint["id"]) == "completed" else "current"
        repo.upsert_progress(
            {"studentId": student_id, "checkpointId": checkpoint["id"], "status": status, "updatedAt": now_iso()}
        )

    # 6. Route and persist the decision (C-19). A routing_decision needs a real checkpoint
    # id (the schema forbids null), so when the lesson is complete we route to None and
    # simply do not write a decision row.
    teacher_input = repo.get_teacher_input(student_id)
    fresh_progress = repo.get_progress(student_id)
    decision = route(tree, fresh_progress, evidence_map, teacher_input)
    next_ = _build_next(tree, decision)
    if decision.checkpoint_id:
        repo.write_routing_decision(
            {
                "decisionId": new_record_id("dec"),
                "studentId": student_id,
                "proposedCheckpointId": decision.checkpoint_id,
                "teacherInput": _normalize_teacher_input(teacher_input),
                "appliedCheckpointId": decision.checkpoint_id,
                "reason": decision.reason,
                "createdAt": now_iso(),
            }
        )

    # 7. Assemble.
    if outcome == "scored":
        return {
            "stepId": step["id"],
            "outcome": "scored",
            "evidence": evidence,
            "masteryDisplay": mastery_display,
            "completed": completed,
            "next": next_,
            "hint": None,
            "passive": None,
            "notice": None,
            "source": source,
            "correlationId": correlation_id,
        }
    return _recorded_response(step["id"], correlation_id, next_, source="none")


# --- response builders (each satisfies the SubmitResponse schema conditionals) ---

def _recorded_response(step_id, correlation_id, next_, source):
    return {
        "stepId": step_id,
        "outcome": "recorded",
        "evidence": None,
        "masteryDisplay": None,
        "completed": False,
        "next": next_,
        "hint": None,
        "passive": None,
        "notice": None,
        "source": source or "none",
        "correlationId": correlation_id,
    }


def _blocked_response(step_id, correlation_id, message):
    return {
        "stepId": step_id,
        "outcome": "blocked",
        "evidence": None,
        "masteryDisplay": None,
        "completed": False,
        "next": None,
        "hint": None,
        "passive": None,
        "notice": {"code": "CONTENT_BLOCKED", "message": message},
        "source": "none",
        "correlationId": correlation_id,
    }


def _fallback_response(step_id, correlation_id, next_=None):
    return {
        "stepId": step_id or "unknown",
        "outcome": "fallback",
        "evidence": None,
        "masteryDisplay": None,
        "completed": False,
        "next": next_,
        "hint": None,
        "passive": None,
        "notice": {
            "code": "ADAPTIVE_UNAVAILABLE",
            "message": "Adaptive feedback is temporarily unavailable. Your lesson keeps going and your work is saved.",
        },
        "source": "rules",
        "correlationId": correlation_id,
    }


# --- internals ---

def _attempt_row(student_id, step, input_text, level, confidence):
    return {
        "attemptId": new_record_id("att"),
        "studentId": student_id,
        "stepId": step["id"],
        "inputText": input_text,
        "projectSnapshotRef": None,
        "evidenceLevel": level,
        "confidence": confidence,
        "createdAt": now_iso(),
    }


def _maybe_complete(repo, checkpoint, evidence_map, student_id, progress) -> bool:
    skill_ids = checkpoint.get("skillIds") or list((checkpoint.get("targetEvidenceLevels") or {}).keys())
    if not skill_ids:
        return False
    targets = checkpoint.get("targetEvidenceLevels") or {}
    met = all(evidence_map.get(sid, 0) >= targets.get(sid, 1) for sid in skill_ids)  # default target 1 (C-12)
    if not met:
        if progress.get(checkpoint["id"]) != "completed":
            repo.upsert_progress(
                {"studentId": student_id, "checkpointId": checkpoint["id"], "status": "current", "updatedAt": now_iso()}
            )
        return False
    repo.upsert_progress(
        {"studentId": student_id, "checkpointId": checkpoint["id"], "status": "completed", "updatedAt": now_iso()}
    )
    return True


def _maybe_flag(repo, student_id, step, checkpoint, evidence) -> None:
    skill_ids = checkpoint.get("skillIds", [])
    target = (checkpoint.get("targetEvidenceLevels") or {}).get(evidence["skillId"], 1)
    if evidence["level"] >= target or evidence["skillId"] not in skill_ids:
        return
    history = repo.get_history(student_id)
    for_step = [a for a in history if a["stepId"] == step["id"]]
    consecutive = 0
    for a in reversed(for_step):
        lvl = a.get("evidenceLevel")
        if lvl is not None and lvl < target:
            consecutive += 1
        else:
            break
    if consecutive < CONSECUTIVE_MISS_FLAG:
        return
    repo.write_remediation_flag(
        {
            "studentId": student_id,
            "skillId": evidence["skillId"],
            "reason": f"{consecutive} attempts below target on {step['id']}.",
            "severity": "high" if consecutive >= HIGH_SEVERITY_AFTER else "normal",
            "createdAt": now_iso(),
            "resolvedAt": None,
        }
    )


def _build_next(tree, decision):
    if not decision.checkpoint_id:
        return None
    cp = tree.checkpoint(decision.checkpoint_id)
    first_step = (cp.get("steps") or [{}])[0].get("id") if cp else decision.checkpoint_id
    return {"checkpointId": decision.checkpoint_id, "stepId": first_step or decision.checkpoint_id, "reason": decision.reason}


def _linear_next(tree, checkpoint, step):
    steps = checkpoint.get("steps", [])
    idx = next((i for i, s in enumerate(steps) if s["id"] == step["id"]), -1)
    reason = "Adaptive feedback is unavailable; following the standard lesson order."
    if 0 <= idx < len(steps) - 1:
        return {"checkpointId": checkpoint["id"], "stepId": steps[idx + 1]["id"], "reason": reason}
    cps = tree.checkpoints
    cp_idx = next((i for i, c in enumerate(cps) if c["id"] == checkpoint["id"]), -1)
    if 0 <= cp_idx < len(cps) - 1:
        nxt = cps[cp_idx + 1]
        return {"checkpointId": nxt["id"], "stepId": (nxt.get("steps") or [{}])[0].get("id", nxt["id"]), "reason": reason}
    return {"checkpointId": checkpoint["id"], "stepId": step["id"], "reason": "Adaptive feedback is unavailable; stay on this step."}


def _normalize_teacher_input(teacher_input):
    mode = (teacher_input or {}).get("mode", "auto")
    out = {"mode": mode}
    if (teacher_input or {}).get("checkpointId"):
        out["checkpointId"] = teacher_input["checkpointId"]
    return out


def _safe_screen_input(model, text, correlation_id):
    try:
        return model.screen_input(text, correlation_id)
    except Exception:  # fail closed (C-25)
        return {"allowed": False, "action": "error", "replacement": "That message could not be checked. Please try again.", "categories": [], "guardrailVersion": None}


def _safe_validate(model, request):
    try:
        return model.validate_project(request)
    except Exception:
        return {"ok": False, "fallback": {"component": "validation", "reason": "validator_error"}}
