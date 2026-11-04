"""Backend authentication (ADR-018, phase 2). Verifies the Cognito JWT and derives the role
from the token, so the API trusts a *verified* identity rather than client-supplied headers.

Two modes, chosen by AUTH_MODE (mirrors the frontend's VITE_AUTH_MODE):
  - `none` (default): demo/local mode (C-33). The bearer token is accepted as-is and the role
    comes from the X-Role header. This preserves the no-AWS demo path and the existing tests.
  - `cognito`: the bearer must be a valid Cognito access/ID token. We verify the RS256
    signature against the pool JWKS, the issuer, expiry, token_use, and audience/client_id,
    then derive the role from the `cognito:groups` claim — NOT from X-Role (a client cannot
    pick its own role). X-User-Id is ignored in favor of the token `sub`.

Defense in depth: even behind an API Gateway Cognito authorizer (which the skill notes does
NOT enforce group claims), this re-checks the token and enforces the group→role mapping.

Verification uses PyJWT's PyJWKClient (JWKS fetch + key caching). Never leaks a provider
error to the client — failures become a C-29 UNAUTHORIZED/FORBIDDEN.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any, Mapping, Optional

from .util import ContractError

_ROLES = ("student", "teacher")


def auth_mode(env: Optional[Mapping[str, str]] = None) -> str:
    """`cognito` to verify JWTs, else `none` (demo/local, the default)."""
    env = env if env is not None else os.environ
    return "cognito" if (env.get("AUTH_MODE") == "cognito") else "none"


def role_from_groups(groups: Any) -> str:
    """Map the cognito:groups claim to an app role. Teacher wins; default student.

    Mirrors the frontend's identity.roleFromGroups so both sides agree.
    """
    if isinstance(groups, str):
        groups = [groups]
    items = [str(g).lower() for g in groups] if isinstance(groups, (list, tuple)) else []
    if "teacher" in items:
        return "teacher"
    if "student" in items:
        return "student"
    return "student"


@lru_cache(maxsize=4)
def _jwk_client(jwks_uri: str):
    """Cached PyJWKClient for a JWKS URI (caches keys across invocations/warm starts)."""
    from jwt import PyJWKClient  # lazy import: only needed in cognito mode

    return PyJWKClient(jwks_uri)


def _cognito_config(env: Mapping[str, str]) -> dict[str, str]:
    """Resolve the required Cognito verification config, or raise CONFIG_ERROR.

    COGNITO_ISSUER   e.g. https://cognito-idp.us-west-2.amazonaws.com/<userPoolId>
    COGNITO_CLIENT_ID the app client id (audience / client_id claim)
    """
    issuer = (env.get("COGNITO_ISSUER") or "").strip()
    client_id = (env.get("COGNITO_CLIENT_ID") or "").strip()
    missing = [k for k, v in [("COGNITO_ISSUER", issuer), ("COGNITO_CLIENT_ID", client_id)] if not v]
    if missing:
        raise ContractError(
            "CONFIG_ERROR",
            f"AUTH_MODE=cognito requires {', '.join(missing)} (from the user-pool SSM config).",
        )
    return {"issuer": issuer, "client_id": client_id, "jwks_uri": f"{issuer}/.well-known/jwks.json"}


def verify_cognito_token(token: str, env: Optional[Mapping[str, str]] = None) -> dict[str, Any]:
    """Verify a Cognito JWT and return its claims. Raises ContractError on any failure.

    Checks the RS256 signature (pool JWKS), issuer, expiry, and — for access tokens — the
    `client_id` claim, or for ID tokens the `aud`. token_use must be 'access' or 'id'.
    """
    env = env if env is not None else os.environ
    cfg = _cognito_config(env)

    try:
        import jwt  # lazy: PyJWT only required in cognito mode

        signing_key = _jwk_client(cfg["jwks_uri"]).get_signing_key_from_jwt(token).key
        # Decode WITHOUT audience here: Cognito access tokens carry `client_id`, not `aud`,
        # so we verify the signature/issuer/expiry via jwt and check the audience claim
        # ourselves below (depending on token_use).
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=cfg["issuer"],
            options={"require": ["exp", "iss"], "verify_aud": False},
        )
    except ContractError:
        raise
    except Exception as exc:  # noqa: BLE001 - never leak the provider error
        # Token-level failures (bad signature, expired, wrong issuer) -> UNAUTHORIZED.
        raise ContractError("UNAUTHORIZED", "The access token is invalid or expired.") from exc

    token_use = claims.get("token_use")
    if token_use not in ("access", "id"):
        raise ContractError("UNAUTHORIZED", "Unexpected token type.")

    # Audience check: access tokens use `client_id`; id tokens use `aud`.
    expected = cfg["client_id"]
    actual = claims.get("client_id") if token_use == "access" else claims.get("aud")
    if actual != expected:
        raise ContractError("UNAUTHORIZED", "The token was not issued for this application.")

    return claims


def read_context(headers: Mapping[str, Any], env: Optional[Mapping[str, str]] = None) -> dict[str, Any]:
    """Build the request context from the P-1.4 headers, verifying the token in cognito mode.

    Returns { studentId, role, token }. In `none` mode this is the legacy header-trust path
    (demo/local); in `cognito` mode the identity comes from the verified token.
    """
    env = env if env is not None else os.environ
    auth = headers.get("authorization", "") or ""
    token = auth[len("Bearer "):].strip() if auth.startswith("Bearer ") else ""
    if not token:
        raise ContractError("UNAUTHORIZED", "Missing bearer token.")

    if auth_mode(env) == "cognito":
        claims = verify_cognito_token(token, env)
        user_id = claims.get("sub")
        if not user_id:
            raise ContractError("UNAUTHORIZED", "The token has no subject.")
        role = role_from_groups(claims.get("cognito:groups"))
        # Role is derived from the verified token; a client-supplied X-Role is ignored.
        return {"studentId": str(user_id), "role": role, "token": token}

    # none mode (demo/local): trust the headers, as before (C-33).
    user_id = headers.get("x-user-id", "") or ""
    role = headers.get("x-role", "") or ""
    if not user_id:
        raise ContractError("UNAUTHORIZED", "Missing X-User-Id.")
    if role not in _ROLES:
        raise ContractError("FORBIDDEN", "Unknown or missing role.")
    return {"studentId": user_id, "role": role, "token": token}
