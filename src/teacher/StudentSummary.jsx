import { useState } from 'react'
import { STANDARDS, RATINGS, skillStates, overallScore, letterFor } from './teacherData.js'

// Colour HTML tags in a code line (text stays plain text, so it is escaped).
function CodeLine({ text }) {
  const parts = text.split(/(<\/?[a-zA-Z][^>]*>)/g)
  return parts.map((p, i) => (/^<\/?[a-zA-Z]/.test(p) ? <span key={i} className="tv-tag">{p}</span> : p))
}

// Left detail column: skills mastered, code written, CS standards assessment.
export default function StudentSummary({ student, onOverrideGrade }) {
  const skills = skillStates(student.level)
  const masteredCount = skills.filter((s) => s.state === 'mastered').length
  const pct = Math.round((masteredCount / skills.length) * 100)

  const autoScore = overallScore(student.ratings)
  const score = student.gradeOverride ?? autoScore
  const overridden = student.gradeOverride != null

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(null)

  function startEdit() { setDraft(String(score)); setError(null); setEditing(true) }
  function apply() {
    const n = Number(draft)
    if (draft.trim() === '' || !Number.isInteger(n) || n < 0 || n > 100) {
      setError('Enter a whole number from 0 to 100.')
      return
    }
    onOverrideGrade(n === autoScore ? null : n)
    setEditing(false)
  }

  return (
    <div className="tv-summary">
      <section aria-labelledby="tv-skills-h">
        <h3 id="tv-skills-h" className="tv-h3">Skills mastered</h3>
        <div className="tv-panel">
          <ul className="tv-chips">
            {skills.map((s) => (
              <li key={s.name} className={`tv-chip tv-chip--${s.state}`}>
                {s.name}{' '}
                {s.state === 'mastered' ? '✓' : s.state === 'progress' ? '· in progress' : '· locked'}
              </li>
            ))}
          </ul>
          <p className="tv-meta">
            {masteredCount} of {skills.length} skills mastered · {student.hintsUsed} hint{student.hintsUsed === 1 ? '' : 's'} used this level · {student.minutes} min on task
          </p>
          <div className="tv-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Skill graph progress">
            <div className="tv-bar-fill tv-bar-fill--blue" style={{ width: `${pct}%` }} />
          </div>
          <p className="tv-tiny">Skill graph progress (feeds the tutor agent)</p>
        </div>
      </section>

      <section aria-labelledby="tv-code-h">
        <div className="tv-h3-row">
          <h3 id="tv-code-h" className="tv-h3">Code written</h3>
          <button type="button" className="tv-link" title="Opens the student's sandbox (demo)">View full project · open sandbox ↗</button>
        </div>
        <div className="tv-code" role="region" aria-label={`${student.name}'s code`}>
          {student.code.lines.map((l, i) => (
            <div key={i} className={`tv-codeline ${l.flag ? 'is-flagged' : ''}`}>
              <span className="tv-ln" aria-hidden="true">{i + 1}</span>
              <span className="tv-ct"><CodeLine text={l.text} /></span>
              {l.flag && <span className="tv-flag">{l.flag}</span>}
            </div>
          ))}
          <div className={`tv-run ${student.code.run.ok ? 'is-ok' : 'is-bad'}`} role="status">
            <p className="tv-run-title">● run output</p>
            {student.code.run.lines.map((l, i) => <p key={i} className={i === 0 ? 'tv-run-main' : 'tv-run-note'}>{l}</p>)}
          </div>
        </div>
      </section>

      <section aria-labelledby="tv-std-h">
        <h3 id="tv-std-h" className="tv-h3">CS standards assessment</h3>
        <p className="tv-muted">Graded against CS teacher standards · fed to the tutor agent to tune help</p>
        <div className="tv-panel">
          <ul className="tv-standards">
            {STANDARDS.map((st, i) => {
              const r = student.ratings[i]
              return (
                <li key={st.code}>
                  <span>{st.code} · {st.label}</span>
                  <span className={`tv-rate tv-rate--${r}`}>{RATINGS[r].label}</span>
                </li>
              )
            })}
          </ul>
          <hr className="tv-rule" />
          <div className="tv-grade-row">
            <strong>Overall grade</strong>
            <strong className="tv-grade" role="status">
              {letterFor(score)} · {score}%{overridden && <em className="tv-overridden"> overridden</em>}
            </strong>
          </div>
          {overridden && <p className="tv-tiny">Auto grade was {letterFor(autoScore)} · {autoScore}%</p>}
          <p className="tv-tiny">Teacher can override before it feeds the agent</p>

          {!editing ? (
            <button type="button" className="tv-btn tv-btn--light tv-btn--xs" onClick={startEdit}>Adjust grade</button>
          ) : (
            <div className="tv-adjust">
              <label className="tv-sr" htmlFor="tv-grade-input">Overall grade percent</label>
              <input
                id="tv-grade-input"
                className="tv-num"
                type="number"
                min="0"
                max="100"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-invalid={error ? 'true' : undefined}
              />
              <span className="tv-muted">%</span>
              <button type="button" className="tv-btn tv-btn--blue tv-btn--xs" onClick={apply}>Apply</button>
              <button type="button" className="tv-btn tv-btn--light tv-btn--xs" onClick={() => setEditing(false)}>Cancel</button>
              {overridden && (
                <button type="button" className="tv-btn tv-btn--ghost tv-btn--xs" onClick={() => { onOverrideGrade(null); setEditing(false) }}>
                  Reset to auto
                </button>
              )}
              {error && <p className="tv-error" role="alert">{error}</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
