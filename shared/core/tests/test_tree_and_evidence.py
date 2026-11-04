"""Tree loading (C-5, C-6) and evidence monotonicity (C-9, C-10, C-11)."""

from shared.core import load_tree, apply_evidence, display_score, skill_max
from shared.core.evidence import reduce_evidence, mean_display_score


def test_loads_real_tree_and_indexes_skills():
    tree = load_tree()
    assert tree.id == "hoai2026-adaptive"
    assert tree.skill_max == {"build": 2, "language": 3, "debug": 3}
    assert tree.has_checkpoint("steer-it")
    assert tree.is_skippable("steer-it")
    assert tree.requires("keep-or-redirect") == ["steer-it"]


def test_apply_evidence_is_monotonic_and_pure():
    base = {"build": 2}
    out = apply_evidence(base, "build", 1)   # lower, ignored (C-10)
    assert out["build"] == 2
    assert base == {"build": 2}              # not mutated
    assert apply_evidence(out, "build", 3)["build"] == 3


def test_reduce_evidence_takes_the_max():
    rows = [
        {"skillId": "build", "level": 1},
        {"skillId": "build", "level": 2},
        {"skillId": "language", "level": 1},
    ]
    assert reduce_evidence(rows) == {"build": 2, "language": 1}


def test_display_score_is_rounded_percentage():
    assert display_score(1, 2) == 50
    assert display_score(2, 2) == 100
    assert display_score(0, 3) == 0
    assert display_score(1, 0) == 0          # guards divide-by-zero


def test_mean_display_score_ignores_unknown_skills():
    tree = load_tree()
    ev = {"build": 2, "language": 3, "debug": 0, "mystery": 9}
    # build 100, language 100, debug 0 -> mean 67; mystery ignored
    assert mean_display_score(ev, tree) == 67


def test_skill_max_lookup():
    tree = load_tree()
    assert skill_max(tree, "language") == 3
    assert skill_max(tree, "nope") == 0
