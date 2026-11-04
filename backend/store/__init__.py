"""Store seam (seam 4): the repository and its adapters (ADR-016).

The repository interface is storage-agnostic. `JsonRepository` is the demo-mode adapter
(STORE_MODE=json); `AuroraRepository` is the deployed adapter over the RDS Data API
(STORE_MODE=aurora). Both satisfy the same contract suite, so swapping is a config change.
"""

from .repository import Repository
from .json_repository import JsonRepository

__all__ = ["Repository", "JsonRepository"]
