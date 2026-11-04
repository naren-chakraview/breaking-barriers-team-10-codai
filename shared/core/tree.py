"""Load and index the skill tree (C-5, C-6).

Content is data, loaded from database/sample-skilltree.json. It is never copied into code.
Ids are the JSON string slugs.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import cached_property
from pathlib import Path
from typing import Any, Optional

# Repo-root-relative path to the single content file.
_DEFAULT_TREE_PATH = (
    Path(__file__).resolve().parents[2] / "database" / "sample-skilltree.json"
)


@dataclass(frozen=True)
class Tree:
    """An indexed, read-only view over the skill tree JSON.

    Wraps the raw dict rather than re-modelling it, so new content fields never require a
    code change (C-6). Lookups are O(1).
    """

    raw: dict[str, Any]

    @cached_property
    def id(self) -> str:
        return self.raw["id"]

    @cached_property
    def checkpoints(self) -> list[dict[str, Any]]:
        return self.raw["checkpoints"]

    @cached_property
    def skills(self) -> dict[str, dict[str, Any]]:
        return self.raw["skills"]

    @cached_property
    def _by_id(self) -> dict[str, dict[str, Any]]:
        return {c["id"]: c for c in self.checkpoints}

    @cached_property
    def _order(self) -> dict[str, int]:
        # JSON order, used for deterministic tie-breaking (C-19.3).
        return {c["id"]: i for i, c in enumerate(self.checkpoints)}

    @cached_property
    def skill_max(self) -> dict[str, int]:
        return {
            sid: max(int(level) for level in skill["evidenceLevels"])
            for sid, skill in self.skills.items()
        }

    def checkpoint(self, checkpoint_id: str) -> Optional[dict[str, Any]]:
        return self._by_id.get(checkpoint_id)

    def has_checkpoint(self, checkpoint_id: str) -> bool:
        return checkpoint_id in self._by_id

    def order_of(self, checkpoint_id: str) -> int:
        return self._order.get(checkpoint_id, len(self._order))

    def requires(self, checkpoint_id: str) -> list[str]:
        cp = self.checkpoint(checkpoint_id)
        return list(cp.get("requires", [])) if cp else []

    def targets(self, checkpoint_id: str) -> dict[str, int]:
        cp = self.checkpoint(checkpoint_id)
        return dict(cp.get("targetEvidenceLevels", {})) if cp else {}

    def skill_ids(self, checkpoint_id: str) -> list[str]:
        cp = self.checkpoint(checkpoint_id)
        return list(cp.get("skillIds", [])) if cp else []

    def is_skippable(self, checkpoint_id: str) -> bool:
        cp = self.checkpoint(checkpoint_id)
        return bool(cp and cp.get("skippable", False))

    def routes_after_completion(self, checkpoint_id: str) -> bool:
        cp = self.checkpoint(checkpoint_id)
        return bool(cp and cp.get("routeAfterCompletion", False))


def load_tree(path: str | Path | None = None) -> Tree:
    """Load the tree from disk (defaults to database/sample-skilltree.json)."""
    tree_path = Path(path) if path else _DEFAULT_TREE_PATH
    with open(tree_path, encoding="utf-8") as fh:
        return Tree(json.load(fh))


def from_dict(raw: dict[str, Any]) -> Tree:
    """Wrap an already-parsed tree dict (used by tests and by callers that cache the JSON)."""
    return Tree(raw)
