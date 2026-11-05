"""Fill the golden set's modelLevel column from a live validator run (C-17).

Reads the submissions and the human-rated golden set, runs each rated submission through the
real validator (`validate_project` against Bedrock) on a pinned model + prompt version, and
writes the resulting evidenceLevel back as `modelLevel`. Pairs with backend/eval/rate.py
(the human side) to complete the benchmark.

This makes real, billable model calls — one `validate` call per rated submission — so it is
guarded behind `--live`.

Usage:
    python -m backend.ai.scripts.snapshot_validator --live
    python -m backend.ai.scripts.snapshot_validator --live --region us-west-2 \
        --submissions backend/eval/fixtures/submissions.json \
        --golden backend/eval/fixtures/golden-set.json

A submission that falls back (low confidence / invalid / model error) is recorded with
modelLevel = null and noted; re-run to retry, or rate/score fewer if a model is flaky.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

DEFAULT_FAST = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
DEFAULT_STRONG = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
_DIR = Path("backend/eval/fixtures")
DEFAULT_SUBMISSIONS = _DIR / "submissions.json"
DEFAULT_GOLDEN = _DIR / "golden-set.json"


def _config(region: str):
    import boto3

    ssm = boto3.client("ssm", region_name=region)
    names = {
        "model.fast": "/codeai/model/fast",
        "model.strong": "/codeai/model/strong",
        "guardrail.id": "/codeai/guardrail/id",
        "guardrail.version": "/codeai/guardrail/version",
    }
    fallback = {"model.fast": DEFAULT_FAST, "model.strong": DEFAULT_STRONG}

    def get_config(key: str):
        try:
            return ssm.get_parameter(Name=names[key])["Parameter"]["Value"]
        except Exception:
            return fallback.get(key)

    return get_config


def run(region: str, submissions_path: Path, golden_path: Path) -> int:
    from backend.ai import create_bedrock_port

    subs = {s["submissionId"]: s
            for s in json.loads(submissions_path.read_text(encoding="utf-8"))["submissions"]}
    golden = json.loads(golden_path.read_text(encoding="utf-8"))

    get_config = _config(region)
    if not get_config("guardrail.id"):
        print("ERROR: no guardrail id in SSM; deploy CodeAI-GuardrailStack first.", file=sys.stderr)
        return 2
    port = create_bedrock_port(get_config, region_name=region)
    # The validator resolves the skill's evidence descriptors from the tree by default.

    scored = fallbacks = 0
    for rating in golden["ratings"]:
        sid = rating["submissionId"]
        sub = subs.get(sid)
        if sub is None:
            print(f"  {sid}: not in submissions file — skipping")
            continue
        res = port.validate_project({
            "stepId": sub.get("stepId", sid),
            "skillId": sub["skillId"],
            "condition": sub["condition"],
            "prompts": sub["prompts"],
            "projectBefore": sub.get("projectBefore"),
            "projectAfter": sub["projectAfter"],
            "correlationId": f"snap-{sid}",
        })
        if res.get("ok"):
            lvl = res["result"]["evidenceLevel"]
            rating["modelLevel"] = lvl
            scored += 1
            print(f"  {sid}: human={rating.get('humanLevel')} model={lvl} "
                  f"(conf {res['result']['confidence']:.2f})")
        else:
            rating["modelLevel"] = None
            fallbacks += 1
            print(f"  {sid}: FALLBACK ({res['fallback']['reason']}) -> modelLevel null")

    golden["modelSnapshot"] = {
        "modelFast": get_config("model.fast"),
        "modelStrong": get_config("model.strong"),
        "promptVersion": "validate@1",
    }
    golden_path.write_text(json.dumps(golden, indent=2), encoding="utf-8")
    print(f"\nScored {scored}, fallbacks {fallbacks}. Wrote {golden_path}.")
    print("Run the gate:  python -m backend.eval " + str(golden_path))
    if fallbacks:
        print("Note: fallbacks have modelLevel=null; the gate will reject them — re-run to retry.")
    return 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Fill modelLevel from a live validator run.")
    ap.add_argument("--live", action="store_true",
                    help="Required. Confirms real, billable validator calls (one per submission).")
    ap.add_argument("--region", default="us-west-2")
    ap.add_argument("--submissions", default=str(DEFAULT_SUBMISSIONS))
    ap.add_argument("--golden", default=str(DEFAULT_GOLDEN))
    args = ap.parse_args(argv[1:])
    if not args.live:
        print("This makes REAL, billable validator calls. Re-run with --live.", file=sys.stderr)
        return 2
    try:
        return run(args.region, Path(args.submissions), Path(args.golden))
    except (FileNotFoundError, KeyError, json.JSONDecodeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
