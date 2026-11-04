"""Passive stage 1 (features) and the rule baseline (C-10, ADR-006).

Features are derived ONLY from attempt content and server-side timestamps. There is no
client telemetry: no idle time, tab visibility, or keystroke counts (ADR-006).

`rule_signal` is the deterministic fallback for the Haiku reasoner (architecture 2.7). It
is also the CI baseline the persona regression tests assert against, so it must be stable
and explainable.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from datetime import datetime
from statistics import median
from typing import Any, Mapping, Optional, Sequence

from .tree import Tree

# A submission counts as "cosmetic" when it is only about colour, font, spacing, etc.
_COSMETIC = re.compile(
    r"\b(colou?r|background|font|bold|italic|px|rem|margin|padding|round(ed)?|"
    r"shadow|border|navy|teal|blue|red|green|#[0-9a-fA-F]{3,6})\b",
    re.IGNORECASE,
)
# A submission counts as "low effort" when it is very short or obviously filler.
_LOW_EFFORT = re.compile(r"^\s*(ok|idk|asdf|hi|lol|yes|no|meh|\W*)\s*$", re.IGNORECASE)

_RAPID_SECONDS = 10          # two submits closer than this are "rapid"
_LONG_GAP_SECONDS = 20 * 60  # a gap longer than this suggests the student stepped away
_HINT_STYLES = ("guiding_question", "example", "analogy", "step_by_step")


@dataclass
class SkillFeatures:
    attempts: int = 0
    misses: int = 0
    consecutive_misses: int = 0
    best_level: int = 0
    trend: str = "flat"                 # rising | flat | falling
    hints_used: int = 0
    angles_tried: list[str] = field(default_factory=list)


@dataclass
class Features:
    student_id: str
    window_attempts: int
    first_at: Optional[str]
    last_at: Optional[str]
    per_skill: dict[str, SkillFeatures]
    median_seconds_per_step: Optional[float]
    cohort_median_seconds_per_step: Optional[float]
    max_gap_seconds: Optional[float]
    rapid_submits: int
    cosmetic_edit_share: float
    project_submits: int

    def to_contract(self) -> dict[str, Any]:
        """Shape matching model.schema.json#/$defs/Features (camelCase)."""
        return {
            "studentId": self.student_id,
            "window": {
                "attempts": self.window_attempts,
                "firstAt": self.first_at,
                "lastAt": self.last_at,
            },
            "perSkill": {
                sid: {
                    "attempts": f.attempts,
                    "misses": f.misses,
                    "consecutiveMisses": f.consecutive_misses,
                    "bestLevel": f.best_level,
                    "trend": f.trend,
                    "hintsUsed": f.hints_used,
                    "anglesTried": list(f.angles_tried),
                }
                for sid, f in self.per_skill.items()
            },
            "timing": {
                "medianSecondsPerStep": self.median_seconds_per_step,
                "cohortMedianSecondsPerStep": self.cohort_median_seconds_per_step,
                "maxGapSeconds": self.max_gap_seconds,
                "rapidSubmits": self.rapid_submits,
            },
            "content": {"cosmeticEditShare": round(self.cosmetic_edit_share, 4)},
        }


