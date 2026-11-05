#!/usr/bin/env python3
"""Generate the Course 2 (adaptive lesson) block of database/seed.sql from the canonical
lesson JSON (C-1, C-6: content is data, never hand-copied).

The adaptive curriculum of record is `database/hoai2026-adaptive.json`, vendored from
Code.org (provenance + license in `hoai2026-adaptive.NOTICE.md`). This script projects it
into the content-table
INSERTs for course 2 — COURSE, SKILLS, SKILL_LEVEL_DESCRIPTOR, CHECKPOINT,
CHECKPOINT_REQUIRES, CHECKPOINT_TARGET, STEP, MEASURE — matching schema.sql (ADR-017:
string ids, the kind-specific step body in the JSONB Payload column).

It rewrites ONLY the block between the GENERATED markers in seed.sql, so Course 1 (HTML
basics) and the hand-authored demo-student rows are preserved. Re-run whenever the lesson
JSON changes; never hand-edit the generated block.

    python database/generate_seed_adaptive.py            # rewrite the block in seed.sql
    python database/generate_seed_adaptive.py --check    # fail if seed.sql is out of date
    python database/generate_seed_adaptive.py --stdout    # print the block only

Skill ids 7, 8, 9 carry the tree skill slugs build, language, debug (course 2 continues the
SKILLS identity column after course 1's six skills).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_DIR = Path(__file__).resolve().parent
LESSON_JSON = _DIR / "hoai2026-adaptive.json"
SEED_SQL = _DIR / "seed.sql"

COURSE_ID = 2
# Deterministic skill-id assignment: tree slugs follow course 1's six skills (ids 1..6).
SKILL_ID = {"build": 7, "language": 8, "debug": 9}

BEGIN_MARKER = "-- >>> GENERATED: course 2 adaptive lesson (do not edit by hand) >>>"
END_MARKER = "-- <<< GENERATED: course 2 adaptive lesson <<<"


def sql_str(value) -> str:
    """A SQL string literal (single-quote-escaped), or NULL for None."""
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def sql_bool(value) -> str:
    return "TRUE" if value else "FALSE"


def sql_json(obj) -> str:
    """A JSONB literal: compact JSON as a single-quote-escaped string."""
    if obj is None:
        return "NULL"
    blob = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return "'" + blob.replace("'", "''") + "'"


def _step_payload(step: dict) -> dict:
    """The kind-specific content for the Payload JSONB column: everything the UI/validator
    needs that is not a dedicated column. Structural fields mapped to columns are dropped."""
    mapped = {"id", "title", "kind", "isProject", "instructions", "instructionsPrompt", "validation"}
    return {k: v for k, v in step.items() if k not in mapped}


def _validation(step: dict, checkpoint: dict) -> tuple[str, int | None]:
    """(ValidationCondition, ValidationSkillId) for a step. Only project steps that spell out
    a condition carry one; otherwise the validator derives it at runtime (architecture 2.5)."""
    v = step.get("validation") or {}
    condition = v.get("condition")
    skill_slug = (v.get("measures") or {}).get("skillId")
    if not skill_slug:
        skills = checkpoint.get("skillIds") or []
        skill_slug = skills[0] if skills else None
    skill_id = SKILL_ID.get(skill_slug) if condition else None
    # Only attach a skill id when there is a condition to validate against.
    return condition, skill_id


def generate_block(lesson: dict) -> str:
    skills = lesson["skills"]
    checkpoints = lesson["checkpoints"]
    lines: list[str] = []

    lines.append(BEGIN_MARKER)
    lines.append(f"-- Generated from database/hoai2026-adaptive.json by "
                 f"database/generate_seed_adaptive.py. Do not edit; re-run the generator.")
    lines.append(f"-- {len(checkpoints)} checkpoints, "
                 f"{sum(len(c['steps']) for c in checkpoints)} steps.")
    lines.append("")

    # COURSE
    lines.append("-- COURSE")
    lines.append(f"INSERT INTO COURSE (CourseId, CourseTitle) VALUES "
                 f"({COURSE_ID}, {sql_str(lesson['title'])});")
    lines.append("")

    # SKILLS
    lines.append("-- SKILLS (tree skills; ids continue after course 1)")
    objective = lesson.get("objective", "")
    for slug, skill in skills.items():
        lines.append(
            "INSERT INTO SKILLS (SkillId, CourseId, Slug, Title, Description, LessonObjective) VALUES "
            f"({SKILL_ID[slug]}, {COURSE_ID}, {sql_str(slug)}, {sql_str(skill.get('title'))}, "
            f"{sql_str(skill.get('description'))}, {sql_str(objective)});"
        )
    lines.append("")

    # SKILL_LEVEL_DESCRIPTOR (evidence levels of the tree skills)
    lines.append("-- SKILL_LEVEL_DESCRIPTOR (evidence levels of the tree skills)")
    for slug, skill in skills.items():
        for level, desc in sorted(skill["evidenceLevels"].items(), key=lambda kv: int(kv[0])):
            lines.append(
                "INSERT INTO SKILL_LEVEL_DESCRIPTOR (SkillId, LevelId, Descriptor) VALUES "
                f"({SKILL_ID[slug]}, {int(level)}, {sql_str(desc)});"
            )
    lines.append("")

    # CHECKPOINT
    lines.append("-- CHECKPOINT")
    for seq, cp in enumerate(checkpoints, 1):
        lines.append(
            "INSERT INTO CHECKPOINT (CheckpointId, CourseId, Title, Description, Destination, "
            "Skippable, RouteAfterCompletion, Sequence) VALUES "
            f"({sql_str(cp['id'])}, {COURSE_ID}, {sql_str(cp.get('title'))}, "
            f"{sql_str(cp.get('description'))}, {sql_str(cp.get('destination'))}, "
            f"{sql_bool(cp.get('skippable', False))}, "
            f"{sql_bool(cp.get('routeAfterCompletion', False))}, {seq});"
        )
    lines.append("")

    # CHECKPOINT_REQUIRES
    lines.append("-- CHECKPOINT_REQUIRES")
    for cp in checkpoints:
        for req in cp.get("requires", []) or []:
            lines.append(
                "INSERT INTO CHECKPOINT_REQUIRES (CheckpointId, RequiresCheckpointId) VALUES "
                f"({sql_str(cp['id'])}, {sql_str(req)});"
            )
    lines.append("")

    # CHECKPOINT_TARGET (explicit targets only; default of 1 is applied at runtime, C-12)
    lines.append("-- CHECKPOINT_TARGET (explicit targets; default 1 applied at runtime)")
    for cp in checkpoints:
        for slug, level in (cp.get("targetEvidenceLevels") or {}).items():
            lines.append(
                "INSERT INTO CHECKPOINT_TARGET (CheckpointId, SkillId, TargetEvidenceLevel) VALUES "
                f"({sql_str(cp['id'])}, {SKILL_ID[slug]}, {int(level)});"
            )
    lines.append("")

    # STEP + MEASURE (MEASURE ids continue after course 1's measures; assigned below)
    measure_rows: list[str] = []
    measure_id = _next_measure_id()
    lines.append("-- STEP")
    for cp in checkpoints:
        for seq, step in enumerate(cp["steps"], 1):
            condition, skill_id = _validation(step, cp)
            lines.append(
                "INSERT INTO STEP (StepId, CheckpointId, Sequence, Kind, Title, IsProject, "
                "Instructions, InstructionsPrompt, Payload, ValidationCondition, ValidationSkillId) VALUES "
                f"({sql_str(step['id'])}, {sql_str(cp['id'])}, {seq}, {sql_str(step.get('kind'))}, "
                f"{sql_str(step.get('title'))}, {sql_bool(step.get('isProject', False))}, "
                f"{sql_str(step.get('instructions'))}, {sql_str(step.get('instructionsPrompt'))}, "
                f"{sql_json(_step_payload(step))}, {sql_str(condition)}, "
                f"{skill_id if skill_id is not None else 'NULL'});"
            )
            # MEASURE: any MCQ in this step carrying measures.evidenceLevels (C-13).
            for q in step.get("questions", []) or []:
                measures = q.get("measures") or {}
                emap = measures.get("evidenceLevels")
                mskill = measures.get("skillId")
                if emap and mskill in SKILL_ID:
                    measure_rows.append(
                        "INSERT INTO MEASURE (MeasureId, StepId, SkillId, QuestionName, EvidenceMap) VALUES "
                        f"({measure_id}, {sql_str(step['id'])}, {SKILL_ID[mskill]}, "
                        f"{sql_str(q.get('questionName'))}, {sql_json(emap)});"
                    )
                    measure_id += 1
    lines.append("")

    lines.append("-- MEASURE (choice -> evidence level maps, C-13)")
    lines.extend(measure_rows if measure_rows else ["-- (none)"])
    lines.append("")
    lines.append(END_MARKER)
    return "\n".join(lines)


def _next_measure_id() -> int:
    """MEASURE uses a shared identity column across courses. Continue after the highest
    MeasureId already present in the file's non-generated (course 1) section."""
    if not SEED_SQL.exists():
        return 1
    import re

    text = SEED_SQL.read_text(encoding="utf-8")
    pre = text.split(BEGIN_MARKER)[0]  # course-1 section only
    ids = [int(m) for m in re.findall(r"INSERT INTO MEASURE \(MeasureId[^)]*\) VALUES \((\d+),", pre)]
    return (max(ids) + 1) if ids else 1


