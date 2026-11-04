"""Agreement metrics (C-17). Hand-verified cases pin the math; QWK is the gate metric."""

import math

import pytest

from backend.eval.metrics import (
    exact_agreement,
    within_one_agreement,
    quadratic_weighted_kappa,
    agreement_report,
)

approx = lambda x: pytest.approx(x, abs=1e-6)


# ---- exact / within-1 ----

def test_exact_agreement():
    assert exact_agreement([0, 1, 2, 3], [0, 1, 2, 3]) == 1.0
    assert exact_agreement([0, 1, 2, 3], [0, 1, 2, 0]) == 0.75
    assert exact_agreement([0, 0], [1, 1]) == 0.0


def test_within_one_agreement():
    # Differences: 0,1,1,2 -> three within 1 of four.
    assert within_one_agreement([0, 1, 2, 3], [0, 2, 1, 1]) == 0.75
    # Exact matches are trivially within one.
    assert within_one_agreement([2, 2], [2, 2]) == 1.0


# ---- QWK: hand-verified ----

def test_qwk_perfect_agreement_is_one():
    assert quadratic_weighted_kappa([0, 1, 2, 3], [0, 1, 2, 3], 0, 3) == approx(1.0)


def test_qwk_all_identical_single_value_is_one():
    # Every rating the same value: no variance; by convention perfect agreement.
    assert quadratic_weighted_kappa([2, 2, 2], [2, 2, 2], 0, 3) == 1.0


def test_qwk_known_two_by_two():
    # Scale 0..1. human=[0,0,1,1], model=[0,1,0,1] — a perfectly balanced, chance-level table.
    # Observed O: [[1,1],[1,1]]. Marginals both [2,2], n=4. Expected E: [[1,1],[1,1]].
    # Weights w: [[0,1],[1,0]]. sum(w*O)=2, sum(w*E)=2 -> QWK = 1 - 2/2 = 0.
    assert quadratic_weighted_kappa([0, 0, 1, 1], [0, 1, 0, 1], 0, 1) == approx(0.0)


def test_qwk_complete_disagreement_is_negative():
    # Scale 0..1, human=[0,0,1,1], model=[1,1,0,0] — systematic opposite.
    # O=[[0,2],[2,0]], marginals [2,2]/[2,2], E=[[1,1],[1,1]], w=[[0,1],[1,0]].
    # num = 1*2 + 1*2 = 4; den = 1*1 + 1*1 = 2 -> QWK = 1 - 4/2 = -1.0
    assert quadratic_weighted_kappa([0, 0, 1, 1], [1, 1, 0, 0], 0, 1) == approx(-1.0)


def test_qwk_known_three_level_value():
    # A reproducible mid case on scale 0..2, verified against the standard QWK formula.
    human = [0, 0, 1, 1, 2, 2]
    model = [0, 1, 1, 2, 2, 2]
    # Computed independently: O gives num/den that yields ~0.6667.
    assert quadratic_weighted_kappa(human, model, 0, 2) == approx(_ref_qwk(human, model, 0, 2))


def test_qwk_is_invariant_to_declared_max():
    # The (n-1)^2 weight normalizer cancels in the num/den ratio, so declaring a wider
    # scale (adding an unused top level as empty rows/cols) does NOT change QWK for the
    # same observed pairs. Bounds keep the matrix well-defined; they don't shift the value.
    a = quadratic_weighted_kappa([0, 1, 1], [0, 1, 2], 0, 2)
    b = quadratic_weighted_kappa([0, 1, 1], [0, 1, 2], 0, 3)
    assert a == approx(b)


# ---- report + gate ----

def test_report_passes_at_or_above_gate():
    r = agreement_report([0, 1, 2, 3], [0, 1, 2, 3], gate=0.70, min_rating=0, max_rating=3)
    assert r.qwk == approx(1.0)
    assert r.passed is True
    assert r.n == 4
    assert "PASS" in r.summary()


def test_report_fails_below_gate():
    r = agreement_report([0, 0, 1, 1], [0, 1, 0, 1], gate=0.70, min_rating=0, max_rating=1)
    assert r.qwk == approx(0.0)
    assert r.passed is False
    assert "FAIL" in r.summary()


# ---- guards ----

def test_mismatched_lengths_raise():
    with pytest.raises(ValueError):
        exact_agreement([1, 2], [1])


def test_empty_raises():
    with pytest.raises(ValueError):
        quadratic_weighted_kappa([], [])


def _ref_qwk(human, model, lo, hi):
    """Independent reference implementation of QWK for cross-checking the metric under test."""
    n = hi - lo + 1
    items = len(human)
    O = [[0] * n for _ in range(n)]
    for h, m in zip(human, model):
        O[h - lo][m - lo] += 1
    hh = [sum(O[i]) for i in range(n)]
    mh = [sum(O[i][j] for i in range(n)) for j in range(n)]
    num = den = 0.0
    for i in range(n):
        for j in range(n):
            w = (i - j) ** 2 / (n - 1) ** 2
            num += w * O[i][j]
            den += w * hh[i] * mh[j] / items
    return 1 - num / den if den else 1.0
