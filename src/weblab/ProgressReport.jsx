import { useEffect, useMemo, useRef } from 'react'
import { getObjective } from './courseData.js'
import { describeRoute } from './engine.js'
import './progressReport.css'

// Full progress report: a performance picture, not just a checklist. It reads the
// per-step log the lesson records (tier, score, hints, attempts, time, route
// reason) and summarizes how the student is doing per objective, what the
// adaptive engine did and why, and what to do next. All mocked (no backend).


function fmtTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0))
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`
}

// Roll the step log up per objective: best score, attempts, hints, whether the
// student needed support or earned a stretch, and a simple performance band.
function summarize(lesson, stepLog, completed) {
  return lesson.objectives.map((o) => {
    const steps = stepLog.filter((e) => e.objectiveId === o.id)
    const best = steps.reduce((m, e) => Math.max(m, e.score), 0)
    const attempts = steps.reduce((n, e) => n + e.attempts, 0)
    const hints = steps.reduce((n, e) => n + e.hints, 0)
    const seconds = steps.reduce((n, e) => n + e.seconds, 0)
    const neededSupport = steps.some((e) => e.tier === 'support')
    const earnedStretch = steps.some((e) => e.tier === 'stretch')
    const done = !!completed[o.id]

    // Performance band drives the strengths / needs-support grouping and copy.
    let band = 'not-started'
    if (steps.length > 0) {
      if (done && !neededSupport && hints === 0 && attempts <= steps.length) band = 'strong'
      else if (done) band = 'steady'
      else band = 'working'
    }
    return { objective: o, steps, best, attempts, hints, seconds, neededSupport, earnedStretch, done, band }
  })
}

const BAND = {
  strong: { label: 'Strong', cls: 'strong', note: 'First-try pass with no hints.' },
  steady: { label: 'Steady', cls: 'steady', note: 'Got there, used some help along the way.' },
  working: { label: 'In progress', cls: 'working', note: 'Still working through this skill.' },
  'not-started': { label: 'Not started', cls: 'todo', note: 'Not reached yet.' },
}

export default function ProgressReport({
  open, onClose, lesson, completed, mastery, bestMastery, hintsUsed, timeLabel, levelsVisited, stepLog = [],
}) {
  const closeRef = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const prev = document.activeElement
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [open, onClose])

  const rows = useMemo(() => summarize(lesson, stepLog, completed), [lesson, stepLog, completed])

  if (!open) return null

  const done = Object.keys(completed).length
  const strengths = rows.filter((r) => r.band === 'strong' || r.earnedStretch)
  const needs = rows.filter((r) => r.neededSupport || r.band === 'working')
  const totalHints = stepLog.reduce((n, e) => n + e.hints, 0) || hintsUsed
  const totalAttempts = stepLog.reduce((n, e) => n + e.attempts, 0)
  const overall = Math.max(bestMastery ?? 0, mastery ?? 0)

  // A plain-language recommendation from the overall picture.
  let recommendation
  if (done === 0) recommendation = 'Make a first attempt on any step — the lesson adapts to how it goes.'
  else if (needs.length === 0 && strengths.length > 0) recommendation = 'Great run. Try a stretch challenge or start a new project to keep the momentum.'
  else if (needs.length > 0) recommendation = `Spend a little more time on ${needs.map((r) => r.objective.title).slice(0, 2).join(' and ')}. The tutor can walk you through it step by step.`
  else recommendation = 'Solid progress — keep going to finish the remaining objectives.'

  const adaptiveSteps = stepLog.filter((e) => e.routeReason === 'support' || e.routeReason === 'stretch')

  return (
    <div className="pr-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pr" role="dialog" aria-modal="true" aria-labelledby="pr-title">
        <header className="pr-head">
          <div>
            <p className="pr-eyebrow">Progress report</p>
            <h2 id="pr-title" className="pr-title">{lesson.title}</h2>
          </div>
          <button type="button" className="pr-close" ref={closeRef} onClick={onClose} aria-label="Close report">✕</button>
        </header>

        {/* Headline band */}
        <section className="pr-headline">
          <div className="pr-ring" role="img" aria-label={`Overall mastery ${overall} percent`}>
            <svg viewBox="0 0 120 120" width="108" height="108">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="12" />
              <circle
                cx="60" cy="60" r="50" fill="none" stroke="url(#pr-grad)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${(Math.PI * 100 * overall) / 100} ${Math.PI * 100}`}
                transform="rotate(-90 60 60)"
              />
              <defs>
                <linearGradient id="pr-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#22c55e" /><stop offset="1" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              <text x="60" y="58" textAnchor="middle" className="pr-ring-num">{overall}</text>
              <text x="60" y="76" textAnchor="middle" className="pr-ring-cap">mastery</text>
            </svg>
          </div>
          <ul className="pr-kpis">
            <li><strong>{done}/{lesson.objectives.length}</strong><span>objectives mastered</span></li>
            <li><strong>{totalAttempts || '—'}</strong><span>attempts</span></li>
            <li><strong>{totalHints}</strong><span>hints used</span></li>
            <li><strong>{timeLabel}</strong><span>time on task</span></li>
          </ul>
        </section>

        {/* Per-objective performance */}
        <h3 className="pr-h3">How you're doing, skill by skill</h3>
        <ul className="pr-objlist">
          {rows.map((r) => {
            const b = BAND[r.band]
            return (
              <li key={r.objective.id} className="pr-obj">
                <div className="pr-obj-top">
                  <span className="pr-obj-title">{r.objective.title}</span>
                  <span className={`pr-pill pr-pill--${b.cls}`}>{b.label}</span>
                </div>
                <div className="pr-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.best} aria-label={`${r.objective.title} mastery`}>
                  <div className={`pr-meter-fill pr-meter-fill--${b.cls}`} style={{ width: `${r.best}%` }} />
                </div>
                <div className="pr-obj-meta">
                  <span>{b.note}</span>
                  <span className="pr-obj-tags">
                    {r.neededSupport && <em className="pr-tag pr-tag--support">extra support</em>}
                    {r.earnedStretch && <em className="pr-tag pr-tag--stretch">stretch earned</em>}
                    {r.hints > 0 && <span>{r.hints} hint{r.hints === 1 ? '' : 's'}</span>}
                    {r.attempts > 0 && <span>{r.attempts} attempt{r.attempts === 1 ? '' : 's'}</span>}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>

        {/* Strengths vs needs */}
        <div className="pr-cols">
          <section className="pr-col pr-col--good">
            <h3 className="pr-h3">Strengths</h3>
            {strengths.length === 0
              ? <p className="pr-empty">Keep going — your strengths will show up here.</p>
              : <ul className="pr-chips">{strengths.map((r) => <li key={r.objective.id}>{r.objective.title}</li>)}</ul>}
          </section>
          <section className="pr-col pr-col--needs">
            <h3 className="pr-h3">Where to focus</h3>
            {needs.length === 0
              ? <p className="pr-empty">Nothing flagged — nice and steady.</p>
              : <ul className="pr-chips">{needs.map((r) => <li key={r.objective.id}>{r.objective.title}</li>)}</ul>}
          </section>
        </div>

        {/* The adaptive path */}
        <h3 className="pr-h3">How the lesson adapted to you</h3>
        {adaptiveSteps.length === 0 ? (
          <p className="pr-empty">You're moving at the standard pace — no easier or tougher detours yet.</p>
        ) : (
          <ol className="pr-path">
            {adaptiveSteps.map((e) => (
              <li key={e.id} className={`pr-path-step pr-path-step--${e.routeReason}`}>
                <span className="pr-path-dot" aria-hidden="true" />
                <span className="pr-path-text">
                  <strong>{getObjective(e.objectiveId)?.title || e.title}:</strong> {describeRoute(e.routeReason)}
                </span>
              </li>
            ))}
          </ol>
        )}

        {/* Recommendation */}
        <section className="pr-reco" role="note">
          <span className="pr-reco-icon" aria-hidden="true">💡</span>
          <p>{recommendation}</p>
        </section>

        <p className="pr-foot">{levelsVisited} step{levelsVisited === 1 ? '' : 's'} visited · {fmtTime(stepLog.reduce((n, e) => n + e.seconds, 0))} across graded steps</p>
      </div>
    </div>
  )
}
