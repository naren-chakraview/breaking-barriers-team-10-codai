"""create_bedrock_port: builds the port from config, fails clearly when config is missing."""

import pytest

from backend.ai import create_bedrock_port, BedrockModelPort

_CONFIG = {
    "model.fast": "us.anthropic.claude-haiku-4-5",
    "model.strong": "us.anthropic.claude-sonnet-4-5",
    "guardrail.id": "gr-abc",
    "guardrail.version": "1",
}


def test_builds_port_from_full_config():
    port = create_bedrock_port(_CONFIG.get)
    assert isinstance(port, BedrockModelPort)


@pytest.mark.parametrize("missing", list(_CONFIG.keys()))
def test_missing_config_key_raises(missing):
    cfg = {k: v for k, v in _CONFIG.items() if k != missing}
    with pytest.raises(ValueError, match=missing):
        create_bedrock_port(cfg.get)


def test_integrates_with_build_app():
    # The whole point: inject the port into the API's build_app with MODEL_MODE=bedrock.
    from backend.api.app import build_app

    port = create_bedrock_port(_CONFIG.get)
    app = build_app(model=port, env={"MODEL_MODE": "bedrock", "STORE_MODE": "json"})
    assert app["modes"]["modelMode"] == "bedrock"
    assert callable(app["router"])
