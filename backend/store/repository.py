"""The repository interface (seam 4).

Mirrors REPOSITORY_METHODS in shared/contracts/seams.js. Methods take and return the
camelCase records in shared/contracts/schemas/records.schema.json. Both the JSON and the
Aurora adapters implement this, and both are checked by the same contract tests.

Defined as a Protocol so adapters are structurally typed and the contract test can assert
every method is present without a base-class import.
"""

from __future__ import annotations

from typing import Any, Mapping, Optional, Protocol, Sequence, runtime_checkable

DEFAULT_ANSWER_TIMEOUT_SECONDS = 180  # C-8 teacher_config default


@runtime_checkable
class Repository(Protocol):
    # Students
    def put_student(self, student: Mapping[str, Any]) -> Mapping[str, Any]: ...
    def list_students(self) -> list[dict[str, Any]]: ...

    # Evidence (append-only; level is the max observed, C-10)
    def append_evidence(self, row: Mapping[str, Any]) -> Mapping[str, Any]: ...
    def get_evidence(self, student_id: str) -> dict[str, int]: ...

    # Progress
    def get_progress(self, student_id: str) -> dict[str, str]: ...
    def upsert_progress(self, row: Mapping[str, Any]) -> Mapping[str, Any]: ...

    # Attempts
    def save_attempt(self, attempt: Mapping[str, Any]) -> Mapping[str, Any]: ...
    def get_history(self, student_id: str) -> list[dict[str, Any]]: ...

    # Hints
    def write_hint_event(self, hint: Mapping[str, Any]) -> Mapping[str, Any]: ...
    def list_hint_events(self, student_id: str) -> list[dict[str, Any]]: ...

    # Routing decisions
    def write_routing_decision(self, decision: Mapping[str, Any]) -> Mapping[str, Any]: ...
    def list_routing_decisions(self, student_id: str) -> list[dict[str, Any]]: ...

    # Fallback events
    def write_fallback_event(self, event: Mapping[str, Any]) -> Mapping[str, Any]: ...
    def list_fallback_events(self, student_id: str) -> list[dict[str, Any]]: ...

    # Passive signals (with cache lookup)
    def write_passive_signal(self, signal: Mapping[str, Any]) -> Mapping[str, Any]: ...
    def get_latest_passive_signal(self, student_id: str) -> Optional[dict[str, Any]]: ...
    def get_cached_passive_signal(
        self, student_id: str, features_hash: str, prompt_version: str
    ) -> Optional[dict[str, Any]]: ...

    # Remediation flags
    def write_remediation_flag(self, flag: Mapping[str, Any]) -> Mapping[str, Any]: ...
    def list_open_flags(self, student_id: str) -> list[dict[str, Any]]: ...

    # Teacher input and config
    def get_teacher_input(self, student_id: str) -> dict[str, Any]: ...
    def set_teacher_input(self, student_id: str, teacher_input: Mapping[str, Any]) -> dict[str, Any]: ...
    def get_teacher_config(self, teacher_id: str) -> dict[str, Any]: ...


# The method names a contract test checks for (kept in sync with REPOSITORY_METHODS on the JS side).
REPOSITORY_METHODS: tuple[str, ...] = (
    "put_student",
    "list_students",
    "append_evidence",
    "get_evidence",
    "get_progress",
    "upsert_progress",
    "save_attempt",
    "get_history",
    "write_hint_event",
    "list_hint_events",
    "write_routing_decision",
    "list_routing_decisions",
    "write_fallback_event",
    "list_fallback_events",
    "write_passive_signal",
    "get_latest_passive_signal",
    "get_cached_passive_signal",
    "write_remediation_flag",
    "list_open_flags",
    "get_teacher_input",
    "set_teacher_input",
    "get_teacher_config",
)
