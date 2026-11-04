// Test doubles for the seams Track D consumes but does not own: the domain core (Track B,
// Seam 2) and the model/safety port (Track C, Seam 3). These let the services contract run
// today against stub-equivalent behavior. They are NOT shipped: the real wiring (api/index.js)
// injects shared/core and the Seam-3 implementations.
//
// The core double is a faithful, minimal implementation of the C-18/C-19 contract so the
// orchestration is exercised for real; when Track B's shared/core lands, api/index.js imports
// it instead and these doubles are used only in tests.

/** @returns {import('./ports.js').CorePort} */
export function makeCoreDouble() {
  const DONE = new Set(['completed', 'tested_out'])
  return {
    loadTree(json) {
      return json
    },
    applyEvidence(evidence, row) {
      const next = { ...(evidence ?? {}) }
      next[row.skillId] = Math.max(next[row.skillId] ?? 0, row.level)
      return next
    },
    route(tree, progress = {}, evidence = {}, teacherInput = { mode: 'auto' }) {
      const order = (tree.checkpoints ?? []).map((c) => c.id)
      const byId = new Map((tree.checkpoints ?? []).map((c) => [c.id, c]))
      const done = (id) => DONE.has(progress[id] ?? 'locked')
      const available = order.filter((id) => {
        const cp = byId.get(id)
        if (!cp || done(id)) return false
        return (cp.requires ?? []).every((r) => done(r))
      })

      if (teacherInput?.mode === 'assign' && teacherInput.checkpointId && available.includes(teacherInput.checkpointId)) {
        return { checkpointId: teacherInput.checkpointId, reason: `Teacher assigned ${teacherInput.checkpointId}, which is available.` }
      }
      if (teacherInput?.mode === 'hold') {
        const current = order.find((id) => (progress[id] ?? 'locked') === 'current') ?? available[0] ?? order[0]
        return { checkpointId: current, reason: 'Teacher held routing; staying on the current checkpoint.' }
      }

      // Largest gap to target; ties go to JSON order.
      let best = null
      for (const id of available) {
        const cp = byId.get(id)
        const skillIds = cp.skillIds ?? Object.keys(cp.targetEvidenceLevels ?? {})
        let gap = -Infinity
        let skill = skillIds[0] ?? 'build'
        for (const sk of skillIds.length ? skillIds : [skill]) {
          const target = cp.targetEvidenceLevels?.[sk] ?? 1
          const g = target - (evidence[sk] ?? 0)
          if (g > gap) {
            gap = g
            skill = sk
          }
        }
        if (best === null || gap > best.gap) best = { id, gap, skill }
      }
      if (!best) {
        const fallback = order.find((id) => !done(id)) ?? order[0]
        return { checkpointId: fallback, reason: 'No available checkpoint has a gap; staying put.' }
      }
      const cp = byId.get(best.id)
      const target = cp.targetEvidenceLevels?.[best.skill] ?? 1
      return {
        checkpointId: best.id,
        reason: `${best.id} is the first available checkpoint with the largest gap to target (${best.skill} at ${evidence[best.skill] ?? 0} of ${target}).`,
      }
    },
  }
}

/**
 * A model/safety port double. By default everything is allowed and the validator scores at a
 * fixed level, tagged source 'stub'. Options let a test force a block or a fallback.
 * @param {object} [opts]
 * @param {boolean} [opts.block] screenInput returns not-allowed
 * @param {boolean} [opts.validatorFallback] validateProject returns a fallback
 * @param {number} [opts.level] validator evidence level
 * @returns {import('./ports.js').ModelPort}
 */
export function makeModelDouble(opts = {}) {
  const { block = false, validatorFallback = false, level = 2 } = opts
  return {
    async screenInput() {
      return block
        ? { allowed: false, action: 'blocked', replacement: 'That message was not sent. Try describing a change to your page.', categories: ['safety'], guardrailVersion: 'v1' }
        : { allowed: true, action: 'none', replacement: null, categories: [], guardrailVersion: 'v1' }
    },
    async screenOutput() {
      return { allowed: true, action: 'none', replacement: null, categories: [], guardrailVersion: 'v1' }
    },
    async validateProject(req) {
      if (validatorFallback) {
        return { ok: false, fallback: { component: 'validation', reason: 'low_confidence' } }
      }
      return {
        ok: true,
        source: 'stub',
        result: { skillId: req.skillId ?? 'build', evidenceLevel: level, conditionMet: level > 0, confidence: 0.88, evidence: 'Prompt named a goal and one change.' },
      }
    },
    async invoke(req) {
      return {
        ok: true,
        task: req.task,
        source: 'stub',
        modelId: 'stub-model',
        promptVersion: 'v0',
        text: req.task === 'codegen' ? '{"html":"<h1>Hi</h1>","css":"","js":""}' : 'Clear and specific. Go ahead and generate it.',
        latencyMs: 1,
        usage: { inputTokens: 10, outputTokens: 10 },
        guardrail: { version: 'v1', action: 'none' },
        correlationId: req.opts.correlationId,
      }
    },
  }
}
