"""JSON-file repository: the demo-mode store (STORE_MODE=json, C-8 "a JSON file in demo mode").

Same contract as the Aurora adapter. In-memory with optional load/save to a JSON file so a
demo can seed the three personas and persist across a reload. No AWS. This is the behavioral
reference the Aurora adapter is tested against.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping, Optional

from .repository import DEFAULT_ANSWER_TIMEOUT_SECONDS


def _by_time(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(rows, key=lambda r: r.get("createdAt") or "")


class JsonRepository:
    """In-memory store with optional JSON-file persistence."""

    def __init__(self, path: Optional[str | Path] = None) -> None:
        self._path = Path(path) if path else None
        self._students: dict[str, dict[str, Any]] = {}
        self._evidence: list[dict[str, Any]] = []
        self._attempts: list[dict[str, Any]] = []
        self._progress: dict[tuple[str, str], dict[str, Any]] = {}
        self._flags: list[dict[str, Any]] = []
        self._routing: list[dict[str, Any]] = []
        self._fallbacks: list[dict[str, Any]] = []
        self._passive: list[dict[str, Any]] = []
        self._hints: list[dict[str, Any]] = []
        self._teacher_input: dict[str, dict[str, Any]] = {}
        self._teacher_config: dict[str, dict[str, Any]] = {}
        if self._path and self._path.exists():
            self._load()

    # ---- students ----
    def put_student(self, student: Mapping[str, Any]) -> dict[str, Any]:
        self._students[student["studentId"]] = dict(student)
        self._save()
        return dict(student)

    def list_students(self) -> list[dict[str, Any]]:
        return list(self._students.values())

    # ---- evidence (max level, never decreases) ----
    def append_evidence(self, row: Mapping[str, Any]) -> dict[str, Any]:
        self._evidence.append(dict(row))
        self._save()
        return dict(row)

    def get_evidence(self, student_id: str) -> dict[str, int]:
        out: dict[str, int] = {}
        for r in self._evidence:
            if r["studentId"] != student_id:
                continue
            out[r["skillId"]] = max(out.get(r["skillId"], 0), int(r["level"]))
        return out

    # ---- progress ----
    def get_progress(self, student_id: str) -> dict[str, str]:
        return {
            cid: row["status"]
            for (sid, cid), row in self._progress.items()
            if sid == student_id
        }

    def upsert_progress(self, row: Mapping[str, Any]) -> dict[str, Any]:
        self._progress[(row["studentId"], row["checkpointId"])] = dict(row)
        self._save()
        return dict(row)

    # ---- attempts ----
    def save_attempt(self, attempt: Mapping[str, Any]) -> dict[str, Any]:
        self._attempts.append(dict(attempt))
        self._save()
        return dict(attempt)

    def get_history(self, student_id: str) -> list[dict[str, Any]]:
        return _by_time([a for a in self._attempts if a["studentId"] == student_id])

    # ---- hints ----
    def write_hint_event(self, hint: Mapping[str, Any]) -> dict[str, Any]:
        self._hints.append(dict(hint))
        self._save()
        return dict(hint)

    def list_hint_events(self, student_id: str) -> list[dict[str, Any]]:
        return _by_time([h for h in self._hints if h["studentId"] == student_id])

    # ---- routing decisions ----
    def write_routing_decision(self, decision: Mapping[str, Any]) -> dict[str, Any]:
        self._routing.append(dict(decision))
        self._save()
        return dict(decision)

    def list_routing_decisions(self, student_id: str) -> list[dict[str, Any]]:
        return _by_time([d for d in self._routing if d["studentId"] == student_id])

    # ---- fallback events ----
    def write_fallback_event(self, event: Mapping[str, Any]) -> dict[str, Any]:
        self._fallbacks.append(dict(event))
        self._save()
        return dict(event)

    def list_fallback_events(self, student_id: str) -> list[dict[str, Any]]:
        return _by_time([e for e in self._fallbacks if e["studentId"] == student_id])

    # ---- passive signals ----
    def write_passive_signal(self, signal: Mapping[str, Any]) -> dict[str, Any]:
        self._passive.append(dict(signal))
        self._save()
        return dict(signal)

    def get_latest_passive_signal(self, student_id: str) -> Optional[dict[str, Any]]:
        rows = _by_time([s for s in self._passive if s["studentId"] == student_id])
        return rows[-1] if rows else None

    def get_cached_passive_signal(
        self, student_id: str, features_hash: str, prompt_version: str
    ) -> Optional[dict[str, Any]]:
        for s in self._passive:
            if (
                s["studentId"] == student_id
                and s.get("featuresHash") == features_hash
                and s.get("promptVersion") == prompt_version
            ):
                return s
        return None

    # ---- remediation flags ----
    def write_remediation_flag(self, flag: Mapping[str, Any]) -> dict[str, Any]:
        self._flags.append(dict(flag))
        self._save()
        return dict(flag)

    def list_open_flags(self, student_id: str) -> list[dict[str, Any]]:
        return _by_time(
            [f for f in self._flags if f["studentId"] == student_id and not f.get("resolvedAt")]
        )

    # ---- teacher input and config ----
    def get_teacher_input(self, student_id: str) -> dict[str, Any]:
        return self._teacher_input.get(student_id, {"mode": "auto"})

    def set_teacher_input(self, student_id: str, teacher_input: Mapping[str, Any]) -> dict[str, Any]:
        row = {
            "studentId": student_id,
            "mode": teacher_input["mode"],
            "checkpointId": teacher_input.get("checkpointId"),
            "updatedAt": _now(),
        }
        self._teacher_input[student_id] = row
        self._save()
        return row

    def get_teacher_config(self, teacher_id: str) -> dict[str, Any]:
        return self._teacher_config.get(
            teacher_id,
            {"teacherId": teacher_id, "answerTimeoutSeconds": DEFAULT_ANSWER_TIMEOUT_SECONDS},
        )

    # ---- persistence ----
    def _save(self) -> None:
        if not self._path:
            return
        self._path.write_text(json.dumps(self._dump(), indent=2), encoding="utf-8")

    def _load(self) -> None:
        data = json.loads(self._path.read_text(encoding="utf-8"))
        self._students = {s["studentId"]: s for s in data.get("students", [])}
        self._evidence = data.get("evidence", [])
        self._attempts = data.get("attempts", [])
        self._progress = {(r["studentId"], r["checkpointId"]): r for r in data.get("progress", [])}
        self._flags = data.get("flags", [])
        self._routing = data.get("routing", [])
        self._fallbacks = data.get("fallbacks", [])
        self._passive = data.get("passive", [])
        self._hints = data.get("hints", [])
        self._teacher_input = {r["studentId"]: r for r in data.get("teacherInput", [])}
        self._teacher_config = {r["teacherId"]: r for r in data.get("teacherConfig", [])}

    def _dump(self) -> dict[str, Any]:
        return {
            "students": list(self._students.values()),
            "evidence": self._evidence,
            "attempts": self._attempts,
            "progress": list(self._progress.values()),
            "flags": self._flags,
            "routing": self._routing,
            "fallbacks": self._fallbacks,
            "passive": self._passive,
            "hints": self._hints,
            "teacherInput": list(self._teacher_input.values()),
            "teacherConfig": list(self._teacher_config.values()),
        }


def _now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
