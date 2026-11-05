// Build the lesson the student works through from the authoritative skill tree
// (C-6, C-7): content is the real curriculum from getTree, not the invented
// courseData.js HTML lesson. This replaces lessonBuilder.buildLesson on the
// student path.
//
// The existing lesson components (LessonPanel, TaskCard, LearnCard) render a
// `{ lesson, levels }` shape whose fields they read defensively. Rather than
// rewrite those components, this adapter projects the tree into that shape:
//   - each skill-bearing checkpoint  -> an "objective"  { id, title }
//   - each of its steps              -> a "level"       { id, objectiveId, title, instructions, kind, payload }
// Fields the courseData model carried but the tree does not (tier, targets,
// lesson.points/walkthrough/terms, code examples) are simply omitted; the
// components already guard them (optional chaining / `|| 'Standard'`), so they
// degrade to a clean task view driven by the tree's instructions and panels.
//
// Routing and grading do NOT live here: the backend router (via submitStep /
// getTree.current) decides the next checkpoint, and the validator grades project
// steps. This module only shapes content for display.

/** Steps that are shown but not "worked" with the editor (completion-only, C-15). */
const READONLY_KINDS = new Set(['panels', 'review'])

/**
 * Human-readable instructions for a step, from the tree.
 * Prefers an explicit instruction, then the project/instructions prompt, then a
 * kind-appropriate default so the task card always says something useful.
 */
function stepInstructions(step) {
  if (step.instructions) return step.instructions
  if (step.instructionsPrompt) return step.instructionsPrompt
  if (step.kind === 'panels') return 'Read through the panels, then continue.'
  if (step.kind === 'review') return 'Review your plan, then continue.'
  if (step.kind === 'questions') return 'Answer the question(s) to continue.'
  return 'Follow the task, then submit your work.'
}

/**
 * Project steps are the graded, editor-driven ones (C-14). A step is "project"
 * when the tree marks it `project: true`.
 */
function isProjectStep(step) {
  return Boolean(step.project)
}

/**
 * Project a raw tree (TreeResponse.tree) + progress into the lesson shape the
 * student components render.
 *
 * @param {object} rawTree the tree content (TreeResponse.tree)
 * @returns {{
 *   lesson: { lessonId: string, title: string, unitTitle: string, projectTitle: string,
 *             objectives: Array<{ id: string, title: string }> },
 *   levels: Array<{ id, objectiveId, checkpointId, title, instructions, kind, project,
 *                   readOnly, panels?, questions?, payload }>,
 *   byStep: Record<string, object>,
 *   firstLevelId: string | null,
 * }}
 */
export function buildTreeLesson(rawTree) {
  const checkpoints = Array.isArray(rawTree?.checkpoints) ? rawTree.checkpoints : []

  // Objectives = checkpoints that train a skill (same rule as treeAdapter), in JSON order.
  // Diagnostics (intro, skill-check) and the no-skill wrap-up (show-it-off) are not
  // "objectives" in the left-panel checklist, but their steps are still walkable levels.
  const objectives = checkpoints
    .filter((c) => Array.isArray(c.skillIds) && c.skillIds.length > 0)
    .map((c) => ({ id: c.id, title: c.title }))

  const levels = []
  for (const cp of checkpoints) {
    for (const step of cp.steps || []) {
      levels.push({
        id: step.id,
        objectiveId: cp.id,
        checkpointId: cp.id,
        title: step.title,
        instructions: stepInstructions(step),
        kind: step.kind,
        project: isProjectStep(step),
        readOnly: READONLY_KINDS.has(step.kind),
        panels: step.panels || null,
        questions: step.questions || null,
        payload: step,
      })
    }
  }

  const byStep = Object.fromEntries(levels.map((l) => [l.id, l]))

  return {
    lesson: {
      lessonId: rawTree?.id || 'hoai2026-adaptive',
      title: rawTree?.title || 'Hour of AI 2026 - Adaptive',
      unitTitle: rawTree?.title || 'Hour of AI 2026 - Adaptive',
      projectTitle: 'My Website',
      objectives,
    },
    levels,
    byStep,
    firstLevelId: levels[0]?.id || null,
  }
}

/**
 * The step to start on, from getTree.current (the server's routing pointer), else
 * the first level. Returns a level id present in `byStep`.
 */
export function startLevelId(treeLesson, current) {
  const wanted = current?.stepId
  if (wanted && treeLesson.byStep[wanted]) return wanted
  return treeLesson.firstLevelId
}
