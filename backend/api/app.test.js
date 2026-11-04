import { describe, it, expect } from 'vitest'
import { problems } from '../../shared/contracts/validate.js'
import { tree, clone } from '../../shared/contracts/fixtures/index.js'
import { buildApp } from './app.js'
import { makeCoreDouble } from './test-doubles.js'

// buildApp wiring: with STORE_MODE=json and MODEL_MODE=stub (the defaults), the app runs end
// to end through the real services, the real JSON store and the stub model shim. The core is
// the Track-B double here.

const authHeaders = { authorization: 'Bearer demo', 'x-user-id': 'stu-1', 'x-role': 'student' }

function app() {
  return buildApp({ tree: clone(tree), core: makeCoreDouble(), env: { STORE_MODE: 'json', MODEL_MODE: 'stub' } })
}

describe('buildApp (json + stub model)', () => {
  it('resolves the default modes', () => {
    const { modes } = app()
    expect(modes).toEqual({ serviceMode: 'mock', modelMode: 'stub', storeMode: 'json' })
  })

  it('serves a submit end to end with the stub model and returns scored evidence', async () => {
    const { router } = app()
    const res = await router({
      method: 'POST',
      path: '/steps/steer-it-project/submit',
      headers: authHeaders,
      body: {
        courseId: 'hoai2026-adaptive',
        checkpointId: 'steer-it',
        kind: 'prompt',
        text: 'Make the heading say Robotics Club and keep the layout.',
        project: { html: '<h1>Robotics Club</h1>', css: '', js: '' },
      },
    })
    expect(res.status).toBe(200)
    expect(problems('services', 'SubmitResponse', res.body)).toEqual([])
    expect(res.body.outcome).toBe('scored')
    expect(res.body.source).toBe('stub')
  })

  it('MODEL_MODE=bedrock without an injected port fails fast', () => {
    expect(() => buildApp({ tree: clone(tree), core: makeCoreDouble(), env: { MODEL_MODE: 'bedrock' } })).toThrow(/bedrock/i)
  })
})
