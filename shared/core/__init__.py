"""CodeAI pure domain core (Track B, Task 2).

No AWS, no I/O, no model calls. Deterministic and unit-tested. The behavioral source of
truth for routing, evidence and the Passive rule baseline (C-18, C-19, C-10).
"""

from .tree import Tree, load_tree
from .evidence import apply_evidence, display_score, skill_max
from .routing import route, RouteResult, available_checkpoints
from .features import extract_features, rule_signal

__all__ = [
    "Tree",
    "load_tree",
    "apply_evidence",
    "display_score",
    "skill_max",
    "route",
    "RouteResult",
    "available_checkpoints",
    "extract_features",
    "rule_signal",
]
