"""Store factory: pick the repository adapter from STORE_MODE (ADR-016, ADR-017).

`json` (default) -> JsonRepository (demo mode, no AWS).
`aurora` -> AuroraRepository over the RDS Data API. Needs AURORA_CLUSTER_ARN, AURORA_SECRET_ARN,
and AURORA_DATABASE_NAME in the environment (from CDK stack outputs / SSM, see docs/aws-access.md).
"""

from __future__ import annotations

import os
from typing import Any, Optional

from .json_repository import JsonRepository
from .aurora_repository import AuroraRepository

VALID_MODES = ("json", "aurora")


def create_repository(env: Optional[dict[str, str]] = None, path: Optional[str] = None) -> Any:
    """Create the repository for the current STORE_MODE.

    @param env: environment mapping (defaults to os.environ)
    @param path: JSON store file for json mode (optional; in-memory if omitted)
    """
    env = env if env is not None else dict(os.environ)
    mode = env.get("STORE_MODE") or "json"
    if mode not in VALID_MODES:
        raise ValueError(f"STORE_MODE must be one of {VALID_MODES}, got {mode!r}")

    if mode == "aurora":
        cluster_arn = env.get("AURORA_CLUSTER_ARN")
        secret_arn = env.get("AURORA_SECRET_ARN")
        database = env.get("AURORA_DATABASE_NAME", "codeai")
        if not cluster_arn or not secret_arn:
            raise ValueError(
                "STORE_MODE=aurora requires AURORA_CLUSTER_ARN and AURORA_SECRET_ARN in the "
                "environment (from the DataStack outputs / SSM). See docs/aws-access.md."
            )
        return AuroraRepository(
            cluster_arn=cluster_arn,
            secret_arn=secret_arn,
            database=database,
            region_name=env.get("AWS_DEFAULT_REGION", "us-west-2"),
        )

    return JsonRepository(path)
