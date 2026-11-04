// Env/config reader for the HTTP services client (requirement 3; C-26, C-33).
//
// Reads ONLY VITE_-prefixed public values: the base API URL and the demo identity
// (token, user id, role). It never reads or stores an AWS access key, AWS secret
// key, AWS session token, model id, or model prompt — those names are not referenced
// here (requirement 3.6). On any missing/empty/invalid value it throws a
// ContractError('CONFIG_ERROR', ...) and issues no request (requirement 3.7-3.8).

import { ContractError } from '../../shared/contracts/errors.js'

const ROLES = Object.freeze(['student', 'teacher'])

/**
 * @typedef {Object} ClientConfig
 * @property {string} baseUrl Trimmed, non-empty base API URL (from VITE_API_BASE_URL).
 * @property {string} token   Demo bearer token (from VITE_DEMO_TOKEN).
 * @property {string} userId  Demo user id (from VITE_DEMO_USER_ID).
 * @property {'student'|'teacher'} role Demo role (from VITE_DEMO_ROLE).
 */

/**
 * Read and validate the public VITE_ config into a frozen ClientConfig.
 * Throws ContractError('CONFIG_ERROR') on any missing, empty, or invalid value.
 * @param {Record<string, string|undefined>} [env] env-like object
 * @returns {ClientConfig}
 */
export function readConfig(env = {}) {
  const baseUrl = typeof env.VITE_API_BASE_URL === 'string' ? env.VITE_API_BASE_URL.trim() : ''
  const token = typeof env.VITE_DEMO_TOKEN === 'string' ? env.VITE_DEMO_TOKEN : ''
  const userId = typeof env.VITE_DEMO_USER_ID === 'string' ? env.VITE_DEMO_USER_ID : ''
  const role = typeof env.VITE_DEMO_ROLE === 'string' ? env.VITE_DEMO_ROLE : ''

  if (!baseUrl) {
    throw new ContractError('CONFIG_ERROR', 'The API base URL is not configured.')
  }
  if (!token) {
    throw new ContractError('CONFIG_ERROR', 'The demo identity is not configured.')
  }
  if (!userId) {
    throw new ContractError('CONFIG_ERROR', 'The demo identity is not configured.')
  }
  if (!role) {
    throw new ContractError('CONFIG_ERROR', 'The demo identity is not configured.')
  }
  if (!ROLES.includes(role)) {
    throw new ContractError('CONFIG_ERROR', 'The demo role is not valid.')
  }

  return Object.freeze({ baseUrl, token, userId, role })
}
