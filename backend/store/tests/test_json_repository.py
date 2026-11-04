"""The JSON adapter must pass the repository contract, and persist to disk when given a path."""

from backend.store import JsonRepository
from backend.store.tests.contract import check_repository


def test_json_repository_passes_contract():
    check_repository(lambda: JsonRepository())


def test_json_repository_persists_and_reloads(tmp_path):
    path = tmp_path / "store.json"
    repo = JsonRepository(path)
    repo.put_student({"studentId": "stu-quick", "displayName": "Quick Quinn", "synthetic": True})
    repo.append_evidence({"studentId": "stu-quick", "skillId": "build", "level": 2,
                          "sourceStepId": "intro-web-dev", "createdAt": "2026-11-04T10:00:00Z"})

    reloaded = JsonRepository(path)
    assert [s["studentId"] for s in reloaded.list_students()] == ["stu-quick"]
    assert reloaded.get_evidence("stu-quick") == {"build": 2}
