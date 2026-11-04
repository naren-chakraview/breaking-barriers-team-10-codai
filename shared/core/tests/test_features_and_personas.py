"""Passive feature extraction and the rule baseline (C-10, ADR-006), driven by the
persona fixtures. These are the regression tests the architecture plan references: the
rule signal is the CI baseline, and each persona must produce its expected signal.

Every rule_signal output is validated against the shared PassiveSignal JSON Schema, so
the Python baseline cannot drift from the contract the JS side uses.
"""

import pytest

from shared.core import load_tree, extract_features, rule_signal


@pytest.fixture(scope="module")
def tree():
    return load_tree()


def _features_for(tree, persona):
    # build has target 2; the fixtures exercise misses against that target.
    targets = {"build": 2, "language": 2, "debug": 2}
    return extract_features(
        tree,
        attempts=persona["attempts"],
        hints=persona.get("hints", []),
        target_by_skill=targets,
    )


def test_no_client_telemetry_fields_in_features(tree, personas):
    # ADR-006: features come only from content and server timestamps. The contract Features
    # shape has no idle/visibility/keystroke fields; assert our output matches it.
    f = _features_for(tree, personas["slow"])
    c = f.to_contract()
    assert set(c["timing"].keys()) == {
        "medianSecondsPerStep", "cohortMedianSecondsPerStep", "maxGapSeconds", "rapidSubmits",
    }
    assert set(c["content"].keys()) == {"cosmeticEditShare"}


@pytest.mark.parametrize("name", ["quick", "slow", "distracted-detail", "distracted-inattentive"])
def test_features_match_contract(tree, personas, validate_against, name):
    f = _features_for(tree, personas[name])
    errors = validate_against(f.to_contract(), "model", "Features")
    assert errors == [], f"{name} features invalid: {errors}"


@pytest.mark.parametrize("name", ["quick", "slow", "distracted-detail", "distracted-inattentive"])
def test_rule_signal_matches_contract(tree, personas, validate_against, name):
    f = _features_for(tree, personas[name])
    sig = rule_signal(f)
    errors = validate_against(sig, "model", "PassiveSignal")
    assert errors == [], f"{name} signal invalid: {errors}"


@pytest.mark.parametrize("name", ["quick", "slow", "distracted-detail", "distracted-inattentive"])
def test_rule_signal_matches_expected_persona(tree, personas, name):
    f = _features_for(tree, personas[name])
    sig = rule_signal(f)
    expected = personas[name]["expected"]["signal"]
    assert sig["signal"] == expected, f"{name}: got {sig['signal']}, expected {expected}"


def test_rule_signal_never_returns_a_checkpoint_id(tree, personas):
    # Routing is not a model/Passive decision (C-18). The signal must not leak a checkpoint id.
    for p in personas.values():
        sig = rule_signal(_features_for(tree, p))
        assert "checkpointId" not in sig


def test_slow_learner_gets_an_untried_angle(tree, personas):
    # The slow fixture already tried example and analogy; the signal should pick another.
    f = _features_for(tree, personas["slow"])
    sig = rule_signal(f)
    assert sig["signal"] == "slow_down"
    assert sig["hintStyle"] not in ("example", "analogy")


def test_distracted_detail_has_high_cosmetic_share(tree, personas):
    f = _features_for(tree, personas["distracted-detail"])
    assert f.cosmetic_edit_share >= 0.7
    assert rule_signal(f)["signal"] == "redirect"
