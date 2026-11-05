// Live results of a "Play demo" run, keyed by studentId, persisted per browser
// tab. The autopilot writes the final (and in-progress) numbers here; the Teacher
// page reads them so the roster + detail reflect the exact run that was watched,
// not just the static persona fixtures.
//
// Shape per student:
//   { studentId, name, understanding, tier, mastery, hintsUsed, attempts,
//     completedCount, totalObjectives, status, finished, stage, updatedAt }

const KEY = 'adaptai.demo.results'

// understanding -> teacher roster status pill (matches TeacherView STATUS keys).
const STATUS_BY_UNDERSTANDING = {
  strong: 'ahead',
  detail: 'stuck',
  struggling: 'behind',
  low: 'behind',
}

export function demoStatusFor(understanding) {
  return STATUS_BY_UNDERSTANDING[understanding] || 'on track'
}

function readAll() {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeAll(map) {
  try { sessionStorage.setItem(KEY, JSON.stringify(map)) } catch { /* ignore */ }
}

export function readAllDemoResults() {
  return readAll()
}

export function readDemoResult(studentId) {
  return readAll()[studentId] || null
}

export function writeDemoResult(studentId, patch) {
  const all = readAll()
  const prev = all[studentId] || {}
  const next = { ...prev, ...patch, studentId, updatedAt: new Date().toISOString() }
  all[studentId] = next
  writeAll(all)
  return next
}

export function clearDemoResults() {
  try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
}
