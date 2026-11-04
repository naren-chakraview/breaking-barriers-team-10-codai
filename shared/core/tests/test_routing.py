"""Routing rules (C-18, C-19, C-20). One test per rule, table-driven where it helps."""

import pytest

from shared.core import load_tree, route, available_checkpoints
from shared.core.routing import tested_out_after_intro, DEFAULT_TARGET


@pytest.fixture(scope="module")
def tree():
    return load_tree()


def test_available_requires_prereqs_done(tree):
    # Nothing done: only checkpoints whose requires are empty or already met are available.
    avail = available_checkpoints(tree, progress={})
    assert "intro" in avail
    assert "keep-or-redirect" not in avail  # requires steer-it


def test_available_after_prereq_completed(tree):
    avail = available_checkpoints(tree, {"steer-it": "completed"})
    assert "keep-or-redirect" in avail


def test_tested_out_only_after_intro(tree):
    evidence = {"build": 2, "language": 3, "debug": 3}
    # Before intro completes: nothing tests out.
    assert tested_out_after_intro(tree, {}, evidence) == []
    # After intro completes: the three skippable checkpoints test out.
    out = tested_out_after_intro(tree, {"intro": "completed"}, evidence)
    assert set(out) == {"steer-it", "use-the-lingo", "give-context"}


def test_tested_out_counts_as_done_for_dependents(tree):
    # Quick learner: intro done, skippables tested out -> keep-or-redirect becomes available.
    progress = {
        "intro": "completed",
        "steer-it": "tested_out",
        "use-the-lingo": "tested_out",
        "give-context": "tested_out",
    }
    assert "keep-or-redirect" in available_checkpoints(tree, progress)


def test_auto_proposes_first_available_in_json_order(tree):
    # Stay-on-current (C-19.3, issue #24 q2): with no `current` set, propose the first
    # available checkpoint in JSON order. After intro, steer-it is first.
    r = route(tree, {"intro": "completed"}, evidence={})
    assert r.checkpoint_id == "steer-it"
    assert "first available" in r.reason


def test_auto_stays_on_current_checkpoint(tree):
    # When a checkpoint is marked `current` and still available, stay on it rather than
    # jumping to another skill (depth not volume, P-6.5).
    progress = {"intro": "completed", "steer-it": "current"}
    r = route(tree, progress, evidence={})
    assert r.checkpoint_id == "steer-it"
    assert "Continue on steer-it" in r.reason


def test_teacher_hold_keeps_current(tree):
    progress = {"intro": "completed", "steer-it": "current"}
    r = route(tree, progress, {}, {"mode": "hold"})
    assert r.checkpoint_id == "steer-it"
    assert "held" in r.reason.lower()


def test_teacher_assign_available(tree):
    r = route(tree, {"intro": "completed"}, {}, {"mode": "assign", "checkpointId": "give-context"})
    assert r.checkpoint_id == "give-context"
    assert "assigned" in r.reason.lower()


def test_teacher_assign_unavailable_falls_back_to_proposal(tree):
    # keep-or-redirect requires steer-it, which is not done -> not available.
    r = route(tree, {"intro": "completed"}, {}, {"mode": "assign", "checkpointId": "keep-or-redirect"})
    assert r.checkpoint_id == "steer-it"  # the proposal
    assert "not available" in r.reason


def test_route_returns_ids_that_exist(tree):
    r = route(tree, {"intro": "completed"}, {})
    assert tree.has_checkpoint(r.checkpoint_id)


def test_complete_when_nothing_available(tree):
    progress = {c["id"]: "completed" for c in tree.checkpoints}
    r = route(tree, progress, {})
    assert r.checkpoint_id is None
    assert "complete" in r.reason.lower()


def test_default_target_used_when_checkpoint_has_none(tree):
    # keep-or-redirect declares no targetEvidenceLevels; the gap uses DEFAULT_TARGET.
    assert DEFAULT_TARGET == 1
    progress = {"intro": "completed", "steer-it": "completed"}
    r = route(tree, progress, evidence={"build": 0})
    # keep-or-redirect (build) is available; with build at 0 and default target 1 it has a gap.
    assert r.checkpoint_id is not None


def test_routes_when_all_available_targets_already_exceeded(tree):
    # Regression for issue #24 (question 1): a student who has MET or EXCEEDED every
    # available checkpoint's target must still be routed to pre-authored content (depth,
    # P-6.5), not dropped to None. Previously _largest_gap seeded best_gap=-1, so an
    # all-(-1)-gap situation returned None.
    progress = {
        "intro": "completed",
        "steer-it": "tested_out",
        "use-the-lingo": "tested_out",
        "give-context": "tested_out",
    }
    evidence = {"build": 2, "language": 2, "debug": 2}  # at/above every target
    r = route(tree, progress, evidence)
    assert r.checkpoint_id is not None
    # keep-or-redirect requires steer-it (tested_out satisfies it) and is first in JSON order.
    assert r.checkpoint_id == "keep-or-redirect"


def test_tested_out_predecessor_satisfies_requires(tree):
    # A tested_out checkpoint counts as done for a dependent's `requires` (C-19.1).
    progress = {"intro": "completed", "steer-it": "tested_out"}
    assert "keep-or-redirect" in available_checkpoints(tree, progress)
