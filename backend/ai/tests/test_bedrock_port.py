"""BedrockModelPort: safety methods work; model-call methods fail fast until built."""

import pytest

from backend.ai.bedrock_port import BedrockModelPort


class FakeGuardrail:
    def apply_guardrail(self, **kwargs):
        return {"action": "NONE", "assessments": []}


def _port():
    return BedrockModelPort("gr-1", "1", client=FakeGuardrail())


def test_satisfies_modelport_shape():
    # Structurally matches backend.api.model.ModelPort (duck-typed Protocol).
    from backend.api.model import ModelPort

    assert isinstance(_port(), ModelPort)


def test_screen_input_and_output_work(validate_against):
    port = _port()
    for fn in (port.screen_input, port.screen_output):
        r = fn("hello", "corr-1")
        assert r["allowed"] is True
        assert validate_against(r, "model", "ScreenResult") == []


def test_invoke_not_implemented():
    with pytest.raises(NotImplementedError):
        _port().invoke({"task": "verify"})


def test_validate_project_not_implemented():
    with pytest.raises(NotImplementedError):
        _port().validate_project({"skillId": "build"})
