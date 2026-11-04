"""Read-only helpers for looking things up in the skill tree (content consumption, C-6).

The API reads a step's kind, its validation condition and its question rubrics to decide how
to score a submit. Routing and evidence math stay in shared/core (Track B). These work over a
`shared.core.Tree` so they share the same indexed view.
"""

from __future__ import annotations

import re
from typing import Any, Optional

from shared.core.tree import Tree


def find_step(tree: Tree, step_id: str) -> Optional[tuple[dict[str, Any], dict[str, Any]]]:
    """Return (step, checkpoint) for a step id, or None."""
    for checkpoint in tree.checkpoints:
        for step in checkpoint.get("steps", []):
            if step.get("id") == step_id:
                return step, checkpoint
    return None


def step_skill_id(step: dict[str, Any], checkpoint: dict[str, Any]) -> Optional[str]:
    """The skill a step measures: validation.measures.skillId, else the checkpoint's first skill (C-14)."""
    measured = (step.get("validation") or {}).get("measures", {}).get("skillId")
    if measured:
        return measured
    skills = checkpoint.get("skillIds", [])
    return skills[0] if skills else None


def step_condition(step: dict[str, Any]) -> str:
    """The validator condition: validation.condition, else the `Evidence:` line of instructionsPrompt (C-14)."""
    cond = (step.get("validation") or {}).get("condition")
    if cond:
        return cond
    prompt = step.get("instructionsPrompt", "") or ""
    match = re.search(r"Evidence:\s*(.+)\s*$", prompt, re.IGNORECASE | re.MULTILINE)
    if match:
        return match.group(1).strip()
    return step.get("title", "Meets the step objective.")


def is_project_step(step: dict[str, Any]) -> bool:
    """A project step uses the LLM judge (C-14): a `level` step with project=True and a validation block."""
    return step.get("kind") == "level" and step.get("project") is True and bool(step.get("validation"))


def question_measure(step: dict[str, Any], question_id: int) -> Optional[dict[str, Any]]:
    """A multiple-choice question's choice->level map, when it carries one (C-13)."""
    for q in step.get("questions", []):
        if q.get("id") == question_id:
            measures = q.get("measures")
            if measures and measures.get("skillId") and measures.get("evidenceLevels"):
                return measures
    return None
