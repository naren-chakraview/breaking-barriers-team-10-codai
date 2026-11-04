import { useEffect } from 'react'

// Full progress report opened from "View full progress report" in the left
// column. A simple modal: per-objective status plus the outcome totals.
export default function ProgressReport({
  open, onClose, lesson, completed, mastery, hintsUsed, timeLabel, levelsVisited,
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const done = Object.keys(completed).length

  return (
    <div className="wf-modal-back" onClick={onClose}>
      <div
        className="wf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wf-report-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wf-card-head">
          <h2 id="wf-report-title" className="wf-card-title">Progress report</h2>
          <button type="button" className="wf-btn wf-btn--light wf-btn--xs" onClick={onClose} autoFocus>Close</button>
        </div>
        <p className="wf-muted">{lesson.title}</p>

        <div className="wf-report-stats">
          <div><strong>{done}/{lesson.objectives.length}</strong><span>objectives</span></div>
          <div><strong>{mastery ?? '—'}</strong><span>mastery</span></div>
          <div><strong>{hintsUsed}</strong><span>hints used</span></div>
          <div><strong>{timeLabel}</strong><span>time on task</span></div>
        </div>

        <h3 className="wf-h3">Objectives</h3>
        <ul className="wf-report-list">
          {lesson.objectives.map((o) => (
            <li key={o.id}>
              <span>{o.title}</span>
              <span className={completed[o.id] ? 'wf-status wf-status--done' : 'wf-status'}>
                {completed[o.id] ? 'Mastered' : 'Not yet'}
              </span>
            </li>
          ))}
        </ul>
        <p className="wf-tiny">{levelsVisited} step{levelsVisited === 1 ? '' : 's'} visited in this lesson.</p>
      </div>
    </div>
  )
}
