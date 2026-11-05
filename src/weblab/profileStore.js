// Persists the student's interests profile (from the interests quiz) per browser
// tab, so the lesson, examples, and the whole visual theme can adapt to it and
// survive a reload. Same demo-storage approach as progress/session; this is the
// seam where a real per-student preferences API would plug in.
import { buildProfile } from './interestsQuiz.js'

const key = (username) => `adaptai.profile.${username || 'guest'}`

export function readProfile(username) {
  try {
    const raw = sessionStorage.getItem(key(username))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Store the raw answers and the derived profile together.
export function writeProfile(username, answers) {
  const profile = buildProfile(answers)
  const record = { ...profile, answers, savedAt: new Date().toISOString() }
  try { sessionStorage.setItem(key(username), JSON.stringify(record)) } catch { /* ignore */ }
  return record
}

export function hasProfile(username) {
  return !!readProfile(username)
}

export function clearProfile(username) {
  try { sessionStorage.removeItem(key(username)) } catch { /* ignore */ }
}
