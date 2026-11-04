// Submit orchestration: POST /steps/{step_id}/submit (Task 7, C-24, C-29).
//
// The flow, in order:
//   1. Look up the step in the tree; reject an unknown step.
//   2. Screen student free text server-side before any model call (C-25). Blocked -> a
//      CONTENT_BLOCKED response, lesson continues.
//   3. Persist the attempt BEFORE any model result is used, so work is never lost (C-24).
//   4. Score:
//        - answer with a choice->level map  -> deterministic, no model (C-13)
//        - project step                     -> the validator (model seam, C-14)
//        - everything else                  -> completion only (C-15)
//      A validator fallback produces an ADAPTIVE_UNAVAILABLE response (C-21, C-22).
//   5. Apply evidence (monotonic, C-10), update checkpoint completion/progress (C-12).
//   6. Route with the pure route() and persist a routing_decision with a reason (C-19).
//   7. Assemble a SubmitResponse that satisfies the outcome<->field conditionals.
//
// Pure-ish: all I/O goes through injected ports (core, model, repo). The student id comes
// from the request context (P-1.4 headers), never the body.

import { newCorrelationId, nowIso, newRecordId } from './util.js'
import {
  findStep,
  skillMax,
  stepSkillId,
  stepCondition,
  isProjectStep,
  questionMeasure,
} from './tree-read.js'

const CONSECUTIVE_MISS_FLAG = 2 // C-10: 2nd consecutive miss raises a flag
const HIGH_SEVERITY_AFTER = 4 // C-10: high after four

/**
 * @param {import('./ports.js').Deps} deps
 * @param {object} args SubmitStepArgs (contracts/schemas/services.schema.json)
 * @param {{ studentId: string }} ctx request context from the P-1.4 headers
 * @returns {Promise<object>} SubmitResponse
 */
