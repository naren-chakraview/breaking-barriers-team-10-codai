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
 *
 * Identity resolution (ADR-018): by default the bearer token / X-User-Id / X-Role come from
 * the static VITE_ demo config (demo/mock login). When `identityProvider` is supplied (the
 * Cognito AuthProvider passes one), it is called per request and its `{ token, userId, role }`
 * override the static identity — so a live, refreshed token is used on every call without
 * rebuilding the client. The base URL always comes from config.
 *
 * @param {Record<string, string|undefined>} env VITE_-prefixed env-like object
 * @param {object} [opts]
 * @param {() => ({ token: string, userId: string, role: string } | null)} [opts.identityProvider]
 *   returns the current live identity, or null when unauthenticated.
 * @returns {import('./types.js').Services}
 */
export function createHttpServices(env, opts = {}) {
  const { identityProvider } = opts
  // Validate config first so a misconfigured client fails loudly and no function can
  // issue a request (requirement 3.7-3.8). With a live identityProvider (Cognito mode),
  // the static demo identity is not required — the per-request identity supplies it.
  const config = readConfig(env, { requireIdentity: !identityProvider })

  const svc = {}
  for (const name of SERVICE_FUNCTIONS) {
    svc[name] = async (args) => {
      const identity = identityProvider ? identityProvider() : null
      const effective = identity ? { ...config, ...identity } : config
      return sendRequest(effective, buildRequestPlan(name, args))
    }
  }
  return svc
}
