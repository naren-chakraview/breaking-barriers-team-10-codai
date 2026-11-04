// Read-only helpers for looking things up in the parsed skill tree. This is content
// consumption (C-6: content is data), not domain logic — the API reads a step's kind, its
// validation condition and its question rubrics to decide how to score a submit. Routing and
// evidence math stay in shared/core (Track B).

/**
 * Find a step and its checkpoint by step id.
 * @param {object} tree parsed sample-skilltree.json
 * @param {string} stepId
 * @returns {{ step: object, checkpoint: object } | null}
 */
export function findStep(tree, stepId) {
  for (const checkpoint of tree.checkpoints ?? []) {
    for (const step of checkpoint.steps ?? []) {
      if (step.id === stepId) return { step, checkpoint }
    }
  }
  return null
}

/**
 * The maximum evidence level for a skill, from the rubric (build 2, language 3, debug 3).
 * @param {object} tree
 * @param {string} skillId
 * @returns {number}
 */
export function skillMax(tree, skillId) {
  const skill = tree.skills?.[skillId]
  if (!skill?.evidenceLevels) return 0
  const levels = Object.keys(skill.evidenceLevels).map(Number)
  return levels.length ? Math.max(...levels) : 0
}

/**
 * The skill a step measures: validation.measures.skillId, else the checkpoint's first skill
 * (C-14).
 * @param {object} step
 * @param {object} checkpoint
 * @returns {string | null}
 */
export function stepSkillId(step, checkpoint) {
  return step?.validation?.measures?.skillId ?? checkpoint?.skillIds?.[0] ?? null
}

/**
 * The validator condition for a project step: validation.condition, else the `Evidence:`
 * line of instructionsPrompt (C-14).
 * @param {object} step
 * @returns {string}
 */
export function stepCondition(step) {
  if (step?.validation?.condition) return step.validation.condition
  const prompt = step?.instructionsPrompt ?? ''
  const match = prompt.match(/Evidence:\s*(.+)\s*$/im)
  return match ? match[1].trim() : (step?.title ?? 'Meets the step objective.')
}

/**
 * Is this a project step (uses the LLM judge, C-14)? A `level` step with project:true.
 * @param {object} step
 * @returns {boolean}
 */
export function isProjectStep(step) {
  return step?.kind === 'level' && step?.project === true && Boolean(step?.validation)
}

/**
 * A multiple-choice question's choice→level map, when it carries one (C-13).
 * @param {object} step
 * @param {number} questionId
 * @returns {{ skillId: string, evidenceLevels: Record<string, number> } | null}
 */
export function questionMeasure(step, questionId) {
  const q = (step?.questions ?? []).find((x) => x.id === questionId)
  if (!q?.measures?.skillId || !q.measures.evidenceLevels) return null
  return q.measures
}
