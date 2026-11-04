// Seam 1 services provider (architecture 1.8, ADR-014). Returns a Services object
// with exactly the eight SERVICE_FUNCTIONS, chosen by VITE_SERVICE_MODE. In 'mock'
// mode it delegates to the frozen stub; in 'http' mode it returns the real fetch
// client (createHttpServices), which matches the same signatures and passes the same
// contract suite.
//
// JSDoc typedefs for the returned object live in ./types.js (C-30).

import { resolveModes } from '../../shared/contracts/modes.js'
import { createStubServices } from '../../shared/contracts/stubs/services.stub.js'
import { createHttpServices } from './httpClient.js'

/**
 * The ambient env, read lazily so this module imports cleanly under Node (tests,
 * SSR) where `import.meta.env` is undefined. Vite replaces `import.meta.env` at
 * build time; outside Vite it is undefined and we fall back to an empty object.
 */
function ambientEnv() {
  try {
    // eslint-disable-next-line no-undef
    return import.meta.env ?? {}
  } catch {
    return {}
  }
}

/**
 * Build the eight-function Services object for the active service mode.
 * @param {Record<string, string | undefined>} [env] env-like object. Defaults to the
 *   ambient `import.meta.env`; pass an explicit object (e.g. in a test) to choose a mode
 *   without relying on Vite.
 * @param {object} [opts]
 * @param {() => ({ token: string, userId: string, role: string } | null)} [opts.identityProvider]
 *   per-request live identity (the Cognito AuthProvider passes one). Ignored in mock mode.
 * @returns {import('./types.js').Services}
 */
export function createServices(env, opts = {}) {
  // resolveModes throws a ContractError('CONFIG_ERROR', ...) on an invalid value;
  // let it propagate so a misconfigured deploy fails loudly rather than silently.
  const resolvedEnv = env ?? ambientEnv()
  const { serviceMode } = resolveModes(resolvedEnv)
  return serviceMode === 'http'
    ? createHttpServices(resolvedEnv, opts)
    : createStubServices()
}
