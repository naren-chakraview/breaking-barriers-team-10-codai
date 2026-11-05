import { describe, expect, it } from 'vitest'
import {
  NUDGE_COOLDOWN_MS, REPLAYS_BY_STUDENT, activeHint, decideNudge, nudgesFor, replayNudges,
} from './adaptation.js'

describe('decideNudge', () => {
  it('shows a redirect nudge, then holds it back for 60 s on the same checkpoint', () => {
    const first = decideNudge({}, 'steer-it', 'redirect', 1_000)
    expect(first.show).toBe(true)
    const again = decideNudge(first.lastShown, 'steer-it', 'redirect', 1_000 + 30_000)
    expect(again.show).toBe(false)
    expect(again.remainingMs).toBe(30_000)
    const later = decideNudge(first.lastShown, 'steer-it', 'redirect', 1_000 + NUDGE_COOLDOWN_MS)
    expect(later.show).toBe(true)
  })

  it('keeps the cooldown per checkpoint', () => {
    const first = decideNudge({}, 'steer-it', 'redirect', 0)
    expect(decideNudge(first.lastShown, 'use-the-lingo', 'redirect', 5_000).show).toBe(true)
  })

  it('never nudges for pacing-only signals', () => {
    for (const s of ['speed_up', 'slow_down', 'steady', null]) {
      expect(nudgesFor(s)).toBe(false)
      expect(decideNudge({}, 'steer-it', s, 0).show).toBe(false)
    }
  })

  it('does not mutate the cooldown state', () => {
    const state = {}
    decideNudge(state, 'steer-it', 'reengage', 0)
    expect(state).toEqual({})
  })
})

describe('activeHint', () => {
  it('rotates the slow learner to an angle not yet tried', () => {
    const slow = REPLAYS_BY_STUDENT['stu-slow']
    const last = slow.frames.at(-1)
    const hint = activeHint(last.signal, last.anglesTried)
    expect(hint.style).toBe('step_by_step')
    expect(hint.isNewAngle).toBe(true)
    expect(hint.tried).toEqual(['Analogy', 'Worked example'])
  })
})

describe('replayNudges', () => {
  it('nudges the inattentive persona once and holds back the rapid follow-ups', () => {
    const away = REPLAYS_BY_STUDENT['stu-away']
    const decisions = replayNudges(away.frames)
    const nudged = decisions.filter((d) => d.show).length
    const held = decisions.filter((d) => d.text && !d.show).length
    expect(nudged).toBeGreaterThanOrEqual(1)
    expect(held).toBeGreaterThanOrEqual(1)
  })

  it('every persona replay is marked synthetic', () => {
    for (const p of Object.values(REPLAYS_BY_STUDENT)) expect(p.student.synthetic).toBe(true)
  })
})
