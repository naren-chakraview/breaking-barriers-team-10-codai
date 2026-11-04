// Single source of truth for the names and enums that cross a seam.
// Schemas, stubs, suites and (later) real implementations all import from here.
// A drift test (tests/seams-drift.test.js) keeps the JSON Schemas in step with this file.
//
// Architecture: docs/architecture/architecture.md section 1.8 (ADR-014).

/** The eight functions the UI calls (C-28). Seam 1. */
export const SERVICE_FUNCTIONS = Object.freeze([
  'getTree',
  'submitStep',
  'askTutor',
  'verifyPrompt',
  'generate',
  'getTeacherRoster',
  'setTeacherInput',
  'health',
])

/** Seam 2: pure domain logic in shared/core. */
export const CORE_FUNCTIONS = Object.freeze([
  'loadTree',
  'applyEvidence',
  'route',
  'extractFeatures',
  'ruleSignal',
])

/** Seam 3: model access and safety. */
export const MODEL_FUNCTIONS = Object.freeze([
  'invoke',
  'screenInput',
  'screenOutput',
  'validateProject',
  'reasonPassive',
])

/** Seam 4: the repository interface. */
export const REPOSITORY_METHODS = Object.freeze([
  'putStudent',
  'listStudents',
  'getEvidence',
  'appendEvidence',
  'getProgress',
  'upsertProgress',
  'saveAttempt',
  'getHistory',
  'writeHintEvent',
  'listHintEvents',
  'writeRoutingDecision',
  'listRoutingDecisions',
  'writeFallbackEvent',
  'listFallbackEvents',
  'writePassiveSignal',
  'getLatestPassiveSignal',
  'getCachedPassiveSignal',
  'writeRemediationFlag',
  'listOpenFlags',
  'getTeacherInput',
  'setTeacherInput',
  'getTeacherConfig',
])

/** Seam 5: configuration and secrets. */
export const CONFIG_FUNCTIONS = Object.freeze(['getConfig', 'getSecret'])

/** Model tasks (C-27). verify and codegen must use different models (P-7.2). */
export const MODEL_TASKS = Object.freeze(['verify', 'codegen', 'validate', 'tutor', 'passive'])

/** Which model tier each task uses (architecture 2.4). */
export const TASK_MODEL_TIER = Object.freeze({
  verify: 'fast',
  validate: 'fast',
  passive: 'fast',
  codegen: 'strong',
  tutor: 'strong',
})

/** Config keys (architecture 2.14). Values live in SSM, never in the repo. */
export const CONFIG_KEYS = Object.freeze({
  MODEL_FAST: 'model.fast',
  MODEL_STRONG: 'model.strong',
  GUARDRAIL_ID: 'guardrail.id',
  GUARDRAIL_VERSION: 'guardrail.version',
})

export const MODEL_CONFIG_KEY = Object.freeze({
  fast: CONFIG_KEYS.MODEL_FAST,
  strong: CONFIG_KEYS.MODEL_STRONG,
})

/** Enums. Mirrored in schemas/common.schema.json and checked by the drift test. */
export const ENUMS = Object.freeze({
  Source: ['stub', 'bedrock', 'rules', 'cache', 'none'],
  HintStyle: ['guiding_question', 'example', 'analogy', 'step_by_step'],
  PassiveSignalName: ['speed_up', 'slow_down', 'redirect', 'reengage', 'steady'],
  ProgressStatus: ['locked', 'available', 'current', 'completed', 'tested_out'],
  RoutingMode: ['auto', 'hold', 'assign'],
  FallbackComponent: ['validation', 'routing', 'generation', 'safety', 'passive'],
  Severity: ['normal', 'high'],
  ErrorCode: [
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'VALIDATION_ERROR',
    'CONTENT_BLOCKED',
    'RATE_LIMITED',
    'TIMEOUT',
    'UPSTREAM_ERROR',
    'CONFIG_ERROR',
    'INTERNAL',
  ],
})

/** Limits that come from the constraints. */
export const LIMITS = Object.freeze({
  /** C-16: below this a validator result counts as unreliable and triggers fallback. */
  CONFIDENCE_MIN: 0.6,
  /** C-16: maximum length of the validator's evidence string. */
  EVIDENCE_TEXT_MAX: 240,
  /** C-22, C-29: adaptive calls time out after 10 seconds. */
  TIMEOUT_MS: 10_000,
  /** C-23: re-check health at least this often while on fallback. */
  HEALTH_RECHECK_MS: 30_000,
  /** C-34: nudge cooldown per checkpoint. */
  NUDGE_COOLDOWN_MS: 60_000,
  /** C-8: default help-ladder timeout. */
  ANSWER_TIMEOUT_SECONDS_DEFAULT: 180,
})

/**
 * Repository tables. `c8` tables are in C-8 today. `proposed` tables are NOT yet in C-8
 * and need a C-8 edit (made in the PR for Task 8a, or sooner if the team agrees).
 * Columns are the C-8 snake_case names; adapters map them to the camelCase records in
 * schemas/records.schema.json.
 */
export const TABLES = Object.freeze({
  student_skill_evidence: {
    status: 'c8',
    record: 'StudentSkillEvidence',
    columns: ['student_id', 'skill_id', 'level', 'source_step_id', 'created_at'],
  },
  step_attempt: {
    status: 'c8',
    record: 'StepAttempt',
    columns: [
      'attempt_id',
      'student_id',
      'step_id',
      'input_text',
      'project_snapshot_ref',
      'evidence_level',
      'confidence',
      'created_at',
    ],
  },
  checkpoint_progress: {
    status: 'c8',
    record: 'CheckpointProgress',
    columns: ['student_id', 'checkpoint_id', 'status', 'updated_at'],
  },
  remediation_flag: {
    status: 'c8',
    record: 'RemediationFlag',
    columns: ['student_id', 'skill_id', 'reason', 'severity', 'created_at', 'resolved_at'],
  },
  routing_decision: {
    status: 'c8',
    record: 'RoutingDecision',
    columns: [
      'decision_id',
      'student_id',
      'proposed_checkpoint_id',
      'teacher_input',
      'applied_checkpoint_id',
      'reason',
      'created_at',
    ],
  },
  fallback_event: {
    status: 'c8',
    record: 'FallbackEvent',
    columns: ['student_id', 'step_id', 'component', 'error', 'created_at'],
  },
  teacher_config: {
    status: 'c8',
    record: 'TeacherConfig',
    columns: ['teacher_id', 'answer_timeout_seconds'],
  },
  passive_signal: {
    status: 'proposed',
    record: 'PassiveSignalRecord',
    columns: [
      'signal_id',
      'student_id',
      'signal',
      'hint_style',
      'angle_to_try',
      'reason',
      'evidence_refs',
      'confidence',
      'features_hash',
      'model_id',
      'prompt_version',
      'created_at',
    ],
  },
  hint_event: {
    status: 'proposed',
    record: 'HintEvent',
    columns: ['hint_id', 'student_id', 'step_id', 'style', 'angle', 'created_at'],
  },
  student: {
    status: 'proposed',
    record: 'Student',
    columns: ['student_id', 'display_name', 'synthetic'],
  },
  teacher_input: {
    status: 'proposed',
    record: 'TeacherInputRecord',
    columns: ['student_id', 'mode', 'checkpoint_id', 'updated_at'],
  },
})

/** Convert a C-8 snake_case column to the camelCase property used on the wire and in records. */
export function snakeToCamel(name) {
  return name.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}
