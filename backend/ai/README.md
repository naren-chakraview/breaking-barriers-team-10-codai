# backend/ai (Python, Track C)

The model-and-safety seam (seam 3) the API depends on (`backend/api/model.py` `ModelPort`).

| File | What | Status |
|---|---|---|
| `safety.py` | Content safety (C-25): `screen_input`/`screen_output` via Bedrock `ApplyGuardrail`, `wrap_untrusted` for `guardContent` blocks. Fail-closed. | **Built.** |
| `invoke.py` | The single Bedrock caller (C-27): builds the Converse call, sets `maxTokens` + 10 s timeout + pinned guardrail, maps failures to the contract error envelope, logs ids/hashes only. | **Built.** |
| `bedrock_port.py` | `BedrockModelPort`: safety + `invoke` real; `validate_project` raises until the C-14 judge lands. | **Built** (except validator). |
| `factory.py` | `create_bedrock_port(get_config)`: builds the port from SSM config; injected into the API's `build_app(model=...)`. | **Built.** |

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

## The `invoke` wrapper (C-27)

One function builds every model call (`backend/ai/invoke.py`):
- Task → tier → model id: `verify`/`validate`/`passive` use the fast model, `codegen`/`tutor`
  the strong one, so verify and codegen differ (P-7.2). Ids come from SSM config.
- `maxTokens` is always set (never defaulted — the top cause of throttling). 10 s read timeout
  (C-22). `guardrailConfig` is pinned with `trace: disabled` (C-26).
- Trusted `system`/`user` text goes in the message; `untrusted` items are wrapped in
  `guardContent` so the guardrail evaluates them (architecture 2.3).
- Returns the `InvokeResult` contract — success or an `{ok:false, error:{code,message}}`
  envelope — and **never raises** a provider error (the caller falls back, C-22). The decision
  log carries ids/hashes only, never student text (ADR-011).

To run live, inject the port into the API: `build_app(model=create_bedrock_port(get_config))`
with `MODEL_MODE=bedrock`. Not yet exercised against a real Bedrock endpoint.

## Deferred (separate tasks)
- `validate_project` (C-14): the LLM-judge validator. Raises until built.

Until both land, the API runs on `StubModel` (MODEL_MODE=stub).

## Tests

```bash
. .venv/bin/activate && pip install -r requirements-dev.txt
pytest backend/ai
```

A fake Bedrock client exercises clean/blocked/PII/error paths; every result is validated
against `model.schema.json#/$defs/ScreenResult`. No AWS; no live `ApplyGuardrail` call.
