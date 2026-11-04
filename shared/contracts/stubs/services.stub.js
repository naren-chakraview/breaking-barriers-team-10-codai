import { services, tree, clone } from '../fixtures/index.js'

// Stub services for seam 1. Returns canned, schema-valid responses so Tracks E and F
// can build the UI before the backend exists. Everything model-derived is source:'stub'.
// The real mock engine (Task 9) and the HTTP client (Task 9) replace this behind the
// same signatures and the same contract suite.

let counter = 0
const corr = (p) => `${p}-${String(++counter).padStart(4, '0')}00`

/** @returns {Record<string, Function>} the eight service functions */
export function createStubServices() {
  return {
    async getTree() {
      return {
        tree: clone(tree),
        progress: { intro: 'completed', 'steer-it': 'current' },
        evidence: { build: 1, language: 1, debug: 0 },
        current: { checkpointId: 'steer-it', stepId: 'steer-it-widget' },
        fallbackActive: false,
        correlationId: corr('tree'),
      }
    },
    async submitStep(args) {
      // Pick a canned response by kind, so the shape always matches the request.
      const pick =
        args?.kind === 'prompt' ? services.submit.scored
        : args?.kind === 'answer' ? services.submit.scored
        : services.submit.recorded
      return { ...clone(pick), stepId: args?.stepId ?? pick.stepId, correlationId: corr('submit') }
    },
    async askTutor() {
      return { ...clone(services.tutor), correlationId: corr('tutor') }
    },
    async verifyPrompt(args) {
      const narrow = (args?.prompt ?? '').length > 120
      return { ...clone(narrow ? services.verify.needs_narrowing : services.verify.ok), correlationId: corr('verify') }
    },
    async generate() {
      return { ...clone(services.generate), correlationId: corr('generate') }
    },
    async getTeacherRoster() {
      return { ...clone(services.roster), correlationId: corr('roster') }
    },
    async setTeacherInput() {
      return { ...clone(services.routingDecision), correlationId: corr('teacher') }
    },
    async health() {
      return {
        ...clone(services.health.ok),
        checkedAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
        correlationId: corr('health'),
      }
    },
  }
}
