"""Aurora repository over the RDS Data API (STORE_MODE=aurora, ADR-016).

Same interface as JsonRepository. Uses boto3's `rds-data` client: a secure HTTPS endpoint,
so no connection pooling, no VPC attachment, and no DB password in code — the cluster ARN
plus the Secrets Manager secret ARN, authorized by IAM (architecture 2.9, docs/aws-access.md).

boto3 is imported lazily so this module imports cleanly in environments without it (the
contract tests exercise the JSON adapter; the Aurora adapter is covered by a thin SQL-shape
test and, once deployed, by running the same contract suite against a live cluster).

Column names are snake_case in SQL (C-29); every row is mapped to the camelCase records in
shared/contracts/schemas/records.schema.json before it leaves this module.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Mapping, Optional

from .repository import DEFAULT_ANSWER_TIMEOUT_SECONDS


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _snake_to_camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(w.capitalize() for w in rest)


def _param(name: str, value: Any) -> dict[str, Any]:
    """Build an RDS Data API SqlParameter, choosing the field by Python type."""
    if value is None:
        return {"name": name, "value": {"isNull": True}}
    if isinstance(value, bool):
        return {"name": name, "value": {"booleanValue": value}}
    if isinstance(value, int):
        return {"name": name, "value": {"longValue": value}}
    if isinstance(value, float):
        return {"name": name, "value": {"doubleValue": value}}
    if isinstance(value, (dict, list)):
        return {"name": name, "value": {"stringValue": json.dumps(value)}, "typeHint": "JSON"}
    return {"name": name, "value": {"stringValue": str(value)}}


class AuroraRepository:
    """RDS Data API adapter. Pass the cluster ARN, secret ARN and database name from config."""

    def __init__(
        self,
        cluster_arn: str,
        secret_arn: str,
        database: str = "codeai",
        region_name: Optional[str] = None,
        client: Any = None,
    ) -> None:
        self._cluster_arn = cluster_arn
        self._secret_arn = secret_arn
        self._database = database
        self._region = region_name
        self._client = client  # injectable for tests; real client built lazily

    # ---- Data API plumbing ----
    @property
    def client(self) -> Any:
        if self._client is None:
            import boto3  # lazy: not needed to import this module

            self._client = boto3.client("rds-data", region_name=self._region)
        return self._client

    def _execute(self, sql: str, params: Optional[list[dict[str, Any]]] = None) -> dict[str, Any]:
        return self.client.execute_statement(
            resourceArn=self._cluster_arn,
            secretArn=self._secret_arn,
            database=self._database,
            sql=sql,
            parameters=params or [],
            includeResultMetadata=True,
        )

    @staticmethod
    def _rows(response: Mapping[str, Any]) -> list[dict[str, Any]]:
        """Turn a Data API response into camelCase dicts using the result metadata."""
        cols = [c["name"] for c in response.get("columnMetadata", [])]
        out: list[dict[str, Any]] = []
        for record in response.get("records", []):
            row: dict[str, Any] = {}
            for col, field in zip(cols, record):
                row[_snake_to_camel(col)] = _field_value(field)
            out.append(row)
        return out

    # ---- students ----
    def put_student(self, student: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO student (student_id, display_name, synthetic) "
            "VALUES (:student_id, :display_name, :synthetic) "
            "ON CONFLICT (student_id) DO UPDATE SET display_name = EXCLUDED.display_name, "
            "synthetic = EXCLUDED.synthetic",
            [
                _param("student_id", student["studentId"]),
                _param("display_name", student["displayName"]),
                _param("synthetic", bool(student.get("synthetic", False))),
            ],
        )
        return dict(student)

    def list_students(self) -> list[dict[str, Any]]:
        return self._rows(self._execute("SELECT student_id, display_name, synthetic FROM student"))

    # ---- evidence ----
    def append_evidence(self, row: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO student_skill_evidence (student_id, skill_id, level, source_step_id, created_at) "
            "VALUES (:student_id, :skill_id, :level, :source_step_id, :created_at)",
            [
                _param("student_id", row["studentId"]),
                _param("skill_id", row["skillId"]),
                _param("level", int(row["level"])),
                _param("source_step_id", row["sourceStepId"]),
                _param("created_at", row.get("createdAt", _now())),
            ],
        )
        return dict(row)

    def get_evidence(self, student_id: str) -> dict[str, int]:
        resp = self._execute(
            "SELECT skill_id, MAX(level) AS level FROM student_skill_evidence "
            "WHERE student_id = :sid GROUP BY skill_id",
            [_param("sid", student_id)],
        )
        return {r["skillId"]: int(r["level"]) for r in self._rows(resp)}

    # ---- progress ----
    def get_progress(self, student_id: str) -> dict[str, str]:
        resp = self._execute(
            "SELECT checkpoint_id, status FROM checkpoint_progress WHERE student_id = :sid",
            [_param("sid", student_id)],
        )
        return {r["checkpointId"]: r["status"] for r in self._rows(resp)}

    def upsert_progress(self, row: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO checkpoint_progress (student_id, checkpoint_id, status, updated_at) "
            "VALUES (:student_id, :checkpoint_id, :status, :updated_at) "
            "ON CONFLICT (student_id, checkpoint_id) DO UPDATE SET status = EXCLUDED.status, "
            "updated_at = EXCLUDED.updated_at",
            [
                _param("student_id", row["studentId"]),
                _param("checkpoint_id", row["checkpointId"]),
                _param("status", row["status"]),
                _param("updated_at", row.get("updatedAt", _now())),
            ],
        )
        return dict(row)

    # ---- attempts ----
    def save_attempt(self, attempt: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO step_attempt (attempt_id, student_id, step_id, input_text, "
            "project_snapshot_ref, evidence_level, confidence, created_at) "
            "VALUES (:attempt_id, :student_id, :step_id, :input_text, :project_snapshot_ref, "
            ":evidence_level, :confidence, :created_at)",
            [
                _param("attempt_id", attempt["attemptId"]),
                _param("student_id", attempt["studentId"]),
                _param("step_id", attempt["stepId"]),
                _param("input_text", attempt.get("inputText")),
                _param("project_snapshot_ref", attempt.get("projectSnapshotRef")),
                _param("evidence_level", attempt.get("evidenceLevel")),
                _param("confidence", attempt.get("confidence")),
                _param("created_at", attempt.get("createdAt", _now())),
            ],
        )
        return dict(attempt)

    def get_history(self, student_id: str) -> list[dict[str, Any]]:
        resp = self._execute(
            "SELECT attempt_id, student_id, step_id, input_text, project_snapshot_ref, "
            "evidence_level, confidence, created_at FROM step_attempt "
            "WHERE student_id = :sid ORDER BY created_at ASC",
            [_param("sid", student_id)],
        )
        return self._rows(resp)

    # ---- hints ----
    def write_hint_event(self, hint: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO hint_event (hint_id, student_id, step_id, style, angle, created_at) "
            "VALUES (:hint_id, :student_id, :step_id, :style, :angle, :created_at)",
            [
                _param("hint_id", hint["hintId"]),
                _param("student_id", hint["studentId"]),
                _param("step_id", hint["stepId"]),
                _param("style", hint["style"]),
                _param("angle", hint.get("angle")),
                _param("created_at", hint.get("createdAt", _now())),
            ],
        )
        return dict(hint)

    def list_hint_events(self, student_id: str) -> list[dict[str, Any]]:
        resp = self._execute(
            "SELECT hint_id, student_id, step_id, style, angle, created_at FROM hint_event "
            "WHERE student_id = :sid ORDER BY created_at ASC",
            [_param("sid", student_id)],
        )
        return self._rows(resp)

    # ---- routing decisions ----
    def write_routing_decision(self, decision: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO routing_decision (decision_id, student_id, proposed_checkpoint_id, "
            "teacher_input, applied_checkpoint_id, reason, created_at) "
            "VALUES (:decision_id, :student_id, :proposed_checkpoint_id, :teacher_input, "
            ":applied_checkpoint_id, :reason, :created_at)",
            [
                _param("decision_id", decision["decisionId"]),
                _param("student_id", decision["studentId"]),
                _param("proposed_checkpoint_id", decision["proposedCheckpointId"]),
                _param("teacher_input", decision["teacherInput"]),
                _param("applied_checkpoint_id", decision["appliedCheckpointId"]),
                _param("reason", decision["reason"]),
                _param("created_at", decision.get("createdAt", _now())),
            ],
        )
        return dict(decision)

    def list_routing_decisions(self, student_id: str) -> list[dict[str, Any]]:
        resp = self._execute(
            "SELECT decision_id, student_id, proposed_checkpoint_id, teacher_input, "
            "applied_checkpoint_id, reason, created_at FROM routing_decision "
            "WHERE student_id = :sid ORDER BY created_at ASC",
            [_param("sid", student_id)],
        )
        rows = self._rows(resp)
        for r in rows:
            if isinstance(r.get("teacherInput"), str):
                r["teacherInput"] = json.loads(r["teacherInput"])
        return rows

    # ---- fallback events ----
    def write_fallback_event(self, event: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO fallback_event (student_id, step_id, component, error, created_at) "
            "VALUES (:student_id, :step_id, :component, :error, :created_at)",
            [
                _param("student_id", event["studentId"]),
                _param("step_id", event.get("stepId")),
                _param("component", event["component"]),
                _param("error", event["error"]),
                _param("created_at", event.get("createdAt", _now())),
            ],
        )
        return dict(event)

    def list_fallback_events(self, student_id: str) -> list[dict[str, Any]]:
        resp = self._execute(
            "SELECT student_id, step_id, component, error, created_at FROM fallback_event "
            "WHERE student_id = :sid ORDER BY created_at ASC",
            [_param("sid", student_id)],
        )
        return self._rows(resp)

    # ---- passive signals ----
    def write_passive_signal(self, signal: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO passive_signal (signal_id, student_id, signal, hint_style, angle_to_try, "
            "reason, evidence_refs, confidence, features_hash, model_id, prompt_version, created_at) "
            "VALUES (:signal_id, :student_id, :signal, :hint_style, :angle_to_try, :reason, "
            ":evidence_refs, :confidence, :features_hash, :model_id, :prompt_version, :created_at)",
            [
                _param("signal_id", signal["signalId"]),
                _param("student_id", signal["studentId"]),
                _param("signal", signal["signal"]),
                _param("hint_style", signal["hintStyle"]),
                _param("angle_to_try", signal.get("angleToTry")),
                _param("reason", signal["reason"]),
                _param("evidence_refs", signal.get("evidenceRefs", [])),
                _param("confidence", float(signal["confidence"])),
                _param("features_hash", signal["featuresHash"]),
                _param("model_id", signal["modelId"]),
                _param("prompt_version", signal["promptVersion"]),
                _param("created_at", signal.get("createdAt", _now())),
            ],
        )
        return dict(signal)

    def get_latest_passive_signal(self, student_id: str) -> Optional[dict[str, Any]]:
        resp = self._execute(
            "SELECT * FROM passive_signal WHERE student_id = :sid ORDER BY created_at DESC LIMIT 1",
            [_param("sid", student_id)],
        )
        rows = self._rows(resp)
        return rows[0] if rows else None

    def get_cached_passive_signal(
        self, student_id: str, features_hash: str, prompt_version: str
    ) -> Optional[dict[str, Any]]:
        resp = self._execute(
            "SELECT * FROM passive_signal WHERE student_id = :sid AND features_hash = :fh "
            "AND prompt_version = :pv ORDER BY created_at DESC LIMIT 1",
            [_param("sid", student_id), _param("fh", features_hash), _param("pv", prompt_version)],
        )
        rows = self._rows(resp)
        return rows[0] if rows else None

    # ---- remediation flags ----
    def write_remediation_flag(self, flag: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO remediation_flag (student_id, skill_id, reason, severity, created_at, resolved_at) "
            "VALUES (:student_id, :skill_id, :reason, :severity, :created_at, :resolved_at)",
            [
                _param("student_id", flag["studentId"]),
                _param("skill_id", flag["skillId"]),
                _param("reason", flag["reason"]),
                _param("severity", flag["severity"]),
                _param("created_at", flag.get("createdAt", _now())),
                _param("resolved_at", flag.get("resolvedAt")),
            ],
        )
        return dict(flag)

    def list_open_flags(self, student_id: str) -> list[dict[str, Any]]:
        resp = self._execute(
            "SELECT student_id, skill_id, reason, severity, created_at, resolved_at "
            "FROM remediation_flag WHERE student_id = :sid AND resolved_at IS NULL "
            "ORDER BY created_at ASC",
            [_param("sid", student_id)],
        )
        return self._rows(resp)

    # ---- teacher input and config ----
    def get_teacher_input(self, student_id: str) -> dict[str, Any]:
        resp = self._execute(
            "SELECT student_id, mode, checkpoint_id, updated_at FROM teacher_input "
            "WHERE student_id = :sid",
            [_param("sid", student_id)],
        )
        rows = self._rows(resp)
        if not rows:
            return {"mode": "auto"}
        r = rows[0]
        out = {"mode": r["mode"]}
        if r.get("checkpointId"):
            out["checkpointId"] = r["checkpointId"]
        return out

    def set_teacher_input(self, student_id: str, teacher_input: Mapping[str, Any]) -> dict[str, Any]:
        updated = _now()
        self._execute(
            "INSERT INTO teacher_input (student_id, mode, checkpoint_id, updated_at) "
            "VALUES (:student_id, :mode, :checkpoint_id, :updated_at) "
            "ON CONFLICT (student_id) DO UPDATE SET mode = EXCLUDED.mode, "
            "checkpoint_id = EXCLUDED.checkpoint_id, updated_at = EXCLUDED.updated_at",
            [
                _param("student_id", student_id),
                _param("mode", teacher_input["mode"]),
                _param("checkpoint_id", teacher_input.get("checkpointId")),
                _param("updated_at", updated),
            ],
        )
        return {
            "studentId": student_id,
            "mode": teacher_input["mode"],
            "checkpointId": teacher_input.get("checkpointId"),
            "updatedAt": updated,
        }

    def get_teacher_config(self, teacher_id: str) -> dict[str, Any]:
        resp = self._execute(
            "SELECT teacher_id, answer_timeout_seconds FROM teacher_config WHERE teacher_id = :tid",
            [_param("tid", teacher_id)],
        )
        rows = self._rows(resp)
        if rows:
            return rows[0]
        return {"teacherId": teacher_id, "answerTimeoutSeconds": DEFAULT_ANSWER_TIMEOUT_SECONDS}


def _field_value(field: Mapping[str, Any]) -> Any:
    """Unwrap a single RDS Data API field to a Python value."""
    if field.get("isNull"):
        return None
    for key in ("stringValue", "longValue", "doubleValue", "booleanValue"):
        if key in field:
            return field[key]
    return None
