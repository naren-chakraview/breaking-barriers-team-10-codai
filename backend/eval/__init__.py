"""Validator golden-set evaluation (Task 11, C-17, P-19.2).

Measures the validation service's agreement with human raters on a benchmark of project
submissions, reported as exact agreement, within-1 agreement, and quadratic weighted kappa.
Launch gate: QWK >= 0.70.

Pure and deterministic — no AWS, no model calls. It scores a set of (human level, model
level) pairs that a caller has already produced. The model levels come from the validator
(backend/ai, once built); this package only does the agreement math and the gate.
"""

from .metrics import (
    exact_agreement,
    within_one_agreement,
    quadratic_weighted_kappa,
    AgreementReport,
    agreement_report,
)

__all__ = [
    "exact_agreement",
    "within_one_agreement",
    "quadratic_weighted_kappa",
    "AgreementReport",
    "agreement_report",
]
