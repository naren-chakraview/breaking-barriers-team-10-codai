import { describe, it, expect } from 'vitest'
import { createServices } from './provider.js'
import { SERVICE_FUNCTIONS } from '../../shared/contracts/seams.js'
import { ContractError } from '../../shared/contracts/errors.js'

// Property-based tests for the services provider. No PBT library is added (do not
// add dependencies), so each property loops >=100 randomized iterations and asserts
// the invariant every time.

const ITER = 100
const EXPECTED = [...SERVICE_FUNCTIONS].sort()

function randomGarbageMode() {
  const pool = ['grpc', 'rest', 'MOCK', 'Http', 'fake', 'real', 'x', '123', 'sockets']
  return pool[Math.floor(Math.random() * pool.length)]
}

describe('createServices (provider)', () => {
  // Feature: wire-student-services, Property 1: Provider exposes exactly the eight service functions
  it('exposes exactly the eight service functions for any valid mode', () => {
    for (let i = 0; i < ITER; i++) {
      const mode = Math.random() < 0.5 ? 'mock' : 'http'
      const svc = createServices({ VITE_SERVICE_MODE: mode })
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
        // http: resolves to a throwing client (not an error at construction)
        const svc = createServices({ VITE_SERVICE_MODE: 'http' })
        await expect(svc.health()).rejects.toBeInstanceOf(ContractError)
      } else {
        // invalid value: construction throws a ContractError
        expect(() => createServices({ VITE_SERVICE_MODE: randomGarbageMode() })).toThrow(ContractError)
      }
    }
  })

  // Feature: wire-student-services, Property 3: HTTP-mode functions reject as not implemented
  it('every http-mode function rejects with ContractError code INTERNAL', async () => {
    for (let i = 0; i < ITER; i++) {
      const svc = createServices({ VITE_SERVICE_MODE: 'http' })
      const name = SERVICE_FUNCTIONS[Math.floor(Math.random() * SERVICE_FUNCTIONS.length)]
      let caught
      try {
        await svc[name]({})
      } catch (e) {
        caught = e
      }
      expect(caught).toBeInstanceOf(ContractError)
      expect(caught.code).toBe('INTERNAL')
    }
  })
})
