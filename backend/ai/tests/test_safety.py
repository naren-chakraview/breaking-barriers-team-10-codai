"""Safety module tests (C-25, C-26). A fake Bedrock client exercises every path; every
result is validated against the ScreenResult contract so it cannot drift from the schema.
"""

import pytest

from backend.ai.safety import (
    Safety,
    wrap_untrusted,
    SAFE_INPUT_REPLACEMENT,
    SAFE_OUTPUT_REPLACEMENT,
    SAFE_ERROR_REPLACEMENT,
)

GID = "gr-abc123"
GVER = "1"


class FakeGuardrail:
    """Stand-in for bedrock-runtime. Queue a response or an exception per call."""

    def __init__(self):
        self.calls = []
        self._next = None

    def returns(self, response):
        self._next = ("ok", response)

    def raises(self, exc):
        self._next = ("err", exc)

    def apply_guardrail(self, **kwargs):
        self.calls.append(kwargs)
        kind, payload = self._next
        if kind == "err":
            raise payload
        return payload


def _clean():
    return {"action": "NONE", "assessments": []}


def _intervened_content():
    return {
        "action": "GUARDRAIL_INTERVENED",
        "assessments": [
            {"contentPolicy": {"filters": [{"type": "VIOLENCE", "action": "BLOCKED"}]}}
        ],
    }


def _intervened_pii():
    return {
        "action": "GUARDRAIL_INTERVENED",
        "assessments": [
            {"sensitiveInformationPolicy": {"piiEntities": [{"type": "EMAIL", "action": "BLOCKED"}]}}
        ],
    }


# ---- construction guards (C-25) ----

def test_requires_id_and_version():
    with pytest.raises(ValueError):
        Safety(FakeGuardrail(), "", "1")
    with pytest.raises(ValueError):
        Safety(FakeGuardrail(), GID, "")


def test_rejects_draft_version():
    with pytest.raises(ValueError):
        Safety(FakeGuardrail(), GID, "DRAFT")


# ---- clean input/output ----

def test_clean_input_is_allowed(validate_against):
    fake = FakeGuardrail(); fake.returns(_clean())
    r = Safety(fake, GID, GVER).screen_input("Make my heading bigger", "corr-1")
    assert r == {"allowed": True, "action": "none", "replacement": None, "categories": [], "guardrailVersion": "1"}
    assert validate_against(r, "model", "ScreenResult") == []
    # Called ApplyGuardrail with source INPUT and the text.
    assert fake.calls[0]["source"] == "INPUT"
    assert fake.calls[0]["guardrailIdentifier"] == GID
    assert fake.calls[0]["guardrailVersion"] == GVER


def test_clean_output_screens_with_source_output():
    fake = FakeGuardrail(); fake.returns(_clean())
    Safety(fake, GID, GVER).screen_output("Here is your code", "corr-2")
    assert fake.calls[0]["source"] == "OUTPUT"


# ---- blocked content ----

def test_blocked_input_returns_safe_replacement(validate_against):
    fake = FakeGuardrail(); fake.returns(_intervened_content())
    r = Safety(fake, GID, GVER).screen_input("something nasty", "corr-3")
    assert r["allowed"] is False
    assert r["action"] == "blocked"
    assert r["replacement"] == SAFE_INPUT_REPLACEMENT
    assert "violence" in r["categories"]
    assert validate_against(r, "model", "ScreenResult") == []


def test_blocked_output_uses_output_replacement(validate_against):
    fake = FakeGuardrail(); fake.returns(_intervened_content())
    r = Safety(fake, GID, GVER).screen_output("bad model text", "corr-4")
    assert r["replacement"] == SAFE_OUTPUT_REPLACEMENT
    assert validate_against(r, "model", "ScreenResult") == []


def test_pii_is_categorized_without_leaking_text(validate_against):
    fake = FakeGuardrail(); fake.returns(_intervened_pii())
    r = Safety(fake, GID, GVER).screen_input("my email is a@b.com", "corr-5")
    assert r["allowed"] is False
    assert "pii" in r["categories"]
    # The offending text never appears in the result (C-26).
    assert "a@b.com" not in str(r)
    assert validate_against(r, "model", "ScreenResult") == []


# ---- fail closed (C-25) ----

def test_filter_error_fails_closed(validate_against):
    fake = FakeGuardrail(); fake.raises(RuntimeError("Guardrail timeout"))
    r = Safety(fake, GID, GVER).screen_input("anything", "corr-6")
    assert r["allowed"] is False           # never opens the gate
    assert r["action"] == "error"
    assert r["replacement"] == SAFE_ERROR_REPLACEMENT
    assert r["guardrailVersion"] is None   # version unknown on error
    assert "Guardrail timeout" not in str(r)  # no error text leaked
    assert validate_against(r, "model", "ScreenResult") == []


def test_error_never_raises_to_caller():
    fake = FakeGuardrail(); fake.raises(ValueError("boom"))
    # Must return a result, not propagate — the lesson keeps running.
    r = Safety(fake, GID, GVER).screen_output("x", "corr-7")
    assert r["allowed"] is False


# ---- guardContent wrapping (architecture 2.3) ----

def test_wrap_untrusted_builds_guardcontent_blocks():
    blocks = wrap_untrusted(["student prompt", "tool output"])
    assert blocks == [
        {"guardContent": {"text": {"text": "student prompt"}}},
        {"guardContent": {"text": {"text": "tool output"}}},
    ]


def test_wrap_untrusted_skips_empty():
    assert wrap_untrusted(["", "real", None]) == [{"guardContent": {"text": {"text": "real"}}}]
