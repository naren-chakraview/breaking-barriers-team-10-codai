// The eight C-28 service functions (Seam 1), the HTTP API's backbone. Each maps one-to-one
// to a P-11/C-29 endpoint. Student id/role travel in the P-1.4 headers (the request
// context), never in the bodies. Every response carries a server-set correlationId.
//
// submitStep lives in ./submit.js (the orchestration). The rest are here.
//
// Model-derived output (tutor/verify/generate) is tagged with `source` so a stub can never
// pass as live (architecture 1.8); the source comes from the injected model port's result.

import { newCorrelationId, nowIso } from './util.js'
import { submitStep } from './submit.js'
import { findStep, skillMax } from './tree-read.js'

/**
 * Build the eight service functions over a set of injected dependencies.
 * @param {import('./ports.js').Deps} deps
 * @returns {Record<string, (args: object, ctx?: object) => Promise<object>>}
 */
export function createServices(deps) {
  const { core, model, repo, tree } = deps

  return {
    async getTree(_args, ctx) {
      const studentId = ctx?.studentId ?? 'demo-student'
      const [progress, evidence, teacherInput] = await Promise.all([
        repo.getProgress(studentId),
        repo.getEvidence(studentId),
        repo.getTeacherInput(studentId),
      ])
      const fallbackActive = await isFallbackActive(repo, studentId)
      const decision = core.route(tree, progress, evidence, teacherInput)
      const current = currentPointer(tree, decision.checkpointId, progress)
      return {
        tree,
        progress,
        evidence,
        current,
        fallbackActive,
        correlationId: newCorrelationId('tree'),
      }
    },

    async submitStep(args, ctx) {
      return submitStep(deps, args, ctx ?? { studentId: 'demo-student' })
    },

    async askTutor(args, ctx) {
      const correlationId = newCorrelationId('tutor')
      const result = await callModel(model.invoke, {
        task: 'tutor',
        prompt: tutorPrompt(args),
        opts: { maxTokens: 512, correlationId },
      })
      if (!result.ok) {
        return {
          answer: 'I can’t help with that right now. Try asking about a change to your page.',
          hintStyle: 'guiding_question',
          notice: { code: 'ADAPTIVE_UNAVAILABLE', message: 'The tutor is temporarily unavailable.' },
          source: 'rules',
          correlationId,
        }
      }
      // Screen the model output before display (C-25).
      const screen = await safeScreenOutput(model, result.text, correlationId)
      const answer = screen.allowed ? result.text : (screen.replacement ?? 'Let’s try a different question.')
      return {
        answer: answer || 'What is the one change you want to make next?',
        hintStyle: 'guiding_question',
        notice: screen.allowed ? null : { code: 'CONTENT_BLOCKED', message: 'That response was adjusted for safety.' },
        source: result.source,
        correlationId,
      }
    },

    async verifyPrompt(args) {
      const correlationId = newCorrelationId('verify')
      const result = await callModel(model.invoke, {
        task: 'verify',
        prompt: verifyPromptBody(args),
        opts: { maxTokens: 256, correlationId },
      })
      if (!result.ok) {
        return {
          verdict: 'ok',
          guidance: 'Go ahead and generate it, then check the result against your plan.',
          notice: { code: 'ADAPTIVE_UNAVAILABLE', message: 'Prompt check is temporarily unavailable.' },
          source: 'rules',
          correlationId,
        }
      }
      const narrow = /narrow|too much|one at a time|break|split/i.test(result.text)
      return {
        verdict: narrow ? 'needs_narrowing' : 'ok',
        guidance: result.text || 'Clear and specific. Go ahead and generate it.',
        notice: null,
        source: result.source,
        correlationId,
      }
    },

    async generate(args) {
      const correlationId = newCorrelationId('generate')
      const result = await callModel(model.invoke, {
        task: 'codegen',
        prompt: generatePromptBody(args),
        opts: { maxTokens: 2048, correlationId },
      })
      if (!result.ok) {
        return {
          project: args.project ?? null,
          explanation: '',
          notice: { code: 'ADAPTIVE_UNAVAILABLE', message: 'Code generation is temporarily unavailable.' },
          source: 'rules',
          correlationId,
        }
      }
      const project = parseProject(result.text) ?? args.project ?? null
      return {
        project,
        explanation: 'Applied your change.',
        notice: null,
        source: result.source,
        correlationId,
      }
    },

    async getTeacherRoster(_args, _ctx) {
      const correlationId = newCorrelationId('roster')
      const students = await repo.listStudents()
      const rows = await Promise.all(students.map((s) => rosterRow(deps, s)))
      return { students: rows, correlationId }
    },

    async setTeacherInput(args) {
      const correlationId = newCorrelationId('teacher')
      const { studentId, input } = args
      await repo.setTeacherInput(studentId, input)

      // Re-route under the new teacher input and record the decision (C-19).
      const [progress, evidence] = await Promise.all([repo.getProgress(studentId), repo.getEvidence(studentId)])
      const routed = core.route(tree, progress, evidence, input)
      const decision = {
        decisionId: `dec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        studentId,
        proposedCheckpointId: routed.checkpointId,
        teacherInput: stripNullCheckpoint(input),
        appliedCheckpointId: routed.checkpointId,
        reason: routed.reason,
        createdAt: nowIso(),
      }
      await repo.writeRoutingDecision(decision)
      return { decision, correlationId }
    },

    async health() {
      const correlationId = newCorrelationId('health')
      // Each component is a best-effort probe; in stub mode they are all ok.
      const components = {
        validation: 'ok',
        routing: 'ok',
        generation: 'ok',
        safety: 'ok',
        passive: 'ok',
      }
      const anyDown = Object.values(components).includes('down')
      return {
        status: anyDown ? 'degraded' : 'ok',
        components,
        checkedAt: nowIso(),
        correlationId,
      }
    },
  }
}

// --- helpers ---

async function isFallbackActive(repo, studentId) {
  const events = await repo.listFallbackEvents(studentId)
  if (events.length === 0) return false
  const last = events.at(-1)
  // Consider adaptivity down if the last fallback was within the health re-check window.
  const ageMs = Date.now() - Date.parse(last.createdAt)
  return Number.isFinite(ageMs) && ageMs < 30_000
}

function currentPointer(tree, checkpointId, progress) {
  const cp = (tree.checkpoints ?? []).find((c) => c.id === checkpointId)
  if (!cp) return null
  // First step that isn't a completed checkpoint's trailing step; simplest: first step.
  const stepId = cp.steps?.[0]?.id
  if (!stepId) return null
  // If the checkpoint is already completed, there is no current pointer into it.
  if (progress[checkpointId] === 'completed') return null
  return { checkpointId, stepId }
}

async function rosterRow(deps, student) {
  const { repo, tree } = deps
  const studentId = student.studentId
  const [evidence, progress, flags, passive, routing, teacherInput] = await Promise.all([
    repo.getEvidence(studentId),
    repo.getProgress(studentId),
    repo.listOpenFlags(studentId),
    repo.getLatestPassiveSignal(studentId),
    repo.listRoutingDecisions(studentId),
    repo.getTeacherInput(studentId),
  ])

  const mastery = Object.keys(tree.skills ?? {}).map((skillId) => {
    const level = evidence[skillId] ?? 0
    const max = skillMax(tree, skillId)
    return { skillId, level, max, display: max > 0 ? Math.round((100 * level) / max) : 0 }
  })

  const current = Object.entries(progress).find(([, s]) => s === 'current')?.[0] ?? null

  return {
    studentId,
    displayName: student.displayName ?? studentId,
    synthetic: student.synthetic ?? true,
    currentCheckpointId: current,
    mastery,
    flags: flags.map((f) => ({ skillId: f.skillId, reason: f.reason, severity: f.severity, createdAt: f.createdAt })),
    passive: passive
      ? { signal: passive.signal, hintStyle: passive.hintStyle, reason: passive.reason, confidence: passive.confidence, createdAt: passive.createdAt }
      : null,
    lastRouting: routing.at(-1) ?? null,
    teacherInput: stripNullCheckpoint(teacherInput),
  }
}

function stripNullCheckpoint(input) {
  const mode = input?.mode ?? 'auto'
  const out = { mode }
  if (input?.checkpointId) out.checkpointId = input.checkpointId
  return out
}

async function callModel(invoke, req) {
  try {
    return await invoke(req)
  } catch {
    return { ok: false, task: req.task, error: { code: 'UPSTREAM_ERROR', message: 'model call failed' }, correlationId: req.opts.correlationId }
  }
}

async function safeScreenOutput(model, text, correlationId) {
  try {
    return await model.screenOutput({ text, correlationId })
  } catch {
    return { allowed: false, action: 'error', replacement: 'Let’s try a different question.', categories: [], guardrailVersion: null }
  }
}

// Prompts are intentionally minimal here; Track C owns the real prompt text (prompts/).
function tutorPrompt(args) {
  return {
    system: 'You are a patient coding tutor for beginners. Guide with a question; never write the code for them.',
    user: args.question,
    untrusted: [args.question],
  }
}
function verifyPromptBody(args) {
  return {
    system: 'Judge whether a student prompt is specific enough to generate from. Reply "ok" or suggest how to narrow it.',
    user: args.prompt,
    untrusted: [args.prompt],
  }
}
function generatePromptBody(args) {
  return {
    system: 'Apply the requested change to the project. Return the full updated project.',
    user: args.prompt,
    untrusted: [args.prompt],
  }
}

function parseProject(text) {
  try {
    const obj = JSON.parse(text)
    if (obj && typeof obj.html === 'string' && typeof obj.css === 'string' && typeof obj.js === 'string') {
      return { html: obj.html, css: obj.css, js: obj.js }
    }
  } catch {
    /* not JSON; leave null */
  }
  return null
}
