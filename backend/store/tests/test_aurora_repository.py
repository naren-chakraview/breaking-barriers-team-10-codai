"""Aurora adapter tests with a fake Data API client (no AWS, no boto3 needed).

Verifies SQL generation, parameter typing, result unwrapping (lowercase → camelCase via
_CAMEL), and the JSONB round-trip for TeacherInput and EvidenceRefs. The full behavioral
contract (`check_repository`) runs against a live cluster after deploy.
"""

from __future__ import annotations

import json
from typing import Any

import pytest

from backend.store.aurora_repository import AuroraRepository, _param, _field_value, _to_camel
from backend.store.factory import create_repository


class FakeDataApi:
    """Stand-in for boto3 rds-data. Captures calls; returns queued responses."""

    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []
        self._responses: list[dict[str, Any]] = []

    def queue(self, response: dict[str, Any]) -> None:
        self._responses.append(response)

    def execute_statement(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append(kwargs)
        return self._responses.pop(0) if self._responses else {"records": [], "columnMetadata": []}


def _repo() -> tuple[AuroraRepository, FakeDataApi]:
    fake = FakeDataApi()
    repo = AuroraRepository(
        cluster_arn="arn:aws:rds:us-west-2:111122223333:cluster:codeai",
        secret_arn="arn:aws:secretsmanager:us-west-2:111122223333:secret:codeai-xyz",
        database="codeai",
        client=fake,
    )
    return repo, fake


# ---- parameter typing ----

def test_param_type_selection():
    assert _param("a", None)["value"] == {"isNull": True}
    assert _param("a", True)["value"] == {"booleanValue": True}
    assert _param("a", 3)["value"] == {"longValue": 3}
    assert _param("a", 1.5)["value"] == {"doubleValue": 1.5}
    assert _param("a", "x")["value"] == {"stringValue": "x"}
    json_param = _param("a", {"mode": "auto"})
    assert json_param["typeHint"] == "JSON"


# ---- camelCase mapping (ADR-017) ----

def test_to_camel_maps_known_columns():
    # The contract records use lower-camelCase (records.schema.json), so the Postgres-lowered
    # column maps back to lower-camelCase, not the PascalCase DDL spelling.
    assert _to_camel("studentid") == "studentId"
    assert _to_camel("createdat") == "createdAt"
    assert _to_camel("teacherinput") == "teacherInput"
    assert _to_camel("evidencerefs") == "evidenceRefs"
    assert _to_camel("featureshash") == "featuresHash"  # Postgres-lowered → lower-camelCase
    assert _to_camel("unknowncol") == "unknowncol"       # unknown → passthrough


# ---- evidence (string ids, skill slugs, max level) ----

def test_append_evidence_uses_string_ids():
    repo, fake = _repo()
    repo.append_evidence({"studentId": "stu-quick", "skillId": "build", "level": 2,
                          "sourceStepId": "steer-it-project", "createdAt": "2026-11-04T10:00:00Z"})
    call = fake.calls[-1]
    assert "INSERT INTO STUDENT_SKILL_EVIDENCE" in call["sql"]
    names = {p["name"]: p["value"] for p in call["parameters"]}
    assert names["sid"] == {"stringValue": "stu-quick"}
    assert names["skill"] == {"stringValue": "build"}
    assert names["level"] == {"longValue": 2}


def test_get_evidence_unwraps_to_string_keys():
    repo, fake = _repo()
    fake.queue({
        "columnMetadata": [{"name": "skillid"}, {"name": "level"}],
        "records": [
            [{"stringValue": "build"}, {"longValue": 2}],
            [{"stringValue": "language"}, {"longValue": 1}],
        ],
    })
    assert repo.get_evidence("stu-quick") == {"build": 2, "language": 1}


# ---- routing decision: JSONB TeacherInput ----

def test_routing_decision_jsonb_roundtrip():
    repo, fake = _repo()
    repo.write_routing_decision({
        "decisionId": "d1", "studentId": "stu-slow", "proposedCheckpointId": "steer-it",
        "teacherInput": {"mode": "assign", "checkpointId": "use-the-lingo"},
        "appliedCheckpointId": "use-the-lingo", "reason": "assigned", "createdAt": "2026-11-04T10:00:00Z",
    })
    call = fake.calls[-1]
    ti = next(p for p in call["parameters"] if p["name"] == "ti")
    assert ti["typeHint"] == "JSON"

    fake.queue({
        "columnMetadata": [
            {"name": "decisionid"}, {"name": "studentid"}, {"name": "proposedcheckpointid"},
            {"name": "teacherinput"}, {"name": "appliedcheckpointid"}, {"name": "reason"},
            {"name": "createdat"},
        ],
        "records": [[
            {"stringValue": "d1"}, {"stringValue": "stu-slow"}, {"stringValue": "steer-it"},
            {"stringValue": json.dumps({"mode": "assign", "checkpointId": "use-the-lingo"})},
            {"stringValue": "use-the-lingo"}, {"stringValue": "assigned"},
            {"stringValue": "2026-11-04T10:00:00Z"},
        ]],
    })
    rows = repo.list_routing_decisions("stu-slow")
    assert rows[0]["teacherInput"]["mode"] == "assign"
    assert rows[0]["teacherInput"]["checkpointId"] == "use-the-lingo"


# ---- teacher input (separate table, ADR-017) ----

def test_teacher_input_default_is_auto():
    repo, fake = _repo()
    fake.queue({"columnMetadata": [], "records": []})
    assert repo.get_teacher_input("stu-x") == {"mode": "auto"}


# ---- teacher config default ----

def test_teacher_config_default_timeout():
    repo, fake = _repo()
    fake.queue({"columnMetadata": [], "records": []})
    assert repo.get_teacher_config("teacher-1")["answerTimeoutSeconds"] == 180


# ---- factory ----

def test_factory_aurora_requires_arns():
    with pytest.raises(ValueError, match="AURORA_CLUSTER_ARN"):
        create_repository({"STORE_MODE": "aurora"})


def test_factory_aurora_with_arns():
    repo = create_repository({
        "STORE_MODE": "aurora",
        "AURORA_CLUSTER_ARN": "arn:aws:rds:us-west-2:111:cluster:x",
        "AURORA_SECRET_ARN": "arn:aws:secretsmanager:us-west-2:111:secret:x",
    })
    assert isinstance(repo, AuroraRepository)


def test_field_value_unwraps_null():
    assert _field_value({"isNull": True}) is None
    assert _field_value({"stringValue": "x"}) == "x"
    assert _field_value({"longValue": 42}) == 42
    assert _field_value({"booleanValue": True}) is True
