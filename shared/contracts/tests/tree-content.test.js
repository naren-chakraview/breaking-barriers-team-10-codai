import { describe, it, expect } from 'vitest'
import { problems } from '../validate.js'
import { tree } from '../fixtures/index.js'

// Validate the real content file against the tree schema, then check the integrity
// rules the platform relies on but a schema cannot express. These encode C-5, C-6,
// C-14 and C-19. If the content changes in a way that breaks a rule, Track B hears
// about it here, not at runtime.

const checkpoints = tree.checkpoints
const byId = new Map(checkpoints.map((c) => [c.id, c]))
const skillMax = Object.fromEntries(
  Object.entries(tree.skills).map(([id, s]) => [id, Math.max(...Object.keys(s.evidenceLevels).map(Number))]),
)

describe('sample-skilltree.json', () => {
  it('matches the tree schema', () => {
    expect(problems('tree', undefined, tree)).toEqual([])
  })

  it('checkpoint and step ids are unique', () => {
    const cids = checkpoints.map((c) => c.id)
    expect(new Set(cids).size).toBe(cids.length)
    const sids = checkpoints.flatMap((c) => c.steps.map((s) => s.id))
    expect(new Set(sids).size).toBe(sids.length)
  })

  it('every requires points at a real checkpoint (C-19)', () => {
    for (const c of checkpoints) for (const r of c.requires ?? []) {
      expect(byId.has(r), `${c.id} requires missing ${r}`).toBe(true)
    }
  })

  it('requires graph is acyclic', () => {
    const state = new Map() // id -> 0 visiting, 1 done
    const visit = (id, path) => {
      if (state.get(id) === 1) return
      expect(state.get(id), `cycle at ${id} via ${path.join(' -> ')}`).not.toBe(0)
      state.set(id, 0)
      for (const r of byId.get(id)?.requires ?? []) visit(r, [...path, id])
      state.set(id, 1)
    }
    for (const c of checkpoints) visit(c.id, [])
  })

  it('target evidence levels never exceed the skill maximum (C-14)', () => {
    for (const c of checkpoints) for (const [skill, lvl] of Object.entries(c.targetEvidenceLevels ?? {})) {
      expect(skillMax[skill], `unknown skill ${skill} in ${c.id}`).toBeDefined()
      expect(lvl).toBeLessThanOrEqual(skillMax[skill])
    }
  })

  it('the diagnostic checkpoints route after completion (C-19)', () => {
    // intro (onboarding) and skill-check (the placement diagnostic) both route after
    // completion in the authoritative curriculum; no other checkpoint does.
    const routers = checkpoints.filter((c) => c.routeAfterCompletion)
    expect(routers.map((c) => c.id)).toEqual(['intro', 'skill-check'])
  })

  it('skippable checkpoints declare a target, so test-out is defined (C-19.2)', () => {
    for (const c of checkpoints.filter((c) => c.skippable)) {
      expect(Object.keys(c.targetEvidenceLevels ?? {}).length, `${c.id} skippable without a target`).toBeGreaterThan(0)
    }
  })

  it('every project step has a condition source: validation.condition or an Evidence: line (C-14)', () => {
    const exempt = new Set(['intro-starter', 'show-it-off-project']) // no skill; completion only (C-15)
    for (const c of checkpoints) for (const s of c.steps) {
      if (!s.project || exempt.has(s.id)) continue
      const hasCondition = Boolean(s.validation?.condition)
      const hasEvidenceLine = /Evidence:/.test(s.instructionsPrompt ?? '')
      expect(hasCondition || hasEvidenceLine, `${s.id} has no condition source`).toBe(true)
    }
  })

  it('multiple-choice evidence levels stay within the skill maximum', () => {
    for (const c of checkpoints) for (const s of c.steps) for (const q of s.questions ?? []) {
      if (!q.measures) continue
      const max = skillMax[q.measures.skillId]
      for (const lvl of Object.values(q.measures.evidenceLevels)) {
        expect(lvl).toBeLessThanOrEqual(max)
      }
    }
  })

  it('the quick-learner path exists: skippable build/language/debug then keep-or-redirect', () => {
    expect(byId.get('steer-it')?.skippable).toBe(true)
    expect(byId.get('use-the-lingo')?.skippable).toBe(true)
    expect(byId.get('keep-or-redirect')?.requires).toContain('steer-it')
  })
})
