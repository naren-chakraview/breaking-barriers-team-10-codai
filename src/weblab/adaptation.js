// Visible adaptation (Task 8c, P-5.3): how a Passive signal changes what the student sees.
// Pure functions only. The signal itself comes from the backend (or, in the replay, from the
// committed engine output in shared/contracts/fixtures/replays); nothing here re-derives it.

import replays from '../../shared/contracts/fixtures/replays/persona-replays.json' with { type: 'json' }

export const NUDGE_COOLDOWN_MS = 60_000

export const SIGNAL_INFO = {
  speed_up: { label: 'Speed up', tone: 'good', hint: 'Breezing through: ready for a deeper challenge.' },
  slow_down: { label: 'Slow down', tone: 'low', hint: 'Repeated misses on the same skill: needs more scaffolding.' },
  redirect: { label: 'Redirect', tone: 'mid', hint: 'Over-focused on cosmetic detail: nudge back to the goal.' },
  reengage: { label: 'Re-engage', tone: 'mid', hint: 'Low-effort submits with long gaps: gently re-engage.' },
  steady: { label: 'Steady', tone: 'good', hint: 'On a healthy pace.' },
}

export const HINT_STYLE_LABEL = {
  guiding_question: 'Guiding question',
  example: 'Worked example',
  analogy: 'Analogy',
  step_by_step: 'Step by step',
}

// What the tutor's next hint sounds like in each style (student-facing preview).
const HINT_STYLE_SAMPLE = {
  guiding_question: 'What is the one thing a visitor should do on your page?',
  example: 'Here is a prompt with two details: "Make the sign-up button blue and put it under the heading."',
  analogy: 'Prompting is like ordering a sandwich: "a sandwich" gets you anything; say what goes in it.',
  step_by_step: 'Step 1: name one part of the page. Step 2: say what should change. Step 3: say how it should look.',
}

// The nudge the student sees. Only redirect and reengage nudge; the others change the hint style.
const NUDGES = {
  redirect: 'Nice styling! Before the next color change: what is the one thing a visitor should do on your page?',
  reengage: 'Still with us? Pick up where you left off: try one small change and see what the AI does.',
}

/** True when this signal shows a visible nudge to the student. */
export function nudgesFor(signal) {
  return Boolean(NUDGES[signal])
}

/**
 * Decide whether to show a nudge now. Cooldown is per checkpoint (60 s), so a student who
 * keeps tripping the same signal is not spammed. Returns the next cooldown state; never mutates.
 *
 * @param {Record<string, number>} lastShown checkpointId -> epoch ms of the last nudge shown
 * @param {string} checkpointId
 * @param {string | null | undefined} signal
 * @param {number} nowMs
 * @returns {{ show: boolean, text: string | null, remainingMs: number, lastShown: Record<string, number> }}
 */
export function decideNudge(lastShown, checkpointId, signal, nowMs) {
  const text = NUDGES[signal] ?? null
  if (!text) return { show: false, text: null, remainingMs: 0, lastShown }
  const prev = lastShown[checkpointId]
  const elapsed = prev == null ? Infinity : nowMs - prev
  if (elapsed < NUDGE_COOLDOWN_MS) {
    return { show: false, text, remainingMs: NUDGE_COOLDOWN_MS - elapsed, lastShown }
  }
  return { show: true, text, remainingMs: 0, lastShown: { ...lastShown, [checkpointId]: nowMs } }
}

/**
 * The hint the tutor would use next: the signal's style plus the angle to try, flagged as new
 * when it has not been tried in this student's hint log (angle rotation).
 */
export function activeHint(signal, anglesTried = []) {
  if (!signal) return null
  const style = signal.hintStyle
  return {
    style,
    label: HINT_STYLE_LABEL[style] ?? style,
    angle: signal.angleToTry ?? null,
    sample: HINT_STYLE_SAMPLE[style] ?? '',
    isNewAngle: !anglesTried.includes(style),
    tried: anglesTried.map((s) => HINT_STYLE_LABEL[s] ?? s),
  }
}

/** Persona replays keyed by studentId, as computed by shared/core/replay.py. */
export const REPLAYS_BY_STUDENT = Object.fromEntries(
  Object.values(replays.personas).map((p) => [p.student.studentId, p]),
)

/**
 * Walk a persona's frames once, applying the nudge cooldown on the server-timestamp clock.
 * Returns one decision per frame, so the replay UI can show "nudged" or "held back (cooldown)".
 */
export function replayNudges(frames) {
  let lastShown = {}
  return frames.map((f) => {
    const d = decideNudge(lastShown, f.event.checkpointId, f.signal?.signal, Date.parse(f.event.at))
    lastShown = d.lastShown
    return { show: d.show, text: d.text, remainingMs: d.remainingMs }
  })
}
