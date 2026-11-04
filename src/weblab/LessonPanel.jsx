// Left column from the wireframe: LESSON title, learning objectives checklist
// (done / current / upcoming), "What you'll learn now" with a code example,
// "My outcomes" mini report, and a button to open the full progress report.
function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  return m > 0 ? `${m} min` : `${seconds} sec`
}

export default function LessonPanel({
  lesson, level, completed, mastery, hintsUsed, seconds, onOpenReport,
}) {
  const example = level.targets?.code?.comment?.code
  const conceptsMastered = Object.keys(completed).length

  return (
    <aside className="wf-card wf-lesson" aria-label="Lesson and outcomes">
      <div className="wf-lesson-top">
        <p className="wf-eyebrow">LESSON</p>
        <h2 className="wf-lesson-title">Build a personal site</h2>
        <p className="wf-muted">{lesson.unitTitle}</p>
      </div>

      <hr className="wf-rule" />

      <h3 className="wf-h3">Learning objectives</h3>
      <ul className="wf-objectives">
        {lesson.objectives.map((o) => {
          const done = !!completed[o.id]
          const current = !done && o.id === level.objectiveId
          return (
            <li
              key={o.id}
              className={`wf-objective ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`}
              aria-current={current ? 'step' : undefined}
            >
              <span className="wf-check" aria-hidden="true">{done ? '✓' : ''}</span>
              <span>
                {o.title}
                {current ? ' (current)' : ''}
                <span className="wf-sr"> — {done ? 'completed' : current ? 'in progress' : 'not started'}</span>
              </span>
            </li>
          )
        })}
      </ul>

      <hr className="wf-rule" />

      <h3 className="wf-h3">What you'll learn now</h3>
      <div className="wf-learn">
        <p className="wf-learn-title">{level.title}</p>
        <p className="wf-learn-body">{level.instructions}</p>
        {example && (
          <div className="wf-example">
            <span className="wf-example-chip">code example</span>
            <pre>{example}</pre>
          </div>
        )}
      </div>

      <h3 className="wf-h3">My outcomes</h3>
      <div className="wf-outcomes">
        <div className="wf-outcome-row"><span>Concepts mastered</span><strong>{conceptsMastered}</strong></div>
        <div className="wf-outcome-row"><span>Hints used</span><strong>{hintsUsed}</strong></div>
        <div className="wf-outcome-row"><span>Time on task</span><strong>{formatTime(seconds)}</strong></div>
        <div
          className="wf-bar wf-bar--thin"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={mastery ?? 0}
          aria-label="Mastery score"
        >
          <div className="wf-bar-fill wf-bar-fill--green" style={{ width: `${mastery ?? 0}%` }} />
        </div>
        <p className="wf-tiny" role="status">
          {mastery == null ? 'Mastery score · not available yet' : `Mastery score ${mastery} · updates live`}
        </p>
      </div>

      <button type="button" className="wf-btn wf-btn--light wf-btn--block" onClick={onOpenReport}>
        View full progress report
      </button>
    </aside>
  )
}
