"""Live Aurora contract test (opt-in).

Runs the SAME `check_repository` suite the JSON adapter passes, against a real cluster via
the RDS Data API. Skipped unless AURORA_CLUSTER_ARN + AURORA_SECRET_ARN are set, so CI (no
AWS) skips it and it runs post-deploy to prove the two adapters are behaviorally identical
(seam 4, ADR-016/017).

Run after `cdk deploy CodeAI-DataStack` and loading schema.sql:
    AURORA_CLUSTER_ARN=... AURORA_SECRET_ARN=... pytest backend/store/tests/test_aurora_live.py

Note: the suite writes rows for synthetic ids (stu-x, teacher-1). Point it at a scratch
database, not one holding real student data.
"""

from __future__ import annotations

import os

import pytest

from backend.store.factory import create_repository
from backend.store.tests.contract import check_repository

_LIVE = bool(os.environ.get("AURORA_CLUSTER_ARN") and os.environ.get("AURORA_SECRET_ARN"))

pytestmark = pytest.mark.skipif(
    not _LIVE,
    reason="Set AURORA_CLUSTER_ARN and AURORA_SECRET_ARN to run the live Aurora contract test.",
)


def test_aurora_passes_the_repository_contract():
    # check_repository calls make_repo() several times for isolation; each returns a fresh
    # adapter bound to the same cluster. The contract uses synthetic ids, so runs are
    # independent as long as the scratch DB starts clean.
    def make_repo():
        return create_repository({**os.environ, "STORE_MODE": "aurora"})

    check_repository(make_repo)
