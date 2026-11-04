"""BedrockModelPort: safety methods work; model-call methods fail fast until built."""

import pytest

from backend.ai.bedrock_port import BedrockModelPort


class FakeBedrock:
    """Fake bedrock-runtime: handles both guardrail screening and converse."""

    def apply_guardrail(self, **kwargs):
        return {"action": "NONE", "assessments": []}

    def converse(self, **kwargs):
        return {
            "output": {"message": {"content": [{"text": "ok"}]}},
            "stopReason": "end_turn",
            "usage": {"inputTokens": 10, "outputTokens": 2},
        }


def _port():
    return BedrockModelPort(
        "gr-1", "1",
        model_ids={"fast": "m-fast", "strong": "m-strong"},
        client=FakeBedrock(),
    )


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


def test_invoke_works_through_the_port(validate_against):
    req = {
        "task": "verify",
        "prompt": {"system": "s", "user": "u"},
        "opts": {"maxTokens": 64, "correlationId": "corr-port1234", "promptVersion": "verify@1"},
    }
    r = _port().invoke(req)
    assert r["ok"] is True
    assert r["modelId"] == "m-fast"          # verify -> fast tier
    assert validate_against(r, "model", "InvokeResult") == []


def test_invoke_requires_model_ids():
    # No model_ids configured -> clear error, not a silent failure.
    port = BedrockModelPort("gr-1", "1", client=FakeBedrock())
    req = {"task": "verify", "prompt": {"system": "s", "user": "u"},
           "opts": {"maxTokens": 64, "correlationId": "corr-x0000001"}}
    with pytest.raises(ValueError, match="No model id configured"):
        port.invoke(req)


def test_validate_project_still_not_implemented():
    # The C-14 LLM-judge validator is a separate task.
    with pytest.raises(NotImplementedError):
        _port().validate_project({"skillId": "build"})
