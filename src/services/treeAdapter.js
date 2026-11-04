// Pure adapter between the frozen contract models (TreeResponse, SubmitResponse)
// and the prop shapes the existing student components already render. The contract
// tree is a checkpoint/step/skill model with evidenceLevels (C-4..C-6); the current
// components were built around a flat four-objective model. Confining the mapping
// here keeps the component markup — and the visual design — unchanged.
//
// No React in this file: the functions are pure so they can be property-tested.

/**
 * Map a contract ProgressStatus to the three UI states the components use.
 * @param {string} [progressStatus]
 * @returns {'done'|'progress'|'todo'}
 */
export function statusToUiState(progressStatus) {
  if (progressStatus === 'completed' || progressStatus === 'tested_out') return 'done'
  if (progressStatus === 'current') return 'progress'
  return 'todo'
}

/**
 * The checkpoints we treat as "objectives": every checkpoint that measures a skill.
 * The intro checkpoint has no skillIds, so it is excluded — it is onboarding, not a
 * graded objective. Order is preserved from the tree (tree order is the lesson path).
 * @param {object} tree
 * @returns {Array<object>}
 */
function objectiveCheckpoints(tree) {
  const checkpoints = Array.isArray(tree?.checkpoints) ? tree.checkpoints : []
  return checkpoints.filter((c) => Array.isArray(c?.skillIds) && c.skillIds.length > 0)
}

/**
 * Map a TreeResponse into the shape the student screens render.
 * @param {import('./types.js').TreeResponse} treeResponse
 * @returns {{
 *   courseId: string,
 *   title: string,
 *   objectives: Array<{ id: string, title: string, status: 'done'|'progress'|'todo', skillIds: string[] }>,
 *   progressPercent: number,
 *   evidence: Record<string, number>,
 *   current: { checkpointId: string, stepId: string } | null,
 *   fallbackActive: boolean,
 *   source: string,
 * }}
 */
export function adaptTree(treeResponse) {
  const tree = treeResponse?.tree ?? {}
  const progress = treeResponse?.progress ?? {}
  const evidence = treeResponse?.evidence ?? {}

  const checkpoints = objectiveCheckpoints(tree)
  const objectives = checkpoints.map((c) => ({
    id: c.id,
    title: c.title,
    status: statusToUiState(progress[c.id]),
    skillIds: c.skillIds.slice(),
  }))

  const total = objectives.length
  const completed = objectives.filter((o) => o.status === 'done').length
  const progressPercent = total === 0 ? 0 : Math.round((100 * completed) / total)

  return {
    courseId: tree.id ?? treeResponse?.courseId ?? '',
    title: tree.title ?? '',
    objectives,
    progressPercent,
    // Preserve every skill level exactly as reported (C-10: the max observed).
    evidence: { ...evidence },
    current: treeResponse?.current ?? null,
    fallbackActive: Boolean(treeResponse?.fallbackActive),
    // The tree is content, but when fallback is active it was served without the
    // adaptive layer; label it so it is never mistaken for a live adaptive view.
    source: treeResponse?.fallbackActive ? 'rules' : 'stub',
  }
}

/**
 * Map a SubmitResponse into the lesson's post-submit view.
 * @param {import('./types.js').SubmitResponse} submitResponse
 * @returns {{
 *   stepId: string,
 *   outcome: string,
 *   completed: boolean,
 *   mastery: number | null,
 *   next: { checkpointId: string, stepId: string, reason: string } | null,
 *   hint: object | null,
 *   passive: object | null,
 *   notice: object | null,
 *   source: string,
 * }}
 */
export function adaptSubmit(submitResponse) {
  const r = submitResponse ?? {}
  return {
    stepId: r.stepId,
    outcome: r.outcome,
    completed: Boolean(r.completed),
    // Display only (C-11): pass masteryDisplay through verbatim. A number stays the
    // number; null stays null — never substitute a lower or zero value.
    mastery: typeof r.masteryDisplay === 'number' ? r.masteryDisplay : null,
    next: r.next ?? null,
    hint: r.hint ?? null,
    passive: r.passive ?? null,
    notice: r.notice ?? null,
    source: r.source,
  }
}