export async function submitStep(deps, args, ctx) {
  const { core, model, repo, tree } = deps
  const correlationId = newCorrelationId('submit')
  const studentId = ctx?.studentId
  if (!studentId) {
    // Shouldn't happen if the HTTP layer enforced headers, but never trust the caller.
    return fallbackResponse(args?.stepId, correlationId, 'Missing student context.')
  }

  const found = findStep(tree, args.stepId)
  if (!found) {
    return recordedResponse({
      stepId: args.stepId,
      correlationId,
      next: null,
      reason: 'Unknown step; nothing recorded.',
      source: 'none',
    })
  }
  const { step, checkpoint } = found

  // 2. Safety screen on any student free text (C-25). Fail closed.
  const studentText = args.kind === 'prompt' ? args.text : args.kind === 'answer' ? args.text : null
  if (studentText) {
    const screen = await safeScreenInput(model, studentText, correlationId)
    if (!screen.allowed) {
      // Still record that an attempt was made, with no stored text.
      await repo.saveAttempt(attemptRow({ studentId, step, inputText: null, level: null, confidence: null }))
      return blockedResponse({
        stepId: args.stepId,
        correlationId,
        message: screen.replacement ?? 'That message was not sent. Try describing a change to your page.',
      })
    }
  }

  // 4a. Score the submit.
  let evidence = null // { skillId, level, max, confidence, conditionMet, note } | null
  let outcome = 'recorded'
  let source = 'none'
  let fallback = null

  if (args.kind === 'answer' && typeof args.questionId === 'number') {
    const measure = questionMeasure(step, args.questionId)
    if (measure && args.choiceId) {
      // Deterministic map, no model (C-13).
      const level = measure.evidenceLevels[args.choiceId] ?? 0
      const max = skillMax(tree, measure.skillId)
      evidence = { skillId: measure.skillId, level, max, confidence: 1, conditionMet: level > 0, note: 'Answer mapped to an evidence level.' }
      outcome = 'scored'
      source = 'rules'
    }
  } else if (args.kind === 'prompt' && isProjectStep(step)) {
    const skillId = stepSkillId(step, checkpoint)
    const result = await safeValidate(model, {
      stepId: step.id,
      skillId,
      condition: stepCondition(step),
      prompts: [args.text],
      projectBefore: null,
      projectAfter: args.project ?? { html: '', css: '', js: '' },
      correlationId,
    })
    if (result.ok) {
      const out = result.result
      const max = skillMax(tree, out.skillId)
      evidence = {
        skillId: out.skillId,
        level: out.evidenceLevel,
        max,
        confidence: out.confidence,
        conditionMet: out.conditionMet,
        note: out.evidence,
      }
      outcome = 'scored'
      source = result.source // 'stub' | 'bedrock'
    } else {
      fallback = result.fallback
    }
  }

  // 3/5. Persist the attempt (after scoring we know the level, but still before the result
  // is shown to the student; a write failure would surface as INTERNAL and nothing is lost).
  await repo.saveAttempt(
    attemptRow({
      studentId,
      step,
      inputText: studentText ?? null,
      level: evidence?.level ?? null,
      confidence: evidence?.confidence ?? null,
    }),
  )

  // Fallback path: adaptivity failed, follow the linear order (C-21).
  if (fallback) {
    await repo.writeFallbackEvent({
      studentId,
      stepId: step.id,
      component: fallback.component ?? 'validation',
      error: fallback.reason ?? 'validator_fallback',
      createdAt: nowIso(),
    })
    const next = linearNext(tree, checkpoint, step)
    return fallbackResponse(step.id, correlationId, 'Adaptive feedback is temporarily unavailable.', next)
  }

  // 5. Apply evidence + completion.
  let masteryDisplay = null
  let completed = false
  const progress = await repo.getProgress(studentId)
  let evidenceMap = await repo.getEvidence(studentId)

  if (evidence) {
    await repo.appendEvidence({
      studentId,
      skillId: evidence.skillId,
      level: evidence.level,
      sourceStepId: step.id,
      createdAt: nowIso(),
    })
    evidenceMap = core.applyEvidence(evidenceMap, { skillId: evidence.skillId, level: evidence.level })
    masteryDisplay = evidence.max > 0 ? Math.round((100 * evidence.level) / evidence.max) : 0

    // Completion (C-12): a project step validated at/above target completes its checkpoint.
    completed = await maybeComplete({ repo, checkpoint, evidenceMap, step, studentId, progress })

    // Remediation flags on misses (C-10).
    await maybeFlag({ repo, studentId, step, checkpoint, evidence })
  } else {
    // Completion-only step: mark progress on the current checkpoint as current.
    await repo.upsertProgress({
      studentId,
      checkpointId: checkpoint.id,
      status: progress[checkpoint.id] === 'completed' ? 'completed' : 'current',
      updatedAt: nowIso(),
    })
  }

  // 6. Route (pure, deterministic) and persist the decision with its reason (C-19).
  const teacherInput = await repo.getTeacherInput(studentId)
  const freshProgress = await repo.getProgress(studentId)
  const decision = core.route(tree, freshProgress, evidenceMap, teacherInput)
  const next = buildNext(tree, decision)
  await repo.writeRoutingDecision({
    decisionId: newRecordId('dec'),
    studentId,
    proposedCheckpointId: decision.checkpointId,
    teacherInput: normalizeTeacherInput(teacherInput),
    appliedCheckpointId: decision.checkpointId,
    reason: decision.reason,
    createdAt: nowIso(),
  })

  // 7. Assemble, honoring the schema conditionals.
  if (outcome === 'scored') {
    return {
      stepId: step.id,
      outcome: 'scored',
      evidence,
      masteryDisplay,
      completed,
      next,
      hint: null,
      passive: null,
      notice: null,
      source,
      correlationId,
    }
  }
  return recordedResponse({ stepId: step.id, correlationId, next, source: 'none' })
}

// --- response builders (each satisfies the SubmitResponse schema conditionals) ---

function recordedResponse({ stepId, correlationId, next, source }) {
  return {
    stepId,
    outcome: 'recorded',
    evidence: null,
    masteryDisplay: null,
    completed: false,
    next: next ?? null,
    hint: null,
    passive: null,
    notice: null,
    source: source ?? 'none',
    correlationId,
  }
}

function blockedResponse({ stepId, correlationId, message }) {
  return {
    stepId,
    outcome: 'blocked',
    evidence: null,
    masteryDisplay: null,
    completed: false,
    next: null,
    hint: null,
    passive: null,
    notice: { code: 'CONTENT_BLOCKED', message },
    source: 'none',
    correlationId,
  }
}

function fallbackResponse(stepId, correlationId, _reason, next = null) {
  return {
    stepId: stepId ?? 'unknown',
    outcome: 'fallback',
    evidence: null,
    masteryDisplay: null,
    completed: false,
    next,
    hint: null,
    passive: null,
    notice: {
      code: 'ADAPTIVE_UNAVAILABLE',
      message: 'Adaptive feedback is temporarily unavailable. Your lesson keeps going and your work is saved.',
    },
    source: 'rules',
    correlationId,
  }
}

// --- internals ---

