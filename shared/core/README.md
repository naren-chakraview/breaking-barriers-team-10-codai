# shared/core (Python)

The pure domain core (Track B, Task 2). No AWS, no I/O, no model calls. These functions
are deterministic and fully unit-tested, and they are the behavioral source of truth for
routing, evidence and the Passive rule baseline.

Python is the backend language (ADR-015). The front-end mock keeps a JavaScript
implementation of the same behavior; both are checked against the one set of JSON Schemas
and fixtures in `shared/contracts/`, so the two implementations cannot drift in shape.

## Modules

| Module | Purpose | Constraints |
|---|---|---|
| `tree.py` | Load and index `database/sample-skilltree.json`; look up checkpoints, steps, skills, skill maxima. | C-5, C-6 |
| `evidence.py` | Monotonic per-skill level (max observed); the 0-100 display value. | C-9, C-10, C-11 |
| `routing.py` | `route(tree, progress, evidence, teacher_input)` returning `(checkpoint_id, reason)`. | C-18, C-19, C-20 |
| `features.py` | `extract_features` and `rule_signal`: the deterministic Passive baseline. | C-10, ADR-006 |

## Why two implementations

The merged contracts (`shared/contracts/`) define the shapes once, in JSON Schema. This
Python core is what the backend runs. The JS stub/mock in `shared/contracts/stubs/` keeps
the front end working offline. Each is tested against the same schemas and the same
persona fixtures, so "two implementations" means two bodies of code validated against one
contract, not two diverging contracts.

## Run the tests

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
pytest shared/core backend/store
```
