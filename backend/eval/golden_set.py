"""The golden set: human-rated project submissions and the runner (C-17, P-19.2).

A golden-set file is JSON:

    {
      "description": "...",
      "gate": 0.70,
      "ratings": [
        { "submissionId": "s-001", "skillId": "build",
          "humanLevel": 2, "modelLevel": 2 },
        ...
      ]
    }

`humanLevel` is the reference rating. `modelLevel` is the validator's score for the same
submission. In CI the file carries precomputed `modelLevel`s (a snapshot taken on a pinned
model + prompt version), so the gate runs with no AWS. When the real validator is available,
a caller can recompute `modelLevel`s and write a fresh snapshot.

The runner groups by `skillId` so each skill uses its own 0..max scale, then reports the
pooled agreement across all submissions (the launch gate is on the pooled QWK).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Optional, Sequence

from .metrics import agreement_report, AgreementReport

# Per-skill maximum evidence level (from the tree rubric; build 2, language 3, debug 3).
# Kept here so the runner needs no tree load; a mismatch is caught by validate_ratings.
SKILL_MAX = {"build": 2, "language": 3, "debug": 3}

MIN_SUBMISSIONS = 15  # C-17 launch-gate minimum


@dataclass(frozen=True)
class GoldenSet:
    gate: float
    ratings: list[dict[str, Any]]
    description: str = ""


def load_golden_set(path: str | Path) -> GoldenSet:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return GoldenSet(
        gate=float(data.get("gate", 0.70)),
        ratings=list(data["ratings"]),
        description=data.get("description", ""),
    )


def validate_ratings(ratings: Sequence[Mapping[str, Any]]) -> list[str]:
    """Return a list of problems ([] if clean). Checks fields, skills and level ranges."""
    problems: list[str] = []
    seen_ids: set[str] = set()
    for i, r in enumerate(ratings):
        where = r.get("submissionId", f"index {i}")
        for field in ("submissionId", "skillId", "humanLevel", "modelLevel"):
            if field not in r:
                problems.append(f"{where}: missing '{field}'")
        sid = r.get("skillId")
        if sid is not None and sid not in SKILL_MAX:
            problems.append(f"{where}: unknown skillId {sid!r}")
        if r.get("submissionId") in seen_ids:
            problems.append(f"{where}: duplicate submissionId")
        seen_ids.add(r.get("submissionId"))
        for lvl_field in ("humanLevel", "modelLevel"):
            lvl = r.get(lvl_field)
            if sid in SKILL_MAX and isinstance(lvl, int):
                if not (0 <= lvl <= SKILL_MAX[sid]):
                    problems.append(
                        f"{where}: {lvl_field}={lvl} out of range 0..{SKILL_MAX[sid]} for {sid}"
                    )
    return problems


@dataclass(frozen=True)
class GoldenSetResult:
    pooled: AgreementReport
    per_skill: dict[str, AgreementReport]
    n: int
    enough_submissions: bool

    @property
    def passed(self) -> bool:
        # The launch gate: enough submissions AND pooled QWK over the gate (C-17).
        return self.enough_submissions and self.pooled.passed

    def summary(self) -> str:
        lines = [f"Golden set: {self.n} submissions (min {MIN_SUBMISSIONS})"]
        if not self.enough_submissions:
            lines.append(f"  NOT ENOUGH SUBMISSIONS: {self.n} < {MIN_SUBMISSIONS} (C-17)")
        lines.append(f"  pooled   {self.pooled.summary()}")
        for skill, rep in sorted(self.per_skill.items()):
            lines.append(f"  {skill:<9} {rep.summary()}")
        lines.append(f"GATE: {'PASS' if self.passed else 'FAIL'}")
        return "\n".join(lines)


def evaluate(golden: GoldenSet) -> GoldenSetResult:
    """Score a golden set: pooled and per-skill agreement, and the launch-gate pass/fail."""
    problems = validate_ratings(golden.ratings)
    if problems:
        raise ValueError("invalid golden set:\n  " + "\n  ".join(problems))

    # Pooled over all submissions. Different skills share the ordinal scale (levels are
    # comparable as "evidence level"), and the gate is defined on the pooled number (C-17).
    human = [r["humanLevel"] for r in golden.ratings]
    model = [r["modelLevel"] for r in golden.ratings]
    max_level = max(SKILL_MAX.values())
    pooled = agreement_report(human, model, gate=golden.gate, min_rating=0, max_rating=max_level)

    per_skill: dict[str, AgreementReport] = {}
    for skill in sorted({r["skillId"] for r in golden.ratings}):
        rows = [r for r in golden.ratings if r["skillId"] == skill]
        per_skill[skill] = agreement_report(
            [r["humanLevel"] for r in rows],
            [r["modelLevel"] for r in rows],
            gate=golden.gate,
            min_rating=0,
            max_rating=SKILL_MAX[skill],
        )

    return GoldenSetResult(
        pooled=pooled,
        per_skill=per_skill,
        n=len(golden.ratings),
        enough_submissions=len(golden.ratings) >= MIN_SUBMISSIONS,
    )


def run_file(path: str | Path) -> GoldenSetResult:
    return evaluate(load_golden_set(path))
