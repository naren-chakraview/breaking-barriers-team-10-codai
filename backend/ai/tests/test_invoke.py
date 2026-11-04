"""invoke wrapper tests (C-27, C-22). A fake Converse client exercises success, guardrail
intervention, and failure paths. Every result is validated against the InvokeResult
contract; no student text appears in any result or decision-log record.
"""

import pytest

from backend.ai.invoke import invoke, build_converse_kwargs, TASK_TIER

MODELS = {"fast": "us.anthropic.claude-haiku-4-5", "strong": "us.anthropic.claude-sonnet-4-5"}


def _model_for_tier(tier):
    return MODELS[tier]


def _req(task="tutor", untrusted=None):
    prompt = {"system": "You are a tutor.", "user": "How do I center a div?"}
    if untrusted is not None:
        prompt["untrusted"] = untrusted
    return {
        "task": task,
        "prompt": prompt,
        "opts": {"maxTokens": 256, "correlationId": "corr-abcd1234", "promptVersion": f"{task}@1"},
    }


class FakeConverse:
    def __init__(self, response=None, raises=None):
        self._response = response
        self._raises = raises
        self.calls = []

    def converse(self, **kwargs):
        self.calls.append(kwargs)
        if self._raises:
            raise self._raises
        return self._response


def _ok_response(text="Use margin auto.", stop="end_turn"):
    return {
        "output": {"message": {"content": [{"text": text}]}},
        "stopReason": stop,
        "usage": {"inputTokens": 42, "outputTokens": 7},
    }


class ClientError(Exception):
    """Minimal botocore-ClientError stand-in with a `.response`."""
    def __init__(self, code):
        super().__init__(code)
        self.response = {"Error": {"Code": code}}


# ---- request building ----

def test_build_converse_wraps_untrusted_and_sets_maxtokens():
    kwargs = build_converse_kwargs(
        _req(untrusted=["student said: make it blue"]), "m-fast", "gr-1", "1"
    )
    assert kwargs["modelId"] == "m-fast"
    assert kwargs["inferenceConfig"]["maxTokens"] == 256
    assert kwargs["system"] == [{"text": "You are a tutor."}]
    content = kwargs["messages"][0]["content"]
    assert content[0] == {"text": "How do I center a div?"}          # trusted user text
    assert content[1] == {"guardContent": {"text": {"text": "student said: make it blue"}}}
    gc = kwargs["guardrailConfig"]
    assert gc["guardrailIdentifier"] == "gr-1" and gc["guardrailVersion"] == "1"
    assert gc["trace"] == "disabled"


def test_task_tiers_split_verify_and_codegen():
    # P-7.2: verify and codegen must use different models.
    assert TASK_TIER["verify"] == "fast"
    assert TASK_TIER["codegen"] == "strong"


# ---- success ----

def test_verify_uses_fast_model(validate_against):
    fake = FakeConverse(_ok_response())
    r = invoke(_req("verify"), fake, _model_for_tier, "gr-1", "1")
    assert r["ok"] is True
    assert r["modelId"] == MODELS["fast"]
    assert r["source"] == "bedrock"
    assert r["usage"] == {"inputTokens": 42, "outputTokens": 7}
    assert r["guardrail"] == {"version": "1", "action": "none"}
    assert validate_against(r, "model", "InvokeResult") == []


def test_codegen_uses_strong_model(validate_against):
    fake = FakeConverse(_ok_response("<div style=...>"))
    r = invoke(_req("codegen"), fake, _model_for_tier, "gr-1", "1")
    assert r["modelId"] == MODELS["strong"]
    assert validate_against(r, "model", "InvokeResult") == []


def test_guardrail_intervened_is_flagged(validate_against):
    fake = FakeConverse(_ok_response("", stop="guardrail_intervened"))
    r = invoke(_req("tutor"), fake, _model_for_tier, "gr-1", "1")
    assert r["ok"] is True
    assert r["guardrail"]["action"] == "intervened"
    assert validate_against(r, "model", "InvokeResult") == []


# ---- failure: never raises, maps error codes ----

def test_throttling_maps_to_rate_limited(validate_against):
    fake = FakeConverse(raises=ClientError("ThrottlingException"))
    r = invoke(_req("codegen"), fake, _model_for_tier, "gr-1", "1")
    assert r["ok"] is False
    assert r["error"]["code"] == "RATE_LIMITED"
    assert validate_against(r, "model", "InvokeResult") == []


def test_model_timeout_maps_to_timeout():
    fake = FakeConverse(raises=ClientError("ModelTimeoutException"))
    r = invoke(_req(), fake, _model_for_tier, "gr-1", "1")
    assert r["error"]["code"] == "TIMEOUT"


def test_read_timeout_without_response_maps_to_timeout():
    class ReadTimeoutError(Exception):
        pass
    fake = FakeConverse(raises=ReadTimeoutError("Read timeout on endpoint"))
    r = invoke(_req(), fake, _model_for_tier, "gr-1", "1")
    assert r["error"]["code"] == "TIMEOUT"


def test_access_denied_maps_to_upstream():
    fake = FakeConverse(raises=ClientError("AccessDeniedException"))
    r = invoke(_req(), fake, _model_for_tier, "gr-1", "1")
    assert r["error"]["code"] == "UPSTREAM_ERROR"


def test_invoke_never_raises():
    fake = FakeConverse(raises=ValueError("boom"))
    r = invoke(_req(), fake, _model_for_tier, "gr-1", "1")  # must return, not raise
    assert r["ok"] is False


# ---- no student text leaks (C-26, ADR-011) ----

def test_decision_log_has_no_student_text():
    records = []
    fake = FakeConverse(_ok_response())
    invoke(_req("tutor", untrusted=["SECRET student prompt text"]), fake, _model_for_tier,
           "gr-1", "1", log=records.append)
    assert len(records) == 1
    blob = str(records[0])
    assert "SECRET student prompt" not in blob
    assert "How do I center a div" not in blob
    # Only ids/hashes/counts.
    assert records[0]["task"] == "tutor"
    assert records[0]["modelId"] == MODELS["strong"]


def test_error_message_has_no_provider_internals():
    fake = FakeConverse(raises=ClientError("ThrottlingException"))
    r = invoke(_req(), fake, _model_for_tier, "gr-1", "1")
    assert "How do I center" not in str(r)
