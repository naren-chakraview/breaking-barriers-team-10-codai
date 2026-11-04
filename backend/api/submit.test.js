import { describe, it, expect } from 'vitest'
import { problems } from '../../shared/contracts/validate.js'
import { tree, clone } from '../../shared/contracts/fixtures/index.js'
import { submitStep } from './submit.js'
import { createServices } from './services.js'
import { createJsonRepository } from '../store/json-repository.js'
import { makeCoreDouble, makeModelDouble } from './test-doubles.js'

// Behavioral tests for the submit orchestration (Task 7). These go beyond the generic
// harness: they assert the C-24 (persist), C-13/C-14 (scoring), C-21/C-22 (fallback) and
// C-25 (safety) behaviors, and that every response still validates against SubmitResponse.

function setup(modelOpts) {
  const repo = createJsonRepository()
  const deps = {
    core: makeCoreDouble(),
    model: makeModelDouble(modelOpts),
    repo,
    tree: clone(tree),
    modes: { serviceMode: 'http', modelMode: 'stub', storeMode: 'json' },
  }
  return { deps, repo }
}

const ctx = { studentId: 'stu-1' }
const PROJECT_ARGS = {
  stepId: 'steer-it-project',
  courseId: 'hoai2026-adaptive',
  checkpointId: 'steer-it',
  kind: 'prompt',
  text: 'Make the heading say Robotics Club and keep the layout the same.',
  project: { html: '<h1>Robotics Club</h1>', css: '', js: '' },
}

function valid(res) {
  return problems('services', 'SubmitResponse', res)
}

describe('submitStep orchestration', () => {
  it('scores a project step via the validator and returns schema-valid evidence (C-14)', async () => {
    const { deps } = setup()
    const res = await submitStep(deps, clone(PROJECT_ARGS), ctx)
    expect(valid(res)).toEqual([])
    expect(res.outcome).toBe('scored')
    expect(res.evidence.skillId).toBe('build')
    expect(res.evidence.level).toBe(2)
    expect(res.masteryDisplay).toBe(100) // round(100 * 2 / 2)
    expect(res.source).toBe('stub')
  })

  it('persists the attempt before returning (C-24)', async () => {
    const { deps, repo } = setup()
    await submitStep(deps, clone(PROJECT_ARGS), ctx)
    const history = await repo.getHistory('stu-1')
    expect(history).toHaveLength(1)
    expect(history[0].stepId).toBe('steer-it-project')
    expect(history[0].evidenceLevel).toBe(2)
  })

  it('appends monotonic evidence and completes the checkpoint at target (C-10, C-12)', async () => {
    const { deps, repo } = setup()
    const res = await submitStep(deps, clone(PROJECT_ARGS), ctx)
    expect(res.completed).toBe(true)
    const progress = await repo.getProgress('stu-1')
    expect(progress['steer-it']).toBe('completed')
    const ev = await repo.getEvidence('stu-1')
    expect(ev.build).toBe(2)
  })

  it('writes a routing_decision with a human-readable reason (C-19)', async () => {
    const { deps, repo } = setup()
    const res = await submitStep(deps, clone(PROJECT_ARGS), ctx)
    const decisions = await repo.listRoutingDecisions('stu-1')
    expect(decisions).toHaveLength(1)
    expect(decisions[0].reason.length).toBeGreaterThan(0)
    expect(res.next.reason).toBe(decisions[0].reason)
  })

  it('maps a multiple-choice answer to a level with no model call (C-13)', async () => {
    const { deps } = setup()
    const res = await submitStep(
      deps,
      { stepId: 'intro-web-dev', courseId: 'hoai2026-adaptive', checkpointId: 'intro', kind: 'answer', questionId: 103, choiceId: 'b' },
      ctx,
    )
    expect(valid(res)).toEqual([])
    expect(res.outcome).toBe('scored')
    expect(res.evidence.skillId).toBe('build')
    expect(res.evidence.level).toBe(2) // choice b -> 2 in the tree
    expect(res.source).toBe('rules')
  })

  it('records completion only for a panels step (C-15)', async () => {
    const { deps } = setup()
    const res = await submitStep(
      deps,
      { stepId: 'steer-it-video', courseId: 'hoai2026-adaptive', checkpointId: 'steer-it', kind: 'complete' },
      ctx,
    )
    expect(valid(res)).toEqual([])
    expect(res.outcome).toBe('recorded')
    expect(res.evidence).toBeNull()
    expect(res.masteryDisplay).toBeNull()
  })

  it('blocks unsafe input and keeps the lesson running (C-25)', async () => {
    const { deps, repo } = setup({ block: true })
    const res = await submitStep(deps, clone(PROJECT_ARGS), ctx)
    expect(valid(res)).toEqual([])
    expect(res.outcome).toBe('blocked')
    expect(res.notice.code).toBe('CONTENT_BLOCKED')
    // The attempt is still recorded, with no stored text.
    const history = await repo.getHistory('stu-1')
    expect(history).toHaveLength(1)
    expect(history[0].inputText).toBeNull()
  })

  it('falls back and writes a fallback_event when the validator is unreliable (C-21, C-22)', async () => {
    const { deps, repo } = setup({ validatorFallback: true })
    const res = await submitStep(deps, clone(PROJECT_ARGS), ctx)
    expect(valid(res)).toEqual([])
    expect(res.outcome).toBe('fallback')
    expect(res.notice.code).toBe('ADAPTIVE_UNAVAILABLE')
    const events = await repo.listFallbackEvents('stu-1')
    expect(events).toHaveLength(1)
    expect(events[0].component).toBe('validation')
  })

  it('raises a remediation flag after two consecutive misses (C-10)', async () => {
    const { deps, repo } = setup({ level: 0 }) // every attempt misses the target of 2
    await submitStep(deps, clone(PROJECT_ARGS), ctx)
    await submitStep(deps, clone(PROJECT_ARGS), ctx)
    const flags = await repo.listOpenFlags('stu-1')
    expect(flags.length).toBeGreaterThanOrEqual(1)
    expect(flags[0].skillId).toBe('build')
  })
})

describe('createServices wiring', () => {
  it('submitStep through the services facade stays schema-valid', async () => {
    const repo = createJsonRepository()
    const svc = createServices({
      core: makeCoreDouble(),
      model: makeModelDouble(),
      repo,
      tree: clone(tree),
      modes: { serviceMode: 'http', modelMode: 'stub', storeMode: 'json' },
    })
    const res = await svc.submitStep(clone(PROJECT_ARGS), ctx)
    expect(valid(res)).toEqual([])
  })
})
