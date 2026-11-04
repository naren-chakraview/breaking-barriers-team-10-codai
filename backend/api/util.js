// Small helpers shared by the API handlers. All output must satisfy the contracts:
// correlationId matches ^[A-Za-z0-9_-]{8,64}$ (common.schema.json), timestamps are
// server-set UTC ISO 8601 (ADR-006), and errors are the C-29 { error: { code, message } }.

import { randomUUID } from 'node:crypto'
import { ContractError } from '../../shared/contracts/errors.js'

/**
 * A fresh correlation id for a request/response. Prefixed for readability in logs and long
 * enough to satisfy the 8..64 pattern.
 * @param {string} [prefix]
 * @returns {string}
 */
export function newCorrelationId(prefix = 'corr') {
  return `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 20)}`
}

/** Server timestamp in the contract's Timestamp format (seconds precision, trailing Z). */
export function nowIso() {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z')
}

/** A short, random id matching the records' id pattern ^[A-Za-z0-9_-]{4,64}$. */
export function newRecordId(prefix) {
  const body = randomUUID().replace(/-/g, '').slice(0, 24)
  return prefix ? `${prefix}-${body}` : body
}

/**
 * Re-export so handlers raise the one error type. The HTTP layer serializes `err.error`.
 */
export { ContractError }

/**
 * Wrap an unknown thrown value as a ContractError so nothing but the C-29 shape escapes.
 * @param {unknown} err
 * @returns {ContractError}
 */
export function asContractError(err) {
  if (err instanceof ContractError) return err
  // Never leak an internal message or student text to the client.
  return new ContractError('INTERNAL', 'An unexpected error occurred.')
}
