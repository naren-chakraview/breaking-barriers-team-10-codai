"""Store seam (seam 4): the repository interface and its adapters (ADR-016, ADR-017).

`JsonRepository` is the demo-mode adapter (STORE_MODE=json). `AuroraRepository` is the
deployed adapter over the RDS Data API (STORE_MODE=aurora), using string ids and skill slugs
per ADR-017. Use `create_repository` from `factory.py` to pick the right one from the env.
"""

from .repository import Repository
from .json_repository import JsonRepository
from .aurora_repository import AuroraRepository
from .factory import create_repository

__all__ = ["Repository", "JsonRepository", "AuroraRepository", "create_repository"]
