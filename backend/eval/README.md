# backend/eval (Python)

The validator golden-set evaluation and launch gate (Task 11, C-17, P-19.2). Pure and
deterministic — no AWS, no model calls. It scores agreement between human raters and the
validator's evidence levels and enforces the launch gate.

| File | What |
|---|---|
| `metrics.py` | Exact agreement, within-1 agreement, quadratic weighted kappa (QWK). |
| `golden_set.py` | Load/validate a golden-set file; pooled + per-skill report; the gate. |
| `__main__.py` | CLI: `python -m backend.eval <file>` — prints the report, exits non-zero if the gate fails. |
| `rate.py` | CLI: `python -m backend.eval.rate` — walks a human rater through the submissions, collects `humanLevel`, writes the golden set. The HUMAN side of the benchmark. |
| `fixtures/submissions.json` | 18 synthetic project-step submissions (6 each build/language/debug, levels 0..max). Synthetic submissions are fine; the ratings are not — see below. |
| `fixtures/golden-set.sample.json` | **Placeholder** set that wires the gate; replace with the real ratings produced below. |

## Producing a real gate number (Track G + C)

The launch gate measures validator-vs-human agreement, so the `humanLevel` ratings must be
assigned by real people and the `modelLevel`s by a real validator run. Two steps:

1. **Human side** — a teammate rates the submissions (~30 min):

   ```bash
   python -m backend.eval.rate --rater "Sam"        # resumable; saves after each rating
   ```

   This reads `fixtures/submissions.json`, shows each submission with the skill's rubric, and
   writes `fixtures/golden-set.json` with `humanLevel` set and `modelLevel: -1` (placeholder).
   Rate all 18 (need ≥ 15 for the gate, C-17).

2. **Model side** — snapshot the validator's scores on a pinned model + prompt version
   (makes real, billable Bedrock calls, so it is `--live`-guarded; needs the deployed
   Guardrail in SSM):

   ```bash
   python -m backend.ai.scripts.snapshot_validator --live
   ```

   This fills `modelLevel` in `fixtures/golden-set.json` from `validate_project`.

3. **Run the gate** on the completed file:

   ```bash
   python -m backend.eval backend/eval/fixtures/golden-set.json
   ```

Submissions are synthetic (team-authored) by design — that only affects coverage, not the
agreement measure. Keeping `humanLevel` genuinely human is what makes the kappa honest.

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
