"""Aurora repository over the RDS Data API (STORE_MODE=aurora, ADR-016, ADR-017).

Same interface as JsonRepository. Uses boto3's `rds-data` client: a secure HTTPS endpoint,
so no connection pooling, no VPC attachment, and no DB password in code — the cluster ARN
plus the Secrets Manager secret ARN, authorized by IAM.

ADR-017 decided: string ids, skill slugs, columns are the camelCase record keys (Postgres
folds them to lowercase). The adapter maps lowercase result-set columns back to camelCase
by looking up the original DDL name in column metadata. TeacherInput on ROUTING_DECISION is
JSONB; TEACHER_INPUT is a separate table for the standing hold/assign.

boto3 is imported lazily so this module imports without it (the contract tests exercise
the JSON adapter; this adapter is tested with a fake Data API client locally, and against
a live cluster after deploy).
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Mapping, Optional

from .repository import DEFAULT_ANSWER_TIMEOUT_SECONDS

# The DDL writes columns in PascalCase (StudentId); Postgres folds them to lowercase in
# result sets, so the adapter receives 'studentid'. The contract records use lower-camelCase
# ('studentId', records.schema.json), so we map each lowercase column back to lower-camelCase
# (first letter lowered), NOT the PascalCase DDL spelling. Every student-state column must be
# listed here; a missing entry means the adapter returns a lowercase key, which fails the
# contract schema.
_CAMEL = {n.lower(): n[0].lower() + n[1:] for n in [
    "StudentId", "DisplayName", "Synthetic",
    "EvidenceId", "SkillId", "Level", "SourceStepId", "CreatedAt",
    "AttemptId", "StepId", "InputText", "ProjectSnapshotRef", "EvidenceLevel",
    "Confidence", "PromptVersion",
    "CheckpointId", "Status", "UpdatedAt",
    "FlagId", "Reason", "Severity", "ResolvedAt",
    "DecisionId", "ProposedCheckpointId", "TeacherInput", "AppliedCheckpointId",
    "FallbackEventId", "Component", "Error",
    "SignalId", "Signal", "HintStyle", "AngleToTry", "EvidenceRefs",
    "FeaturesHash", "ModelId",
    "HintId", "Style", "Angle",
    "Mode", "TeacherId", "AnswerTimeoutSeconds",
]}


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _to_camel(col: str) -> str:
    """Map a lowercase result-set column back to its camelCase record key.

    `_CAMEL` holds the DDL names in PascalCase (as written in schema.sql). The contract
    records use camelCase with a lowercase first letter (studentId, attemptId), so lower the
    first character of the mapped name. Unknown columns pass through unchanged.
    """
    name = _CAMEL.get(col)
    if name is None:
        return col
    return name[0].lower() + name[1:]


def _param(name: str, value: Any) -> dict[str, Any]:
    """Build an RDS Data API SqlParameter."""
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


def _field_value(field: Mapping[str, Any]) -> Any:
    """Unwrap a single RDS Data API field to a Python value."""
    if field.get("isNull"):
        return None
    for key in ("stringValue", "longValue", "doubleValue", "booleanValue"):
        if key in field:
            return field[key]
    return None


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
        self._client = client

    @property
    def client(self) -> Any:
        if self._client is None:
            import boto3

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

    def _rows(self, response: Mapping[str, Any]) -> list[dict[str, Any]]:
        cols = [_to_camel(c["name"]) for c in response.get("columnMetadata", [])]
        out: list[dict[str, Any]] = []
        for record in response.get("records", []):
            row: dict[str, Any] = {}
            for col, field in zip(cols, record):
                val = _field_value(field)
                # JSONB columns come back as strings; parse them.
                if col in ("teacherInput", "evidenceRefs") and isinstance(val, str):
                    try:
                        val = json.loads(val)
                    except (json.JSONDecodeError, TypeError):
                        pass
                row[col] = val
            out.append(row)
        return out

    # ---- students ----
    def put_student(self, student: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO STUDENT_PROFILE (StudentId, DisplayName, Synthetic) "
            "VALUES (:sid, :name, :syn) "
            "ON CONFLICT (StudentId) DO UPDATE SET DisplayName = EXCLUDED.DisplayName, "
            "Synthetic = EXCLUDED.Synthetic",
            [
                _param("sid", student["studentId"]),
                _param("name", student["displayName"]),
                _param("syn", bool(student.get("synthetic", False))),
            ],
        )
        return dict(student)

    def list_students(self) -> list[dict[str, Any]]:
        return self._rows(self._execute(
            "SELECT StudentId, DisplayName, Synthetic FROM STUDENT_PROFILE"
        ))

    # ---- evidence ----
    def append_evidence(self, row: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO STUDENT_SKILL_EVIDENCE (StudentId, SkillId, Level, SourceStepId, CreatedAt) "
            "VALUES (:sid, :skill, :level, :step, :ts::timestamptz)",
            [
                _param("sid", row["studentId"]),
                _param("skill", row["skillId"]),
                _param("level", int(row["level"])),
                _param("step", row["sourceStepId"]),
                _param("ts", row.get("createdAt", _now())),
            ],
        )
        return dict(row)

    def get_evidence(self, student_id: str) -> dict[str, int]:
        resp = self._execute(
            "SELECT SkillId, MAX(Level) AS Level FROM STUDENT_SKILL_EVIDENCE "
            "WHERE StudentId = :sid GROUP BY SkillId",
            [_param("sid", student_id)],
        )
        return {r["skillId"]: int(r["level"]) for r in self._rows(resp)}

    # ---- progress ----
    def get_progress(self, student_id: str) -> dict[str, str]:
        resp = self._execute(
            "SELECT CheckpointId, Status FROM CHECKPOINT_PROGRESS WHERE StudentId = :sid",
            [_param("sid", student_id)],
        )
        return {r["checkpointId"]: r["status"] for r in self._rows(resp)}

    def upsert_progress(self, row: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO CHECKPOINT_PROGRESS (StudentId, CheckpointId, Status, UpdatedAt) "
            "VALUES (:sid, :cid, :status, :ts::timestamptz) "
            "ON CONFLICT (StudentId, CheckpointId) DO UPDATE SET Status = EXCLUDED.Status, "
            "UpdatedAt = EXCLUDED.UpdatedAt",
            [
                _param("sid", row["studentId"]),
                _param("cid", row["checkpointId"]),
                _param("status", row["status"]),
                _param("ts", row.get("updatedAt", _now())),
            ],
        )
        return dict(row)

    # ---- attempts ----
    def save_attempt(self, attempt: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO STEP_ATTEMPT (AttemptId, StudentId, StepId, InputText, "
            "ProjectSnapshotRef, EvidenceLevel, Confidence, CreatedAt) "
            "VALUES (:aid, :sid, :step, :text, :snap, :level, :conf, :ts::timestamptz)",
            [
                _param("aid", attempt["attemptId"]),
                _param("sid", attempt["studentId"]),
                _param("step", attempt["stepId"]),
                _param("text", attempt.get("inputText")),
                _param("snap", attempt.get("projectSnapshotRef")),
                _param("level", attempt.get("evidenceLevel")),
                _param("conf", attempt.get("confidence")),
                _param("ts", attempt.get("createdAt", _now())),
            ],
        )
        return dict(attempt)

    def get_history(self, student_id: str) -> list[dict[str, Any]]:
        return self._rows(self._execute(
            "SELECT AttemptId, StudentId, StepId, InputText, ProjectSnapshotRef, "
            "EvidenceLevel, Confidence, CreatedAt FROM STEP_ATTEMPT "
            "WHERE StudentId = :sid ORDER BY CreatedAt ASC",
            [_param("sid", student_id)],
        ))

    # ---- hints ----
    def write_hint_event(self, hint: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO HINT_EVENT (HintId, StudentId, StepId, Style, Angle, CreatedAt) "
            "VALUES (:hid, :sid, :step, :style, :angle, :ts::timestamptz)",
            [
                _param("hid", hint["hintId"]),
                _param("sid", hint["studentId"]),
                _param("step", hint["stepId"]),
                _param("style", hint["style"]),
                _param("angle", hint.get("angle")),
                _param("ts", hint.get("createdAt", _now())),
            ],
        )
        return dict(hint)

    def list_hint_events(self, student_id: str) -> list[dict[str, Any]]:
        return self._rows(self._execute(
            "SELECT HintId, StudentId, StepId, Style, Angle, CreatedAt FROM HINT_EVENT "
            "WHERE StudentId = :sid ORDER BY CreatedAt ASC",
            [_param("sid", student_id)],
        ))

    # ---- routing decisions ----
    def write_routing_decision(self, decision: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO ROUTING_DECISION (DecisionId, StudentId, ProposedCheckpointId, "
            "TeacherInput, AppliedCheckpointId, Reason, CreatedAt) "
            "VALUES (:did, :sid, :proposed, :ti, :applied, :reason, :ts::timestamptz)",
            [
                _param("did", decision["decisionId"]),
                _param("sid", decision["studentId"]),
                _param("proposed", decision["proposedCheckpointId"]),
                _param("ti", decision["teacherInput"]),  # JSONB
                _param("applied", decision["appliedCheckpointId"]),
                _param("reason", decision["reason"]),
                _param("ts", decision.get("createdAt", _now())),
            ],
        )
        return dict(decision)

    def list_routing_decisions(self, student_id: str) -> list[dict[str, Any]]:
        return self._rows(self._execute(
            "SELECT DecisionId, StudentId, ProposedCheckpointId, TeacherInput, "
            "AppliedCheckpointId, Reason, CreatedAt FROM ROUTING_DECISION "
            "WHERE StudentId = :sid ORDER BY CreatedAt ASC",
            [_param("sid", student_id)],
        ))

    # ---- fallback events ----
    def write_fallback_event(self, event: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO FALLBACK_EVENT (StudentId, StepId, Component, Error, CreatedAt) "
            "VALUES (:sid, :step, :comp, :err, :ts::timestamptz)",
            [
                _param("sid", event["studentId"]),
                _param("step", event.get("stepId")),
                _param("comp", event["component"]),
                _param("err", event["error"]),
                _param("ts", event.get("createdAt", _now())),
            ],
        )
        return dict(event)

    def list_fallback_events(self, student_id: str) -> list[dict[str, Any]]:
        return self._rows(self._execute(
            "SELECT StudentId, StepId, Component, Error, CreatedAt FROM FALLBACK_EVENT "
            "WHERE StudentId = :sid ORDER BY CreatedAt ASC",
            [_param("sid", student_id)],
        ))

    # ---- passive signals ----
    def write_passive_signal(self, signal: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO PASSIVE_SIGNAL (SignalId, StudentId, Signal, HintStyle, AngleToTry, "
            "Reason, EvidenceRefs, Confidence, FeaturesHash, ModelId, PromptVersion, CreatedAt) "
            "VALUES (:sid2, :sid, :signal, :style, :angle, :reason, :refs, :conf, :hash, :model, :pv, :ts::timestamptz)",
            [
                _param("sid2", signal["signalId"]),
                _param("sid", signal["studentId"]),
                _param("signal", signal["signal"]),
                _param("style", signal["hintStyle"]),
                _param("angle", signal.get("angleToTry")),
                _param("reason", signal["reason"]),
                _param("refs", signal.get("evidenceRefs", [])),  # JSONB
                _param("conf", float(signal["confidence"])),
                _param("hash", signal["featuresHash"]),
                _param("model", signal["modelId"]),
                _param("pv", signal["promptVersion"]),
                _param("ts", signal.get("createdAt", _now())),
            ],
        )
        return dict(signal)

    def get_latest_passive_signal(self, student_id: str) -> Optional[dict[str, Any]]:
        rows = self._rows(self._execute(
            "SELECT * FROM PASSIVE_SIGNAL WHERE StudentId = :sid ORDER BY CreatedAt DESC LIMIT 1",
            [_param("sid", student_id)],
        ))
        return rows[0] if rows else None

    def get_cached_passive_signal(
        self, student_id: str, features_hash: str, prompt_version: str
    ) -> Optional[dict[str, Any]]:
        rows = self._rows(self._execute(
            "SELECT * FROM PASSIVE_SIGNAL WHERE StudentId = :sid AND FeaturesHash = :fh "
            "AND PromptVersion = :pv ORDER BY CreatedAt DESC LIMIT 1",
            [_param("sid", student_id), _param("fh", features_hash), _param("pv", prompt_version)],
        ))
        return rows[0] if rows else None

    # ---- remediation flags ----
    def write_remediation_flag(self, flag: Mapping[str, Any]) -> dict[str, Any]:
        self._execute(
            "INSERT INTO REMEDIATION_FLAG (StudentId, SkillId, Reason, Severity, CreatedAt, ResolvedAt) "
            "VALUES (:sid, :skill, :reason, :sev, :ts::timestamptz, :resolved::timestamptz)",
            [
                _param("sid", flag["studentId"]),
                _param("skill", flag["skillId"]),
                _param("reason", flag["reason"]),
                _param("sev", flag["severity"]),
                _param("ts", flag.get("createdAt", _now())),
                _param("resolved", flag.get("resolvedAt")),
            ],
        )
        return dict(flag)

    def list_open_flags(self, student_id: str) -> list[dict[str, Any]]:
        return self._rows(self._execute(
            "SELECT StudentId, SkillId, Reason, Severity, CreatedAt, ResolvedAt "
            "FROM REMEDIATION_FLAG WHERE StudentId = :sid AND ResolvedAt IS NULL "
            "ORDER BY CreatedAt ASC",
            [_param("sid", student_id)],
        ))

    # ---- teacher input and config ----
    def get_teacher_input(self, student_id: str) -> dict[str, Any]:
        rows = self._rows(self._execute(
            "SELECT Mode, CheckpointId FROM TEACHER_INPUT WHERE StudentId = :sid",
            [_param("sid", student_id)],
        ))
        if not rows:
            return {"mode": "auto"}
        r = rows[0]
        out: dict[str, Any] = {"mode": r["mode"]}
        if r.get("checkpointId"):
            out["checkpointId"] = r["checkpointId"]
        return out

    def set_teacher_input(self, student_id: str, teacher_input: Mapping[str, Any]) -> dict[str, Any]:
        updated = _now()
        self._execute(
            "INSERT INTO TEACHER_INPUT (StudentId, Mode, CheckpointId, UpdatedAt) "
            "VALUES (:sid, :mode, :cid, :ts::timestamptz) "
            "ON CONFLICT (StudentId) DO UPDATE SET Mode = EXCLUDED.Mode, "
            "CheckpointId = EXCLUDED.CheckpointId, UpdatedAt = EXCLUDED.UpdatedAt",
            [
                _param("sid", student_id),
                _param("mode", teacher_input["mode"]),
                _param("cid", teacher_input.get("checkpointId")),
                _param("ts", updated),
            ],
        )
        return {
            "studentId": student_id,
            "mode": teacher_input["mode"],
            "checkpointId": teacher_input.get("checkpointId"),
            "updatedAt": updated,
        }

    def get_teacher_config(self, teacher_id: str) -> dict[str, Any]:
        rows = self._rows(self._execute(
            "SELECT TeacherId, AnswerTimeoutSeconds FROM TEACHER_CONFIG WHERE TeacherId = :tid",
            [_param("tid", teacher_id)],
        ))
        if rows:
            return rows[0]
        return {"teacherId": teacher_id, "answerTimeoutSeconds": DEFAULT_ANSWER_TIMEOUT_SECONDS}
