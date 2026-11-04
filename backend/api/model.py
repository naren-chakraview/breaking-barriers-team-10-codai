"""Model and safety seam (seam 3, Track C) as consumed by the API.

Track D does not own this seam; it depends on it through the `ModelPort` protocol and injects
an implementation at wiring time. Until Track C's Bedrock-backed port lands, `StubModel`
presents the same shape, backed by the language-neutral contract fixtures
(`shared/contracts/fixtures/model/*.json`) so it never drifts from the schemas. Everything it
returns is tagged source='stub' — a stub can never pass as live (architecture 1.8).

Results follow model.schema.json: each call returns a tagged dict and never raises a provider
error.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping, Optional, Protocol, runtime_checkable

# C-16: below this a validator result is unreliable and triggers fallback.
CONFIDENCE_MIN = 0.6

_FIXTURES = Path(__file__).resolve().parents[2] / "shared" / "contracts" / "fixtures" / "model"


@runtime_checkable
class ModelPort(Protocol):
    """Seam 3. Each method returns a tagged result dict; none raises a provider error."""

    def screen_input(self, text: str, correlation_id: str) -> dict[str, Any]:
        """Guardrail screen of untrusted input (C-25). Returns a ScreenResult. Fails closed."""
        ...

    def screen_output(self, text: str, correlation_id: str) -> dict[str, Any]:
        """Guardrail screen of model output before display (C-25). Returns a ScreenResult."""
        ...

    def validate_project(self, request: Mapping[str, Any]) -> dict[str, Any]:
        """Score a project step (C-14). Returns a ValidateResult (ok+result | fallback)."""
        ...

    def invoke(self, request: Mapping[str, Any]) -> dict[str, Any]:
        """The only Bedrock caller (C-27). Returns an InvokeResult."""
        ...


def _load(name: str) -> Any:
    with open(_FIXTURES / name, encoding="utf-8") as fh:
        return json.load(fh)


class StubModel:
    """MODEL_MODE=stub adapter, backed by the contract fixtures. No AWS."""

    def __init__(self, confidence_min: float = CONFIDENCE_MIN) -> None:
        self._confidence_min = confidence_min
        self._invoke = _load("invoke-results.json")
        self._validators = _load("validator-outputs.json")

    def screen_input(self, text: str, correlation_id: str) -> dict[str, Any]:
        # The stub allows everything; the real Guardrail handling is Track C (C-25).
        return {
            "allowed": True,
            "action": "none",
            "replacement": None,
            "categories": [],
            "guardrailVersion": "stub-1",
        }

    def screen_output(self, text: str, correlation_id: str) -> dict[str, Any]:
        return {
            "allowed": True,
            "action": "none",
            "replacement": None,
            "categories": [],
            "guardrailVersion": "stub-1",
        }

    def validate_project(self, request: Mapping[str, Any]) -> dict[str, Any]:
        canned = next(c for c in self._validators["cases"] if c["name"] == "valid-pass")
        parsed = json.loads(canned["raw"])
        parsed["skillId"] = request.get("skillId", parsed["skillId"])
        if parsed["confidence"] < self._confidence_min:
            return {"ok": False, "fallback": {"component": "validation", "reason": "low_confidence"}}
        return {"ok": True, "source": "stub", "result": parsed}

    def invoke(self, request: Mapping[str, Any]) -> dict[str, Any]:
        task = request.get("task", "tutor")
        canned = dict(self._canned_invoke(task))
        canned["task"] = task
        canned["correlationId"] = request["opts"]["correlationId"]
        return canned

    def _canned_invoke(self, task: str) -> dict[str, Any]:
        return {
            "verify": self._invoke["verify_ok"],
            "codegen": self._invoke["codegen_ok"],
            "validate": self._invoke["validate_ok"],
            "tutor": self._invoke["tutor_ok"],
        }.get(task, self._invoke["tutor_ok"])
