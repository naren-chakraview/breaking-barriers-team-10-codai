import { describe, it, expect } from 'vitest'
import { adaptTree, adaptSubmit, statusToUiState } from './treeAdapter.js'

// Property-based tests for the pure adapter. No PBT library is added, so each
// property loops >=100 randomized iterations.

const ITER = 100
const STATUSES = ['locked', 'available', 'current', 'completed', 'tested_out']

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Build a synthetic TreeResponse with a random number of skill-bearing checkpoints
// (plus an intro checkpoint with no skillIds, which must be excluded), a random
// progress map, and a random evidence map.
function makeTreeResponse() {
  const n = randInt(0, 6)
  const skillPool = ['build', 'language', 'debug']
  const checkpoints = [
    // intro: no skillIds -> not an objective
    { id: 'intro', title: 'Intro', steps: [{ id: 'intro-panels', title: 'Welcome', kind: 'panels' }] },
  ]
  const progress = {}
  const evidence = {}
  for (let i = 0; i < n; i++) {
    const id = `cp-${i}`
    const skillIds = [pick(skillPool)]
    checkpoints.push({ id, title: `Checkpoint ${i}`, skillIds, steps: [{ id: `${id}-s`, title: 's', kind: 'level' }] })
    if (Math.random() < 0.85) progress[id] = pick(STATUSES)
  }
  for (const s of skillPool) {
    if (Math.random() < 0.7) evidence[s] = randInt(0, 3)
  }
  return {
    tree: { formatVersion: 4, id: 'hoai2026-adaptive', title: 'Course', skills: {}, checkpoints },
    progress,
    evidence,
    current: n > 0 ? { checkpointId: 'cp-0', stepId: 'cp-0-s' } : null,
    fallbackActive: Math.random() < 0.3,
    correlationId: 'corr-tree-0001',
  }
}

function makeSubmitResponse() {
  const scored = Math.random() < 0.5
  const masteryDisplay = scored ? randInt(0, 100) : null
  return {
    stepId: 'cp-0-s',
    outcome: scored ? 'scored' : 'recorded',
    evidence: null,
    masteryDisplay,
    completed: Math.random() < 0.5,
    next: Math.random() < 0.7 ? { checkpointId: 'cp-1', stepId: 'cp-1-s', reason: 'next' } : null,
    hint: null,
    passive: null,
    notice: null,
    source: scored ? 'stub' : 'none',
    correlationId: 'corr-submit-0001',
  }
}

describe('treeAdapter', () => {
  // Feature: wire-student-services, Property 4: Adapted progress percent is a bounded integer
  it('progressPercent is an integer in 0..100 for any TreeResponse', () => {
    for (let i = 0; i < ITER; i++) {
      const { progressPercent } = adaptTree(makeTreeResponse())
      expect(Number.isInteger(progressPercent)).toBe(true)
      expect(progressPercent).toBeGreaterThanOrEqual(0)
      expect(progressPercent).toBeLessThanOrEqual(100)
    }
  })

  // Feature: wire-student-services, Property 5: Mastery display passes through without decreasing
  it('mastery equals masteryDisplay (number stays, null stays null)', () => {
    for (let i = 0; i < ITER; i++) {
      const r = makeSubmitResponse()
      const { mastery } = adaptSubmit(r)
      if (typeof r.masteryDisplay === 'number') expect(mastery).toBe(r.masteryDisplay)
      else expect(mastery).toBeNull()
    }
  })

  // Feature: wire-student-services, Property 6: Evidence levels are preserved by the adapter
  it('every evidence skill level is preserved unchanged', () => {
    for (let i = 0; i < ITER; i++) {
      const r = makeTreeResponse()
      const { evidence } = adaptTree(r)
      for (const [skillId, level] of Object.entries(r.evidence)) {
        expect(evidence[skillId]).toBe(level)
      }
    }
  })

  // Feature: wire-student-services, Property 7: Objective status reflects the progress map
  it('each objective state equals statusToUiState(progress[id])', () => {
    for (let i = 0; i < ITER; i++) {
      const r = makeTreeResponse()
      const { objectives } = adaptTree(r)
      // intro must be excluded
      expect(objectives.find((o) => o.id === 'intro')).toBeUndefined()
      for (const o of objectives) {
        expect(o.status).toBe(statusToUiState(r.progress[o.id]))
      }
    }
  })
})
