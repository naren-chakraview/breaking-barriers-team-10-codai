"""Aurora adapter unit tests with a fake Data API client (no AWS, no boto3 needed).

The fake records SQL and parameters and returns canned Data API responses, so we can assert
the adapter builds the right statements and unwraps result fields correctly. The full
behavioral contract is proven by running check_repository against a live cluster after
deploy (see backend/store/README.md); that is not run in CI.
"""

from __future__ import annotations

from typing import Any

from backend.store.aurora_repository import AuroraRepository, _param, _field_value


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


def make_repo() -> tuple[AuroraRepository, FakeDataApi]:
    fake = FakeDataApi()
    repo = AuroraRepository(
        cluster_arn="arn:aws:rds:us-west-2:111122223333:cluster:codeai",
        secret_arn="arn:aws:secretsmanager:us-west-2:111122223333:secret:codeai-xyz",
        database="codeai",
        client=fake,
    )
    return repo, fake


def test_param_type_selection():
    assert _param("a", None)["value"] == {"isNull": True}
    assert _param("a", True)["value"] == {"booleanValue": True}
    assert _param("a", 3)["value"] == {"longValue": 3}
    assert _param("a", 1.5)["value"] == {"doubleValue": 1.5}
    assert _param("a", "x")["value"] == {"stringValue": "x"}
    json_param = _param("a", {"mode": "auto"})
    assert json_param["typeHint"] == "JSON"


def test_append_evidence_sends_insert_with_params():
    repo, fake = make_repo()
    repo.append_evidence({"studentId": "stu-x", "skillId": "build", "level": 2,
                          "sourceStepId": "steer-it-project", "createdAt": "2026-11-04T10:00:00Z"})
    call = fake.calls[-1]
    assert "INSERT INTO student_skill_evidence" in call["sql"]
    assert call["resourceArn"].endswith(":cluster:codeai")
    assert call["secretArn"].startswith("arn:aws:secretsmanager")
    names = {p["name"]: p["value"] for p in call["parameters"]}
    assert names["level"] == {"longValue": 2}
    assert names["skill_id"] == {"stringValue": "build"}


def test_get_evidence_unwraps_rows():
    repo, fake = make_repo()
    fake.queue({
        "columnMetadata": [{"name": "skill_id"}, {"name": "level"}],
        "records": [
            [{"stringValue": "build"}, {"longValue": 2}],
            [{"stringValue": "language"}, {"longValue": 1}],
        ],
    })
    assert repo.get_evidence("stu-x") == {"build": 2, "language": 1}


def test_get_teacher_config_falls_back_to_default():
    repo, fake = make_repo()
    fake.queue({"columnMetadata": [], "records": []})  # no row
    assert repo.get_teacher_config("teacher-1")["answerTimeoutSeconds"] == 180


def test_routing_decision_json_param_and_roundtrip():
    repo, fake = make_repo()
    repo.write_routing_decision({
        "decisionId": "d1", "studentId": "stu-x", "proposedCheckpointId": "steer-it",
        "teacherInput": {"mode": "assign", "checkpointId": "use-the-lingo"},
        "appliedCheckpointId": "use-the-lingo", "reason": "assigned", "createdAt": "2026-11-04T10:00:00Z",
    })
    call = fake.calls[-1]
    ti = next(p for p in call["parameters"] if p["name"] == "teacher_input")
    assert ti["typeHint"] == "JSON"

    # Reading back: a JSON string column is parsed into a dict.
    fake.queue({
        "columnMetadata": [
            {"name": "decision_id"}, {"name": "student_id"}, {"name": "proposed_checkpoint_id"},
            {"name": "teacher_input"}, {"name": "applied_checkpoint_id"}, {"name": "reason"},
            {"name": "created_at"},
        ],
        "records": [[
            {"stringValue": "d1"}, {"stringValue": "stu-x"}, {"stringValue": "steer-it"},
            {"stringValue": "{\"mode\": \"assign\", \"checkpointId\": \"use-the-lingo\"}"},
            {"stringValue": "use-the-lingo"}, {"stringValue": "assigned"},
            {"stringValue": "2026-11-04T10:00:00Z"},
        ]],
    })
    rows = repo.list_routing_decisions("stu-x")
    assert rows[0]["teacherInput"]["mode"] == "assign"


def test_field_value_unwraps_null():
    assert _field_value({"isNull": True}) is None
    assert _field_value({"stringValue": "x"}) == "x"
