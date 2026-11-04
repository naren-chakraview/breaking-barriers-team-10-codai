// Store factory. Chooses the repository adapter from STORE_MODE (modes.js): `json` for demo
// mode (a JSON file) and `dynamodb` for the deployed store. Both satisfy the same seam-4
// contract, so callers depend only on the interface, never on which adapter is live.
//
// Seam 4. Architecture 2.9.

import { resolveModes } from '../../shared/contracts/modes.js'
import { createJsonRepository } from './json-repository.js'
import { createDynamoRepository, DYNAMO_TABLE_KEYS, KEY_SHAPE } from './dynamo-repository.js'

export { createJsonRepository, createDynamoRepository, DYNAMO_TABLE_KEYS, KEY_SHAPE }

/**
 * Create the repository for the current STORE_MODE.
 *
 * For `dynamodb`, the caller supplies the AWS wiring (docClient, tableNames, commands) so
 * this module needs no AWS import; the Lambda bootstrap builds the real document client. For
 * `json`, an optional filePath enables persistence (otherwise it is in-memory).
 *
 * @param {object} [opts]
 * @param {Record<string, string|undefined>} [opts.env] env for resolveModes (defaults to process.env)
 * @param {string} [opts.filePath] JSON store file (json mode)
 * @param {object} [opts.dynamo] { docClient, tableNames, commands } (dynamodb mode)
 * @returns {object} a repository implementing REPOSITORY_METHODS
 */
export function createRepository({ env = process.env, filePath, dynamo } = {}) {
  const { storeMode } = resolveModes(env)

  if (storeMode === 'dynamodb') {
    if (!dynamo) {
      throw new Error('STORE_MODE=dynamodb requires { docClient, tableNames, commands }')
    }
    return createDynamoRepository(dynamo)
  }

  return createJsonRepository({ filePath })
}
