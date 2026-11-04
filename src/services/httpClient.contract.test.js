import { afterAll, beforeAll } from 'vitest'
import { runServicesContract } from '../../shared/contracts/harness.js'
import { clone, tree, services as responses } from '../../shared/contracts/fixtures/index.js'
import { createHttpServices } from './httpClient.js'

// Prove the real HTTP client satisfies the SAME seam-1 contract suite the stub passes
// (ADR-014, requirement 7). CI has no live backend (A2), so the client is pointed at an
// in-memory fake `fetch` that routes by (method, path) like buildRequestPlan and returns
// schema-valid canned bodies. Fixtures are reused from responses.json for
// submit/tutor/verify/generate/roster/routing/health and from sample-skilltree.json for
// getTree's tree payload. Every canned body carries a correlationId matching
// ^[A-Za-z0-9_-]{8,64}$.

// A correlationId guaranteed to match the schema pattern, used for every canned body so
// the client's 2xx correlationId check (requirement 6.4) always passes.
const CID = 'corr-http-contract-0001'

const BASE_URL = 'https://fake.local/prod'
// The route path the client appends after the base; strip the base's own pathname
// prefix (e.g. '/prod') so routing matches buildRequestPlan's '/courses/...' table.
const BASE_PATH = new URL(BASE_URL).pathname.replace(/\/+$/, '')

// getTree is built from the real skill tree (C-6): a schema-valid TreeResponse that
// embeds sample-skilltree.json as the tree payload.
function treeResponse() {
  return {
    tree: clone(tree),
    progress: {},
    evidence: {},
    current: null,
    fallbackActive: false,
    correlationId: CID,
  }
}

function withCid(body) {
  return { ...clone(body), correlationId: CID }
}

// Route (method, path) to a schema-valid canned body, mirroring buildRequestPlan.
// submitStep in the harness targets a panels step (steer-it-video) with kind 'complete',
// so its response is the 'recorded' fixture: outcome 'recorded', evidence null,
// masteryDisplay null (requirement 7.5, C-15).
function routeBody(method, path) {
  if (method === 'GET' && /^\/courses\/[^/]+$/.test(path)) return treeResponse()
  if (method === 'POST' && /^\/steps\/[^/]+\/submit$/.test(path)) return withCid(responses.submit.recorded)
  if (method === 'POST' && path === '/tutor/ask') return withCid(responses.tutor)
  if (method === 'POST' && path === '/prompts/verify') return withCid(responses.verify.ok)
  if (method === 'POST' && path === '/prompts/generate') return withCid(responses.generate)
  if (method === 'GET' && path === '/teacher/students') return withCid(responses.roster)
  if (method === 'POST' && /^\/teacher\/students\/[^/]+\/routing$/.test(path)) {
    return withCid(responses.routingDecision)
  }
  if (method === 'GET' && path === '/health') return withCid(responses.health.ok)
  return null
}

function fakeFetch(url, init = {}) {
  const method = init.method || 'GET'
  const fullPath = new URL(url).pathname
  const path = BASE_PATH && fullPath.startsWith(BASE_PATH) ? fullPath.slice(BASE_PATH.length) : fullPath
  const body = routeBody(method, path)
  if (body == null) {
    return Promise.resolve({
      ok: false,
      status: 404,
      async json() {
        return { error: { code: 'NOT_FOUND', message: 'No such endpoint.' } }
      },
    })
  }
  return Promise.resolve({
    ok: true,
    status: 200,
    async json() {
      return body
    },
  })
}

let realFetch

beforeAll(() => {
  realFetch = globalThis.fetch
  globalThis.fetch = fakeFetch
})

afterAll(() => {
  globalThis.fetch = realFetch
})

runServicesContract('http client (fake fetch)', () =>
  createHttpServices({
    VITE_API_BASE_URL: BASE_URL,
    VITE_DEMO_TOKEN: 'demo-token',
    VITE_DEMO_USER_ID: 'stu-quick',
    VITE_DEMO_ROLE: 'student',
  }),
)
