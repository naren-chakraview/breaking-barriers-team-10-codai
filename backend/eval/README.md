# backend/eval (Python)

The validator golden-set evaluation and launch gate (Task 11, C-17, P-19.2). Pure and
deterministic — no AWS, no model calls. It scores agreement between human raters and the
validator's evidence levels and enforces the launch gate.

| File | What |
|---|---|
| `metrics.py` | Exact agreement, within-1 agreement, quadratic weighted kappa (QWK). |
| `golden_set.py` | Load/validate a golden-set file; pooled + per-skill report; the gate. |
| `__main__.py` | CLI: `python -m backend.eval <file>` — prints the report, exits non-zero if the gate fails. |
| `fixtures/golden-set.sample.json` | **Placeholder** set that wires the gate; replace with real ratings. |

## The gate (C-17)

Two conditions, both required:
1. **At least 15 human-rated submissions.**
2. **Pooled QWK ≥ 0.70** (configurable per file via `gate`).

The report also shows exact and within-1 agreement, and a per-skill breakdown (each skill
on its own 0..max scale: build 0..2, language/debug 0..3). The pooled QWK is the number to
show in the demo.

## Golden-set file

```json
{
  "gate": 0.70,
  "ratings": [
    { "submissionId": "s-001", "skillId": "build", "humanLevel": 2, "modelLevel": 2 }
  ]
}
```

- `humanLevel` — the reference rating from a human.
- `modelLevel` — the validator's score for the same submission, captured as a **snapshot**
  on a pinned model + prompt version, so the gate runs in CI with no AWS.

## Status / what's left for Track G and C

- The shipped `fixtures/golden-set.sample.json` is a **placeholder** (synthetic pairs) so
  the harness and the CI gate are proven. It must be replaced with:
  - **≥ 15 genuinely human-rated project submissions** (Track G) — the slow dependency.
  - a **`modelLevel` snapshot** produced by the real validator (C-14, which reuses the
    `invoke` wrapper) on a pinned model + prompt version.
- Wiring the gate into CI on `main` (not every PR, to limit model spend) is a small
  workflow add once real ratings exist.

## Run

```bash
. .venv/bin/activate && pip install -r requirements-dev.txt
python -m backend.eval backend/eval/fixtures/golden-set.sample.json
pytest backend/eval
```
