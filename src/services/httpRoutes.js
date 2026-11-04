// Pure request-plan builder for the HTTP services client (requirement 2).
//
// Maps (fnName, args) -> { method, path, query, body, adaptive } with NO I/O. This is
// the single source of the route/method/body mapping and mirrors _ROUTES in
// backend/api/http.py. Path segments interpolated from args are URL-encoded with
// encodeURIComponent and occupy exactly one segment each. camelCase is preserved
// verbatim; the client never renames or recases a field. Headers (identity, correlation)
// are added later by the request helper from the ClientConfig.

/**
 * @typedef {Object} RequestPlan
 * @property {'GET'|'POST'} method
 * @property {string} path Leading '/', interpolated segments URL-encoded.
 * @property {Record<string,string>|null} query
 * @property {object|null} body camelCase JSON body; null for GET.
 * @property {boolean} adaptive True only for the four adaptive calls.
 */

const seg = (value) => encodeURIComponent(value)

/**
 * Build the request plan for a service function and its args.
 * @param {string} fnName one of SERVICE_FUNCTIONS
 * @param {object} [args]
 * @returns {RequestPlan}
 */
export function buildRequestPlan(fnName, args = {}) {
  switch (fnName) {
    case 'getTree':
      return {
        method: 'GET',
        path: `/courses/${seg(args.courseId)}`,
        query: null,
        body: null,
        adaptive: false,
      }

    case 'submitStep': {
      // The router rebuilds stepId from the path ({**b, "stepId": m.group(1)}), so the
      // body omits stepId; the path is authoritative (requirement 2.2).
      const { stepId, ...body } = args
      return {
        method: 'POST',
        path: `/steps/${seg(stepId)}/submit`,
        query: null,
        body,
        adaptive: true,
      }
    }

    case 'askTutor':
      return {
        method: 'POST',
        path: '/tutor/ask',
        query: null,
        body: { ...args },
        adaptive: true,
      }

    case 'verifyPrompt':
      return {
        method: 'POST',
        path: '/prompts/verify',
        query: null,
        body: { ...args },
        adaptive: true,
      }

    case 'generate':
      return {
        method: 'POST',
        path: '/prompts/generate',
        query: null,
        body: { ...args },
        adaptive: true,
      }

    case 'getTeacherRoster':
      return {
        method: 'GET',
        path: '/teacher/students',
        query: { courseId: args.courseId },
        body: null,
        adaptive: false,
      }

    case 'setTeacherInput':
      // Router takes studentId from the path and reads b.get("input", b); send { input }
      // only, with no studentId field in the body (requirement 2.7).
      return {
        method: 'POST',
        path: `/teacher/students/${seg(args.studentId)}/routing`,
        query: null,
        body: { input: args.input },
        adaptive: false,
      }

    case 'health':
      return {
        method: 'GET',
        path: '/health',
        query: null,
        body: null,
        adaptive: false,
      }

    default:
      throw new TypeError(`Unknown service function: ${fnName}`)
  }
}
