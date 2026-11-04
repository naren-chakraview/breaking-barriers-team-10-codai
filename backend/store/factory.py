"""Store factory: pick the repository adapter from STORE_MODE (ADR-016).

`json` (default) -> JsonRepository (demo mode, no AWS). `aurora` -> the Aurora adapter, which
is deferred pending the schema reconciliation (see README.md); selecting it today raises a
clear error rather than silently falling back, so a misconfigured deploy is obvious.
"""

from __future__ import annotations

import os
from typing import Any, Optional

from .json_repository import JsonRepository

VALID_MODES = ("json", "aurora")


def create_repository(env: Optional[dict[str, str]] = None, path: Optional[str] = None) -> Any:
    """Create the repository for the current STORE_MODE.

    @param env: environment mapping (defaults to os.environ)
    @param path: JSON store file for json mode (optional; in-memory if omitted)
    """
    env = env if env is not None else dict(os.environ)
    mode = env.get("STORE_MODE") or "json"
    if mode not in VALID_MODES:
        raise ValueError(f"STORE_MODE must be one of {VALID_MODES}, got {mode!r}")
    if mode == "aurora":
        raise NotImplementedError(
            "STORE_MODE=aurora is deferred pending the schema reconciliation with the data "
            "track (see backend/store/README.md). Use STORE_MODE=json for now."
        )
    return JsonRepository(path)
