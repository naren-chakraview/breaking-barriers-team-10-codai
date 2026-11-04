"""Bedrock-backed ModelPort (seam 3, Track C).

Fills the port the API depends on (backend/api/model.py). Delivers the **safety** methods
(`screen_input`/`screen_output`, real Guardrail) and the **`invoke`** wrapper (C-27, the
single Bedrock caller). `validate_project` (the C-14 LLM judge) is a separate task and still
raises `NotImplementedError` until built — so wiring MODEL_MODE=bedrock for validation before
it lands fails fast rather than silently.

Model ids per tier (fast/strong) come from config (SSM in production, architecture 2.14), so
verify/validate/passive use the fast model and codegen/tutor the strong one (P-7.2). boto3 is
imported lazily; the client can be injected (tests pass a fake).
"""

from __future__ import annotations

from typing import Any, Callable, Mapping, Optional

from .safety import Safety
from .invoke import invoke as _invoke, TIMEOUT_MS


class BedrockModelPort:
    """Structurally satisfies backend.api.model.ModelPort. Safety + invoke are real."""

    def __init__(
        self,
        guardrail_id: str,
        guardrail_version: str,
        model_ids: Optional[Mapping[str, str]] = None,
        region_name: Optional[str] = None,
        client: Any = None,
        log: Optional[Callable[[Mapping[str, Any]], None]] = None,
    ) -> None:
        self._region = region_name
        self._client = client
        self._guardrail_id = guardrail_id
        self._guardrail_version = guardrail_version
        # {'fast': <model id>, 'strong': <model id>} — from SSM in production.
        self._model_ids = dict(model_ids or {})
        self._log = log
        self._safety: Optional[Safety] = None

    @property
    def safety(self) -> Safety:
        if self._safety is None:
            self._safety = Safety(self._runtime(), self._guardrail_id, self._guardrail_version)
        return self._safety

    def _runtime(self) -> Any:
        if self._client is None:
            import boto3  # lazy
            from botocore.config import Config

            self._client = boto3.client(
                "bedrock-runtime",
                region_name=self._region,
                # 10 s adaptive-call budget (C-22). Adaptive retry for throttling.
                config=Config(
                    read_timeout=TIMEOUT_MS / 1000,
                    connect_timeout=5,
                    retries={"max_attempts": 2, "mode": "adaptive"},
                ),
            )
        return self._client

    def _model_for_tier(self, tier: str) -> str:
        try:
            return self._model_ids[tier]
        except KeyError as exc:
            raise ValueError(
                f"No model id configured for tier {tier!r}; expected 'fast' and 'strong' "
                "(from SSM model.fast / model.strong)."
            ) from exc

    # ---- safety (built) ----
    def screen_input(self, text: str, correlation_id: str) -> dict[str, Any]:
        return self.safety.screen_input(text, correlation_id)

    def screen_output(self, text: str, correlation_id: str) -> dict[str, Any]:
        return self.safety.screen_output(text, correlation_id)

    # ---- invoke (built) ----
    def invoke(self, request: Mapping[str, Any]) -> dict[str, Any]:
        return _invoke(
            request,
            client=self._runtime(),
            model_for_tier=self._model_for_tier,
            guardrail_id=self._guardrail_id,
            guardrail_version=self._guardrail_version,
            log=self._log,
        )

    # ---- validator (pending; separate task C-14) ----
    def validate_project(self, request: Mapping[str, Any]) -> dict[str, Any]:
        raise NotImplementedError(
            "validate_project is the LLM-judge validator task (C-14); not built yet. "
            "Use MODEL_MODE=stub until then."
        )
