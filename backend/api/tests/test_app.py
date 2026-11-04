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


def test_bedrock_without_injected_port_fails_fast():
    with pytest.raises(RuntimeError, match="bedrock"):
        build_app(env={"MODEL_MODE": "bedrock"})
