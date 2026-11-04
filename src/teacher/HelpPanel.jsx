import { HELP_STEPS, formatClock } from './teacherData.js'

const PLACEHOLDER = [
  'Shown when the student runs their code and it is wrong.',
  'Points the student to the live preview to see what happened.',
  'A second, more specific nudge toward the fix.',
]

// Build the card content for one rung of the help ladder.
function describe(i, student) {
  const { stage, messages, remaining, reason } = student.help
  const n = i + 1
  const done = stage > 0 && n < stage
  const current = stage > 0 && n === stage
  const state = done ? 'done' : current ? 'current' : 'upcoming'
  let title = HELP_STEPS[i].title
  let body

  if (i <= 2) {
    body = messages[i] ? `“${messages[i]}”` : PLACEHOLDER[i]
  } else if (i === 3) {
    const revealed = stage >= 4
    title = revealed ? 'Answer revealed' : stage === 3 ? `Timed reveal (in ${formatClock(remaining)})` : 'Timed reveal (after timeout)'
    body = revealed
      ? (reason === 'teacher'
          ? 'Revealed early by you. The agent is walking through the solution step by step.'
          : 'Timeout reached. The agent is walking through the solution step by step.')
      : 'After the timeout, the agent shows the answer and walks through the solution step by step.'
  } else {
    body = 'A fresh exercise reusing what was just learned.'
  }
  if (current) title += ' (current)'
  return { n, state, title, body }
}

// Right detail column: where the agent is on the help ladder, plus the
// teacher's controls (reveal now, custom hint, timeout, "See the answer").
export default function HelpPanel({ student, onRevealNow, onSendHint, onTimeout, onToggleSeeAnswer }) {
  const h = student.help
  const revealed = h.stage >= 4

  return (
    <div className="tv-helpcol">
      <h3 className="tv-h3">Scaffolded help timeline</h3>
      <p className="tv-muted">How the agent is helping {student.name.split(' ')[0]} build the project</p>
      {h.stage === 0 && <p className="tv-note" role="status">No scaffolded help has been needed yet.</p>}

      <ol className="tv-timeline">
        {HELP_STEPS.map((step, i) => {
          const d = describe(i, student)
          return (
            <li key={step.key} className={`tv-step tv-step--${d.state} ${i === 3 ? 'tv-step--reveal' : ''}`} aria-current={d.state === 'current' ? 'step' : undefined}>
              <span className="tv-dot" aria-hidden="true">{d.state === 'upcoming' ? '' : d.n}</span>
              <div className="tv-stepcard">
                <p className="tv-stepcard-title">{d.title}<span className="tv-sr"> — {d.state === 'done' ? 'completed' : d.state === 'current' ? 'in progress' : 'upcoming'}</span></p>
                <p className="tv-stepcard-body">{d.body}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <h3 className="tv-h3 tv-h3--controls">Teacher controls</h3>
      <div className="tv-controls">
        <button type="button" className="tv-btn tv-btn--blue tv-btn--lg" onClick={onRevealNow} disabled={revealed}>
          {revealed ? 'Answer already revealed' : 'Reveal answer now'}
        </button>
        <button type="button" className="tv-btn tv-btn--light tv-btn--lg" onClick={onSendHint}>Send a custom hint</button>
      </div>

      <div className="tv-setting">
        <div className="tv-setting-row">
          <label htmlFor="tv-timeout">Answer timeout</label>
          <input
            id="tv-timeout"
            className="tv-range"
            type="range"
            min="1"
            max="15"
            step="1"
            value={h.timeoutMin}
            disabled={revealed}
            aria-valuetext={`${h.timeoutMin} minutes`}
            onChange={(e) => onTimeout(Number(e.target.value))}
          />
          <output htmlFor="tv-timeout">{h.timeoutMin} min</output>
        </div>
        <p className="tv-tiny">
          When to auto-reveal the worked solution{h.stage === 3 ? ' · changing it restarts the countdown' : ''}
        </p>
      </div>

      <div className="tv-setting">
        <div className="tv-setting-row">
          <span id="tv-see-label">“See the answer” button for student</span>
          <button
            type="button"
            role="switch"
            aria-checked={h.seeAnswer}
            aria-labelledby="tv-see-label"
            className={`tv-switch ${h.seeAnswer ? 'is-on' : ''}`}
            onClick={onToggleSeeAnswer}
          >
            {h.seeAnswer ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        <p className="tv-tiny">
          {h.seeAnswer ? 'Student may opt to see the answer before timeout' : 'Student sees the answer only when the timeout is reached'}
        </p>
      </div>

      {h.sentHints.length > 0 && (
        <div className="tv-sent">
          <h4 className="tv-h4">Hints you wrote</h4>
          <ul>{h.sentHints.map((t, i) => <li key={i}>“{t}”</li>)}</ul>
        </div>
      )}
    </div>
  )
}
