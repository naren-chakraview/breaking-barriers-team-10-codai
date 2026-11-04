// Seam 1 services provider (architecture 1.8, ADR-014). Returns a Services object
// with exactly the eight SERVICE_FUNCTIONS, chosen by VITE_SERVICE_MODE. In 'mock'
// mode it delegates to the frozen stub; in 'http' mode it returns a clearly-marked
// NOT-YET-IMPLEMENTED client so the real fetch client can later drop in behind the
// same signatures and the same contract suite.
//
// JSDoc typedefs for the returned object live in ./types.js (C-30).

import { resolveModes } from '../../shared/contracts/modes.js'
import { createStubServices } from '../../shared/contracts/stubs/services.stub.js'
import { ContractError } from '../../shared/contracts/errors.js'
import { SERVICE_FUNCTIONS } from '../../shared/contracts/seams.js'

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
 * The NOT-YET-IMPLEMENTED HTTP client. Every function rejects with the C-29 wire
 * shape so a half-finished client can never silently pass as live. When the real
 * client is built (Task 9 in the implementation plan), replace this with a fetch
 * implementation that matches the same signatures and passes runServicesContract.
 * @returns {Record<string, Function>}
 */
function notImplementedServices() {
  const message =
    'HTTP services client is not implemented yet (seam 1). Set VITE_SERVICE_MODE=mock for the demo.'
  const svc = {}
  for (const name of SERVICE_FUNCTIONS) {
    // TODO: real HTTP client — fetch the C-29 endpoint for `name`, send the P-1.4
    // headers, validate the response server-side, and return the parsed body.
    svc[name] = async () => {
      throw new ContractError('INTERNAL', message)
    }
  }
  return svc
}

/**
 * Build the eight-function Services object for the active service mode.
 * @param {Record<string, string | undefined>} [env] env-like object. Defaults to the
 *   ambient `import.meta.env`; pass an explicit object (e.g. in a test) to choose a mode
 *   without relying on Vite.
 * @returns {import('./types.js').Services}
 */
export function createServices(env) {
  // resolveModes throws a ContractError('CONFIG_ERROR', ...) on an invalid value;
  // let it propagate so a misconfigured deploy fails loudly rather than silently.
  const { serviceMode } = resolveModes(env ?? ambientEnv())
  return serviceMode === 'http' ? notImplementedServices() : createStubServices()
}
