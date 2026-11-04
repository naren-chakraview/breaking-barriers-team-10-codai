// HTTP layer for the services API (Task 7, P-11, P-1.4, C-29). Transport-agnostic: it works
// over a normalized request shape so the same router serves API Gateway/Lambda and a local
// Node server. It:
//   - reads the P-1.4 headers (Authorization: Bearer, X-User-Id, X-Role) into a context;
//   - routes the C-29 endpoints to the eight service functions;
//   - enforces a per-student call cap (C-24 / spend protection);
//   - serializes every error as the C-29 shape { error: { code, message } }.
//
// Request/response validation of bodies is delegated to the schemas via validate.js so the
// HTTP layer rejects malformed input with VALIDATION_ERROR before it reaches a handler.

import { problems } from '../../shared/contracts/validate.js'
import { ContractError, asContractError } from './util.js'

/** Endpoint table: method + path pattern -> { fn, argsDef, build(params, body) }. */
const ROUTES = [
  { method: 'GET', pattern: /^\/courses\/([^/]+)$/, fn: 'getTree', build: (m) => ({ courseId: m[1] }), argsDef: 'GetTreeArgs' },
  { method: 'POST', pattern: /^\/steps\/([^/]+)\/submit$/, fn: 'submitStep', build: (m, b) => ({ ...b, stepId: m[1] }), argsDef: 'SubmitStepArgs' },
  { method: 'POST', pattern: /^\/tutor\/ask$/, fn: 'askTutor', build: (_m, b) => b, argsDef: 'AskTutorArgs' },
  { method: 'POST', pattern: /^\/prompts\/verify$/, fn: 'verifyPrompt', build: (_m, b) => b, argsDef: 'VerifyPromptArgs' },
  { method: 'POST', pattern: /^\/prompts\/generate$/, fn: 'generate', build: (_m, b) => b, argsDef: 'GenerateArgs' },
  { method: 'GET', pattern: /^\/teacher\/students$/, fn: 'getTeacherRoster', build: (_m, b, q) => ({ courseId: q.courseId }), argsDef: 'GetTeacherRosterArgs' },
  { method: 'POST', pattern: /^\/teacher\/students\/([^/]+)\/routing$/, fn: 'setTeacherInput', build: (m, b) => ({ studentId: m[1], input: b?.input ?? b }), argsDef: 'SetTeacherInputArgs' },
  { method: 'GET', pattern: /^\/health$/, fn: 'health', build: () => ({}), argsDef: 'HealthArgs' },
]

const ROLES = new Set(['student', 'teacher'])

/**
 * Build an HTTP router over a set of services.
 * @param {Record<string, Function>} services the eight functions from createServices
 * @param {object} [opts]
 * @param {number} [opts.perStudentCap] max requests per student per process lifetime (spend
 *   protection). Defaults to 500.
 * @returns {(req: NormalizedRequest) => Promise<NormalizedResponse>}
 */
export function createRouter(services, { perStudentCap = 500 } = {}) {
  const callCounts = new Map() // studentId -> count (in-memory; a real deploy uses a usage plan + store)

  /**
   * @typedef {object} NormalizedRequest
   * @property {string} method
   * @property {string} path
   * @property {Record<string, string>} headers lower-cased header names
   * @property {object} [body] parsed JSON body
   * @property {Record<string, string>} [query]
   */
  return async function handle(req) {
    try {
      const route = ROUTES.find((r) => r.method === req.method && r.pattern.test(req.path))
      if (!route) throw new ContractError('NOT_FOUND', 'No such endpoint.')

      // Health needs no auth (the UI polls it on fallback, C-23).
      const ctx = route.fn === 'health' ? {} : readContext(req.headers)

      // Per-student spend cap (C-24 / Task 7). Health is exempt.
      if (ctx.studentId) {
        const n = (callCounts.get(ctx.studentId) ?? 0) + 1
        callCounts.set(ctx.studentId, n)
        if (n > perStudentCap) throw new ContractError('RATE_LIMITED', 'Request limit reached for this session.')
      }

      const match = route.pattern.exec(req.path)
      const args = route.build(match, req.body ?? {}, req.query ?? {})

      // Validate the args against the schema before the handler runs.
      const errs = problems('services', route.argsDef, args)
      if (errs.length) throw new ContractError('VALIDATION_ERROR', `Invalid request: ${errs[0]}`)

      const result = await services[route.fn](args, ctx)
      return { status: 200, headers: jsonHeaders(), body: result }
    } catch (err) {
      const ce = asContractError(err)
      // The C-29 wire shape is { error: { code, message } }; ce.error is the inner object.
      return { status: statusFor(ce.code), headers: jsonHeaders(), body: { error: ce.error } }
    }
  }
}

/** Read and validate the P-1.4 headers into a request context. */
function readContext(headers = {}) {
  const auth = headers['authorization'] ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : ''
  const userId = headers['x-user-id'] ?? ''
  const role = headers['x-role'] ?? ''
  if (!token) throw new ContractError('UNAUTHORIZED', 'Missing bearer token.')
  if (!userId) throw new ContractError('UNAUTHORIZED', 'Missing X-User-Id.')
  if (!ROLES.has(role)) throw new ContractError('FORBIDDEN', 'Unknown or missing role.')
  return { studentId: userId, role, token }
}

function jsonHeaders() {
  return { 'content-type': 'application/json' }
}

/** Map a C-29 error code to an HTTP status. */
function statusFor(code) {
  switch (code) {
    case 'UNAUTHORIZED':
      return 401
    case 'FORBIDDEN':
      return 403
    case 'NOT_FOUND':
      return 404
    case 'VALIDATION_ERROR':
    case 'CONTENT_BLOCKED':
      return 400
    case 'RATE_LIMITED':
      return 429
    case 'TIMEOUT':
      return 504
    case 'UPSTREAM_ERROR':
      return 502
    case 'CONFIG_ERROR':
    case 'INTERNAL':
    default:
      return 500
  }
}
