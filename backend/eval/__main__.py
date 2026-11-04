"""CLI gate for the golden set (C-17). Prints the report, exits non-zero if the gate fails.

    python -m backend.eval path/to/golden-set.json

In CI this runs on `main` against a pinned snapshot; a failing gate fails the build.
"""

from __future__ import annotations

import sys

from .golden_set import run_file


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: python -m backend.eval <golden-set.json>", file=sys.stderr)
        return 2
    try:
        result = run_file(argv[1])
    except (FileNotFoundError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    print(result.summary())
    return 0 if result.passed else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
