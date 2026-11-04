"""Bedrock-backed ModelPort (seam 3, Track C).

Fills the port the API depends on (backend/api/model.py). This task delivers the **safety**
methods (`screen_input`, `screen_output`) backed by a real Guardrail. The model-calling
methods are intentionally not built here:

- `invoke` is the `invoke` wrapper task (C-27).
- `validate_project` is the LLM-judge validator task (C-14).

Both raise `NotImplementedError` so a caller that wires MODEL_MODE=bedrock before those land
fails fast and loud, rather than silently doing nothing. Until then the API runs on
`StubModel` (MODEL_MODE=stub).

boto3 is imported lazily so this module imports without it; the Guardrail client can also be
injected (tests pass a fake).
"""

from __future__ import annotations

from typing import Any, Mapping, Optional

from .safety import Safety


class BedrockModelPort:
    """Structurally satisfies backend.api.model.ModelPort. Safety is real; model calls pend."""

    def __init__(
        self,
        guardrail_id: str,
        guardrail_version: str,
        region_name: Optional[str] = None,
        client: Any = None,
    ) -> None:
        self._region = region_name
        self._client = client
        self._guardrail_id = guardrail_id
        self._guardrail_version = guardrail_version
        self._safety: Optional[Safety] = None

    @property
    def safety(self) -> Safety:
        if self._safety is None:
            self._safety = Safety(self._runtime(), self._guardrail_id, self._guardrail_version)
        return self._safety

    def _runtime(self) -> Any:
        if self._client is None:
            import boto3  # lazy

            self._client = boto3.client("bedrock-runtime", region_name=self._region)
        return self._client

    # ---- safety (built) ----
    def screen_input(self, text: str, correlation_id: str) -> dict[str, Any]:
        return self.safety.screen_input(text, correlation_id)

    def screen_output(self, text: str, correlation_id: str) -> dict[str, Any]:
        return self.safety.screen_output(text, correlation_id)

    # ---- model calls (pending; separate tasks) ----
    def validate_project(self, request: Mapping[str, Any]) -> dict[str, Any]:
        raise NotImplementedError(
            "validate_project is the LLM-judge validator task (C-14); not built yet. "
            "Use MODEL_MODE=stub until then."
        )

    def invoke(self, request: Mapping[str, Any]) -> dict[str, Any]:
        raise NotImplementedError(
            "invoke is the model-wrapper task (C-27); not built yet. Use MODEL_MODE=stub until then."
        )
