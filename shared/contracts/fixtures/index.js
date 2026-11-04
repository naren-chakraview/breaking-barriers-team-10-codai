// One import point for fixtures, so consumers never hard-code paths.
// JSON imports use import attributes, which Node 22+ and Vite/Vitest both accept.
// The skill tree is the real content file (C-6): never copy it.

import tree from '../../../database/sample-skilltree.json' with { type: 'json' }
import quick from './personas/quick.json' with { type: 'json' }
import slow from './personas/slow.json' with { type: 'json' }
import distractedDetail from './personas/distracted-detail.json' with { type: 'json' }
import distractedInattentive from './personas/distracted-inattentive.json' with { type: 'json' }
import services from './services/responses.json' with { type: 'json' }
import invokeResults from './model/invoke-results.json' with { type: 'json' }
import screenResults from './model/screen-results.json' with { type: 'json' }
import validatorOutputs from './model/validator-outputs.json' with { type: 'json' }
import passiveResults from './model/passive-results.json' with { type: 'json' }

export const personas = Object.freeze({
  quick,
  slow,
  'distracted-detail': distractedDetail,
  'distracted-inattentive': distractedInattentive,
})

export { tree, services, invokeResults, screenResults, validatorOutputs, passiveResults }

/** Deep clone so a test or stub can never mutate a shared fixture. */
export function clone(value) {
  return structuredClone(value)
}
