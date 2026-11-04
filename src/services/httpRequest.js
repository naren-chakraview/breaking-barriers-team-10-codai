// Request helper for the HTTP services client — the ONLY module that performs I/O.
//
// Joins the base URL and plan path, sets the P-1.4 headers and the correlation header,
// sends the body for POST plans, bounds adaptive calls with a 10s abort timeout, and maps
// every settle outcome to either a schema-valid response object or a ContractError whose
// .error is the C-29 wire shape { code, message } (requirements 2.10, 3.1-3.4, 4, 5, 6).

import { ContractError } from '../../shared/contracts/errors.js'
import { ENUMS, LIMITS } from '../../shared/contracts/seams.js'

const CORRELATION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/

// Status-derived codes for non-2xx responses with no recognizable error body
// (requirement 4.3; mirrors _status_for in backend/api/http.py read in reverse).
const STATUS_CODE = Object.freeze({
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  429: 'RATE_LIMITED',
  502: 'UPSTREAM_ERROR',
  504: 'TIMEOUT',
})

// Fixed, generic messages. The client never interpolates the token or any raw student
// text (text/prompt/question/project) into a message it constructs (requirement 4.6).
const MESSAGES = Object.freeze({
  UNAUTHORIZED: 'The request was not authorized.',
  FORBIDDEN: 'This action is not permitted.',
  NOT_FOUND: 'The requested resource was not found.',
  RATE_LIMITED: 'Request limit reached for this session.',
  TIMEOUT: 'The request timed out.',
  UPSTREAM_ERROR: 'The server returned an unreadable response.',
  INTERNAL: 'The server encountered an error.',
})

/**
 * Generate a correlation identifier matching ^[A-Za-z0-9_-]{8,64}$ for the
 * X-Correlation-Id request header. Derived from crypto.randomUUID.
 * @returns {string}
 */
export function generateCorrelationId() {
  // randomUUID is lowercase hex with hyphens, all within [A-Za-z0-9_-]; stripping the
  // hyphens yields 32 chars, well inside the 8..64 bound.
  return crypto.randomUUID().replace(/-/g, '')
}

function joinUrl(baseUrl, path, query) {
  const base = baseUrl.replace(/\/+$/, '')
  let url = `${base}${path}`
  if (query) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      qs.append(key, value == null ? '' : String(value))
    }
    const encoded = qs.toString()
    if (encoded) url += `?${encoded}`
  }
  return url
}

function statusDerivedCode(status) {
  return STATUS_CODE[status] ?? 'INTERNAL'
}

/**
 * Send one request plan and resolve a response object or reject a ContractError.
 * @param {import('./httpConfig.js').ClientConfig} config
 * @param {import('./httpRoutes.js').RequestPlan} plan
 * @returns {Promise<object>}
 */
export async function sendRequest(config, plan) {
  const url = joinUrl(config.baseUrl, plan.path, plan.query)
  const hasBody = plan.method === 'POST' && plan.body != null

  const headers = {
    Authorization: `Bearer ${config.token}`,
    'X-User-Id': config.userId,
    'X-Role': config.role,
    'X-Correlation-Id': generateCorrelationId(),
  }
  if (hasBody) headers['Content-Type'] = 'application/json'

  const init = { method: plan.method, headers }
  if (hasBody) init.body = JSON.stringify(plan.body)
  if (plan.adaptive === true) init.signal = AbortSignal.timeout(LIMITS.TIMEOUT_MS)

  let res
  try {
    res = await fetch(url, init)
  } catch (err) {
    // An adaptive timeout surfaces as an AbortError -> TIMEOUT, no parsed body
    // (requirement 5.2). Any other network-layer failure -> UPSTREAM_ERROR
    // (requirement 4.5).
    if (err && err.name === 'AbortError') {
      throw new ContractError('TIMEOUT', MESSAGES.TIMEOUT)
    }
    throw new ContractError('UPSTREAM_ERROR', MESSAGES.UPSTREAM_ERROR)
  }

  if (res.ok) {
    let parsed
    try {
      parsed = await res.json()
    } catch {
      throw new ContractError('UPSTREAM_ERROR', MESSAGES.UPSTREAM_ERROR)
    }
    const cid = parsed && parsed.correlationId
    if (typeof cid !== 'string' || !CORRELATION_ID_RE.test(cid)) {
      throw new ContractError('UPSTREAM_ERROR', MESSAGES.UPSTREAM_ERROR)
    }
    // Resolve the parsed object UNCHANGED (preserve correlationId/source/notice/
    // fallbackActive verbatim) (requirements 2.9, 6.1, 9.6-9.8).
    return parsed
  }

  // Non-2xx: a well-formed error body with a known code wins over the status
  // (requirement 4.1); otherwise derive from the status (requirements 4.2-4.3).
  let body
  try {
    body = await res.json()
  } catch {
    body = null
  }

  const err = body && typeof body === 'object' ? body.error : null
  if (err && typeof err === 'object' && typeof err.code === 'string' && typeof err.message === 'string') {
    if (ENUMS.ErrorCode.includes(err.code)) {
      throw new ContractError(err.code, err.message)
    }
  }

  const code = statusDerivedCode(res.status)
  throw new ContractError(code, MESSAGES[code])
}