def _parse_ts(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _step_skill(tree: Tree, step_id: str) -> Optional[str]:
    """The skill a step measures: the owning checkpoint's first skillId (C-14 simplification)."""
    for cp in tree.checkpoints:
        for step in cp["steps"]:
            if step["id"] == step_id:
                skills = cp.get("skillIds", [])
                return skills[0] if skills else None
    return None


def extract_features(
    tree: Tree,
    attempts: Sequence[Mapping[str, Any]],
    hints: Sequence[Mapping[str, Any]] = (),
    cohort_median_seconds_per_step: Optional[float] = None,
    target_by_skill: Optional[Mapping[str, int]] = None,
) -> Features:
    """Fold a student's attempts and hint log into deterministic features.

    A "miss" is a scored attempt whose evidenceLevel is below the skill's target
    (default 1). Unscored attempts (evidenceLevel is None) are ignored for miss counting
    but still inform timing and content.
    """
    targets = dict(target_by_skill or {})
    ordered = sorted(attempts, key=lambda a: a.get("createdAt") or "")
    per_skill: dict[str, SkillFeatures] = {}

    # Timing from server timestamps only (ADR-006).
    times = [t for t in (_parse_ts(a.get("createdAt")) for a in ordered) if t]
    gaps = [
        (times[i] - times[i - 1]).total_seconds() for i in range(1, len(times))
    ]
    rapid_submits = sum(1 for g in gaps if g < _RAPID_SECONDS)
    max_gap = max(gaps) if gaps else None
    median_gap = median(gaps) if gaps else None

    # Content signal: share of project submissions that are purely cosmetic.
    project_texts = [
        (a.get("inputText") or "")
        for a in ordered
        if a.get("projectSnapshotRef") is not None
    ]
    cosmetic = sum(1 for t in project_texts if _COSMETIC.search(t))
    cosmetic_share = (cosmetic / len(project_texts)) if project_texts else 0.0

    # Per-skill accumulation.
    for a in ordered:
        skill = _step_skill(tree, a.get("stepId", ""))
        if skill is None:
            continue
        f = per_skill.setdefault(skill, SkillFeatures())
        level = a.get("evidenceLevel")
        if level is None:
            continue  # unscored: no effect on level or misses
        f.attempts += 1
        prev_best = f.best_level
        f.best_level = max(f.best_level, int(level))
        target = targets.get(skill, 1)
        if int(level) < target:
            f.misses += 1
            f.consecutive_misses += 1
        else:
            f.consecutive_misses = 0
        if f.attempts >= 2:
            f.trend = "rising" if f.best_level > prev_best else "flat"

    # Hints: count and angles already tried, per skill.
    for h in hints:
        skill = _step_skill(tree, h.get("stepId", ""))
        if skill is None:
            continue
        f = per_skill.setdefault(skill, SkillFeatures())
        f.hints_used += 1
        style = h.get("style")
        if style in _HINT_STYLES and style not in f.angles_tried:
            f.angles_tried.append(style)

    return Features(
        student_id=str(attempts[0]["studentId"]) if attempts else "",
        window_attempts=len(ordered),
        first_at=ordered[0].get("createdAt") if ordered else None,
        last_at=ordered[-1].get("createdAt") if ordered else None,
        per_skill=per_skill,
        median_seconds_per_step=median_gap,
        cohort_median_seconds_per_step=cohort_median_seconds_per_step,
        max_gap_seconds=max_gap,
        rapid_submits=rapid_submits,
        cosmetic_edit_share=cosmetic_share,
        project_submits=len(project_texts),
    )


def _next_angle(tried: Sequence[str], preferred: Sequence[str]) -> Optional[str]:
    """First preferred hint style not already tried (so the slow learner gets a new angle)."""
    for style in preferred:
        if style not in tried:
            return style
    return None


def rule_signal(features: Features) -> dict[str, Any]:
    """Deterministic Passive signal: the fallback and the CI baseline (architecture 2.7).

    Returns a dict matching model.schema.json#/$defs/PassiveSignal. modelId is set to
    "rules" by the caller when this is persisted; this function only produces the signal.

    Order of checks matters: struggle and distraction are decided before "steady".
    """
    worst = max(
        features.per_skill.values(),
        key=lambda f: (f.consecutive_misses, f.misses),
        default=SkillFeatures(),
    )

    # Distraction: obsessed with a non-essential detail (many cosmetic edits, flat evidence).
    # Needs several project submissions, so a single redirect-decision prompt that merely
    # names a colour does not trip it.
    cosmetic_fires = (
        features.project_submits >= 3
        and features.cosmetic_edit_share >= 0.6
        and worst.trend != "rising"
    )
    if cosmetic_fires:
        return {
            "signal": "redirect",
            "hintStyle": "guiding_question",
            "angleToTry": "name the one visitor action that matters most",
            "reason": (
                f"{round(features.cosmetic_edit_share * 100)}% of recent project edits were cosmetic "
                "with no gain in evidence; redirect from styling to purpose."
            ),
            "evidenceRefs": [],
            "confidence": 0.7,
        }

    # Distraction: inattentive (long gaps and rapid low-effort submits). Lower confidence:
    # this can look like slow thinking, so it is a gentle check-in (ADR-006).
    if (features.max_gap_seconds or 0) >= _LONG_GAP_SECONDS and features.rapid_submits >= 2:
        return {
            "signal": "reengage",
            "hintStyle": "guiding_question",
            "reason": (
                "Long gaps between work with several very short submissions; a gentle check-in. "
                "May also be slow thinking, so confidence is low."
            ),
            "evidenceRefs": [],
            "confidence": 0.5,
        }

    # Struggle: repeated misses on a skill. Rotate to an angle not yet tried.
    if worst.consecutive_misses >= 2:
        angle = _next_angle(worst.angles_tried, ("step_by_step", "analogy", "example"))
        return {
            "signal": "slow_down",
            "hintStyle": angle or "step_by_step",
            "angleToTry": angle or "step_by_step",
            "reason": (
                f"{worst.consecutive_misses} consecutive misses; slow the pace and try the "
                f"{(angle or 'step_by_step').replace('_', ' ')} angle, which has not been used yet."
            ),
            "evidenceRefs": [],
            "confidence": 0.75,
        }

    # Advanced: at or above target with no hints. Favour guiding questions.
    at_target = all(f.best_level >= 1 and f.misses == 0 for f in features.per_skill.values())
    no_hints = sum(f.hints_used for f in features.per_skill.values()) == 0
    if features.per_skill and at_target and no_hints:
        return {
            "signal": "speed_up",
            "hintStyle": "guiding_question",
            "angleToTry": "ask for the trade-off behind a choice",
            "reason": "At or above target on every skill with no hints used; reduce scaffolding.",
            "evidenceRefs": [],
            "confidence": 0.8,
        }

    return {
        "signal": "steady",
        "hintStyle": "guiding_question",
        "reason": "On track; no change to guidance.",
        "evidenceRefs": [],
        "confidence": 0.7,
    }
