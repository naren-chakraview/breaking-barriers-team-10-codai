"""Reusable repository contract checks (seam 4), the Python mirror of
shared/contracts/harness.js:runRepositoryContract. Any adapter passing these matches the
JSON adapter's behavior, so swapping STORE_MODE is a config change, not a rewrite.

Call `check_repository(make_repo)` from a test. `make_repo` returns a fresh, empty repo.
"""

from __future__ import annotations

from typing import Any, Callable

from backend.store.repository import REPOSITORY_METHODS, DEFAULT_ANSWER_TIMEOUT_SECONDS


def check_repository(make_repo: Callable[[], Any]) -> None:
    _implements_every_method(_seeded(make_repo))
    _evidence_is_monotonic(_seeded(make_repo))
    _history_is_time_ordered(_seeded(make_repo))
    _progress_upsert_idempotent(_seeded(make_repo))
    _teacher_config_default(_seeded(make_repo))
    _fallback_accepts_passive(_seeded(make_repo))
    _passive_cache_lookup(_seeded(make_repo))
    _open_flags_exclude_resolved(_seeded(make_repo))


# The test writes student-state rows for "stu-x". A relational adapter (Aurora) enforces the
# StudentId -> STUDENT_PROFILE foreign key, so the student must exist before any child row.
# The JSON adapter has no FKs and simply records it. Seeding through put_student (part of the
# repository interface) keeps this adapter-agnostic. The referenced skill slug, step and
# checkpoints come from the loaded master data (seed.sql); only the synthetic student is ours.
def _seeded(make_repo: Callable[[], Any]) -> Any:
    repo = make_repo()
    repo.put_student({"studentId": "stu-x", "displayName": "Test Student", "synthetic": True})
    return repo


def _implements_every_method(repo: Any) -> None:
    for m in REPOSITORY_METHODS:
        assert callable(getattr(repo, m, None)), f"missing {m}"


def _evidence_is_monotonic(repo: Any) -> None:
    base = {"studentId": "stu-x", "skillId": "build", "sourceStepId": "steer-it-project"}
    repo.append_evidence({**base, "level": 2, "createdAt": "2026-11-04T10:00:00Z"})
    repo.append_evidence({**base, "level": 1, "createdAt": "2026-11-04T10:05:00Z"})
    assert repo.get_evidence("stu-x")["build"] == 2  # max, never decreases (C-10)


def _history_is_time_ordered(repo: Any) -> None:
    repo.save_attempt({"attemptId": "a2", "studentId": "stu-x", "stepId": "steer-it-project",
                       "inputText": "second", "projectSnapshotRef": None, "evidenceLevel": 1,
                       "confidence": 0.7, "createdAt": "2026-11-04T10:05:00Z"})
    repo.save_attempt({"attemptId": "a1", "studentId": "stu-x", "stepId": "steer-it-project",
                       "inputText": "first", "projectSnapshotRef": None, "evidenceLevel": 0,
                       "confidence": 0.7, "createdAt": "2026-11-04T10:00:00Z"})
    assert [a["attemptId"] for a in repo.get_history("stu-x")] == ["a1", "a2"]


def _progress_upsert_idempotent(repo: Any) -> None:
    repo.upsert_progress({"studentId": "stu-x", "checkpointId": "steer-it", "status": "current",
                          "updatedAt": "2026-11-04T10:00:00Z"})
    repo.upsert_progress({"studentId": "stu-x", "checkpointId": "steer-it", "status": "completed",
                          "updatedAt": "2026-11-04T10:10:00Z"})
    assert repo.get_progress("stu-x")["steer-it"] == "completed"


def _teacher_config_default(repo: Any) -> None:
    assert repo.get_teacher_config("teacher-1")["answerTimeoutSeconds"] == DEFAULT_ANSWER_TIMEOUT_SECONDS


def _fallback_accepts_passive(repo: Any) -> None:
    repo.write_fallback_event({"studentId": "stu-x", "stepId": "steer-it-project",
                               "component": "passive", "error": "low_confidence",
                               "createdAt": "2026-11-04T10:00:00Z"})
    assert repo.list_fallback_events("stu-x")[-1]["component"] == "passive"


def _passive_cache_lookup(repo: Any) -> None:
    # featuresHash must be a real hex hash in the schema (CHECK ~ '^[a-f0-9]{8,64}$'); use a
    # valid value so the contract exercises the same shape both adapters see in production.
    features_hash = "abc12345"
    sig = {"signalId": "sig-1", "studentId": "stu-x", "signal": "steady",
           "hintStyle": "guiding_question", "angleToTry": None, "reason": "ok",
           "evidenceRefs": [], "confidence": 0.7, "featuresHash": features_hash,
           "modelId": "rules", "promptVersion": "p1", "createdAt": "2026-11-04T10:00:00Z"}
    repo.write_passive_signal(sig)
    hit = repo.get_cached_passive_signal("stu-x", features_hash, "p1")
    assert hit is not None and hit["signalId"] == "sig-1"
    assert repo.get_cached_passive_signal("stu-x", "deadbeef", "p1") is None


def _open_flags_exclude_resolved(repo: Any) -> None:
    repo.write_remediation_flag({"studentId": "stu-x", "skillId": "build", "reason": "misses",
                                 "severity": "high", "createdAt": "2026-11-04T10:00:00Z",
                                 "resolvedAt": None})
    repo.write_remediation_flag({"studentId": "stu-x", "skillId": "language", "reason": "done",
                                 "severity": "normal", "createdAt": "2026-11-04T09:00:00Z",
                                 "resolvedAt": "2026-11-04T09:30:00Z"})
    open_flags = repo.list_open_flags("stu-x")
    assert [f["skillId"] for f in open_flags] == ["build"]
