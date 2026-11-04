# backend/ai (Python, Track C)

The model-and-safety seam (seam 3) the API depends on (`backend/api/model.py` `ModelPort`).

| File | What | Status |
|---|---|---|
| `safety.py` | Content safety (C-25): `screen_input`/`screen_output` via Bedrock `ApplyGuardrail`, `wrap_untrusted` for `guardContent` blocks. Fail-closed. | **Built.** |
| `bedrock_port.py` | `BedrockModelPort`: a `ModelPort` whose safety methods are real; `invoke`/`validate_project` raise `NotImplementedError`. | **Partial** (safety only). |

## Safety (C-25, C-26, P-18, architecture 2.3)

- Every untrusted student input is screened before any model call; every model output is
  screened before display.
- **Fail closed:** a Guardrail error blocks the content (`allowed=False`, `action="error"`)
  and never raises to the caller — the lesson keeps running on a safe replacement. The
  `ScreenResult` schema encodes this invariant and the tests assert every return against it.
- **No leaks (C-26):** results carry category labels only, never the offending text or the
  error message.
- `wrap_untrusted` builds Converse `guardContent` blocks so all untrusted text is evaluated
  while trusted rubrics/system prompts stay outside (architecture 2.3).

The Guardrail itself is `infra/GuardrailStack` (`CodeAI-GuardrailStack`): K-12 content
filters at HIGH strength, prompt-attack, 9 PII entities blocked, KMS-encrypted, a pinned
numbered version (never DRAFT). Its id and version are published to SSM
(`/codeai/guardrail/id`, `/codeai/guardrail/version`) for the backend to read at runtime.

## Deferred (separate tasks)

- `invoke` (C-27): the single Bedrock caller. Raises until built.
- `validate_project` (C-14): the LLM-judge validator. Raises until built.

Until both land, the API runs on `StubModel` (MODEL_MODE=stub).

## Tests

```bash
. .venv/bin/activate && pip install -r requirements-dev.txt
pytest backend/ai
```

A fake Bedrock client exercises clean/blocked/PII/error paths; every result is validated
against `model.schema.json#/$defs/ScreenResult`. No AWS; no live `ApplyGuardrail` call.
