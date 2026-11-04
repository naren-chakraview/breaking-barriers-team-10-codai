"""Human rating helper for the validator benchmark (C-17).

Walks a rater through the synthetic submissions, shows the skill's evidence descriptors
(the same rubric the validator uses), collects a `humanLevel` for each, and writes a
golden-set file. The `modelLevel` column is filled separately by the snapshot script
(backend/ai/scripts/snapshot_validator.py) — this tool does the HUMAN side only.

Keeping the human ratings genuinely human is what makes the kappa meaningful: the gate
measures validator-vs-human agreement, so a human must assign these (not a model).

Usage:
    python -m backend.eval.rate                      # interactive, default paths
    python -m backend.eval.rate --submissions <in> --out <golden-set.json>
    python -m backend.eval.rate --rater "Sam"        # record who rated (provenance)

Resumable: if --out already has ratings, already-rated submissionIds are skipped.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from shared.core import load_tree

_DIR = Path(__file__).resolve().parent / "fixtures"
DEFAULT_SUBMISSIONS = _DIR / "submissions.json"
DEFAULT_OUT = _DIR / "golden-set.json"


def _load_descriptors() -> dict[str, dict[str, str]]:
    tree = load_tree()
    return {sid: skill["evidenceLevels"] for sid, skill in tree.skills.items()}


def _project_summary(project: dict[str, Any] | None) -> str:
    if not project:
        return "(none)"
    parts = []
    for k in ("html", "css", "js"):
        v = (project.get(k) or "").strip()
        if v:
            parts.append(f"  {k}: {v}")
    return "\n".join(parts) if parts else "(empty)"


def _existing(out_path: Path) -> dict[str, Any]:
    if out_path.exists():
        return json.loads(out_path.read_text(encoding="utf-8"))
    return {"gate": 0.70, "status": "human-rated", "ratings": []}


def rate(submissions_path: Path, out_path: Path, rater: str) -> int:
    subs = json.loads(submissions_path.read_text(encoding="utf-8"))["submissions"]
    descriptors = _load_descriptors()
    golden = _existing(out_path)
    done = {r["submissionId"] for r in golden["ratings"]}

    todo = [s for s in subs if s["submissionId"] not in done]
    if not todo:
        print(f"All {len(subs)} submissions already rated in {out_path}.")
        return 0

    print(f"Rating {len(todo)} of {len(subs)} submissions (rater: {rater or 'anonymous'}).")
    print("For each, read the submission and enter the evidence level using the rubric.")
    print("Enter 's' to skip, 'q' to save and quit.\n")

    for i, sub in enumerate(todo, 1):
        skill = sub["skillId"]
        levels = descriptors[skill]
        max_level = max(int(x) for x in levels)
        print("=" * 72)
        print(f"[{i}/{len(todo)}] {sub['submissionId']}  skill: {skill}  (levels 0..{max_level})")
        print(f"\nCondition: {sub['condition']}")
        print("\nStudent prompt(s):")
        for p in sub["prompts"]:
            print(f"  - {p}")
        print("\nProject BEFORE:\n" + _project_summary(sub.get("projectBefore")))
        print("\nProject AFTER:\n" + _project_summary(sub.get("projectAfter")))
        print("\nRubric (evidence descriptors):")
        for lvl in sorted(levels, key=int):
            print(f"  {lvl}: {levels[lvl]}")

        choice = _prompt_level(max_level)
        if choice == "q":
            break
        if choice == "s":
            continue
        golden["ratings"].append({
            "submissionId": sub["submissionId"],
            "skillId": skill,
            "humanLevel": int(choice),
            # modelLevel filled by the snapshot script; -1 marks "not yet scored".
            "modelLevel": -1,
            "ratedBy": rater or "anonymous",
        })
        # Save after each rating so progress is never lost.
        out_path.write_text(json.dumps(golden, indent=2), encoding="utf-8")

    out_path.write_text(json.dumps(golden, indent=2), encoding="utf-8")
    rated = len(golden["ratings"])
    print(f"\nSaved {rated} ratings to {out_path}.")
    if rated < 15:
        print(f"NOTE: need >= 15 for the launch gate (C-17); have {rated}.")
    print("Next: fill modelLevel with  python -m backend.ai.scripts.snapshot_validator --live")
    return 0


def _prompt_level(max_level: int) -> str:
    valid = {str(n) for n in range(max_level + 1)} | {"s", "q"}
    while True:
        raw = input(f"\nYour rating (0..{max_level}, s=skip, q=quit): ").strip().lower()
        if raw in valid:
            return raw
        print(f"  please enter 0..{max_level}, or s / q")


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Human rating helper for the validator benchmark.")
    ap.add_argument("--submissions", default=str(DEFAULT_SUBMISSIONS))
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    ap.add_argument("--rater", default="")
    args = ap.parse_args(argv[1:])
    try:
        return rate(Path(args.submissions), Path(args.out), args.rater)
    except (FileNotFoundError, KeyError, json.JSONDecodeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
