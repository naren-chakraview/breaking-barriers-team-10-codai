// MODEL_MODE=stub adapter for the Seam-3 model/safety port. It presents the ModelPort shape
// (invoke, screenInput, screenOutput, validateProject) that the services consume, backed by
// the canned contract fixtures so it never drifts from Track C's schemas. Everything it
// returns is tagged source:'stub' — a stub can never pass as live (architecture 1.8).
//
// This is a Track-D shim so the backend runs end to end before Track C's real module lands
// (IC2). At IC3, api/index.js injects Track C's bedrock-backed ModelPort instead and this is
// used only as the stub fallback.

import { invokeResults, validatorOutputs, clone } from '../../shared/contracts/fixtures/index.js'

/**
 * @param {object} [opts]
 * @param {number} [opts.confidenceMin] below this a validator result is unreliable (C-16).
 * @returns {import('./ports.js').ModelPort}
 */
export function createStubModel({ confidenceMin = 0.6 } = {}) {
  return {
    async screenInput() {
      // The stub allows everything; red-team handling is Track C's real Guardrail (C-25).
      return { allowed: true, action: 'none', replacement: null, categories: [], guardrailVersion: 'stub-1' }
    },
    async screenOutput() {
      return { allowed: true, action: 'none', replacement: null, categories: [], guardrailVersion: 'stub-1' }
    },

    async validateProject(req) {
      // Use the canned "valid-pass" shape, retargeted to the requested skill. Parse, check
      // confidence (C-16), and classify exactly as the real validator will.
      const canned = validatorOutputs.cases.find((c) => c.name === 'valid-pass')
      const parsed = JSON.parse(canned.raw)
      parsed.skillId = req.skillId ?? parsed.skillId
      if (parsed.confidence < confidenceMin) {
        return { ok: false, fallback: { component: 'validation', reason: 'low_confidence' } }
      }
      return { ok: true, source: 'stub', result: parsed }
    },

    async invoke(req) {
      const canned = cannedInvoke(req.task)
      return { ...clone(canned), task: req.task, correlationId: req.opts.correlationId }
    },
  }
}

function cannedInvoke(task) {
  switch (task) {
    case 'verify':
      return invokeResults.verify_ok
    case 'codegen':
      return invokeResults.codegen_ok
    case 'validate':
      return invokeResults.validate_ok
    case 'tutor':
      return invokeResults.tutor_ok
    default:
      return invokeResults.tutor_ok
  }
}
