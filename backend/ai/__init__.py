"""Track C: model access and safety (seam 3, backend/ai).

Fills the `ModelPort` the API depends on (backend/api/model.py). This package currently
provides the content-safety module (C-25); the `invoke` wrapper (C-27) and the LLM
validator judge (C-14) are separate tasks and are stubbed to raise until built.
"""

from .safety import Safety, wrap_untrusted, SAFE_INPUT_REPLACEMENT, SAFE_OUTPUT_REPLACEMENT
from .bedrock_port import BedrockModelPort
from .invoke import invoke, build_converse_kwargs, TASK_TIER
from .factory import create_bedrock_port

__all__ = [
    "Safety",
    "wrap_untrusted",
    "SAFE_INPUT_REPLACEMENT",
    "SAFE_OUTPUT_REPLACEMENT",
    "BedrockModelPort",
    "invoke",
    "build_converse_kwargs",
    "TASK_TIER",
    "create_bedrock_port",
]
