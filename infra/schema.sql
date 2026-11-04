-- CodeAI student-state schema (C-8 + the proposed additions). PostgreSQL.
-- Applied by the backend migration runner on first deploy, not by CDK, so schema changes
-- do not force a stack update. snake_case columns (C-29); the Python adapter maps them to
-- the camelCase records in shared/contracts/schemas/records.schema.json.
--
-- Tables marked PROPOSED are not yet in C-8 (passive_signal, hint_event, student,
-- teacher_input); they need the C-8 edit tracked in Task 8a.

-- ---- C-8 tables ---------------------------------------------------------------

-- PROPOSED: C-8 has no student table, but the roster and personas need one.
CREATE TABLE IF NOT EXISTS student (
    student_id   TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    synthetic    BOOLEAN NOT NULL DEFAULT FALSE
);

-- Append-only. A student's level for a skill is MAX(level); it never decreases (C-10).
CREATE TABLE IF NOT EXISTS student_skill_evidence (
    id             BIGSERIAL PRIMARY KEY,
    student_id     TEXT NOT NULL,
    skill_id       TEXT NOT NULL,
    level          INT  NOT NULL CHECK (level >= 0),
    source_step_id TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_student_skill
    ON student_skill_evidence (student_id, skill_id);

-- One row per submit. Holds student text, so access is restricted (encrypted at rest via KMS).
CREATE TABLE IF NOT EXISTS step_attempt (
    attempt_id           TEXT PRIMARY KEY,
    student_id           TEXT NOT NULL,
    step_id              TEXT NOT NULL,
    input_text           TEXT,
    project_snapshot_ref TEXT,
    evidence_level       INT,
    confidence           DOUBLE PRECISION,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attempt_student_time
    ON step_attempt (student_id, created_at);

CREATE TABLE IF NOT EXISTS checkpoint_progress (
    student_id    TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('locked','available','current','completed','tested_out')),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, checkpoint_id)
);

CREATE TABLE IF NOT EXISTS remediation_flag (
    id          BIGSERIAL PRIMARY KEY,
    student_id  TEXT NOT NULL,
    skill_id    TEXT NOT NULL,
    reason      TEXT NOT NULL,
    severity    TEXT NOT NULL CHECK (severity IN ('normal','high')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_flag_open
    ON remediation_flag (student_id) WHERE resolved_at IS NULL;

CREATE TABLE IF NOT EXISTS routing_decision (
    decision_id            TEXT PRIMARY KEY,
    student_id             TEXT NOT NULL,
    proposed_checkpoint_id TEXT NOT NULL,
    teacher_input          JSONB NOT NULL,
    applied_checkpoint_id  TEXT NOT NULL,
    reason                 TEXT NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_routing_student_time
    ON routing_decision (student_id, created_at);

CREATE TABLE IF NOT EXISTS fallback_event (
    id         BIGSERIAL PRIMARY KEY,
    student_id TEXT NOT NULL,
    step_id    TEXT,
    component  TEXT NOT NULL CHECK (component IN ('validation','routing','generation','safety','passive')),
    error      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fallback_student_time
    ON fallback_event (student_id, created_at);

CREATE TABLE IF NOT EXISTS teacher_config (
    teacher_id             TEXT PRIMARY KEY,
    answer_timeout_seconds INT NOT NULL DEFAULT 180
);

-- ---- PROPOSED additions (Task 8a C-8 edit) -----------------------------------

CREATE TABLE IF NOT EXISTS passive_signal (
    signal_id      TEXT PRIMARY KEY,
    student_id     TEXT NOT NULL,
    signal         TEXT NOT NULL CHECK (signal IN ('speed_up','slow_down','redirect','reengage','steady')),
    hint_style     TEXT NOT NULL CHECK (hint_style IN ('guiding_question','example','analogy','step_by_step')),
    angle_to_try   TEXT,
    reason         TEXT NOT NULL,
    evidence_refs  JSONB NOT NULL DEFAULT '[]',
    confidence     DOUBLE PRECISION NOT NULL,
    features_hash  TEXT NOT NULL,
    model_id       TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_passive_cache
    ON passive_signal (student_id, features_hash, prompt_version);

CREATE TABLE IF NOT EXISTS hint_event (
    hint_id    TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    step_id    TEXT NOT NULL,
    style      TEXT NOT NULL CHECK (style IN ('guiding_question','example','analogy','step_by_step')),
    angle      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hint_student_time
    ON hint_event (student_id, created_at);

CREATE TABLE IF NOT EXISTS teacher_input (
    student_id    TEXT PRIMARY KEY,
    mode          TEXT NOT NULL CHECK (mode IN ('auto','hold','assign')),
    checkpoint_id TEXT,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
