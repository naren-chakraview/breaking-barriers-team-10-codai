"""Mastery as evidence levels (C-9, C-10, C-11).

A student's level for a skill is the maximum evidence observed. It never decreases.
Repeated misses raise a remediation flag elsewhere (features.py), not a lower score.
"""

from __future__ import annotations

from typing import Iterable, Mapping

from .tree import Tree


def apply_evidence(current: Mapping[str, int], skill_id: str, level: int) -> dict[str, int]:
    """Return a new evidence map with (skill_id -> max(existing, level)) (C-10).

    Pure: does not mutate `current`. The level never decreases, so a weaker later
    observation leaves the stored level unchanged.
    """
    merged = dict(current)
    merged[skill_id] = max(merged.get(skill_id, 0), int(level))
    return merged


def reduce_evidence(rows: Iterable[Mapping[str, object]]) -> dict[str, int]:
    """Fold append-only evidence rows into {skill_id: max level}.

    Each row needs `skillId` and `level`. Mirrors the repository's getEvidence contract.
    """
    out: dict[str, int] = {}
    for row in rows:
        sid = str(row["skillId"])
        out[sid] = max(out.get(sid, 0), int(row["level"]))
    return out


def display_score(level: int, max_level: int) -> int:
    """The 0-100 Mastery_Score for the UI (C-11). Display only; never stored or routed.

    round(100 * level / max). Python's round() is banker's rounding, which is fine here
    because the inputs are small integers and the value is cosmetic.
    """
    if max_level <= 0:
        return 0
    return round(100 * level / max_level)


def mean_display_score(evidence: Mapping[str, int], tree: Tree) -> int:
    """Mean of the per-skill display scores, for the outcomes panel (C-11)."""
    maxima = tree.skill_max
    scores = [
        display_score(level, maxima[sid])
        for sid, level in evidence.items()
        if sid in maxima
    ]
    return round(sum(scores) / len(scores)) if scores else 0


def skill_max(tree: Tree, skill_id: str) -> int:
    """Maximum evidence level for a skill from its rubric (build 2, language 3, debug 3)."""
    return tree.skill_max.get(skill_id, 0)
