import { describe, it, expect } from 'vitest'
import { problems } from './validate.js'
import { SERVICE_FUNCTIONS, REPOSITORY_METHODS, ENUMS, LIMITS } from './seams.js'
import { clone, tree } from './fixtures/index.js'

// Reusable contract suites. A track calls one of these with its implementation
// (stub today, real later). The implementation passes the SAME suite either way,
// so swapping a stub for the real thing is a green test run, not a rewrite.
//
// Architecture 1.8, ADR-014.

const sampleArgs = {
  getTree: { courseId: tree.id },
  submitStep: { stepId: 'steer-it-video', courseId: tree.id, checkpointId: 'steer-it', kind: 'complete' },
  askTutor: { courseId: tree.id, checkpointId: 'steer-it', stepId: 'steer-it-widget', question: 'How do I start?' },
  verifyPrompt: { courseId: tree.id, checkpointId: 'steer-it', stepId: 'steer-it-project', prompt: 'Make the heading bigger and keep the layout.' },
  generate: { courseId: tree.id, checkpointId: 'steer-it', stepId: 'steer-it-project', prompt: 'Add a sign-up button.', project: { html: '<h1>Hi</h1>', css: '', js: '' } },
  getTeacherRoster: { courseId: tree.id },
  setTeacherInput: { studentId: 'stu-slow', input: { mode: 'hold' } },
  health: {},
}

const responseSchema = {
  getTree: ['services', 'TreeResponse'],
  submitStep: ['services', 'SubmitResponse'],
  askTutor: ['services', 'TutorResponse'],
  verifyPrompt: ['services', 'VerifyResponse'],
  generate: ['services', 'GenerateResponse'],
  getTeacherRoster: ['services', 'RosterResponse'],
  setTeacherInput: ['services', 'SetTeacherInputResponse'],
  health: ['services', 'HealthResponse'],
}

/**
 * Seam 1. Verify a services implementation (mock or HTTP).
 * @param {string} label
 * @param {() => Record<string, Function>} makeServices returns an object with the eight functions
 */
export function runServicesContract(label, makeServices) {
  describe(`services contract: ${label}`, () => {
    it('exposes exactly the eight service functions', () => {
      const svc = makeServices()
      expect(Object.keys(svc).filter((k) => typeof svc[k] === 'function').sort())
        .toEqual([...SERVICE_FUNCTIONS].sort())
    })

    for (const name of SERVICE_FUNCTIONS) {
      it(`${name} resolves a response that matches its schema`, async () => {
        const svc = makeServices()
        const out = await svc[name](clone(sampleArgs[name]))
        const [file, def] = responseSchema[name]
        expect(problems(file, def, out)).toEqual([])
      })

      it(`${name} echoes a correlationId`, async () => {
        const svc = makeServices()
        const out = await svc[name](clone(sampleArgs[name]))
        expect(typeof out.correlationId).toBe('string')
        expect(out.correlationId.length).toBeGreaterThanOrEqual(8)
      })
    }

    it('submitStep on a panels step records completion with no evidence (C-15)', async () => {
      const svc = makeServices()
      const out = await svc.submitStep(clone(sampleArgs.submitStep))
      expect(out.outcome).toBe('recorded')
      expect(out.evidence).toBeNull()
      expect(out.masteryDisplay).toBeNull()
    })

    it('a stub response is labelled source=stub so it cannot pass as live (architecture 1.8)', async () => {
      const svc = makeServices()
      const out = await svc.askTutor(clone(sampleArgs.askTutor))
      expect(ENUMS.Source).toContain(out.source)
    })
  })
}

/**
 * Seam 4. Verify a repository implementation (JSON file or DynamoDB) against the same suite.
 * @param {string} label
 * @param {() => object | Promise<object>} makeRepo returns a fresh, empty repository
 */
export function runRepositoryContract(label, makeRepo) {
  describe(`repository contract: ${label}`, () => {
    it('implements every repository method', async () => {
      const repo = await makeRepo()
      for (const m of REPOSITORY_METHODS) {
        expect(typeof repo[m], `missing ${m}`).toBe('function')
      }
    })

    it('appendEvidence then getEvidence returns the max level and never decreases (C-10)', async () => {
      const repo = await makeRepo()
      const base = { studentId: 'stu-x', skillId: 'build', sourceStepId: 'steer-it-project' }
      await repo.appendEvidence({ ...base, level: 2, createdAt: '2026-11-04T10:00:00Z' })
      await repo.appendEvidence({ ...base, level: 1, createdAt: '2026-11-04T10:05:00Z' })
      const ev = await repo.getEvidence('stu-x')
      expect(ev.build).toBe(2)
    })

    it('saveAttempt then getHistory returns the attempt in time order', async () => {
      const repo = await makeRepo()
      await repo.saveAttempt({ attemptId: 'a2', studentId: 'stu-x', stepId: 'steer-it-project', inputText: 'second', projectSnapshotRef: null, evidenceLevel: 1, confidence: 0.7, createdAt: '2026-11-04T10:05:00Z' })
      await repo.saveAttempt({ attemptId: 'a1', studentId: 'stu-x', stepId: 'steer-it-project', inputText: 'first', projectSnapshotRef: null, evidenceLevel: 0, confidence: 0.7, createdAt: '2026-11-04T10:00:00Z' })
      const hist = await repo.getHistory('stu-x')
      expect(hist.map((h) => h.attemptId)).toEqual(['a1', 'a2'])
    })

    it('upsertProgress is idempotent on the same key', async () => {
      const repo = await makeRepo()
      await repo.upsertProgress({ studentId: 'stu-x', checkpointId: 'steer-it', status: 'current', updatedAt: '2026-11-04T10:00:00Z' })
      await repo.upsertProgress({ studentId: 'stu-x', checkpointId: 'steer-it', status: 'completed', updatedAt: '2026-11-04T10:10:00Z' })
      const p = await repo.getProgress('stu-x')
      expect(p['steer-it']).toBe('completed')
    })

    it('getTeacherConfig returns the default answer timeout (C-8)', async () => {
      const repo = await makeRepo()
      const cfg = await repo.getTeacherConfig('teacher-1')
      expect(cfg.answerTimeoutSeconds).toBe(LIMITS.ANSWER_TIMEOUT_SECONDS_DEFAULT)
    })

    it('writeFallbackEvent accepts the passive component (proposed C-8 edit)', async () => {
      const repo = await makeRepo()
      await repo.writeFallbackEvent({ studentId: 'stu-x', stepId: 'steer-it-project', component: 'passive', error: 'low_confidence', createdAt: '2026-11-04T10:00:00Z' })
      const events = await repo.listFallbackEvents('stu-x')
      expect(events.at(-1).component).toBe('passive')
    })
  })
}
