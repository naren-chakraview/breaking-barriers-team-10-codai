"""Content safety (C-25, C-26, P-18, architecture 2.3).

Every student free-text input is screened before any model call, and every model output is
screened before display. Screening uses the Bedrock Guardrail `ApplyGuardrail` API.

Fail closed (C-25): if the Guardrail errors, the content is blocked (allowed=False,
action='error') and never passed through. A filter outage must not open the gate — but it
also must not break the lesson, so the caller shows a safe replacement and carries on down
the fallback path.

Server-side only (C-26): the browser never calls a model or a Guardrail. Returned
`ScreenResult`s carry category labels only, never the offending text.

The result shape is model.schema.json#/$defs/ScreenResult; the schema encodes the
fail-closed invariant (allowed=false => action in {blocked,error} and a non-empty
replacement), and the tests assert every return against it.
"""

from __future__ import annotations

from typing import Any, Optional, Sequence

# Shown to the student in place of blocked content. No detail about why, to avoid coaching
# a workaround; the lesson keeps going (F-14.1).
SAFE_INPUT_REPLACEMENT = (
    "Let's keep this about building your website. Try describing a part of your page you "
    "want to change."
)
SAFE_OUTPUT_REPLACEMENT = (
    "That response was held back by our safety check. Let's keep going with your project."
)
# Shown when the Guardrail itself errors (fail closed). Distinct so operators can tell a
# genuine block from an outage in the logs, without leaking content.
SAFE_ERROR_REPLACEMENT = (
    "Our safety check is briefly unavailable, so we paused that. Your work is saved and the "
    "lesson continues."
)


def wrap_untrusted(texts: Sequence[str]) -> list[dict[str, Any]]:
    """Wrap untrusted strings as Converse `guardContent` blocks (architecture 2.3).

    All student text, retrieved context and tool output must be wrapped so the Guardrail
    evaluates them; trusted rubrics/system prompts stay outside guardContent. Returning the
    blocks (rather than mutating a message) keeps this pure and easy to test.
    """
    return [{"guardContent": {"text": {"text": t}}} for t in texts if t]


class Safety:
    """Guardrail-backed screening. Inject a bedrock-runtime client (or a fake in tests).

    `guardrail_id` and `guardrail_version` are required together (omitting either makes the
    Guardrail silently not apply). `version` must be a pinned numbered version, never DRAFT.
    """

    def __init__(
        self,
        client: Any,
        guardrail_id: str,
        guardrail_version: str,
    ) -> None:
        if not guardrail_id or not guardrail_version:
            raise ValueError("Both guardrail_id and guardrail_version are required (C-25).")
        if guardrail_version.upper() == "DRAFT":
            raise ValueError("Guardrail version must be a pinned number, not DRAFT (C-25).")
        self._client = client
        self._id = guardrail_id
        self._version = guardrail_version

    def screen_input(self, text: str, correlation_id: str) -> dict[str, Any]:
        """Screen untrusted student input before any model call (C-25)."""
        return self._apply(text, source="INPUT", replacement=SAFE_INPUT_REPLACEMENT)

    def screen_output(self, text: str, correlation_id: str) -> dict[str, Any]:
        """Screen model output before it reaches the student (C-25)."""
        return self._apply(text, source="OUTPUT", replacement=SAFE_OUTPUT_REPLACEMENT)

    def _apply(self, text: str, source: str, replacement: str) -> dict[str, Any]:
        """Call ApplyGuardrail and map the response to a ScreenResult. Fail closed on error."""
        try:
            resp = self._client.apply_guardrail(
                guardrailIdentifier=self._id,
                guardrailVersion=self._version,
                source=source,  # 'INPUT' or 'OUTPUT'
                content=[{"text": {"text": text}}],
            )
        except Exception:
            # Fail closed: block, do not raise, do not leak the error text to the student.
            return self._result(
                allowed=False, action="error", replacement=SAFE_ERROR_REPLACEMENT, categories=[]
            )

        action = resp.get("action")  # 'GUARDRAIL_INTERVENED' | 'NONE'
        if action == "GUARDRAIL_INTERVENED":
            return self._result(
                allowed=False,
                action="blocked",
                replacement=replacement,
                categories=self._categories(resp),
            )
        return self._result(allowed=True, action="none", replacement=None, categories=[])

    def _result(
        self,
        allowed: bool,
        action: str,
        replacement: Optional[str],
        categories: list[str],
    ) -> dict[str, Any]:
        return {
            "allowed": allowed,
            "action": action,
            "replacement": replacement,
            "categories": categories[:10],
            # On a filter error we may not know the version; null is allowed by the schema.
            "guardrailVersion": self._version if action != "error" else None,
        }

    @staticmethod
    def _categories(resp: dict[str, Any]) -> list[str]:
        """Extract category labels only from the assessment. Never the matched text (C-26)."""
        cats: list[str] = []
        for assessment in resp.get("assessments", []):
            cf = assessment.get("contentPolicy", {}).get("filters", [])
            cats.extend(f.get("type", "").lower() for f in cf if f.get("type"))
            if assessment.get("sensitiveInformationPolicy"):
                sip = assessment["sensitiveInformationPolicy"]
                if sip.get("piiEntities") or sip.get("regexes"):
                    cats.append("pii")
            tp = assessment.get("topicPolicy", {}).get("topics", [])
            cats.extend(t.get("name", "").lower() for t in tp if t.get("name"))
        # De-dupe, preserve order.
        seen: set[str] = set()
        out: list[str] = []
        for c in cats:
            if c and c not in seen:
                seen.add(c)
                out.append(c)
        return out
