import { ENUMS } from './seams.js'

/**
 * One error type for every seam. `.error` is exactly the C-29 wire shape:
 * { code, message }. Services reject with it; the HTTP layer serializes `{ error }`.
 */
export class ContractError extends Error {
  /**
   * @param {string} code one of ENUMS.ErrorCode
   * @param {string} message human-readable, never contains secrets or student text
   */
  constructor(code, message) {
    super(message)
    this.name = 'ContractError'
    if (!ENUMS.ErrorCode.includes(code)) {
      throw new TypeError(`Unknown error code: ${code}`)
    }
    this.code = code
    this.error = { code, message }
  }
}
