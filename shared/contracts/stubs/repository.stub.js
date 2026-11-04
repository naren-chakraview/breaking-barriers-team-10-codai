import { REPOSITORY_METHODS, LIMITS } from '../seams.js'

// In-memory repository stub for seam 4. It is the behavioral reference the JSON-file
// adapter (demo mode) and the Aurora adapter (ADR-016) must both match via
// runRepositoryContract. Deliberately simple: Maps and arrays, no persistence.

const byTime = (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0)

export function createStubRepository() {
  const students = new Map()
  const evidence = [] // StudentSkillEvidence rows
  const attempts = []
  const progress = new Map() // `${studentId}::${checkpointId}` -> status row
  const flags = []
  const routing = []
  const fallbacks = []
  const passive = []
  const hints = []
  const teacherInput = new Map()
  const teacherConfig = new Map()

  const key = (a, b) => `${a}::${b}`

  const repo = {
    async putStudent(s) { students.set(s.studentId, s); return s },
    async listStudents() { return [...students.values()] },

    async appendEvidence(row) { evidence.push(row); return row },
    async getEvidence(studentId) {
      const out = {}
      for (const r of evidence) {
        if (r.studentId !== studentId) continue
        out[r.skillId] = Math.max(out[r.skillId] ?? 0, r.level) // max, never decreases (C-10)
      }
      return out
    },

    async getProgress(studentId) {
      const out = {}
      for (const [k, row] of progress) {
        if (k.startsWith(`${studentId}::`)) out[row.checkpointId] = row.status
      }
      return out
    },
    async upsertProgress(row) { progress.set(key(row.studentId, row.checkpointId), row); return row },

    async saveAttempt(a) { attempts.push(a); return a },
    async getHistory(studentId) { return attempts.filter((a) => a.studentId === studentId).sort(byTime) },

    async writeHintEvent(h) { hints.push(h); return h },
    async listHintEvents(studentId) { return hints.filter((h) => h.studentId === studentId).sort(byTime) },

    async writeRoutingDecision(d) { routing.push(d); return d },
    async listRoutingDecisions(studentId) { return routing.filter((d) => d.studentId === studentId).sort(byTime) },

    async writeFallbackEvent(e) { fallbacks.push(e); return e },
    async listFallbackEvents(studentId) { return fallbacks.filter((e) => e.studentId === studentId).sort(byTime) },

    async writePassiveSignal(s) { passive.push(s); return s },
    async getLatestPassiveSignal(studentId) {
      const rows = passive.filter((s) => s.studentId === studentId).sort(byTime)
      return rows.at(-1) ?? null
    },
    async getCachedPassiveSignal(studentId, featuresHash, promptVersion) {
      return passive.find((s) => s.studentId === studentId && s.featuresHash === featuresHash && s.promptVersion === promptVersion) ?? null
    },

    async writeRemediationFlag(f) { flags.push(f); return f },
    async listOpenFlags(studentId) { return flags.filter((f) => f.studentId === studentId && !f.resolvedAt).sort(byTime) },

    async getTeacherInput(studentId) { return teacherInput.get(studentId) ?? { mode: 'auto' } },
    async setTeacherInput(studentId, input) {
      const row = { studentId, mode: input.mode, checkpointId: input.checkpointId ?? null, updatedAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z') }
      teacherInput.set(studentId, row)
      return row
    },

    async getTeacherConfig(teacherId) {
      return teacherConfig.get(teacherId) ?? { teacherId, answerTimeoutSeconds: LIMITS.ANSWER_TIMEOUT_SECONDS_DEFAULT }
    },
  }

  // Fail fast if the interface and the implementation drift apart.
  for (const m of REPOSITORY_METHODS) {
    if (typeof repo[m] !== 'function') throw new Error(`repository stub is missing ${m}`)
  }
  return repo
}
