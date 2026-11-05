# backend/ai/scripts

Operational scripts for Track C. **Not** part of the automated test suite — these make
real, billable AWS calls and require a `--live` flag so they never run by accident.

## `smoke_test.py` — live AI pipeline check

Confirms the model-backed pipeline works against **real Bedrock**, which the unit tests
(run against fakes) cannot: that prompts parse, the deployed Guardrail actually filters,
and model output validates against the contract.

Steps: safety screen (clean + unsafe) → invoke verify (fast) → invoke generate (strong) →
validate_project (judge) → passive reasoner (if merged).

```bash
. .venv/bin/activate
pip install boto3            # if not already present
python -m backend.ai.scripts.smoke_test --live
# options: --region us-west-2  --fast <model-id>  --strong <model-id>
```

Prerequisites:
- AWS credentials for the account holding the Guardrail (us-west-2), with
  `bedrock:InvokeModel`, `bedrock:ApplyGuardrail`, `ssm:GetParameter`.
- `CodeAI-GuardrailStack` deployed (so `/codeai/guardrail/{id,version}` exist in SSM).

Cost: a handful of model + guardrail calls, well under a cent per run.

### Last verified
2026-11-04, the hackathon account in us-west-2 (guardrail id in that account's SSM):
clean input allowed; unsafe input blocked (`violence`, `prompt_attack`); verify (Haiku 4.5,
~1.7s) and generate (Sonnet 4.5, ~3.6s) returned real output; validate returned a valid
`ValidatorOutput` (build level 1, confidence 0.85). All inside the 10s adaptive budget.
