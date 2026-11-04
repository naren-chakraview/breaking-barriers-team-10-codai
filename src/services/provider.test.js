import { describe, it, expect } from 'vitest'
import { createServices } from './provider.js'
import { SERVICE_FUNCTIONS } from '../../shared/contracts/seams.js'
import { ContractError } from '../../shared/contracts/errors.js'

// Property-based tests for the services provider. No PBT library is added (do not
// add dependencies), so each property loops >=100 randomized iterations and asserts
// the invariant every time.
//
// Updated for the http-services-client feature: the 'http' branch now returns the real
// fetch client (createHttpServices), which validates its VITE_ demo config at
// construction (requirement 3.7-3.8). So an http-mode provider is built with a valid
// demo env, and the removed placeholder's INTERNAL-throwing behavior is gone.

const ITER = 100
const EXPECTED = [...SERVICE_FUNCTIONS].sort()

// A valid public demo env so createHttpServices constructs without a CONFIG_ERROR.
const HTTP_ENV = {
  VITE_SERVICE_MODE: 'http',
  VITE_API_BASE_URL: 'https://fake.local/prod',
  VITE_DEMO_TOKEN: 'demo-token',
  VITE_DEMO_USER_ID: 'stu-quick',
  VITE_DEMO_ROLE: 'student',
}

function randomGarbageMode() {
  const pool = ['grpc', 'rest', 'MOCK', 'Http', 'fake', 'real', 'x', '123', 'sockets']
  return pool[Math.floor(Math.random() * pool.length)]
}

describe('createServices (provider)', () => {
  // Feature: wire-student-services, Property 1: Provider exposes exactly the eight service functions
  it('exposes exactly the eight service functions for any valid mode', () => {
    for (let i = 0; i < ITER; i++) {
      const env = Math.random() < 0.5 ? { VITE_SERVICE_MODE: 'mock' } : HTTP_ENV
      const svc = createServices(env)
      const fns = Object.keys(svc).filter((k) => typeof svc[k] === 'function').sort()
      expect(fns).toEqual(EXPECTED)
    }
  })

  // Feature: wire-student-services, Property 2: Default and invalid mode selection
  it('selects mock by default/empty/mock, http client for http, and throws on invalid', async () => {
    for (let i = 0; i < ITER; i++) {
      const choice = Math.floor(Math.random() * 5)
      if (choice === 0) {
        // absent
        const svc = createServices({})
        const tree = await svc.getTree({ courseId: 'hoai2026-adaptive' })
        expect(tree).toBeTruthy()
        expect(tree.tree).toBeTruthy()
      } else if (choice === 1) {
        // empty string
        const svc = createServices({ VITE_SERVICE_MODE: '' })
        const tree = await svc.getTree({ courseId: 'hoai2026-adaptive' })
        expect(tree.tree).toBeTruthy()
      } else if (choice === 2) {
        // explicit mock
        const svc = createServices({ VITE_SERVICE_MODE: 'mock' })
        const tree = await svc.getTree({ courseId: 'hoai2026-adaptive' })
        expect(tree.tree).toBeTruthy()
      } else if (choice === 3) {
        // http with a valid demo env: constructs the real client (not the stub) with
        // exactly the eight functions, and does not throw at construction.
        const svc = createServices(HTTP_ENV)
        const fns = Object.keys(svc).filter((k) => typeof svc[k] === 'function').sort()
        expect(fns).toEqual(EXPECTED)
      } else {
        // invalid value: construction throws a ContractError
        expect(() => createServices({ VITE_SERVICE_MODE: randomGarbageMode() })).toThrow(ContractError)
      }
    }
  })

  // Feature: http-services-client, Requirement 3.7-3.8: http mode validates its demo
  // config at construction. With a missing/empty required VITE_ value, the provider
  // throws a ContractError code CONFIG_ERROR and issues no request.
  it('http mode with missing demo config throws CONFIG_ERROR at construction', () => {
    const missing = ['VITE_API_BASE_URL', 'VITE_DEMO_TOKEN', 'VITE_DEMO_USER_ID', 'VITE_DEMO_ROLE']
    for (let i = 0; i < ITER; i++) {
      const env = { ...HTTP_ENV }
      // Drop or blank one required field at random.
      const key = missing[Math.floor(Math.random() * missing.length)]
      if (Math.random() < 0.5) delete env[key]
      else env[key] = ''
      let caught
      try {
        createServices(env)
      } catch (e) {
        caught = e
      }
      expect(caught).toBeInstanceOf(ContractError)
      expect(caught.code).toBe('CONFIG_ERROR')
    }
  })
})
