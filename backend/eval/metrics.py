"""Inter-rater agreement metrics (C-17, P-19.2).

All three metrics operate on paired integer ratings on the same ordinal scale (evidence
levels 0..max). `human` is the reference rating, `model` is the validator's. The lists must
be equal length and non-empty.

- exact agreement: fraction of pairs that match exactly.
- within-1 agreement: fraction within one level (tolerant of adjacent disagreement).
- quadratic weighted kappa (QWK): agreement corrected for chance, penalising larger
  disagreements quadratically. The launch gate is on QWK.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


def _check(human: Sequence[int], model: Sequence[int]) -> None:
    if len(human) != len(model):
        raise ValueError(f"paired ratings must be equal length: {len(human)} != {len(model)}")
    if not human:
        raise ValueError("need at least one rating pair")


def exact_agreement(human: Sequence[int], model: Sequence[int]) -> float:
    """Fraction of pairs where the two ratings are identical."""
    _check(human, model)
    hits = sum(1 for h, m in zip(human, model) if h == m)
    return hits / len(human)


def within_one_agreement(human: Sequence[int], model: Sequence[int]) -> float:
    """Fraction of pairs within one level of each other."""
    _check(human, model)
    hits = sum(1 for h, m in zip(human, model) if abs(h - m) <= 1)
    return hits / len(human)


def quadratic_weighted_kappa(
    human: Sequence[int], model: Sequence[int], min_rating: int | None = None, max_rating: int | None = None
) -> float:
    """Cohen's kappa with quadratic weights (Fleiss-Cohen), over an ordinal scale.

    The scale spans [min_rating, max_rating]; by default it is inferred from the data.
    Passing explicit bounds keeps the confusion matrix well-defined when a level never
    appears in the data. Note the QWK value itself is invariant to the declared max (the
    (n-1)^2 weight normalizer cancels in the ratio); the bounds are for correctness of the
    matrix shape, not to shift the score.

    QWK = 1 - (sum w*O) / (sum w*E), where w_ij = (i-j)^2 / (N-1)^2 is the quadratic weight,
    O is the observed confusion matrix and E the expected (outer product of marginals).

    Returns 1.0 for perfect agreement. When every rating is identical and there is no
    disagreement to correct for, the denominator is 0; by convention that is perfect
    agreement, so this returns 1.0.
    """
    _check(human, model)
    lo = min_rating if min_rating is not None else min(min(human), min(model))
    hi = max_rating if max_rating is not None else max(max(human), max(model))
    if hi < lo:
        raise ValueError("max_rating must be >= min_rating")
    n_ratings = hi - lo + 1
    n_items = len(human)

    if n_ratings == 1:
        # Only one possible value — all pairs trivially agree.
        return 1.0

    # Observed confusion matrix O[i][j] = count of (human=i, model=j).
    observed = [[0 for _ in range(n_ratings)] for _ in range(n_ratings)]
    for h, m in zip(human, model):
        observed[h - lo][m - lo] += 1

    # Marginals and expected matrix E = outer(human_hist, model_hist) / n_items.
    human_hist = [sum(observed[i]) for i in range(n_ratings)]
    model_hist = [sum(observed[i][j] for i in range(n_ratings)) for j in range(n_ratings)]

    denom_w = (n_ratings - 1) ** 2
    num = 0.0
    den = 0.0
    for i in range(n_ratings):
        for j in range(n_ratings):
            w = ((i - j) ** 2) / denom_w
            expected = human_hist[i] * model_hist[j] / n_items
            num += w * observed[i][j]
            den += w * expected

    if den == 0:
        # No expected disagreement (e.g. all ratings identical) -> perfect agreement.
        return 1.0
    return 1.0 - num / den


@dataclass(frozen=True)
class AgreementReport:
    n: int
    exact: float
    within_one: float
    qwk: float
    gate: float
    passed: bool

    def summary(self) -> str:
        status = "PASS" if self.passed else "FAIL"
        return (
            f"{status}  n={self.n}  "
            f"exact={self.exact:.3f}  within1={self.within_one:.3f}  "
            f"QWK={self.qwk:.3f}  (gate {self.gate:.2f})"
        )


def agreement_report(
    human: Sequence[int],
    model: Sequence[int],
    gate: float = 0.70,
    min_rating: int | None = None,
    max_rating: int | None = None,
) -> AgreementReport:
    """Compute all three metrics and the pass/fail against the QWK gate (default 0.70, C-17)."""
    qwk = quadratic_weighted_kappa(human, model, min_rating, max_rating)
    return AgreementReport(
        n=len(human),
        exact=exact_agreement(human, model),
        within_one=within_one_agreement(human, model),
        qwk=qwk,
        gate=gate,
        passed=qwk >= gate,
    )
