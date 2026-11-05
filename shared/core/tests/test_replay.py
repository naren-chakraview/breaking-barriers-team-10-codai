"""Persona replay regression tests (Task 8c): rule baseline, routing and the committed fixture."""

import json

import pytest

from shared.core.replay import OUTPUT, PERSONAS, build_all, render, replay_persona
from shared.core.tree import load_tree

TREE = load_tree()


@pytest.fixture(scope="module")
def replays():
    return build_all(TREE)["personas"]


def test_committed_fixture_matches_engine():
    """The UI renders the committed JSON; it must be exactly what shared.core computes now.
    Fix a failure with: PYTHONPATH=. python -m shared.core.replay --write"""
    assert OUTPUT.read_text(encoding="utf-8") == render(build_all(TREE))


@pytest.mark.parametrize("name", PERSONAS)
def test_final_frame_matches_expected_signal(replays, name, validate_against):
    final = replays[name]["frames"][-1]
    expected = replays[name]["expected"]
    assert final["signal"]["signal"] == expected["signal"]
    assert final["signal"]["hintStyle"] == expected["hintStyle"]
    assert validate_against(final["signal"], "model", "PassiveSignal") == []


@pytest.mark.parametrize("name", PERSONAS)
def test_route_after_diagnostic_matches_expected(replays, name):
    frames = replays[name]["frames"]
    first_taught = next(f for f in frames if f["route"]["phase"] == "taught")
    assert first_taught["route"]["checkpointId"] == replays[name]["expected"]["nextAfterIntro"]
    assert first_taught["route"]["reason"]


def test_three_different_paths(replays):
    """The roster demo: the personas end on distinct signal/route combinations."""
    ends = {(p["frames"][-1]["signal"]["signal"], p["frames"][-1]["route"]["checkpointId"]) for p in replays.values()}
    assert len(ends) >= 3


def test_quick_tests_out_and_lands_on_keep_or_redirect(replays):
    final = replays["quick"]["frames"][-1]
    assert {"steer-it", "use-the-lingo"} <= set(final["testedOut"])
    assert final["route"]["checkpointId"] == "keep-or-redirect"
    assert final["flags"] == []


def test_slow_gets_flag_and_untried_angle(replays):
    final = replays["slow"]["frames"][-1]
    assert any(f["skillId"] == "build" and f["severity"] == "high" for f in final["flags"])
    assert final["anglesTried"] == ["analogy", "example"]
    assert final["signal"]["hintStyle"] not in final["anglesTried"]
    assert final["signal"]["angleToTry"] not in final["anglesTried"]


def test_signal_changes_visibly_during_replay(replays):
    """Adaptation is visible (P-5.3): the slow and detail personas switch signal mid-history."""
    for name in ("slow", "distracted-detail"):
        signals = [f["signal"]["signal"] for f in replays[name]["frames"]]
        assert signals[0] == "steady" and signals[-1] != "steady"


def test_frames_are_in_timestamp_order_and_cover_every_event(replays):
    for name in PERSONAS:
        p = json.loads(OUTPUT.read_text())["personas"][name]
        times = [f["event"]["at"] for f in p["frames"]]
        assert times == sorted(times)
    slow = replays["slow"]["frames"]
    assert sum(f["event"]["kind"] == "hint" for f in slow) == 2


def test_replay_is_deterministic(personas):
    assert replay_persona(TREE, personas["slow"]) == replay_persona(TREE, personas["slow"])
