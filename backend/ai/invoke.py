"""The `invoke` wrapper: the single Bedrock caller (C-27, architecture 2.4).

One function builds and makes the Converse call for every model task, so model ids,
`maxTokens`, the timeout, the guardrail config and the decision log live in exactly one
place. Verify and codegen resolve to different models (P-7.2) via the task→tier map.

Contract: model.schema.json#/$defs/InvokeRequest -> #/$defs/InvokeResult. The wrapper
returns a tagged result dict and NEVER raises a provider error — failures map to an
`{ok: false, error: {code, message}}` envelope the caller handles (fallback, C-22).

No student text is logged. `trace` is disabled on the guardrail so the response can't echo
flagged content (C-26, ADR-011).
"""

from __future__ import annotations

from typing import Any, Callable, Mapping, Optional

# C-22/C-29: adaptive calls time out at 10 s.
TIMEOUT_MS = 10_000

# architecture 2.4 — which model tier each task uses. verify/codegen differ (P-7.2).
TASK_TIER = {
    "verify": "fast",
    "validate": "fast",
    "passive": "fast",
    "codegen": "strong",
    "tutor": "strong",
}

# Map a botocore error code to the contract ErrorCode. Everything else -> UPSTREAM_ERROR.
_ERROR_CODE = {
    "ThrottlingException": "RATE_LIMITED",
    "ModelTimeoutException": "TIMEOUT",
    "ServiceUnavailableException": "UPSTREAM_ERROR",
    "InternalServerException": "UPSTREAM_ERROR",
    "ValidationException": "UPSTREAM_ERROR",
    "AccessDeniedException": "UPSTREAM_ERROR",
    "ResourceNotFoundException": "UPSTREAM_ERROR",
}


def build_converse_kwargs(
    request: Mapping[str, Any],
    model_id: str,
    guardrail_id: str,
    guardrail_version: str,
) -> dict[str, Any]:
    """Build the Converse request body from an InvokeRequest. Pure; no I/O.

    The trusted `user` text and each `untrusted` item become separate content blocks; the
    untrusted ones are wrapped in `guardContent` so the guardrail evaluates them while the
    trusted system/user text is not needlessly re-scanned (architecture 2.3). `maxTokens`
    is always set (never defaulted — the #1 cause of throttling).
    """
    prompt = request["prompt"]
    opts = request["opts"]

    content: list[dict[str, Any]] = [{"text": prompt["user"]}]
    for item in prompt.get("untrusted", []):
        content.append({"guardContent": {"text": {"text": item}}})

    inference: dict[str, Any] = {"maxTokens": opts["maxTokens"]}
    if "temperature" in opts:
        inference["temperature"] = opts["temperature"]

    return {
        "modelId": model_id,
        "system": [{"text": prompt["system"]}],
        "messages": [{"role": "user", "content": content}],
        "inferenceConfig": inference,
        "guardrailConfig": {
            "guardrailIdentifier": guardrail_id,
            "guardrailVersion": guardrail_version,
            "trace": "disabled",  # never echo flagged content (C-26, ADR-011)
        },
    }


def invoke(
    request: Mapping[str, Any],
    client: Any,
    model_for_tier: Callable[[str], str],
    guardrail_id: str,
    guardrail_version: str,
    log: Optional[Callable[[Mapping[str, Any]], None]] = None,
) -> dict[str, Any]:
    """Make one Converse call for a model task. Returns an InvokeResult; never raises.

    @param client: a bedrock-runtime client (or a fake in tests), already configured with
                   a read timeout; see BedrockModelPort for the production wiring.
    @param model_for_tier: maps 'fast'|'strong' to a concrete model id (from config).
    @param log: optional decision-log sink; receives a dict with ids/hashes only, no text.
    """
    task = request["task"]
    opts = request["opts"]
    correlation_id = opts["correlationId"]
    prompt_version = opts.get("promptVersion", f"{task}@unversioned")
    tier = TASK_TIER.get(task, "strong")
    model_id = model_for_tier(tier)

    kwargs = build_converse_kwargs(request, model_id, guardrail_id, guardrail_version)

    import time

    started = time.monotonic()
    try:
        resp = client.converse(**kwargs)
    except Exception as exc:  # noqa: BLE001 — must not raise to the caller (C-22 fallback)
        code = _classify(exc)
        result = {
            "ok": False,
            "task": task,
            "error": {"code": code, "message": _safe_message(exc)},
            "correlationId": correlation_id,
        }
        _emit(log, task, model_id, prompt_version, correlation_id, error=code)
        return result

    latency_ms = int((time.monotonic() - started) * 1000)
    text = _extract_text(resp)
    usage = resp.get("usage", {}) or {}
    guardrail_action = (
        "intervened" if resp.get("stopReason") == "guardrail_intervened" else "none"
    )

    result = {
        "ok": True,
        "task": task,
        "source": "bedrock",
        "modelId": model_id,
        "promptVersion": prompt_version,
        "text": text,
        "latencyMs": latency_ms,
        "usage": {
            "inputTokens": int(usage.get("inputTokens", 0)),
            "outputTokens": int(usage.get("outputTokens", 0)),
        },
        "guardrail": {"version": guardrail_version, "action": guardrail_action},
        "correlationId": correlation_id,
    }
    _emit(
        log, task, model_id, prompt_version, correlation_id,
        latency_ms=latency_ms,
        input_tokens=result["usage"]["inputTokens"],
        output_tokens=result["usage"]["outputTokens"],
        guardrail_action=guardrail_action,
    )
    return result


def _extract_text(resp: Mapping[str, Any]) -> str:
    """Concatenate the text blocks of the assistant message. Empty string if none."""
    msg = (resp.get("output", {}) or {}).get("message", {}) or {}
    parts = [b.get("text", "") for b in msg.get("content", []) if "text" in b]
    return "".join(parts)


def _classify(exc: Exception) -> str:
    """Map a botocore ClientError (or anything) to a contract ErrorCode."""
    code = getattr(exc, "response", {}).get("Error", {}).get("Code") if hasattr(exc, "response") else None
    if code in _ERROR_CODE:
        return _ERROR_CODE[code]
    # Read-timeouts surface as botocore.exceptions.ReadTimeoutError (no response).
    if "timeout" in type(exc).__name__.lower() or "timeout" in str(exc).lower():
        return "TIMEOUT"
    return "UPSTREAM_ERROR"


def _safe_message(exc: Exception) -> str:
    """A short, text-free error message. Never includes the prompt or model output."""
    name = type(exc).__name__
    code = getattr(exc, "response", {}).get("Error", {}).get("Code") if hasattr(exc, "response") else None
    return f"{code or name} from the model provider"[:400]


def _emit(log, task, model_id, prompt_version, correlation_id, **fields: Any) -> None:
    """Send a decision-log record with ids/hashes only — no student text (ADR-011)."""
    if log is None:
        return
    record = {
        "task": task,
        "modelId": model_id,
        "promptVersion": prompt_version,
        "correlationId": correlation_id,
        **fields,
    }
    log(record)
