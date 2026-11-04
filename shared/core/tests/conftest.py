"""Shared pytest fixtures: the real tree, the persona fixtures, and a schema validator.

The schema validator checks Python outputs against the SAME JSON Schemas the JS side uses
(shared/contracts/schemas), so the two implementations cannot drift in shape (ADR-015).
"""

import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[3]
SCHEMA_DIR = ROOT / "shared" / "contracts" / "schemas"
PERSONA_DIR = ROOT / "shared" / "contracts" / "fixtures" / "personas"


@pytest.fixture(scope="session")
def registry() -> Registry:
    """A referencing Registry with every contract schema, so $ref across files resolves."""
    resources = []
    for path in SCHEMA_DIR.glob("*.schema.json"):
        schema = json.loads(path.read_text(encoding="utf-8"))
        resources.append((schema["$id"], Resource.from_contents(schema)))
    return Registry().with_resources(resources)


@pytest.fixture(scope="session")
def validate_against(registry):
    """Return a function: validate(data, file, def_name) -> list of error strings ([] = valid)."""
    base = "https://codeai.local/contracts/"

    def _validate(data, file, def_name=None):
        # Validate against a tiny schema whose only content is a $ref to the target def,
        # with $id set to the target file's base URI so relative $refs inside the target
        # (e.g. "common.schema.json#/...") resolve the same way Ajv resolves them on the
        # JS side.
        file_id = f"{base}{file}.schema.json"
        ref = file_id + (f"#/$defs/{def_name}" if def_name else "")
        # Neutral $id so the absolute $ref resolves to the registered schema, whose own
        # $id then anchors any relative refs inside it (as Ajv does on the JS side).
        wrapper = {"$id": f"{base}__probe__.json", "$ref": ref}
        validator = Draft202012Validator(wrapper, registry=registry)
        return [f"{list(e.path)}: {e.message}" for e in validator.iter_errors(data)]

    return _validate


def _load_persona(name: str) -> dict:
    return json.loads((PERSONA_DIR / f"{name}.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def personas() -> dict:
    return {
        "quick": _load_persona("quick"),
        "slow": _load_persona("slow"),
        "distracted-detail": _load_persona("distracted-detail"),
        "distracted-inattentive": _load_persona("distracted-inattentive"),
    }
