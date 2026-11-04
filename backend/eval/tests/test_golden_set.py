"""Golden-set runner, validation, and the launch gate (C-17)."""

import json
from pathlib import Path

import pytest

from backend.eval.golden_set import (
    GoldenSet,
    evaluate,
    validate_ratings,
    run_file,
    MIN_SUBMISSIONS,
    SKILL_MAX,
)
from backend.eval.__main__ import main

SAMPLE = Path(__file__).resolve().parents[1] / "fixtures" / "golden-set.sample.json"


def _rating(i, skill="build", h=2, m=2):
    return {"submissionId": f"s-{i:03d}", "skillId": skill, "humanLevel": h, "modelLevel": m}


def _set(ratings, gate=0.70):
    return GoldenSet(gate=gate, ratings=ratings)


# ---- the shipped sample passes the gate ----

def test_sample_file_passes_gate():
    r = run_file(SAMPLE)
    assert r.enough_submissions
    assert r.passed
    assert r.pooled.qwk >= 0.70


# ---- count gate (C-17: >= 15) ----

def test_fails_with_too_few_submissions():
    # Perfect agreement but only 3 submissions -> gate fails on the count.
    r = evaluate(_set([_rating(i) for i in range(3)]))
    assert r.pooled.passed          # QWK is perfect
    assert not r.enough_submissions
    assert not r.passed             # ... but the launch gate still fails
    assert "NOT ENOUGH" in r.summary()


def test_passes_at_exactly_min_submissions():
    r = evaluate(_set([_rating(i) for i in range(MIN_SUBMISSIONS)]))
    assert r.n == MIN_SUBMISSIONS
    assert r.passed


# ---- QWK gate ----

def test_fails_when_qwk_below_gate():
    # 16 submissions, chance-level agreement -> QWK ~0 -> fails the QWK gate.
    ratings = []
    for i in range(16):
        h, m = (0, 1) if i % 2 == 0 else (1, 0)
        ratings.append(_rating(i, h=h, m=m))
    r = evaluate(_set(ratings))
    assert r.enough_submissions
    assert not r.pooled.passed
    assert not r.passed


# ---- per-skill scales ----

def test_per_skill_uses_each_skills_max():
    ratings = [_rating(i, "language", h=3, m=3) for i in range(15)]
    r = evaluate(_set(ratings))
    assert "language" in r.per_skill
    assert r.per_skill["language"].gate == 0.70


# ---- validation ----

def test_validate_flags_unknown_skill():
    problems = validate_ratings([{"submissionId": "x", "skillId": "mystery",
                                  "humanLevel": 1, "modelLevel": 1}])
    assert any("unknown skillId" in p for p in problems)


def test_validate_flags_out_of_range_level():
    # build max is 2; level 3 is out of range.
    problems = validate_ratings([{"submissionId": "x", "skillId": "build",
                                  "humanLevel": 3, "modelLevel": 1}])
    assert any("out of range" in p for p in problems)


def test_validate_flags_duplicate_and_missing():
    problems = validate_ratings([
        {"submissionId": "dup", "skillId": "build", "humanLevel": 1, "modelLevel": 1},
        {"submissionId": "dup", "skillId": "build", "humanLevel": 1},  # missing modelLevel
    ])
    assert any("duplicate" in p for p in problems)
    assert any("missing 'modelLevel'" in p for p in problems)


def test_evaluate_raises_on_invalid_set():
    with pytest.raises(ValueError, match="invalid golden set"):
        evaluate(_set([{"submissionId": "x", "skillId": "nope",
                        "humanLevel": 9, "modelLevel": 0}]))


# ---- CLI exit codes ----

def test_cli_passes_on_sample():
    assert main(["prog", str(SAMPLE)]) == 0


def test_cli_fails_below_gate(tmp_path):
    bad = tmp_path / "bad.json"
    ratings = [{"submissionId": f"s{i}", "skillId": "build",
                "humanLevel": i % 2, "modelLevel": (i + 1) % 2} for i in range(16)]
    bad.write_text(json.dumps({"gate": 0.70, "ratings": ratings}))
    assert main(["prog", str(bad)]) == 1


def test_cli_usage_error_on_missing_arg():
    assert main(["prog"]) == 2


def test_cli_error_on_missing_file():
    assert main(["prog", "/no/such/file.json"]) == 2


def test_skill_max_matches_rubric():
    assert SKILL_MAX == {"build": 2, "language": 3, "debug": 3}
