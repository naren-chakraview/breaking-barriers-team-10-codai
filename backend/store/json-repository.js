// JSON-file repository adapter (STORE_MODE=json), the demo-mode store. It is the same
// behavior as the in-memory stub (shared/contracts/stubs/repository.stub.js) with optional
// persistence to a single JSON file, so it passes runRepositoryContract unchanged.
//
// Seam 4. Architecture 2.9. Demo-mode adapter called for in Task 4 / Task 7.
//
// Shapes are the camelCase records in contracts/schemas/records.schema.json. This adapter
// stores records as-is (camelCase); the snake_case column mapping in seams.js TABLES is the
// DynamoDB adapter's concern, not the JSON file's.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { REPOSITORY_METHODS, LIMITS } from '../../shared/contracts/seams.js'

const byTime = (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0)

/** An empty, serializable store. Arrays for append-only tables, keyed objects for upserts. */
function emptyState() {
  return {
    students: {}, // studentId -> Student
    evidence: [], // StudentSkillEvidence[]
    attempts: [], // StepAttempt[]
    progress: {}, // `${studentId}::${checkpointId}` -> CheckpointProgress
    flags: [], // RemediationFlag[]
    routing: [], // RoutingDecision[]
    fallbacks: [], // FallbackEvent[]
    passive: [], // PassiveSignalRecord[]
    hints: [], // HintEvent[]
    teacherInput: {}, // studentId -> TeacherInputRecord
    teacherConfig: {}, // teacherId -> TeacherConfig
  }
}

/**
 * Create a JSON-file-backed repository.
 * @param {object} [opts]
 * @param {string} [opts.filePath] file to load from and persist to. Omit for pure in-memory.
 * @returns {object} a repository implementing REPOSITORY_METHODS
 */
export function createJsonRepository({ filePath } = {}) {
  let state = emptyState()

  if (filePath && existsSync(filePath)) {
    try {
      state = { ...emptyState(), ...JSON.parse(readFileSync(filePath, 'utf8')) }
    } catch (err) {
      throw new Error(`could not read store file ${filePath}: ${err.message}`)
    }
  }

  const persist = () => {
    if (!filePath) return
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, JSON.stringify(state, null, 2))
  }

  const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  const key = (a, b) => `${a}::${b}`

  const repo = {
    async putStudent(s) {
      state.students[s.studentId] = s
      persist()
      return s
    },
    async listStudents() {
      return Object.values(state.students)
    },

    async appendEvidence(row) {
      state.evidence.push(row)
      persist()
      return row
    },
    async getEvidence(studentId) {
      const out = {}
      for (const r of state.evidence) {
        if (r.studentId !== studentId) continue
        out[r.skillId] = Math.max(out[r.skillId] ?? 0, r.level) // max, never decreases (C-10)
      }
      return out
    },

    async getProgress(studentId) {
      const out = {}
      for (const [k, row] of Object.entries(state.progress)) {
        if (k.startsWith(`${studentId}::`)) out[row.checkpointId] = row.status
      }
      return out
    },
    async upsertProgress(row) {
      state.progress[key(row.studentId, row.checkpointId)] = row
      persist()
      return row
    },

    async saveAttempt(a) {
      state.attempts.push(a)
      persist()
      return a
    },
    async getHistory(studentId) {
      return state.attempts.filter((a) => a.studentId === studentId).sort(byTime)
    },

    async writeHintEvent(h) {
      state.hints.push(h)
      persist()
      return h
    },
    async listHintEvents(studentId) {
      return state.hints.filter((h) => h.studentId === studentId).sort(byTime)
    },

    async writeRoutingDecision(d) {
      state.routing.push(d)
      persist()
      return d
    },
    async listRoutingDecisions(studentId) {
      return state.routing.filter((d) => d.studentId === studentId).sort(byTime)
    },

    async writeFallbackEvent(e) {
      state.fallbacks.push(e)
      persist()
      return e
    },
    async listFallbackEvents(studentId) {
      return state.fallbacks.filter((e) => e.studentId === studentId).sort(byTime)
    },

    async writePassiveSignal(s) {
      state.passive.push(s)
      persist()
      return s
    },
    async getLatestPassiveSignal(studentId) {
      const rows = state.passive.filter((s) => s.studentId === studentId).sort(byTime)
      return rows.at(-1) ?? null
    },
    async getCachedPassiveSignal(studentId, featuresHash, promptVersion) {
      return (
        state.passive.find(
          (s) =>
            s.studentId === studentId &&
            s.featuresHash === featuresHash &&
            s.promptVersion === promptVersion,
        ) ?? null
      )
    },

    async writeRemediationFlag(f) {
      state.flags.push(f)
      persist()
      return f
    },
    async listOpenFlags(studentId) {
      return state.flags.filter((f) => f.studentId === studentId && !f.resolvedAt).sort(byTime)
    },

    async getTeacherInput(studentId) {
      return state.teacherInput[studentId] ?? { mode: 'auto' }
    },
    async setTeacherInput(studentId, input) {
      const row = {
        studentId,
        mode: input.mode,
        checkpointId: input.checkpointId ?? null,
        updatedAt: nowIso(),
      }
      state.teacherInput[studentId] = row
      persist()
      return row
    },

    async getTeacherConfig(teacherId) {
      return (
        state.teacherConfig[teacherId] ?? {
          teacherId,
          answerTimeoutSeconds: LIMITS.ANSWER_TIMEOUT_SECONDS_DEFAULT,
        }
      )
    },
  }

  for (const m of REPOSITORY_METHODS) {
    if (typeof repo[m] !== 'function') throw new Error(`json repository is missing ${m}`)
  }
  return repo
}
