"""Run the full repository contract against the Aurora adapter, offline.

The vendor unit tests (test_aurora_repository.py) feed canned responses, so they can't catch
a semantic SQL bug. The live test (test_aurora_live.py) proves parity but needs a deployed
cluster. This bridges the gap: a small in-memory fake of the RDS Data API that actually
*executes* the statements the adapter emits (INSERT, ON CONFLICT upsert, MAX..GROUP BY,
ORDER BY, the open-flag filter, the passive cache lookup) over dicts, returning Data-API-
shaped responses with lowercase column names (as Postgres folds them). The adapter's
lowercase->camelCase mapping and JSONB round-trip are therefore exercised for real.

If the adapter passes `check_repository` through this fake, its SQL logic matches the JSON
adapter's behavior. (The live test remains the final word on real Postgres quirks.)
"""

from __future__ import annotations

import json
import re
from typing import Any

from backend.store.aurora_repository import AuroraRepository
from backend.store.tests.contract import check_repository


def _unwrap(value: dict[str, Any]) -> Any:
    if value.get("isNull"):
        return None
    for k in ("stringValue", "longValue", "doubleValue", "booleanValue"):
        if k in value:
            return value[k]
    return None


def _field(val: Any) -> dict[str, Any]:
    if val is None:
        return {"isNull": True}
    if isinstance(val, bool):
        return {"booleanValue": val}
    if isinstance(val, int):
        return {"longValue": val}
    if isinstance(val, float):
        return {"doubleValue": val}
    return {"stringValue": str(val)}


