import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHttpServices } from './httpClient.js'

// ADR-018: when an identityProvider is supplied (Cognito AuthProvider), its live
// { token, userId, role } override the static VITE_DEMO_* identity on every request, and
// http mode works with no VITE_DEMO_* set. This captures the outgoing headers to prove it.

const BASE = 'https://fake.local/prod'

function captureFetch() {
  const calls = []
  const fn = vi.fn(async (url, init) => {
    calls.push({ url, headers: init.headers })
    return {
      ok: true,
      json: async () => ({ status: 'ok', components: { validation: 'ok', routing: 'ok', generation: 'ok', safety: 'ok', passive: 'ok' }, checkedAt: '2026-11-04T10:00:00Z', correlationId: 'corr-id-identity01' }),
    }
  })
  fn._calls = calls
  return fn
}

describe('http client identity', () => {
  let realFetch
  beforeEach(() => {
    realFetch = globalThis.fetch
  })
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('sends the live identity headers from the identityProvider', async () => {
    globalThis.fetch = captureFetch()
    const identity = { token: 'live-access-token', userId: 'sub-42', role: 'teacher' }
    const svc = createHttpServices(
      { VITE_API_BASE_URL: BASE }, // no VITE_DEMO_* needed in cognito mode
      { identityProvider: () => identity },
    )
    await svc.health({})
    const { headers } = globalThis.fetch._calls[0]
    expect(headers.Authorization).toBe('Bearer live-access-token')
    expect(headers['X-User-Id']).toBe('sub-42')
    expect(headers['X-Role']).toBe('teacher')
  })

  it('reflects a refreshed token on the next request (provider read per call)', async () => {
    globalThis.fetch = captureFetch()
    let token = 'token-1'
    const svc = createHttpServices({ VITE_API_BASE_URL: BASE }, { identityProvider: () => ({ token, userId: 's', role: 'student' }) })
    await svc.health({})
    token = 'token-2' // simulate a silent renew between requests
    await svc.health({})
    expect(globalThis.fetch._calls[0].headers.Authorization).toBe('Bearer token-1')
    expect(globalThis.fetch._calls[1].headers.Authorization).toBe('Bearer token-2')
  })

  it('falls back to the static VITE_DEMO_* identity when the provider returns null (mock mode)', async () => {
    globalThis.fetch = captureFetch()
    const svc = createHttpServices(
      { VITE_API_BASE_URL: BASE, VITE_DEMO_TOKEN: 'demo-tok', VITE_DEMO_USER_ID: 'demo-user', VITE_DEMO_ROLE: 'student' },
      { identityProvider: () => null },
    )
    await svc.health({})
    const { headers } = globalThis.fetch._calls[0]
    expect(headers.Authorization).toBe('Bearer demo-tok')
    expect(headers['X-User-Id']).toBe('demo-user')
    expect(headers['X-Role']).toBe('student')
  })
})
