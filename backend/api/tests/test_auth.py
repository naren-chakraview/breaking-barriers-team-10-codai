"""Backend auth tests (ADR-018 phase 2).

Default `none` mode keeps the demo header-trust path (covered by test_http.py). These tests
cover `cognito` mode: a real RS256 signature verified against a stubbed JWKS, issuer/expiry/
audience checks, and the role derived from `cognito:groups` (not X-Role).

Tokens are minted locally with a throwaway RSA key; `PyJWKClient.get_signing_key_from_jwt` is
monkeypatched to return the matching public key, so nothing hits the network.
"""

from __future__ import annotations

import time

import pytest

jwt = pytest.importorskip("jwt")  # skip if PyJWT absent (it is a pinned dep, so normally present)
from cryptography.hazmat.primitives.asymmetric import rsa  # noqa: E402

from backend.api.auth import read_context, role_from_groups, auth_mode
from backend.api.util import ContractError

ISSUER = "https://cognito-idp.us-west-2.amazonaws.com/us-west-2_testpool"
CLIENT_ID = "test-client-id"
ENV = {"AUTH_MODE": "cognito", "COGNITO_ISSUER": ISSUER, "COGNITO_CLIENT_ID": CLIENT_ID}

_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_PEM = _KEY.private_bytes(
    encoding=__import__("cryptography").hazmat.primitives.serialization.Encoding.PEM,
    format=__import__("cryptography").hazmat.primitives.serialization.PrivateFormat.PKCS8,
    encryption_algorithm=__import__("cryptography").hazmat.primitives.serialization.NoEncryption(),
)
_PUB = _KEY.public_key()


@pytest.fixture(autouse=True)
def _stub_jwks(monkeypatch):
    """Return our test public key for any token, instead of fetching the pool JWKS."""
    class _SigningKey:
        key = _PUB

    def _get(self, token):  # noqa: ARG001
        return _SigningKey()

    monkeypatch.setattr("jwt.PyJWKClient.get_signing_key_from_jwt", _get)
    # Clear the lru_cache so each test builds a fresh (stubbed) client.
    from backend.api import auth as auth_mod

    auth_mod._jwk_client.cache_clear()


def _mint(claims):
    base = {"iss": ISSUER, "exp": int(time.time()) + 600, "iat": int(time.time()), "sub": "sub-123"}
    return jwt.encode({**base, **claims}, _PEM, algorithm="RS256")


def _headers(token):
    return {"authorization": f"Bearer {token}"}


def test_auth_mode_default_is_none():
    assert auth_mode({}) == "none"
    assert auth_mode({"AUTH_MODE": "cognito"}) == "cognito"


def test_valid_access_token_role_from_groups():
    token = _mint({"token_use": "access", "client_id": CLIENT_ID, "cognito:groups": ["teacher"]})
    ctx = read_context(_headers(token), ENV)
    assert ctx["studentId"] == "sub-123"  # from the token sub, not a header
    assert ctx["role"] == "teacher"  # from cognito:groups, not X-Role


def test_role_ignores_client_supplied_x_role():
    # Even if the client sends X-Role: teacher, the verified token's group (student) wins.
    token = _mint({"token_use": "access", "client_id": CLIENT_ID, "cognito:groups": ["student"]})
    ctx = read_context({**_headers(token), "x-role": "teacher", "x-user-id": "spoofed"}, ENV)
    assert ctx["role"] == "student"
    assert ctx["studentId"] == "sub-123"


def test_valid_id_token_uses_aud():
    token = _mint({"token_use": "id", "aud": CLIENT_ID, "cognito:groups": ["student"]})
    ctx = read_context(_headers(token), ENV)
    assert ctx["role"] == "student"


def test_missing_bearer_is_unauthorized():
    with pytest.raises(ContractError) as e:
        read_context({}, ENV)
    assert e.value.code == "UNAUTHORIZED"


def test_wrong_audience_is_unauthorized():
    token = _mint({"token_use": "access", "client_id": "some-other-client", "cognito:groups": ["student"]})
    with pytest.raises(ContractError) as e:
        read_context(_headers(token), ENV)
    assert e.value.code == "UNAUTHORIZED"


def test_wrong_issuer_is_unauthorized():
    token = jwt.encode(
        {"iss": "https://evil.example.com", "exp": int(time.time()) + 600, "sub": "s", "token_use": "access", "client_id": CLIENT_ID},
        _PEM,
        algorithm="RS256",
    )
    with pytest.raises(ContractError) as e:
        read_context(_headers(token), ENV)
    assert e.value.code == "UNAUTHORIZED"


def test_expired_token_is_unauthorized():
    token = jwt.encode(
        {"iss": ISSUER, "exp": int(time.time()) - 10, "sub": "s", "token_use": "access", "client_id": CLIENT_ID},
        _PEM,
        algorithm="RS256",
    )
    with pytest.raises(ContractError) as e:
        read_context(_headers(token), ENV)
    assert e.value.code == "UNAUTHORIZED"


def test_unexpected_token_use_is_unauthorized():
    token = _mint({"token_use": "refresh", "client_id": CLIENT_ID})
    with pytest.raises(ContractError) as e:
        read_context(_headers(token), ENV)
    assert e.value.code == "UNAUTHORIZED"


def test_missing_cognito_config_is_config_error():
    token = _mint({"token_use": "access", "client_id": CLIENT_ID})
    with pytest.raises(ContractError) as e:
        read_context(_headers(token), {"AUTH_MODE": "cognito"})  # no issuer/client id
    assert e.value.code == "CONFIG_ERROR"


def test_role_from_groups_mapping():
    assert role_from_groups(["teacher"]) == "teacher"
    assert role_from_groups(["student", "teacher"]) == "teacher"
    assert role_from_groups("student") == "student"
    assert role_from_groups([]) == "student"
    assert role_from_groups(None) == "student"
