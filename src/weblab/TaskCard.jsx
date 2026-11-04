// Prominent "Your task" card at the very top of the center column, where the
// student's attention already is (right above the editor). The lesson
// instructions used to live only in the left side panel under a small heading,
// which was easy to miss. This surfaces the current step's goal, the full
// instructions, a tier badge, a step counter, and the code example — clearly.
import { getObjective } from './courseData.js'

const TIER_LABEL = {
  support: 'Guided practice',
  core: 'Standard',
  stretch: 'Challenge',
}

export default function TaskCard({ level, objectives, completed }) {
  if (!level) return null
  const obj = getObjective(level.objectiveId)
  const total = objectives.length
  // Which objective number this is (1-based), for a simple "Step N of M".
  const idx = objectives.findIndex((o) => o.id === level.objectiveId)
  const stepNo = idx >= 0 ? idx + 1 : 1
  const example = level.targets?.code?.comment?.code
  const tier = TIER_LABEL[level.tier] || 'Standard'

  return (
    <section className="wf-task" aria-labelledby="wf-task-title">
      <div className="wf-task-head">
        <span className="wf-task-eyebrow">
          <span className="wf-task-step">Step {stepNo} of {total}</span>
          {obj ? <span className="wf-task-obj">{obj.title}</span> : null}
          <span className={`wf-task-tier wf-task-tier--${level.tier}`}>{tier}</span>
        </span>
      </div>
      <h2 id="wf-task-title" className="wf-task-title">
        <span className="wf-task-icon" aria-hidden="true">🎯</span>
        Your task: {level.title}
      </h2>
      <p className="wf-task-body">{level.instructions}</p>
      {example && (
        <div className="wf-task-example">
          <span className="wf-task-example-label">Example</span>
          <pre>{example}</pre>
        </div>
      )}
      <p className="wf-task-hintline">
        Not sure how? Press <strong>💡 Get a hint</strong> in the AI Tutor, or tap <strong>📍 Show me where</strong>.
      </p>
    </section>
  )
}
