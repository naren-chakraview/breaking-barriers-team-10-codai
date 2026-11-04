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

# SSM parameter names the Bedrock port resolves at runtime (architecture 2.14). Written by
# the Guardrail/model config stack; the keys here mirror backend.ai.factory's config keys.
_SSM_PARAMS = {
    "model.fast": "/codeai/model/fast",
    "model.strong": "/codeai/model/strong",
    "guardrail.id": "/codeai/guardrail/id",
    "guardrail.version": "/codeai/guardrail/version",
}


def _ssm_config_resolver(region: Optional[str]) -> Callable[[str], Optional[str]]:
    """A `get_config(key)` backed by SSM Parameter Store, reading each value once.

    boto3 is imported lazily so stub mode never needs it. Missing parameters return None,
    which makes create_bedrock_port raise a clear "missing config" error at build time
    rather than failing on the first model call.
    """
    import boto3  # lazy: only on MODEL_MODE=bedrock

    ssm = boto3.client("ssm", region_name=region)
    cache: dict[str, Optional[str]] = {}

    def get_config(key: str) -> Optional[str]:
        if key in cache:
            return cache[key]
        name = _SSM_PARAMS.get(key)
        if name is None:
            cache[key] = None
            return None
        try:
            value = ssm.get_parameter(Name=name)["Parameter"]["Value"]
        except Exception:
            value = None
        cache[key] = value
        return value

    return get_config


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
    config_resolver: Optional[Callable[[str], Optional[str]]] = None,
) -> dict[str, Any]:
    """Build the wired services + router.

    Returns {"services": {...}, "router": callable, "modes": {...}}.

    @param config_resolver: optional `get_config(key)` for the Bedrock port's SSM-backed
                            values; defaults to a live SSM reader. Injectable for tests.
    """
    env = env if env is not None else dict(os.environ)
    modes = _resolve_modes(env)

    the_tree = tree or load_tree()
    repository = repo or create_repository(dict(env), path=store_path)

    if model is not None:
        model_port = model
    elif modes["modelMode"] == "bedrock":
        # Build the real Bedrock port from SSM-backed config (Task 6). Imported lazily so
        # stub mode carries no dependency on Track C or boto3.
        from backend.ai import create_bedrock_port

        region = env.get("AWS_REGION") or env.get("CDK_DEFAULT_REGION")
        get_config = config_resolver or _ssm_config_resolver(region)
        model_port = create_bedrock_port(get_config, region_name=region)
    else:
        model_port = StubModel()

    deps = Deps(core=core, model=model_port, repo=repository, tree=the_tree, modes=modes)
    services = create_services(deps)
    router = create_router(services, per_student_cap=per_student_cap)
    return {"services": services, "router": router, "modes": modes}
