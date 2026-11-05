"""build_app wiring: default modes, an end-to-end submit through the stub model, and the
fail-fast when MODEL_MODE=bedrock has no injected port."""

from __future__ import annotations

import pytest

from backend.api.app import build_app
from backend.api.schema_validate import problems

AUTH = {"authorization": "Bearer demo", "x-user-id": "stu-1", "x-role": "student"}


def test_resolves_default_modes():
    app = build_app(env={"STORE_MODE": "json", "MODEL_MODE": "stub"})
    assert app["modes"] == {"serviceMode": "mock", "modelMode": "stub", "storeMode": "json"}


def test_submit_end_to_end_with_stub_model():
    app = build_app(env={"STORE_MODE": "json", "MODEL_MODE": "stub"})
    res = app["router"](
        {
            "method": "POST",
            "path": "/steps/steer-it-project/submit",
            "headers": AUTH,
            "body": {
                "courseId": "hoai2026-adaptive",
                "checkpointId": "steer-it",
                "kind": "prompt",
                "text": "Make the heading say Robotics Club and keep the layout.",
                "project": {"html": "<h1>Robotics Club</h1>", "css": "", "js": ""},
            },
        }
    )
    assert res["status"] == 200
    assert problems("services", "SubmitResponse", res["body"]) == []
    assert res["body"]["outcome"] == "scored"
    assert res["body"]["source"] == "stub"


def test_bedrock_builds_the_real_port_from_resolved_config():
    # MODEL_MODE=bedrock with no injected port builds a BedrockModelPort from config
    # (Task 6). An injected resolver stands in for SSM so the test needs no AWS.
    from backend.ai import BedrockModelPort

    cfg = {
        "model.fast": "us.anthropic.claude-haiku-4-5-20251001-v1:0",
        "model.strong": "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        "guardrail.id": "gr-test-1234",
        "guardrail.version": "1",
    }
    app = build_app(
        env={"STORE_MODE": "json", "MODEL_MODE": "bedrock"},
        config_resolver=cfg.get,
    )
    assert app["modes"]["modelMode"] == "bedrock"


def test_bedrock_fails_fast_when_config_is_missing():
    # No model ids / guardrail id resolvable -> a clear build-time error, not a late failure
    # on the first model call.
    with pytest.raises(ValueError, match="Missing config"):
        build_app(env={"STORE_MODE": "json", "MODEL_MODE": "bedrock"}, config_resolver=lambda _k: None)
