"""Validate data against the language-neutral JSON Schemas in shared/contracts/schemas/.

The schemas are shared by the whole project (C-30: the contract schemas are language-neutral
JSON Schema). This loads every `*.schema.json`, wires cross-file `$ref` resolution by `$id`,
and exposes `problems(file, defn, data)` mirroring the JS `validate.js` helper.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

from jsonschema import Draft202012Validator
from referencing import Registry, Resource

_SCHEMA_DIR = Path(__file__).resolve().parents[2] / "shared" / "contracts" / "schemas"
_BASE = "https://codeai.local/contracts/"


@lru_cache(maxsize=1)
def _registry() -> Registry:
    """A referencing Registry with every schema registered under its $id."""
    resources = []
    for path in _SCHEMA_DIR.glob("*.schema.json"):
        schema = json.loads(path.read_text(encoding="utf-8"))
        resources.append((schema["$id"], Resource.from_contents(schema)))
    return Registry().with_resources(resources)


def _validator_for(file: str, defn: Optional[str]) -> Draft202012Validator:
    root_id = f"{_BASE}{file}.schema.json"
    schema = {"$ref": f"{root_id}#/$defs/{defn}"} if defn else {"$ref": root_id}
    return Draft202012Validator(schema, registry=_registry())


def problems(file: str, defn: Optional[str], data: Any) -> list[str]:
    """Return a readable list of validation problems ([] when valid)."""
    validator = _validator_for(file, defn)
    out = []
    for err in sorted(validator.iter_errors(data), key=lambda e: list(e.path)):
        loc = "/".join(str(p) for p in err.path) or "(root)"
        out.append(f"{loc} {err.message}")
    return out


def is_valid(file: str, defn: Optional[str], data: Any) -> bool:
    return not problems(file, defn, data)
