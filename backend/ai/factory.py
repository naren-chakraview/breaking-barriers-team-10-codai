"""Build the Bedrock model port from config (seam 3 wiring).

The API's `build_app(model=...)` takes an injected `ModelPort` and never imports Track C
or boto3. This factory is the glue a deployment entrypoint uses:

    from backend.ai import create_bedrock_port
    from backend.api.app import build_app
    app = build_app(model=create_bedrock_port(get_config), env={"MODEL_MODE": "bedrock", ...})

`get_config(key)` resolves the SSM-backed config values (architecture 2.14):
`model.fast`, `model.strong`, `guardrail.id`, `guardrail.version`. Passing a plain dict's
`.get` works for local/dev.
"""

from __future__ import annotations

from typing import Any, Callable, Mapping, Optional

from .bedrock_port import BedrockModelPort

# Config keys (mirror CONFIG_KEYS in shared/contracts/seams.js).
MODEL_FAST = "model.fast"
MODEL_STRONG = "model.strong"
GUARDRAIL_ID = "guardrail.id"
GUARDRAIL_VERSION = "guardrail.version"


def create_bedrock_port(
    get_config: Callable[[str], Optional[str]],
    region_name: Optional[str] = None,
    log: Optional[Callable[[Mapping[str, Any]], None]] = None,
) -> BedrockModelPort:
    """Construct a BedrockModelPort from resolved config. Raises if anything is missing."""
    fast = get_config(MODEL_FAST)
    strong = get_config(MODEL_STRONG)
    gid = get_config(GUARDRAIL_ID)
    gver = get_config(GUARDRAIL_VERSION)

    missing = [
        k
        for k, v in [
            (MODEL_FAST, fast),
            (MODEL_STRONG, strong),
            (GUARDRAIL_ID, gid),
            (GUARDRAIL_VERSION, gver),
        ]
        if not v
    ]
    if missing:
        raise ValueError(
            f"Missing config for the Bedrock port: {', '.join(missing)}. "
            "These resolve from SSM (architecture 2.14)."
        )

    return BedrockModelPort(
        guardrail_id=gid,
        guardrail_version=gver,
        model_ids={"fast": fast, "strong": strong},
        region_name=region_name,
        log=log,
    )