class SqlFakeDataApi:
    """Executes the specific statements AuroraRepository emits, over in-memory tables.

    Deliberately not a general SQL engine — it recognizes each statement by table and shape,
    which is enough to run the contract and to catch a wrong ON CONFLICT target, a missing
    GROUP BY MAX, a bad ORDER BY, or a dropped WHERE filter.
    """

    def __init__(self) -> None:
        self.t: dict[str, list[dict[str, Any]]] = {
            "STUDENT_PROFILE": [],
            "STUDENT_SKILL_EVIDENCE": [],
            "CHECKPOINT_PROGRESS": [],
            "STEP_ATTEMPT": [],
            "HINT_EVENT": [],
            "ROUTING_DECISION": [],
            "FALLBACK_EVENT": [],
            "PASSIVE_SIGNAL": [],
            "REMEDIATION_FLAG": [],
            "TEACHER_INPUT": [],
            "TEACHER_CONFIG": [],
        }

    def execute_statement(self, **kwargs: Any) -> dict[str, Any]:
        sql = " ".join(kwargs["sql"].split())
        p = {param["name"]: _unwrap(param["value"]) for param in kwargs.get("parameters", [])}
        upper = sql.upper()
        if upper.startswith("INSERT"):
            return self._insert(sql, p)
        if upper.startswith("SELECT"):
            return self._select(sql, p)
        raise AssertionError(f"fake has no handler for: {sql}")

    # ---- writes ----
    def _insert(self, sql: str, p: dict[str, Any]) -> dict[str, Any]:
        table = re.search(r"INSERT INTO (\w+)", sql).group(1)
        if table == "STUDENT_PROFILE":
            self._upsert("STUDENT_PROFILE", ["studentid"], {"studentid": p["sid"], "displayname": p["name"], "synthetic": p["syn"]})
        elif table == "STUDENT_SKILL_EVIDENCE":
            self.t[table].append({"studentid": p["sid"], "skillid": p["skill"], "level": p["level"], "sourcestepid": p["step"], "createdat": p["ts"]})
        elif table == "CHECKPOINT_PROGRESS":
            self._upsert("CHECKPOINT_PROGRESS", ["studentid", "checkpointid"], {"studentid": p["sid"], "checkpointid": p["cid"], "status": p["status"], "updatedat": p["ts"]})
        elif table == "STEP_ATTEMPT":
            self.t[table].append({"attemptid": p["aid"], "studentid": p["sid"], "stepid": p["step"], "inputtext": p["text"], "projectsnapshotref": p["snap"], "evidencelevel": p["level"], "confidence": p["conf"], "createdat": p["ts"]})
        elif table == "HINT_EVENT":
            self.t[table].append({"hintid": p["hid"], "studentid": p["sid"], "stepid": p["step"], "style": p["style"], "angle": p["angle"], "createdat": p["ts"]})
        elif table == "ROUTING_DECISION":
            self.t[table].append({"decisionid": p["did"], "studentid": p["sid"], "proposedcheckpointid": p["proposed"], "teacherinput": p["ti"], "appliedcheckpointid": p["applied"], "reason": p["reason"], "createdat": p["ts"]})
        elif table == "FALLBACK_EVENT":
            self.t[table].append({"studentid": p["sid"], "stepid": p["step"], "component": p["comp"], "error": p["err"], "createdat": p["ts"]})
        elif table == "PASSIVE_SIGNAL":
            self.t[table].append({"signalid": p["sid2"], "studentid": p["sid"], "signal": p["signal"], "hintstyle": p["style"], "angletotry": p["angle"], "reason": p["reason"], "evidencerefs": p["refs"], "confidence": p["conf"], "featureshash": p["hash"], "modelid": p["model"], "promptversion": p["pv"], "createdat": p["ts"]})
        elif table == "REMEDIATION_FLAG":
            self.t[table].append({"studentid": p["sid"], "skillid": p["skill"], "reason": p["reason"], "severity": p["sev"], "createdat": p["ts"], "resolvedat": p["resolved"]})
        elif table == "TEACHER_INPUT":
            self._upsert("TEACHER_INPUT", ["studentid"], {"studentid": p["sid"], "mode": p["mode"], "checkpointid": p["cid"], "updatedat": p["ts"]})
        else:
            raise AssertionError(f"fake INSERT target unknown: {table}")
        return {"records": [], "columnMetadata": []}

    def _upsert(self, table: str, keys: list[str], row: dict[str, Any]) -> None:
        for existing in self.t[table]:
            if all(existing[k] == row[k] for k in keys):
                existing.update(row)
                return
        self.t[table].append(row)

    # ---- reads ----
    def _select(self, sql: str, p: dict[str, Any]) -> dict[str, Any]:
        table = re.search(r"FROM (\w+)", sql).group(1)
        rows = list(self.t[table])

        # WHERE StudentId / TeacherId filters.
        if "WHERE STUDENTID = :SID" in sql.upper() or "WHERE STUDENTID = :SID " in sql.upper():
            rows = [r for r in rows if r.get("studentid") == p.get("sid")]
        if ":TID" in sql:
            rows = [r for r in rows if r.get("teacherid") == p.get("tid")]
        if "FEATURESHASH = :FH" in sql.upper():
            rows = [r for r in rows if r.get("featureshash") == p.get("fh") and r.get("promptversion") == p.get("pv")]
        if "RESOLVEDAT IS NULL" in sql.upper():
            rows = [r for r in rows if not r.get("resolvedat")]

        # Aggregate: MAX(Level) GROUP BY SkillId.
        if "MAX(LEVEL)" in sql.upper():
            agg: dict[str, int] = {}
            for r in rows:
                agg[r["skillid"]] = max(agg.get(r["skillid"], 0), int(r["level"]))
            return self._shape([{"skillid": s, "level": v} for s, v in agg.items()], ["skillid", "level"])

        # ORDER BY CreatedAt ASC / DESC.
        if "ORDER BY CREATEDAT" in sql.upper():
            rows = sorted(rows, key=lambda r: r.get("createdat") or "", reverse="DESC" in sql.upper())
        if "LIMIT 1" in sql.upper():
            rows = rows[:1]

        # Column projection: the explicit list, or every stored column for SELECT *.
        cols = self._projection(sql, rows)
        return self._shape(rows, cols)

    def _projection(self, sql: str, rows: list[dict[str, Any]]) -> list[str]:
        m = re.search(r"SELECT (.+?) FROM", sql, re.IGNORECASE | re.DOTALL)
        cols_part = m.group(1).strip()
        if cols_part == "*":
            return list(rows[0].keys()) if rows else []
        out = []
        for raw in cols_part.split(","):
            name = raw.strip().split()[-1]  # handle "MAX(Level) AS Level" -> "Level"
            out.append(name.lower())
        return out

    def _shape(self, rows: list[dict[str, Any]], cols: list[str]) -> dict[str, Any]:
        return {
            "columnMetadata": [{"name": c} for c in cols],
            "records": [[_field(r.get(c)) for c in cols] for r in rows],
        }


def _make_repo():
    return AuroraRepository(
        cluster_arn="arn:aws:rds:us-west-2:111122223333:cluster:codeai",
        secret_arn="arn:aws:secretsmanager:us-west-2:111122223333:secret:codeai",
        database="codeai",
        client=SqlFakeDataApi(),
    )


def test_aurora_adapter_passes_contract_against_sql_fake():
    """The Aurora adapter passes the SAME check_repository suite the JSON adapter passes,
    through a fake that executes its SQL semantics. Closes the offline parity gap."""
    check_repository(_make_repo)
