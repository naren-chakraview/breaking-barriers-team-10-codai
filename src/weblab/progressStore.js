// Single source of truth for a student's REAL lesson progress, persisted per
// browser tab so the dashboard reflects what actually happened in the lesson
// instead of a hard-coded number. This is the local-engine progress the lesson
// records (objectives mastered, best mastery, in-progress state); it survives a
// reload the same way the sign-in session does.
//
// Not a backend/database: when the real services backend is wired (http mode),
// this module is where a getProgress/persistProgress API call would slot in.

import { LESSON } from './courseData.js'

const COURSE_ID = 'hour-of-ai-2026'
const key = (username) => `adaptai.progress.${username || 'guest'}`

const EMPTY = Object.freeze({
  courseId: COURSE_ID,
  completed: {},      // objectiveId -> true
  bestMastery: 0,     // 0..100, never decreases
  started: false,     // has the student begun this lesson?
  finished: false,    // all objectives mastered?
  updatedAt: null,
})

export function readProgress(username) {
  try {
    const raw = sessionStorage.getItem(key(username))
    if (!raw) return { ...EMPTY }
    const p = JSON.parse(raw)
    return { ...EMPTY, ...p, completed: p.completed || {} }
  } catch {
    return { ...EMPTY }
  }
}

// Merge an update in, enforcing the invariants (mastery never drops; finished is
// derived from completed count), and persist it.
export function writeProgress(username, patch) {
  const prev = readProgress(username)
  const completed = { ...prev.completed, ...(patch.completed || {}) }
  const total = LESSON.objectives.length
  const doneCount = Object.keys(completed).length
  const next = {
    ...prev,
    ...patch,
    completed,
    bestMastery: Math.max(prev.bestMastery, patch.bestMastery ?? 0),
    started: prev.started || patch.started || doneCount > 0,
    finished: doneCount >= total,
    updatedAt: new Date().toISOString(),
  }
  try { sessionStorage.setItem(key(username), JSON.stringify(next)) } catch { /* ignore */ }
  return next
}

export function clearProgress(username) {
  try { sessionStorage.removeItem(key(username)) } catch { /* ignore */ }
}

// Derived view the dashboard renders: % complete, objectives mastered, state.
export function progressSummary(username) {
  const p = readProgress(username)
  const total = LESSON.objectives.length
  const done = Object.keys(p.completed).length
  const pct = total ? Math.round((100 * done) / total) : 0
  return {
    courseId: p.courseId,
    done,
    total,
    pct,
    bestMastery: p.bestMastery,
    started: p.started,
    finished: p.finished,
    inProgress: p.started && !p.finished,
    completed: p.completed,
  }
}
