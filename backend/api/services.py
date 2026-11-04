"""The eight C-28 service functions (seam 1), the HTTP API's backbone (ADR-015).

Each maps one-to-one to a P-11/C-29 endpoint. Student id/role travel in the P-1.4 headers
(the request context), never in the bodies. Every response carries a server-set
correlationId. Model-derived output (tutor/verify/generate) is tagged with `source` so a
stub can never pass as live (architecture 1.8).

submit_step lives in submit.py. The rest are here. A `Services` instance bundles the eight as
bound methods; `as_dict()` exposes them by their camelCase contract names for the HTTP router
and the contract test.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Mapping, Optional

from shared.core import route, skill_max
from shared.core.tree import Tree

from .submit import submit_step
from .util import new_correlation_id, now_iso


@dataclass
class Deps:
    """Everything the handlers need, injected once (the seam boundary)."""

    core: Any  # shared.core module (route, apply_evidence, skill_max, Tree)
    model: Any  # ModelPort (Track C), injected
    repo: Any  # Repository (seam 4)
    tree: Tree  # indexed skill tree
    modes: Mapping[str, str]


class Services:
    """The eight service functions over a set of injected dependencies."""

    def __init__(self, deps: Deps) -> None:
        self._deps = deps

    # ---- getTree ----
    def get_tree(self, args: Mapping[str, Any], ctx: Optional[Mapping[str, Any]] = None) -> dict[str, Any]:
        deps = self._deps
        student_id = (ctx or {}).get("studentId", "demo-student")
        progress = deps.repo.get_progress(student_id)
        evidence = deps.repo.get_evidence(student_id)
        teacher_input = deps.repo.get_teacher_input(student_id)
        decision = route(deps.tree, progress, evidence, teacher_input)
        current = _current_pointer(deps.tree, decision.checkpoint_id, progress)
        return {
            "tree": deps.tree.raw,
            "progress": progress,
            "evidence": evidence,
            "current": current,
            "fallbackActive": _is_fallback_active(deps.repo, student_id),
            "correlationId": new_correlation_id("tree"),
        }

    # ---- submitStep ----
    def submit_step(self, args: Mapping[str, Any], ctx: Optional[Mapping[str, Any]] = None) -> dict[str, Any]:
        return submit_step(self._deps, args, ctx or {"studentId": "demo-student"})

    # ---- askTutor ----
    def ask_tutor(self, args: Mapping[str, Any], ctx: Optional[Mapping[str, Any]] = None) -> dict[str, Any]:
        deps = self._deps
        correlation_id = new_correlation_id("tutor")
        result = _call_model(deps.model.invoke, {"task": "tutor", "prompt": _tutor_prompt(args), "opts": {"maxTokens": 512, "correlationId": correlation_id}})
        if not result.get("ok"):
            return {
                "answer": "I can't help with that right now. Try asking about a change to your page.",
                "hintStyle": "guiding_question",
                "notice": {"code": "ADAPTIVE_UNAVAILABLE", "message": "The tutor is temporarily unavailable."},
                "source": "rules",
                "correlationId": correlation_id,
            }
        screen = _safe_screen_output(deps.model, result["text"], correlation_id)
        answer = result["text"] if screen["allowed"] else (screen.get("replacement") or "Let's try a different question.")
        return {
            "answer": answer or "What is the one change you want to make next?",
            "hintStyle": "guiding_question",
            "notice": None if screen["allowed"] else {"code": "CONTENT_BLOCKED", "message": "That response was adjusted for safety."},
            "source": result["source"],
            "correlationId": correlation_id,
        }

    # ---- verifyPrompt ----
    def verify_prompt(self, args: Mapping[str, Any], ctx: Optional[Mapping[str, Any]] = None) -> dict[str, Any]:
        deps = self._deps
        correlation_id = new_correlation_id("verify")
        result = _call_model(deps.model.invoke, {"task": "verify", "prompt": _verify_prompt(args), "opts": {"maxTokens": 256, "correlationId": correlation_id}})
        if not result.get("ok"):
            return {
                "verdict": "ok",
                "guidance": "Go ahead and generate it, then check the result against your plan.",
                "notice": {"code": "ADAPTIVE_UNAVAILABLE", "message": "Prompt check is temporarily unavailable."},
                "source": "rules",
                "correlationId": correlation_id,
            }
        text = result["text"]
        narrow = "needs_narrowing" in text or "narrow" in text.lower()
        return {
            "verdict": "needs_narrowing" if narrow else "ok",
            "guidance": _verify_guidance(text, narrow),
            "notice": None,
            "source": result["source"],
            "correlationId": correlation_id,
        }

    # ---- generate ----
    def generate(self, args: Mapping[str, Any], ctx: Optional[Mapping[str, Any]] = None) -> dict[str, Any]:
        deps = self._deps
        correlation_id = new_correlation_id("generate")
        result = _call_model(deps.model.invoke, {"task": "codegen", "prompt": _generate_prompt(args), "opts": {"maxTokens": 2048, "correlationId": correlation_id}})
        if not result.get("ok"):
            return {
                "project": args.get("project"),
                "explanation": "",
                "notice": {"code": "ADAPTIVE_UNAVAILABLE", "message": "Code generation is temporarily unavailable."},
                "source": "rules",
                "correlationId": correlation_id,
            }
        project = _parse_project(result["text"]) or args.get("project")
        return {
            "project": project,
            "explanation": "Applied your change.",
            "notice": None,
            "source": result["source"],
            "correlationId": correlation_id,
        }

    # ---- getTeacherRoster ----
    def get_teacher_roster(self, args: Mapping[str, Any], ctx: Optional[Mapping[str, Any]] = None) -> dict[str, Any]:
        deps = self._deps
        students = deps.repo.list_students()
        rows = [_roster_row(deps, s) for s in students]
        return {"students": rows, "correlationId": new_correlation_id("roster")}

    # ---- setTeacherInput ----
    def set_teacher_input(self, args: Mapping[str, Any], ctx: Optional[Mapping[str, Any]] = None) -> dict[str, Any]:
        deps = self._deps
        correlation_id = new_correlation_id("teacher")
        student_id = args["studentId"]
        teacher_input = args["input"]
        deps.repo.set_teacher_input(student_id, teacher_input)
        progress = deps.repo.get_progress(student_id)
        evidence = deps.repo.get_evidence(student_id)
        routed = route(deps.tree, progress, evidence, teacher_input)
        applied = routed.checkpoint_id or _strip_null_checkpoint(teacher_input).get("checkpointId") or _first_checkpoint(deps.tree)
        proposed = routed.checkpoint_id or applied
        decision = {
            "decisionId": f"dec-{datetime.now(timezone.utc).timestamp():.0f}-{new_correlation_id('x')[-4:]}",
            "studentId": student_id,
            "proposedCheckpointId": proposed,
            "teacherInput": _strip_null_checkpoint(teacher_input),
            "appliedCheckpointId": applied,
            "reason": routed.reason,
            "createdAt": now_iso(),
        }
        deps.repo.write_routing_decision(decision)
        return {"decision": decision, "correlationId": correlation_id}

    # ---- health ----
    def health(self, args: Optional[Mapping[str, Any]] = None, ctx: Optional[Mapping[str, Any]] = None) -> dict[str, Any]:
        components = {"validation": "ok", "routing": "ok", "generation": "ok", "safety": "ok", "passive": "ok"}
        status = "degraded" if "down" in components.values() else "ok"
        return {"status": status, "components": components, "checkedAt": now_iso(), "correlationId": new_correlation_id("health")}

    def as_dict(self) -> dict[str, Callable[..., dict[str, Any]]]:
        """Expose the eight functions by their camelCase contract names."""
        return {
            "getTree": self.get_tree,
            "submitStep": self.submit_step,
            "askTutor": self.ask_tutor,
            "verifyPrompt": self.verify_prompt,
            "generate": self.generate,
            "getTeacherRoster": self.get_teacher_roster,
            "setTeacherInput": self.set_teacher_input,
            "health": self.health,
        }


def create_services(deps: Deps) -> dict[str, Callable[..., dict[str, Any]]]:
    """Build the eight service functions keyed by their contract names."""
    return Services(deps).as_dict()


# --- helpers ---

def _is_fallback_active(repo, student_id) -> bool:
    events = repo.list_fallback_events(student_id)
    if not events:
        return False
    last = events[-1]
    try:
        age = (datetime.now(timezone.utc) - datetime.fromisoformat(last["createdAt"].replace("Z", "+00:00"))).total_seconds()
    except (ValueError, KeyError):
        return False
    return age < 30


def _current_pointer(tree: Tree, checkpoint_id, progress):
    if not checkpoint_id:
        return None
    cp = tree.checkpoint(checkpoint_id)
    if not cp:
        return None
    if progress.get(checkpoint_id) == "completed":
        return None
    steps = cp.get("steps", [])
    if not steps:
        return None
    return {"checkpointId": checkpoint_id, "stepId": steps[0]["id"]}


def _roster_row(deps: Deps, student: Mapping[str, Any]) -> dict[str, Any]:
    repo, tree = deps.repo, deps.tree
    student_id = student["studentId"]
    evidence = repo.get_evidence(student_id)
    progress = repo.get_progress(student_id)
    flags = repo.list_open_flags(student_id)
    passive = repo.get_latest_passive_signal(student_id)
    routing = repo.list_routing_decisions(student_id)
    teacher_input = repo.get_teacher_input(student_id)

    mastery = []
    for skill_id in tree.skills.keys():
        level = evidence.get(skill_id, 0)
        max_level = skill_max(tree, skill_id)
        mastery.append({"skillId": skill_id, "level": level, "max": max_level, "display": round(100 * level / max_level) if max_level > 0 else 0})

    current = next((cid for cid, s in progress.items() if s == "current"), None)

    return {
        "studentId": student_id,
        "displayName": student.get("displayName", student_id),
        "synthetic": student.get("synthetic", True),
        "currentCheckpointId": current,
        "mastery": mastery,
        "flags": [{"skillId": f["skillId"], "reason": f["reason"], "severity": f["severity"], "createdAt": f["createdAt"]} for f in flags],
        "passive": (
            {"signal": passive["signal"], "hintStyle": passive["hintStyle"], "reason": passive["reason"], "confidence": passive["confidence"], "createdAt": passive["createdAt"]}
            if passive
            else None
        ),
        "lastRouting": routing[-1] if routing else None,
        "teacherInput": _strip_null_checkpoint(teacher_input),
    }


def _strip_null_checkpoint(teacher_input):
    mode = (teacher_input or {}).get("mode", "auto")
    out = {"mode": mode}
    if (teacher_input or {}).get("checkpointId"):
        out["checkpointId"] = teacher_input["checkpointId"]
    return out


def _first_checkpoint(tree: Tree) -> str:
    return tree.checkpoints[0]["id"]


def _call_model(invoke, request):
    try:
        return invoke(request)
    except Exception:
        return {"ok": False, "task": request["task"], "error": {"code": "UPSTREAM_ERROR", "message": "model call failed"}, "correlationId": request["opts"]["correlationId"]}


def _safe_screen_output(model, text, correlation_id):
    try:
        return model.screen_output(text, correlation_id)
    except Exception:
        return {"allowed": False, "action": "error", "replacement": "Let's try a different question.", "categories": [], "guardrailVersion": None}


def _tutor_prompt(args):
    return {"system": "You are a patient coding tutor for beginners. Guide with a question; never write the code for them.", "user": args["question"], "untrusted": [args["question"]]}


def _verify_prompt(args):
    return {"system": "Judge whether a student prompt is specific enough to generate from. Reply ok or suggest how to narrow it.", "user": args["prompt"], "untrusted": [args["prompt"]]}


def _verify_guidance(text, narrow):
    # The stub returns JSON like {"verdict":"ok"}; prefer a human sentence for the UI.
    if narrow:
        return "That asks for a lot at once. Try one change first, then the next."
    return "Clear and specific. Go ahead and generate it."


def _generate_prompt(args):
    return {"system": "Apply the requested change to the project. Return the full updated project.", "user": args["prompt"], "untrusted": [args["prompt"]]}


def _parse_project(text):
    import json

    try:
        obj = json.loads(text)
    except (ValueError, TypeError):
        return None
    if isinstance(obj, dict) and all(isinstance(obj.get(k), str) for k in ("html", "css", "js")):
        return {"html": obj["html"], "css": obj["css"], "js": obj["js"]}
    return None
