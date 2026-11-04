#!/usr/bin/env python3
"""Launcher for the local demo services API.

Creates a local virtualenv (.venv-api, gitignored) with the backend's pinned
dependencies on first run, then starts backend/local/server.py inside it. This keeps
the demo backend runnable with a single `npm run dev:api` and no global installs.

Env passthrough: PORT, STORE_PATH, STORE_MODE, MODEL_MODE.
"""

from __future__ import annotations

import os
import subprocess
import sys
import venv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VENV = ROOT / ".venv-api"
REQS = ["jsonschema==4.23.0", "referencing==0.36.2"]


def venv_python() -> Path:
    return VENV / ("Scripts" if os.name == "nt" else "bin") / ("python.exe" if os.name == "nt" else "python")


def ensure_venv() -> Path:
    py = venv_python()
    if not py.exists():
        print("Creating .venv-api with backend deps (first run only)…")
        venv.EnvBuilder(with_pip=True).create(VENV)
        subprocess.check_call([str(py), "-m", "pip", "install", "-q", "--upgrade", "pip"])
        subprocess.check_call([str(py), "-m", "pip", "install", "-q", *REQS])
    return py


def main() -> int:
    py = ensure_venv()
    env = dict(os.environ)
    # Run as a module from the repo root so `backend.*` imports resolve.
    env["PYTHONPATH"] = str(ROOT) + os.pathsep + env.get("PYTHONPATH", "")
    return subprocess.call([str(py), "-m", "backend.local.server"], cwd=str(ROOT), env=env)


if __name__ == "__main__":
    raise SystemExit(main())
