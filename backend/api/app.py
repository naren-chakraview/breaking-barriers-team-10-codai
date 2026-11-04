"""Application bootstrap: assemble the dependency graph from the mode switches (ADR-014).

This is the one place that chooses real vs stub for each seam, so the handlers stay oblivious
to which is live:

  STORE_MODE : json | aurora   -> backend/store (aurora adapter built over the Data API, ADR-017)
  MODEL_MODE : stub | bedrock  -> StubModel here; bedrock is injected by Track C

The domain core (shared/core, Track B) is imported directly — it is a merged dependency.
"""

from __future__ import annotations

import os
from typing import Any, Callable, Mapping, Optional

import shared.core as core
from shared.core.tree import Tree, load_tree

from backend.store.factory import create_repository

from .services import Deps, create_services
from .http import create_router
from .model import StubModel

_VALID_STORE = ("json", "aurora")
_VALID_MODEL = ("stub", "bedrock")


def _resolve_modes(env: Mapping[str, str]) -> dict[str, str]:
    store = env.get("STORE_MODE") or "json"
    model = env.get("MODEL_MODE") or "stub"
    service = env.get("VITE_SERVICE_MODE") or "mock"
    if store not in _VALID_STORE:
        raise ValueError(f"STORE_MODE must be one of {_VALID_STORE}")
    if model not in _VALID_MODEL:
        raise ValueError(f"MODEL_MODE must be one of {_VALID_MODEL}")
    return {"serviceMode": service, "modelMode": model, "storeMode": store}


def build_app(
    tree: Optional[Tree] = None,
    model: Any = None,
    repo: Any = None,
    env: Optional[Mapping[str, str]] = None,
    store_path: Optional[str] = None,
    per_student_cap: int = 500,
) -> dict[str, Any]:
    """Build the wired services + router.

    Returns {"services": {...}, "router": callable, "modes": {...}}.
    """
    env = env if env is not None else dict(os.environ)
    modes = _resolve_modes(env)

    the_tree = tree or load_tree()
    repository = repo or create_repository(dict(env), path=store_path)

    if model is not None:
        model_port = model
    elif modes["modelMode"] == "bedrock":
        raise RuntimeError(
            "MODEL_MODE=bedrock but no model port was injected. Track C provides the bedrock "
            "ModelPort; pass it as build_app(model=...)."
        )
    else:
        model_port = StubModel()

    deps = Deps(core=core, model=model_port, repo=repository, tree=the_tree, modes=modes)
    services = create_services(deps)
    router = create_router(services, per_student_cap=per_student_cap)
    return {"services": services, "router": router, "modes": modes}