def splice_into_seed(block: str) -> str:
    text = SEED_SQL.read_text(encoding="utf-8")
    if BEGIN_MARKER in text and END_MARKER in text:
        head = text.split(BEGIN_MARKER)[0].rstrip("\n")
        tail = text.split(END_MARKER, 1)[1].lstrip("\n")
        return f"{head}\n\n{block}\n\n{tail}"
    raise SystemExit(
        "seed.sql has no GENERATED markers. Add them around the course-2 block once "
        "(a one-time migration), then re-run."
    )


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="exit non-zero if seed.sql is stale")
    ap.add_argument("--stdout", action="store_true", help="print the generated block only")
    args = ap.parse_args(argv[1:])

    lesson = json.loads(LESSON_JSON.read_text(encoding="utf-8"))
    block = generate_block(lesson)

    if args.stdout:
        print(block)
        return 0

    new_seed = splice_into_seed(block)
    if args.check:
        current = SEED_SQL.read_text(encoding="utf-8")
        if current != new_seed:
            print("seed.sql is out of date: run database/generate_seed_adaptive.py", file=sys.stderr)
            return 1
        print("seed.sql is up to date.")
        return 0

    SEED_SQL.write_text(new_seed, encoding="utf-8")
    print(f"Rewrote the course-2 block in {SEED_SQL} "
          f"({len(lesson['checkpoints'])} checkpoints).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
