import { describe, it, expect } from 'vitest'
import { problems, isValid } from '../validate.js'
import {
  personas, services, invokeResults, screenResults, validatorOutputs, passiveResults, tree,
} from '../fixtures/index.js'

// Every fixture must validate against its schema. If a fixture and a schema drift,
// this fails before any track builds against the wrong shape.

describe('persona fixtures', () => {
  for (const [name, p] of Object.entries(personas)) {
    it(`${name}: attempts match StepAttempt`, () => {
      for (const a of p.attempts) expect(problems('records', 'StepAttempt', a), a.attemptId).toEqual([])
    })
    it(`${name}: hints match HintEvent`, () => {
      for (const h of p.hints ?? []) expect(problems('records', 'HintEvent', h), h.hintId).toEqual([])
    })
    it(`${name}: student matches Student and is marked synthetic`, () => {
      expect(problems('records', 'Student', p.student)).toEqual([])
      expect(p.student.synthetic).toBe(true)
    })
    it(`${name}: every step id exists in the tree`, () => {
      const stepIds = new Set(tree.checkpoints.flatMap((c) => c.steps.map((s) => s.id)))
      for (const a of p.attempts) expect(stepIds.has(a.stepId), a.stepId).toBe(true)
    })
  }
})

describe('service response fixtures', () => {
  const checks = [
    ['submit.scored', 'SubmitResponse', services.submit.scored],
    ['submit.recorded', 'SubmitResponse', services.submit.recorded],
    ['submit.blocked', 'SubmitResponse', services.submit.blocked],
    ['submit.fallback', 'SubmitResponse', services.submit.fallback],
    ['tutor', 'TutorResponse', services.tutor],
    ['verify.ok', 'VerifyResponse', services.verify.ok],
    ['verify.needs_narrowing', 'VerifyResponse', services.verify.needs_narrowing],
    ['generate', 'GenerateResponse', services.generate],
    ['roster', 'RosterResponse', services.roster],
    ['routingDecision', 'SetTeacherInputResponse', services.routingDecision],
    ['health.ok', 'HealthResponse', services.health.ok],
    ['health.down', 'HealthResponse', services.health.down],
  ]
  for (const [label, def, data] of checks) {
    it(`${label} matches ${def}`, () => expect(problems('services', def, data)).toEqual([]))
  }
  it('submitArgs match SubmitStepArgs', () => {
    for (const a of Object.values(services.submitArgs)) expect(problems('services', 'SubmitStepArgs', a)).toEqual([])
  })
})

describe('model fixtures', () => {
  it('invoke results match InvokeResult', () => {
    for (const [k, v] of Object.entries(invokeResults)) {
      if (k === 'description') continue
      expect(problems('model', 'InvokeResult', v), k).toEqual([])
    }
  })
  it('screen results match ScreenResult and the error case fails closed', () => {
    for (const [k, v] of Object.entries(screenResults)) {
      if (k === 'description') continue
      expect(problems('model', 'ScreenResult', v), k).toEqual([])
    }
    expect(screenResults.filter_error_fails_closed.allowed).toBe(false)
  })
  it('validator raw outputs classify as expected', () => {
    for (const c of validatorOutputs.cases) {
      const parsed = tryParse(c.raw) ?? tryParse(c.repairRaw)
      const valid = parsed !== null && isValid('model', 'ValidatorOutput', parsed)
      if (c.expect.ok) {
        expect(valid, `${c.name} should be schema-valid`).toBe(true)
        if (c.expect.evidenceLevel !== undefined) expect(parsed.evidenceLevel).toBe(c.expect.evidenceLevel)
      } else if (c.expect.reason === 'low_confidence') {
        expect(valid).toBe(true)
        expect(parsed.confidence).toBeLessThan(0.6)
      } else {
        expect(valid, `${c.name} should be rejected`).toBe(false)
      }
    }
  })
  it('passive results match PassiveResult and carry no checkpoint id', () => {
    for (const [k, v] of Object.entries(passiveResults)) {
      if (k === 'description') continue
      expect(problems('model', 'PassiveResult', v), k).toEqual([])
      expect(JSON.stringify(v)).not.toMatch(/checkpointId/)
    }
  })
})

function tryParse(s) {
  if (typeof s !== 'string') return null
  const i = s.indexOf('{')
  const j = s.lastIndexOf('}')
  if (i === -1 || j === -1 || j < i) return null
  try { return JSON.parse(s.slice(i, j + 1)) } catch { return null }
}
