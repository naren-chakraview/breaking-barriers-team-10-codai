"""Store seam (seam 4): the repository interface and its adapters (ADR-016).

`JsonRepository` is the demo-mode adapter (STORE_MODE=json). The Aurora adapter
(STORE_MODE=aurora) is not built yet. It is unblocked: Task 4.6 aligned `database/schema.sql`
with the contract records (ADR-017), and the deployed cluster holds the schema and master data.
The row-to-record mapping is in backend/store/README.md.
"""

from .repository import Repository
from .json_repository import JsonRepository

__all__ = ["Repository", "JsonRepository"]
