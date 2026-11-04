"""Store seam (seam 4): the repository interface and its adapters (ADR-016).

`JsonRepository` is the demo-mode adapter (STORE_MODE=json). The Aurora adapter
(STORE_MODE=aurora) is deferred: the merged `database/schema.sql` uses INTEGER student ids
and a different teacher-input model than the contract records, so the mapping is a
reconciliation the data track owns (see backend/store/README.md and the PR notes).
"""

from .repository import Repository
from .json_repository import JsonRepository

__all__ = ["Repository", "JsonRepository"]
