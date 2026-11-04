import { ContractError } from './errors.js'

// Three switches choose stub or real, so a half-finished component never blocks a demo
// (architecture 1.8). VITE_ values are public (C-26). The other two are Lambda
// environment values and are not secrets.

export const MODE_VALUES = Object.freeze({
  VITE_SERVICE_MODE: ['mock', 'http'],
  MODEL_MODE: ['stub', 'bedrock'],
  // 'aurora' is the deployed store (ADR-016); 'json' is the demo-mode adapter and the default.
  STORE_MODE: ['json', 'aurora'],
})

export const MODE_DEFAULTS = Object.freeze({
  VITE_SERVICE_MODE: 'mock',
  MODEL_MODE: 'stub',
  STORE_MODE: 'json',
})

/**
 * Read the three switches from an env-like object and fail loudly on a typo.
 * A silent fallback to a default here would hide a misconfigured deploy.
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ serviceMode: 'mock'|'http', modelMode: 'stub'|'bedrock', storeMode: 'json'|'aurora' }}
 */
export function resolveModes(env = {}) {
  const pick = (name) => {
    const raw = env[name]
    if (raw === undefined || raw === '') return MODE_DEFAULTS[name]
    if (!MODE_VALUES[name].includes(raw)) {
      throw new ContractError(
        'CONFIG_ERROR',
        `${name} must be one of ${MODE_VALUES[name].join(', ')}`,
      )
    }
    return raw
  }
  return {
    serviceMode: pick('VITE_SERVICE_MODE'),
    modelMode: pick('MODEL_MODE'),
    storeMode: pick('STORE_MODE'),
  }
}

/**
 * The `source` a model-derived result must carry for a given MODEL_MODE.
 * Live mode must never report `stub`, and stub mode must never report `bedrock`,
 * so canned output cannot pass as live output in the demo.
 */
export function expectedModelSource(modelMode) {
  return modelMode === 'stub' ? 'stub' : 'bedrock'
}
