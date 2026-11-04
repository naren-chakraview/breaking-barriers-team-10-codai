// JSDoc typedefs for the services layer (C-30: JavaScript, not TypeScript).
// These are the editor-facing mirror of shared/contracts/schemas/services.schema.json.
// The schema is the source of truth that CI enforces; these give autocomplete and
// inline docs while writing components and the mock/HTTP implementations.
//
// Nothing here describes client telemetry: the UI sends no idle, revision or
// visibility counters (ADR-006).

/**
 * @typedef {'student'|'teacher'} Role
 * @typedef {'guiding_question'|'example'|'analogy'|'step_by_step'} HintStyle
 * @typedef {'speed_up'|'slow_down'|'redirect'|'reengage'|'steady'} PassiveSignalName
 * @typedef {'locked'|'available'|'current'|'completed'|'tested_out'} ProgressStatus
 * @typedef {'auto'|'hold'|'assign'} RoutingMode
 * @typedef {'stub'|'bedrock'|'rules'|'cache'|'none'} Source
 */

/**
 * @typedef {Object} Project
 * @property {string} html
 * @property {string} css
 * @property {string} js
 */

/**
 * @typedef {Object} TeacherInput
 * @property {RoutingMode} mode
 * @property {string} [checkpointId] Required when mode is 'assign'.
 */

/**
 * @typedef {Object} Notice
 * @property {'ADAPTIVE_UNAVAILABLE'|'CONTENT_BLOCKED'} code
 * @property {string} message
 */

/**
 * @typedef {Object} TreeResponse
 * @property {object} tree The skill tree (content of sample-skilltree.json).
 * @property {Record<string, ProgressStatus>} progress checkpointId to status.
 * @property {Record<string, number>} evidence skillId to the student's level (max observed).
 * @property {{ checkpointId: string, stepId: string } | null} current
 * @property {boolean} fallbackActive
 * @property {string} correlationId
 */

/**
 * @typedef {Object} SubmitStepArgs
 * @property {string} stepId
 * @property {string} courseId
 * @property {string} checkpointId
 * @property {'prompt'|'answer'|'complete'} kind
 * @property {string} [text]
 * @property {number} [questionId]
 * @property {string} [choiceId]
 * @property {Project} [project]
 */

/**
 * @typedef {Object} Evidence
 * @property {string} skillId
 * @property {number} level
 * @property {number} max
 * @property {number} confidence
 * @property {boolean} conditionMet
 * @property {string} note
 */

/**
 * @typedef {Object} NextStep
 * @property {string} checkpointId
 * @property {string} stepId
 * @property {string} reason Human-readable "why this checkpoint" (C-19.5).
 */

/**
 * @typedef {Object} Hint
 * @property {HintStyle} style
 * @property {string} text
 */

/**
 * @typedef {Object} PassiveView
 * @property {PassiveSignalName} signal
 * @property {HintStyle} hintStyle
 * @property {string} reason
 */

/**
 * @typedef {Object} SubmitResponse
 * @property {string} stepId
 * @property {'scored'|'recorded'|'blocked'|'fallback'} outcome
 * @property {Evidence | null} evidence
 * @property {number | null} masteryDisplay round(100 * level / max); display only (C-11).
 * @property {boolean} completed
 * @property {NextStep | null} next
 * @property {Hint | null} hint
 * @property {PassiveView | null} passive
 * @property {Notice | null} notice
 * @property {Source} source
 * @property {string} correlationId
 */

/**
 * @typedef {Object} AskTutorArgs
 * @property {string} courseId
 * @property {string} checkpointId
 * @property {string} stepId
 * @property {string} question
 */

/**
 * @typedef {Object} TutorResponse
 * @property {string} answer
 * @property {HintStyle} hintStyle
 * @property {Notice | null} notice
 * @property {Source} source
 * @property {string} correlationId
 */

/**
 * @typedef {Object} VerifyPromptArgs
 * @property {string} courseId
 * @property {string} checkpointId
 * @property {string} stepId
 * @property {string} prompt
 */

/**
 * @typedef {Object} VerifyResponse
 * @property {'ok'|'needs_narrowing'} verdict
 * @property {string} guidance
 * @property {Notice | null} notice
 * @property {Source} source
 * @property {string} correlationId
 */

/**
 * @typedef {Object} GenerateArgs
 * @property {string} courseId
 * @property {string} checkpointId
 * @property {string} stepId
 * @property {string} prompt
 * @property {Project} project
 */

/**
 * @typedef {Object} GenerateResponse
 * @property {Project | null} project
 * @property {string} explanation
 * @property {Notice | null} notice
 * @property {Source} source
 * @property {string} correlationId
 */

/**
 * @typedef {Object} SetTeacherInputArgs
 * @property {string} studentId
 * @property {TeacherInput} input
 */

/**
 * @typedef {Object} HealthResponse
 * @property {'ok'|'degraded'|'down'} status
 * @property {Record<string, 'ok'|'down'>} components
 * @property {string} checkedAt
 * @property {string} correlationId
 */

/**
 * The services layer. The mock and HTTP implementations share this shape (C-28).
 * @typedef {Object} Services
 * @property {(args: { courseId: string }) => Promise<TreeResponse>} getTree
 * @property {(args: SubmitStepArgs) => Promise<SubmitResponse>} submitStep
 * @property {(args: AskTutorArgs) => Promise<TutorResponse>} askTutor
 * @property {(args: VerifyPromptArgs) => Promise<VerifyResponse>} verifyPrompt
 * @property {(args: GenerateArgs) => Promise<GenerateResponse>} generate
 * @property {(args: { courseId: string }) => Promise<object>} getTeacherRoster
 * @property {(args: SetTeacherInputArgs) => Promise<object>} setTeacherInput
 * @property {() => Promise<HealthResponse>} health
 */

export {}
