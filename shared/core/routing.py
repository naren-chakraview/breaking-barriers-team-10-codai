"""Routing: a pure, deterministic function. No model decides routing (C-18, C-19, C-20).

route(tree, progress, evidence, teacher_input) -> RouteResult(checkpoint_id, reason)

The reason is human-readable and is written to routing_decision and shown in the UI
("why this checkpoint", C-19.5).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Optional

from .tree import Tree

# Default target when a checkpoint declares no targetEvidenceLevels (C-12).
DEFAULT_TARGET = 1

# checkpoint_progress statuses that count as "done" for dependency and availability checks.
_DONE = {"completed", "tested_out"}


@dataclass(frozen=True)
class RouteResult:
    checkpoint_id: Optional[str]
    reason: str


def _is_done(progress: Mapping[str, str], checkpoint_id: str) -> bool:
    return progress.get(checkpoint_id) in _DONE


def _requires_met(tree: Tree, progress: Mapping[str, str], checkpoint_id: str) -> bool:
    return all(_is_done(progress, req) for req in tree.requires(checkpoint_id))


def available_checkpoints(tree: Tree, progress: Mapping[str, str]) -> list[str]:
    """Available = not done and every `requires` checkpoint is completed or tested out (C-19.1).

    Returned in JSON order so all downstream tie-breaking is deterministic.
    """
    out = []
    for cp in tree.checkpoints:
        cid = cp["id"]
        if _is_done(progress, cid):
            continue
        if _requires_met(tree, progress, cid):
            out.append(cid)
    return out


def _target_met(tree: Tree, evidence: Mapping[str, int], checkpoint_id: str) -> bool:
    """True when the student's evidence already meets every target the checkpoint declares."""
    targets = tree.targets(checkpoint_id)
    if not targets:
        return False  # nothing to test out of
    return all(evidence.get(skill, 0) >= level for skill, level in targets.items())


def tested_out_after_intro(
    tree: Tree, progress: Mapping[str, str], evidence: Mapping[str, int]
) -> list[str]:
    """Skippable checkpoints whose target is already met by diagnostic evidence (C-19.2).

    Depth not volume (P-6.5): a tested-out checkpoint counts as done but is not "taught".
    Only applies once the diagnostic (routeAfterCompletion) checkpoint is complete.
    """
    intro_done = any(
        tree.routes_after_completion(c["id"]) and progress.get(c["id"]) == "completed"
        for c in tree.checkpoints
    )
    if not intro_done:
        return []
    out = []
    for cp in tree.checkpoints:
        cid = cp["id"]
        if (
            tree.is_skippable(cid)
            and not _is_done(progress, cid)
            and _requires_met(tree, progress, cid)
            and _target_met(tree, evidence, cid)
        ):
            out.append(cid)
    return out


def _propose(
    tree: Tree,
    available: list[str],
    progress: Mapping[str, str],
) -> Optional[str]:
    """Stay-on-current selection (C-19.3, issue #24 q2).

    The student finishes the checkpoint they are on before moving on: if the `current`
    checkpoint is still available, propose it; otherwise propose the first available
    checkpoint in JSON order. This keeps a student on one skill until its target is met
    (depth not volume, P-6.5) rather than hopping to whichever skill has the largest gap.

    `available` is already in JSON order, so `available[0]` is the lowest-order choice.
    Returns None only when nothing is available (lesson complete / fully tested out).
    """
    if not available:
        return None
    current = next((c for c, s in progress.items() if s == "current"), None)
    if current and current in available:
        return current
    return available[0]


def route(
    tree: Tree,
    progress: Mapping[str, str],
    evidence: Mapping[str, int],
    teacher_input: Optional[Mapping[str, object]] = None,
) -> RouteResult:
    """Pick the next checkpoint (C-19). Returns an id that exists in the tree (C-20).

    teacher_input: {"mode": "auto"|"hold"|"assign", "checkpointId"?}. assign applies only
    if the target checkpoint is available; otherwise the proposal stands and the reason
    says why (the C-19 edge case flagged in the architecture doc for team confirmation).
    """
    teacher_input = teacher_input or {"mode": "auto"}
    mode = teacher_input.get("mode", "auto")

    available = available_checkpoints(tree, progress)

    # The deterministic proposal: stay on the current checkpoint until its target is met,
    # else the first available in JSON order (C-19.3, stay-on-current).
    proposal = _propose(tree, available, progress)

    if mode == "hold":
        current = next((c for c, s in progress.items() if s == "current"), None)
        return RouteResult(current, "Teacher held the student on the current checkpoint (P-8.2).")

    if mode == "assign":
        assigned = teacher_input.get("checkpointId")
        if assigned and assigned in available:
            return RouteResult(str(assigned), f"Teacher assigned {assigned}, which is available.")
        if proposal:
            return RouteResult(
                proposal,
                f"Teacher assigned {assigned!r}, but it is not available; "
                f"applied the proposal {proposal} instead.",
            )
        return RouteResult(
            None,
            f"Teacher assigned {assigned!r}, which is not available, and nothing else is available.",
        )

    # mode == "auto"
    if proposal:
        current = next((c for c, s in progress.items() if s == "current"), None)
        if proposal == current:
            reason = f"Continue on {proposal}; its target is not yet met."
        else:
            reason = f"{proposal} is the first available checkpoint in lesson order."
        return RouteResult(proposal, reason)
    return RouteResult(None, "No available checkpoint; the lesson is complete or fully tested out.")
