"""Shared fixtures for the API tests."""

from __future__ import annotations

import pytest

from shared.core.tree import load_tree
from backend.store import JsonRepository
from backend.api.model import StubModel
from backend.api.services import Deps
import shared.core as core


@pytest.fixture
def tree():
    return load_tree()


@pytest.fixture
def repo():
    return JsonRepository()


def make_deps(tree, repo, model=None):
    return Deps(
        core=core,
        model=model or StubModel(),
        repo=repo,
        tree=tree,
        modes={"serviceMode": "http", "modelMode": "stub", "storeMode": "json"},
    )
