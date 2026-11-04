"""Schema-validation fixture for the Track C tests.

Validates Python outputs against the same JSON Schemas the JS side uses
(shared/contracts/schemas), so the safety module cannot drift from the contract (ADR-015).
Same resolution approach as shared/core/tests/conftest.py.
"""

import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[3]
SCHEMA_DIR = ROOT / "shared" / "contracts" / "schemas"


@pytest.fixture(scope="session")
def registry() -> Registry:
    resources = []
    for path in SCHEMA_DIR.glob("*.schema.json"):
        schema = json.loads(path.read_text(encoding="utf-8"))
        resources.append((schema["$id"], Resource.from_contents(schema)))
    return Registry().with_resources(resources)


@pytest.fixture(scope="session")
def validate_against(registry):
    base = "https://codeai.local/contracts/"

    def _validate(data, file, def_name=None):
        file_id = f"{base}{file}.schema.json"
        ref = file_id + (f"#/$defs/{def_name}" if def_name else "")
        wrapper = {"$id": f"{base}__probe__.json", "$ref": ref}
        validator = Draft202012Validator(wrapper, registry=registry)
        return [f"{list(e.path)}: {e.message}" for e in validator.iter_errors(data)]

    return _validate
