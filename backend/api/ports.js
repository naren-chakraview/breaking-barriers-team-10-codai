// Ports: the external seams the backend API depends on but does not own. Track D injects
// these so the handlers can be built and tested against stubs today and the real
// implementations later, without a rewrite (ADR-014). Each port's shape is fixed by a
// contract, cited below.
//
// This file has no runtime code; it is the typed boundary (JSDoc) between Track D and the
// other tracks. The actual implementations are provided at wiring time (api/index.js in the
// Lambda bootstrap, or a test's fakes).

/**
 * Seam 2 — domain core (Track B, shared/core, CORE_FUNCTIONS). Pure, deterministic (C-18).
 * @typedef {object} CorePort
 * @property {(json: object) => object} loadTree
 *   Validate and index the parsed skill tree (C-6). Returns an indexed tree the other core
 *   functions accept.
 * @property {(evidence: Record<string, number>, row: {skillId: string, level: number}) => Record<string, number>} applyEvidence
 *   Fold one evidence observation into the monotonic per-skill map (C-10).
 * @property {(tree: object, progress: Record<string, string>, evidence: Record<string, number>, teacherInput?: {mode: string, checkpointId?: string}) => {checkpointId: string, reason: string}} route
 *   Pick the next checkpoint and say why (C-18, C-19). Returns an id that exists in the tree.
 */

/**
 * Seam 3 — model access and safety (Track C). Each returns a tagged result; none throws a
 * provider error (model.schema.json).
 * @typedef {object} ModelPort
 * @property {(req: object) => Promise<object>} validateProject
 *   Score a project step against the rubric (C-14). Returns ValidateResult:
 *   { ok: true, result: ValidatorOutput, source } | { ok: false, fallback: {...} }.
 * @property {(args: {text: string, correlationId: string}) => Promise<object>} screenInput
 *   Guardrail screen of untrusted input (C-25). Returns ScreenResult; fails closed.
 * @property {(args: {text: string, correlationId: string}) => Promise<object>} screenOutput
 *   Guardrail screen of model output before display (C-25). Returns ScreenResult.
 * @property {(req: object) => Promise<object>} invoke
 *   The only Bedrock caller (C-27). Returns InvokeResult. Used by tutor/verify/generate.
 */

/**
 * Seam 4 — the repository (Track D's own store). Implements REPOSITORY_METHODS.
 * @typedef {object} RepositoryPort
 */

/**
 * Everything a handler set needs, injected once.
 * @typedef {object} Deps
 * @property {CorePort} core
 * @property {ModelPort} model
 * @property {RepositoryPort} repo
 * @property {object} tree the parsed skill-tree JSON (database/sample-skilltree.json)
 * @property {{ serviceMode: string, modelMode: string, storeMode: string }} modes
 */

export {}
