"""End-to-end integration with the Aurora store adapter, offline.

Runs the API's submit flow with a real AuroraRepository backed by a SQL-executing fake Data
API (see backend/store/tests/test_aurora_contract_fake.SqlFakeDataApi), then reads the rows
back through the adapter and validates them against the contract record schemas. This proves
the API works unchanged on STORE_MODE=aurora and that the adapter's read-back casing matches
the contract (the live cluster test is the final word on real Postgres).
"""

from __future__ import annotations

from backend.api.app import build_app
from backend.api.schema_validate import problems
from backend.store.aurora_repository import AuroraRepository
from backend.store.tests.test_aurora_contract_fake import SqlFakeDataApi


def _aurora_repo():
    return AuroraRepository(cluster_arn="arn:x", secret_arn="arn:y", database="codeai", client=SqlFakeDataApi())


def test_submit_end_to_end_on_aurora_adapter():
    repo = _aurora_repo()
    app = build_app(env={"STORE_MODE": "json", "MODEL_MODE": "stub"}, repo=repo)
    h = {"authorization": "Bearer demo", "x-user-id": "stu-aur", "x-role": "student"}

    res = app["router"]({
        "method": "POST", "path": "/steps/steer-it-project/submit", "headers": h,
        "body": {"courseId": "hoai2026-adaptive", "checkpointId": "steer-it", "kind": "prompt",
                 "text": "Make the heading say Robotics Club, keep the layout.",
                 "project": {"html": "<h1>Hi</h1>", "css": "", "js": ""}},
    })
    assert res["status"] == 200
    assert problems("services", "SubmitResponse", res["body"]) == []
    assert res["body"]["outcome"] == "scored"

    # Rows read back through the adapter must validate against the contract records (lower-
    # camelCase keys). This is the regression guard for the _CAMEL casing bug.
    history = repo.get_history("stu-aur")
    assert len(history) == 1
    assert problems("records", "StepAttempt", history[0]) == []
    assert "attemptId" in history[0] and "createdAt" in history[0]

    decisions = repo.list_routing_decisions("stu-aur")
    assert len(decisions) == 1
    assert problems("records", "RoutingDecision", decisions[0]) == []

    assert repo.get_evidence("stu-aur") == {"build": 2}
    assert repo.get_progress("stu-aur")["steer-it"] == "completed"