function attemptRow({ studentId, step, inputText, level, confidence }) {
  return {
    attemptId: newRecordId('att'),
    studentId,
    stepId: step.id,
    inputText,
    projectSnapshotRef: null,
    evidenceLevel: level,
    confidence,
    createdAt: nowIso(),
  }
}

/** Mark the checkpoint completed when its target is met on every targeted skill (C-12). */
async function maybeComplete({ repo, checkpoint, evidenceMap, studentId, progress }) {
  const skillIds = checkpoint.skillIds ?? Object.keys(checkpoint.targetEvidenceLevels ?? {})
  if (skillIds.length === 0) return false
  const met = skillIds.every((skillId) => {
    const target = checkpoint.targetEvidenceLevels?.[skillId] ?? 1 // default target 1 (C-12)
    return (evidenceMap[skillId] ?? 0) >= target
  })
  if (!met) {
    if ((progress[checkpoint.id] ?? 'locked') !== 'completed') {
      await repo.upsertProgress({ studentId, checkpointId: checkpoint.id, status: 'current', updatedAt: nowIso() })
    }
    return false
  }
  await repo.upsertProgress({ studentId, checkpointId: checkpoint.id, status: 'completed', updatedAt: nowIso() })
  return true
}

/** Raise a remediation flag on consecutive misses (C-10). */
async function maybeFlag({ repo, studentId, step, checkpoint, evidence }) {
  const skillIds = checkpoint.skillIds ?? []
  const target = checkpoint.targetEvidenceLevels?.[evidence.skillId] ?? 1
  const missed = evidence.level < target
  if (!missed || !skillIds.includes(evidence.skillId)) return

  const history = await repo.getHistory(studentId)
  const forStep = history.filter((a) => a.stepId === step.id)
  // Count trailing consecutive misses (level below target) for this step.
  let consecutive = 0
  for (let i = forStep.length - 1; i >= 0; i--) {
    const lvl = forStep[i].evidenceLevel
    if (lvl != null && lvl < target) consecutive++
    else break
  }
  if (consecutive < CONSECUTIVE_MISS_FLAG) return

  await repo.writeRemediationFlag({
    studentId,
    skillId: evidence.skillId,
    reason: `${consecutive} attempts below target on ${step.id}.`,
    severity: consecutive >= HIGH_SEVERITY_AFTER ? 'high' : 'normal',
    createdAt: nowIso(),
    resolvedAt: null,
  })
}

/** Build the SubmitResponse.next from a route() decision: the first step of the next checkpoint. */
function buildNext(tree, decision) {
  const cp = (tree.checkpoints ?? []).find((c) => c.id === decision.checkpointId)
  const firstStep = cp?.steps?.[0]?.id ?? decision.checkpointId
  return { checkpointId: decision.checkpointId, stepId: firstStep, reason: decision.reason }
}

/** The next step on the pre-authored linear path, used when adaptivity is unavailable (C-21). */
function linearNext(tree, checkpoint, step) {
  const steps = checkpoint.steps ?? []
  const idx = steps.findIndex((s) => s.id === step.id)
  if (idx >= 0 && idx + 1 < steps.length) {
    return { checkpointId: checkpoint.id, stepId: steps[idx + 1].id, reason: 'Adaptive feedback is unavailable; following the standard lesson order.' }
  }
  // Fall through to the next checkpoint in JSON order.
  const cps = tree.checkpoints ?? []
  const cpIdx = cps.findIndex((c) => c.id === checkpoint.id)
  const nextCp = cps[cpIdx + 1]
  if (nextCp) {
    return { checkpointId: nextCp.id, stepId: nextCp.steps?.[0]?.id ?? nextCp.id, reason: 'Adaptive feedback is unavailable; following the standard lesson order.' }
  }
  return { checkpointId: checkpoint.id, stepId: step.id, reason: 'Adaptive feedback is unavailable; stay on this step.' }
}

/** TeacherInput for a routing_decision: strip a null checkpointId so the schema accepts it. */
function normalizeTeacherInput(teacherInput) {
  const mode = teacherInput?.mode ?? 'auto'
  const out = { mode }
  if (teacherInput?.checkpointId) out.checkpointId = teacherInput.checkpointId
  return out
}

async function safeScreenInput(model, text, correlationId) {
  try {
    return await model.screenInput({ text, correlationId })
  } catch {
    // Fail closed (C-25): a filter error blocks the content.
    return { allowed: false, action: 'error', replacement: 'That message could not be checked. Please try again.', categories: [], guardrailVersion: null }
  }
}

async function safeValidate(model, req) {
  try {
    return await model.validateProject(req)
  } catch {
    return { ok: false, fallback: { component: 'validation', reason: 'validator_error' } }
  }
}
