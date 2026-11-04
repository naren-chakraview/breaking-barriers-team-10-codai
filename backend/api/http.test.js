import { describe, it, expect } from 'vitest'
import { problems } from '../../shared/contracts/validate.js'
import { tree, clone } from '../../shared/contracts/fixtures/index.js'
import { createRouter } from './http.js'
import { createServices } from './services.js'
import { createJsonRepository } from '../store/json-repository.js'
import { makeCoreDouble, makeModelDouble } from './test-doubles.js'

function makeHandler(opts) {
  const repo = createJsonRepository()
  repo.putStudent({ studentId: 'stu-1', displayName: 'Sam', synthetic: true })
  const services = createServices({
    core: makeCoreDouble(),
    model: makeModelDouble(),
    repo,
    tree: clone(tree),
    modes: { serviceMode: 'http', modelMode: 'stub', storeMode: 'json' },
  })
  return createRouter(services, opts)
}

const authHeaders = { authorization: 'Bearer demo-token', 'x-user-id': 'stu-1', 'x-role': 'student' }

describe('HTTP router', () => {
  it('routes GET /courses/{id} to getTree', async () => {
    const handle = makeHandler()
    const res = await handle({ method: 'GET', path: '/courses/hoai2026-adaptive', headers: authHeaders })
    expect(res.status).toBe(200)
    expect(problems('services', 'TreeResponse', res.body)).toEqual([])
  })

  it('routes POST /steps/{id}/submit and injects stepId from the path', async () => {
    const handle = makeHandler()
    const res = await handle({
      method: 'POST',
      path: '/steps/steer-it-video/submit',
      headers: authHeaders,
      body: { courseId: 'hoai2026-adaptive', checkpointId: 'steer-it', kind: 'complete' },
    })
    expect(res.status).toBe(200)
    expect(res.body.stepId).toBe('steer-it-video')
    expect(problems('services', 'SubmitResponse', res.body)).toEqual([])
  })

  it('rejects a missing bearer token with 401 and the C-29 error shape', async () => {
    const handle = makeHandler()
    const res = await handle({ method: 'GET', path: '/courses/hoai2026-adaptive', headers: { 'x-user-id': 'stu-1', 'x-role': 'student' } })
    expect(res.status).toBe(401)
    expect(problems('error', undefined, res.body)).toEqual([])
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects an unknown role with 403', async () => {
    const handle = makeHandler()
    const res = await handle({ method: 'GET', path: '/courses/x', headers: { ...authHeaders, 'x-role': 'wizard' } })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('rejects a malformed body with VALIDATION_ERROR', async () => {
    const handle = makeHandler()
    const res = await handle({
      method: 'POST',
      path: '/steps/steer-it-project/submit',
      headers: authHeaders,
      body: { courseId: 'hoai2026-adaptive', checkpointId: 'steer-it', kind: 'prompt' }, // missing required text
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 for an unknown endpoint', async () => {
    const handle = makeHandler()
    const res = await handle({ method: 'GET', path: '/nope', headers: authHeaders })
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('serves GET /health with no auth', async () => {
    const handle = makeHandler()
    const res = await handle({ method: 'GET', path: '/health', headers: {} })
    expect(res.status).toBe(200)
    expect(problems('services', 'HealthResponse', res.body)).toEqual([])
  })

  it('enforces the per-student call cap (C-24)', async () => {
    const handle = makeHandler({ perStudentCap: 1 })
    const first = await handle({ method: 'GET', path: '/courses/hoai2026-adaptive', headers: authHeaders })
    expect(first.status).toBe(200)
    const second = await handle({ method: 'GET', path: '/courses/hoai2026-adaptive', headers: authHeaders })
    expect(second.status).toBe(429)
    expect(second.body.error.code).toBe('RATE_LIMITED')
  })
})
