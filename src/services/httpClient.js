// Factory for the HTTP services client (requirement 1, 5).
//
// createHttpServices(env) reads and validates the public VITE_ config once (throwing
// CONFIG_ERROR before any request can be issued), then returns a plain object whose
// own-enumerable keys are exactly the eight SERVICE_FUNCTIONS, each an async function
// that builds a request plan and sends it. Only the four adaptive calls carry the
// LIMITS.TIMEOUT_MS abort budget, which buildRequestPlan marks on each plan.

import { SERVICE_FUNCTIONS } from '../../shared/contracts/seams.js'
import { readConfig } from './httpConfig.js'
import { buildRequestPlan } from './httpRoutes.js'
import { sendRequest } from './httpRequest.js'

/**
 * Build the eight-function HTTP Services object.
 * @param {Record<string, string|undefined>} env VITE_-prefixed env-like object
 * @returns {import('./types.js').Services}
 */
export function createHttpServices(env) {
  // Validate config first so a misconfigured client fails loudly and no function can
  // issue a request (requirement 3.7-3.8).
  const config = readConfig(env)

  const svc = {}
  for (const name of SERVICE_FUNCTIONS) {
    svc[name] = async (args) => sendRequest(config, buildRequestPlan(name, args))
  }
  return svc
}
