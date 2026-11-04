"""Small helpers for the API layer.

Output must satisfy the contracts: correlationId matches ^[A-Za-z0-9_-]{8,64}$
(common.schema.json), timestamps are server-set UTC ISO 8601 (ADR-006), and errors are the
C-29 shape {"error": {"code", "message"}}.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

# The C-29 error codes (mirrors ENUMS.ErrorCode in shared/contracts/seams.js).
ERROR_CODES = (
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "VALIDATION_ERROR",
    "CONTENT_BLOCKED",
    "RATE_LIMITED",
    "TIMEOUT",
    "UPSTREAM_ERROR",
    "CONFIG_ERROR",
    "INTERNAL",
)


class ContractError(Exception):
    """One error type for every seam. `.error` is exactly the C-29 wire shape.

    The HTTP layer serializes {"error": self.error}.
    """

    def __init__(self, code: str, message: str) -> None:
        if code not in ERROR_CODES:
            raise ValueError(f"Unknown error code: {code}")
        super().__init__(message)
        self.code = code
        self.error = {"code": code, "message": message}


def new_correlation_id(prefix: str = "corr") -> str:
    """A fresh correlation id matching the 8..64 CorrelationId pattern."""
    return f"{prefix}-{uuid.uuid4().hex[:20]}"


def new_record_id(prefix: str) -> str:
    """A short random id matching the records' id pattern ^[A-Za-z0-9_-]{4,64}$."""
    body = uuid.uuid4().hex[:24]
    return f"{prefix}-{body}" if prefix else body


def now_iso() -> str:
    """Server timestamp in the contract Timestamp format (seconds precision, trailing Z)."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def as_contract_error(err: Exception) -> ContractError:
    """Wrap an unknown exception so only the C-29 shape escapes (never leak internals)."""
    if isinstance(err, ContractError):
        return err
    return ContractError("INTERNAL", "An unexpected error occurred.")
