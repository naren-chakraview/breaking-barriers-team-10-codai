"""Persona replay: step a synthetic history through the real engine, one event at a time (Task 8c).

`replay_persona(tree, persona)` merges a persona's attempts and hint log in server-timestamp
order and, after each event, records what the deterministic engine would show the teacher:
the evidence map, the Passive rule signal (and the hint style/angle it selects), the route
and its reason, tested-out checkpoints and open remediation flags.

The output is committed as a fixture (shared/contracts/fixtures/replays/persona-replays.json)
so the teacher UI's replay control renders exactly what `shared.core` computes, with no JS
copy of the rules. A test regenerates it and fails on drift. Regenerate with:

    PYTHONPATH=. python -m shared.core.replay --write

Pure: no AWS, no I/O beyond the CLI, no model calls. The live Haiku reasoner (Task 8b) can
override the rule signal in production; this replay shows the rule baseline (C-10, ADR-006).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Mapping, Optional

from .evidence import apply_evidence
from .features import extract_features, rule_signal
from .routing import route, tested_out_after_intro
from .tree import Tree, load_tree

ROOT = Path(__file__).resolve().parents[2]
PERSONA_DIR = ROOT / "shared" / "contracts" / "fixtures" / "personas"
OUTPUT = ROOT / "shared" / "contracts" / "fixtures" / "replays" / "persona-replays.json"
PERSONAS = ("quick", "slow", "distracted-detail", "distracted-inattentive")

# Mirrors backend/api/submit.py (C-10): the 2nd consecutive miss raises a flag, high after four.
CONSECUTIVE_MISS_FLAG = 2
HIGH_SEVERITY_AFTER = 4


def _step_index(tree: Tree) -> dict[str, tuple[dict[str, Any], dict[str, Any]]]:
    return {s["id"]: (cp, s) for cp in tree.checkpoints for s in cp["steps"]}


def _skill_targets(tree: Tree) -> dict[str, int]:
    """Per-skill target used to decide a "miss": the highest target any checkpoint declares."""
    out: dict[str, int] = {}
    for cp in tree.checkpoints:
        for skill, level in (cp.get("targetEvidenceLevels") or {}).items():
            out[skill] = max(out.get(skill, 0), int(level))
    return out


def _measure(cp: Mapping[str, Any], step: Mapping[str, Any], attempt: Mapping[str, Any]):
    """(skillId, level) an attempt contributes, or (None, None) when it is unscored.

    A diagnostic MCQ attempt encodes `q<id>:<choice>`; each question measures its own skill.
    Other steps measure validation.measures.skillId, else the checkpoint's first skill.
    """
    if attempt.get("evidenceLevel") is None:
        return None, None
    text = attempt.get("inputText") or ""
    if step.get("kind") == "questions" and text.startswith("q") and ":" in text:
        q_part, choice = text[1:].split(":", 1)
        for q in step.get("questions", []):
            if str(q.get("id")) == q_part and q.get("measures"):
                m = q["measures"]
                return m["skillId"], int(m["evidenceLevels"].get(choice, 0))
    skill = (step.get("validation") or {}).get("measures", {}).get("skillId")
    if not skill:
        skill = (cp.get("skillIds") or [None])[0]
    return skill, int(attempt["evidenceLevel"])


def _diagnostic_ids(tree: Tree) -> set[str]:
    """The diagnostic phase: routeAfterCompletion checkpoints and everything they require."""
    out: set[str] = set()
    todo = [cp["id"] for cp in tree.checkpoints if tree.routes_after_completion(cp["id"])]
    while todo:
        cid = todo.pop()
        if cid not in out:
            out.add(cid)
            todo.extend(tree.requires(cid))
    return out


def _progress(tree: Tree, steps, attempts, evidence) -> dict[str, str]:
    """checkpoint_progress as the backend would hold it after these attempts.

    Diagnostics: a step completes its checkpoint once every measured question on it has an
    answer (intro has none, so its first attempt completes it). Skippables whose target the diagnostic meets are
    tested out (C-19.2). The taught checkpoint with the latest attempt is `current`.
    """
    progress: dict[str, str] = {}
    answered: dict[str, set[str]] = {}
    latest_taught: Optional[str] = None
    diagnostic = _diagnostic_ids(tree)
    for a in attempts:
        cp, step = steps[a["stepId"]]
        if cp["id"] in diagnostic:
            if step.get("kind") == "questions":
                answered.setdefault(step["id"], set()).add((a.get("inputText") or "").split(":")[0])
                needed = {f"q{q['id']}" for q in step.get("questions", []) if q.get("measures")}
                if needed <= answered[step["id"]]:
                    progress[cp["id"]] = "completed"
                else:
                    progress.setdefault(cp["id"], "current")
            else:
                progress[cp["id"]] = "completed"
        else:
            latest_taught = cp["id"]
    for cid in tested_out_after_intro(tree, progress, evidence):
        progress[cid] = "tested_out"
    if latest_taught and progress.get(latest_taught) not in ("completed", "tested_out"):
        progress[latest_taught] = "current"
    return progress


def _flags(tree: Tree, steps, attempts) -> list[dict[str, Any]]:
    """Open remediation flags, by the same consecutive-miss rule submit uses (C-10)."""
    runs: dict[tuple[str, str], int] = {}
    diagnostic = _diagnostic_ids(tree)
    for a in attempts:
        cp, step = steps[a["stepId"]]
        if cp["id"] in diagnostic:
            continue
        skill, level = _measure(cp, step, a)
        if skill is None:
            continue
        target = (cp.get("targetEvidenceLevels") or {}).get(skill, 1)
        key = (step["id"], skill)
        runs[key] = runs.get(key, 0) + 1 if level < target else 0
    return [
        {
            "skillId": skill,
            "stepId": step_id,
            "severity": "high" if n >= HIGH_SEVERITY_AFTER else "normal",
            "reason": f"{n} attempts below target on {step_id}.",
        }
        for (step_id, skill), n in runs.items()
        if n >= CONSECUTIVE_MISS_FLAG
    ]


def _event(e: Mapping[str, Any], steps) -> dict[str, Any]:
    if "hintId" in e:
        return {
            "kind": "hint",
            "id": e["hintId"],
            "at": e["createdAt"],
            "stepId": e["stepId"],
            "checkpointId": steps[e["stepId"]][0]["id"],
            "style": e.get("style"),
            "text": e.get("angle") or "",
        }
    return {
        "kind": "attempt",
        "id": e["attemptId"],
        "at": e["createdAt"],
        "stepId": e["stepId"],
        "checkpointId": steps[e["stepId"]][0]["id"],
        "text": e.get("inputText") or "",
        "evidenceLevel": e.get("evidenceLevel"),
    }


def replay_persona(tree: Tree, persona: Mapping[str, Any]) -> dict[str, Any]:
    steps = _step_index(tree)
    targets = _skill_targets(tree)
    events = sorted(
        [*persona["attempts"], *persona.get("hints", [])],
        key=lambda e: (e["createdAt"], "hintId" in e),
    )
    frames = []
    for i in range(len(events)):
        seen = events[: i + 1]
        attempts = [e for e in seen if "attemptId" in e]
        hints = [e for e in seen if "hintId" in e]

        evidence: dict[str, int] = {}
        refs: list[str] = []
        for a in attempts:
            skill, level = _measure(*steps[a["stepId"]], a)
            if skill is not None:
                evidence = apply_evidence(evidence, skill, level)
                refs.append(a["attemptId"])

        features = extract_features(tree, attempts, hints, target_by_skill=targets)
        signal = rule_signal(features) if attempts else None
        if signal is not None:
            signal = {**signal, "evidenceRefs": refs[-3:]}

        progress = _progress(tree, steps, attempts, evidence)
        diagnostics_done = all(progress.get(cid) == "completed" for cid in _diagnostic_ids(tree))
        if diagnostics_done:
            decision = route(tree, progress, evidence, persona.get("teacherInput"))
            routing = {"phase": "taught", "checkpointId": decision.checkpoint_id, "reason": decision.reason}
        else:
            routing = {
                "phase": "diagnostic",
                "checkpointId": steps[events[i]["stepId"]][0]["id"],
                "reason": "Diagnostic in progress; routing starts once the skill check is complete (C-19.2).",
            }

        frames.append(
            {
                "index": i,
                "event": _event(events[i], steps),
                "evidence": evidence,
                "progress": progress,
                "testedOut": [c for c, s in progress.items() if s == "tested_out"],
                "route": routing,
                "signal": signal,
                "anglesTried": sorted({h["style"] for h in hints if h.get("style")}),
                "flags": _flags(tree, steps, attempts),
                "timing": {
                    "maxGapSeconds": features.max_gap_seconds,
                    "rapidSubmits": features.rapid_submits,
                    "cosmeticEditShare": round(features.cosmetic_edit_share, 4),
                    "projectSubmits": features.project_submits,
                },
            }
        )
    return {
        "persona": persona["persona"],
        "student": persona["student"],
        "description": persona["description"],
        "targets": targets,
        "expected": persona["expected"],
        "frames": frames,
    }


def build_all(tree: Optional[Tree] = None) -> dict[str, Any]:
    tree = tree or load_tree()
    out = {}
    for name in PERSONAS:
        persona = json.loads((PERSONA_DIR / f"{name}.json").read_text(encoding="utf-8"))
        out[name] = replay_persona(tree, persona)
    return {
        "generatedBy": "PYTHONPATH=. python -m shared.core.replay --write",
        "synthetic": True,
        "personas": out,
    }


def render(data: Mapping[str, Any]) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


if __name__ == "__main__":
    text = render(build_all())
    if "--write" in sys.argv:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(text, encoding="utf-8")
        print(f"wrote {OUTPUT.relative_to(ROOT)}")
    else:
        sys.stdout.write(text)
