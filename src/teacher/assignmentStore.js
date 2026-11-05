// Shared assignment between the teacher view and the student skill tree. The
// teacher picks CSTA High School Specialty standards for a student to learn;
// those selected standards become the skills shown on that student's skill tree.
//
// Like the other demo state, this is persisted to sessionStorage (per browser
// tab) rather than a backend: it is the seam where a real assignment API call
// would go. Keyed by student id so each student gets their own assignment.
import { getStandard } from './cstaStandards.js'

const key = (studentId) => `adaptai.assignment.${studentId || 'default'}`

// Returns an ordered array of selected standard codes for a student.
export function readAssignment(studentId) {
  try {
    const raw = sessionStorage.getItem(key(studentId)) || sessionStorage.getItem(key('demo'))
    const codes = raw ? JSON.parse(raw) : null
    return Array.isArray(codes) ? codes : []
  } catch {
    return []
  }
}

export function writeAssignment(studentId, codes) {
  const clean = Array.isArray(codes) ? codes.filter((c) => !!getStandard(c)) : []
  try {
    sessionStorage.setItem(key(studentId), JSON.stringify(clean))
    // Demo bridge: teacher roster ids (alex, jordan, ...) rarely match the
    // username a student types to log in, so mirror the latest assignment to a
    // shared 'demo' key the student view falls back to. A real build keys this
    // off the authenticated student id instead.
    sessionStorage.setItem(key('demo'), JSON.stringify(clean))
  } catch { /* ignore */ }
  return clean
}

// The selected standards resolved to full { code, statement, areaId, areaLabel }.
export function assignedStandards(studentId) {
  return readAssignment(studentId).map(getStandard).filter(Boolean)
}
