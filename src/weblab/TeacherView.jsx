import { useEffect, useState } from 'react'
import './teacherView.css'
import './demo.css'
import { BrandMark } from '../Brand.jsx'
import { personas } from '../../shared/contracts/fixtures/index.js'
import { createServices } from '../services/provider.js'
import { readDemoResult } from './demoResultsStore.js'

// Build the seam-1 services object from the active mode (VITE_SERVICE_MODE).
// Uses the team's provider (src/services/provider.js); mock mode returns the
// contract stub, http mode the real fetch client.
const services = createServices()

// Teacher's view of a lesson, built from teacher-view-design.md and
// teacher-view.svg. Whole class on the left, one student's detail on the right,
// opened by double-clicking a name in the roster. Same design system as the
// student screens: it keeps the shared `wf` tokens/classes from index.css, so
// the page root must carry the `wf` class.
//
// Layout: top bar > left roster > right student detail (summary column:
// skills / code / CS standards; help column: scaffolded timeline + controls).
//
// Data here is demo-only synthetic class data. The constraints (C-33) scope the
// real teacher MVP to roster + flags + hold/assign; CS-standards grading and the
// help-ladder config are placeholders in the product. This screen renders the
// full wireframe for the demo, with those pieces clearly marked as demo data.

const STATUS = {
  'on track': { dot: 'var(--wf-green)', ink: '#15803d', label: 'on track' },
  ahead: { dot: 'var(--wf-green)', ink: '#15803d', label: 'ahead' },
  stuck: { dot: '#f5b942', ink: '#8a6d1f', label: 'stuck' },
  behind: { dot: '#ef4444', ink: '#b91c1c', label: 'behind' },
}

// The Passive agent's signal, shown to the teacher as an observation (not a verdict).
const SIGNAL_INFO = {
  speed_up: { label: 'Speed up', tone: 'good', hint: 'Breezing through — ready for a deeper challenge.' },
  slow_down: { label: 'Slow down', tone: 'low', hint: 'Repeated misses on the same skill — needs more scaffolding.' },
  redirect: { label: 'Redirect', tone: 'mid', hint: 'Over-focused on cosmetic detail — nudge back to the goal.' },
  reengage: { label: 'Re-engage', tone: 'mid', hint: 'Low-effort submits with long gaps — gently re-engage.' },
  steady: { label: 'Steady', tone: 'good', hint: 'On a healthy pace.' },
}

// Build a detail object (the shape StudentDetail renders) from a persona fixture
// in shared/contracts/fixtures. This surfaces the real synthetic persona data —
// attempts, evidence levels, hints, the Passive signal and any remediation flag —
// instead of hand-authored demo data, so the teacher view reflects the same
// fixtures the backend and tests use.
function detailFromPersona(personaKey) {
  const p = personas[personaKey]
  if (!p) return null

  const scored = p.attempts.filter((a) => typeof a.evidenceLevel === 'number')
  const projectAttempts = p.attempts.filter((a) => a.stepId.endsWith('-project'))
  const bestLevel = scored.reduce((m, a) => Math.max(m, a.evidenceLevel), 0)
  const minsOnTask = attemptSpanMinutes(p.attempts)

  // Skills: derive from the project step's "build" skill evidence (target is 2).
  const buildTarget = 2
  const mastered = []
  const inProgress = []
  const locked = []
  if (bestLevel >= buildTarget) mastered.push('Prompting (build)')
  else inProgress.push('Prompting (build)')
  // Diagnostic (intro) questions answered gives a read on web-dev basics.
  const introScored = scored.filter((a) => a.stepId.startsWith('intro'))
  const introAvg = introScored.length
    ? introScored.reduce((s, a) => s + a.evidenceLevel, 0) / introScored.length
    : 0
  if (introAvg >= 1.5) mastered.push('Web-dev basics')
  else if (introAvg >= 0.5) inProgress.push('Web-dev basics')
  else locked.push('Web-dev basics')
  locked.push('Debugging')

  // The student's latest prompt becomes the "code written" content (the lesson is
  // about prompts and decisions, C-7), with the run note reflecting the signal.
  const latest = p.attempts[p.attempts.length - 1]
  const sig = p.expected?.signal

  // Timeline: real hints first, then the current Passive action, then what's next.
  const timeline = []
  p.hints.forEach((h, i) => {
    timeline.push({
      n: i + 1,
      state: 'done',
      title: `Hint: ${h.style.replace(/_/g, ' ')}`,
      body: h.angle ? `Angle tried: ${h.angle}.` : 'Scaffolded hint delivered.',
    })
  })
  timeline.push({
    n: timeline.length + 1,
    state: 'current',
    title: `Passive signal: ${SIGNAL_INFO[sig]?.label ?? sig} (current)`,
    body: SIGNAL_INFO[sig]?.hint ?? 'The Passive agent is adjusting the help for this student.',
  })
  if (p.expected?.remediationFlag) {
    timeline.push({
      n: timeline.length + 1,
      state: 'timed',
      title: `Remediation flag · ${p.expected.remediationFlag.severity} severity`,
      body: `Skill "${p.expected.remediationFlag.skillId}" repeatedly below target — flagged for teacher attention.`,
    })
  }
  timeline.push({
    n: timeline.length + 1,
    state: 'upcoming',
    title: `Next checkpoint: ${p.expected?.nextAfterIntro ?? 'route'}`,
    body: 'Chosen by the routing rule once the current checkpoint resolves.',
  })

  return {
    fromPersona: personaKey,
    signal: sig,
    module: 'Module 1 "Hour of AI 2026 — Adaptive Weblab"',
    skills: {
      mastered,
      inProgress,
      locked,
      summary: `${mastered.length} of ${mastered.length + inProgress.length + locked.length} skills mastered · ${p.hints.length} hint${p.hints.length === 1 ? '' : 's'} used · ${p.attempts.length} attempts · ~${minsOnTask} min on task`,
      pct: Math.round((bestLevel / buildTarget) * 100),
    },
    code: {
      lines: promptAsLines(latest?.inputText ?? ''),
      output: sig === 'slow_down'
        ? `build evidence stuck at ${bestLevel} of ${buildTarget} after ${projectAttempts.length} project prompts`
        : sig === 'redirect'
          ? 'target met, but recent prompts only change colors/fonts — evidence flat'
          : sig === 'reengage'
            ? 'low-effort submits with long gaps between them'
            : `build evidence at ${bestLevel} of ${buildTarget}`,
      note: `latest prompt · confidence ${latest?.confidence ?? '—'} · Passive signal: ${SIGNAL_INFO[sig]?.label ?? sig}`,
    },
    standards: standardsFromLevel(bestLevel, buildTarget),
    grade: gradeFromLevel(bestLevel, buildTarget),
    timeline,
  }
}

// Minutes between the first and last attempt timestamp.
function attemptSpanMinutes(attempts) {
  const times = attempts.map((a) => Date.parse(a.createdAt)).filter((n) => !Number.isNaN(n))
  if (times.length < 2) return 1
  return Math.max(1, Math.round((Math.max(...times) - Math.min(...times)) / 60000))
}

// Render the student's prompt text as "code" lines (the lesson judges prompts, C-7).
function promptAsLines(text) {
  const wrapped = String(text).match(/.{1,52}(\s|$)/g) || [String(text)]
  return [
    { t: '# Student prompt (what they asked the AI to build)', c: 'tag' },
    ...wrapped.map((t) => ({ t: t.trim(), c: '' })),
  ]
}

// Map build-evidence level to the CS-standards block (demo mapping).
function standardsFromLevel(level, target) {
  const met = level >= target
  const partial = level >= 1
  const rate = (good, mid, low) => (met ? good : partial ? mid : low)
  return [
    { code: 'CSTA 1B-AP-10', desc: 'Create programs w/ sequence', rating: rate('Proficient', 'Developing', 'Needs support') },
    { code: 'CSTA 1B-AP-11', desc: 'Decompose into sub-problems', rating: rate('Proficient', 'Developing', 'Needs support') },
    { code: 'CSTA 1B-AP-15', desc: 'Test & debug', rating: rate('Developing', 'Developing', 'Needs support') },
    { code: 'CSTA 1B-AP-17', desc: 'Describe & fix errors', rating: rate('Developing', 'Needs support', 'Needs support') },
  ]
}

function gradeFromLevel(level, target) {
  if (level >= target) return 'B · 83%'
  if (level >= 1) return 'C · 71%'
  return 'D · 58%'
}

// Map a Passive signal to the roster status pill.
const SIGNAL_STATUS = {
  speed_up: 'ahead',
  steady: 'on track',
  redirect: 'stuck',
  reengage: 'behind',
  slow_down: 'behind',
}

// Map a roster student's id back to its persona fixture key, so the detail panel
// can be enriched from the same synthetic data (attempts, hints, prompts). The
// roster service carries mastery/flags/passive/routing; the persona carries the
// per-attempt detail the panel renders.
const STUDENT_PERSONA = {
  'stu-quick': 'quick',
  'stu-slow': 'slow',
  'stu-detail': 'distracted-detail',
  'stu-away': 'distracted-inattentive',
}

const INITIALS = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

// Turn one student from the getTeacherRoster() response into the shape the
// roster rows and the detail panel render. Roster-level fields come from the
// service; the detail panel is enriched from the matching persona fixture.
function rosterStudentToView(s) {
  const personaKey = STUDENT_PERSONA[s.studentId]
  const detail = personaKey ? detailFromPersona(personaKey) : null
  const buildSkill = (s.mastery || []).find((m) => m.skillId === 'build')
  const signal = s.passive?.signal

  // Prefer the service's values over the persona-derived ones where they overlap.
  if (detail) {
    detail.signal = signal ?? detail.signal
    if (s.passive?.reason) {
      const cur = detail.timeline.find((t) => t.state === 'current')
      if (cur) cur.body = s.passive.reason
    }
  }

  // Live demo run (if any) overrides the persona-derived mastery/status so the
  // teacher page reflects exactly what the autopilot just produced for this
  // student. Persona fixtures remain the fallback when no demo has run.
  const demo = readDemoResult(s.studentId)

  if (detail && demo) {
    const total = demo.totalObjectives || (detail.skills.mastered.length + detail.skills.inProgress.length + detail.skills.locked.length)
    detail.skills.pct = demo.mastery ?? detail.skills.pct
    detail.skills.summary = `${demo.completedCount ?? 0} of ${total} objectives complete · ${demo.hintsUsed ?? 0} hint${(demo.hintsUsed ?? 0) === 1 ? '' : 's'} used · ${demo.attempts ?? 0} attempts · starting tier: ${demo.tier ?? '—'}`
    detail.live = {
      tier: demo.tier,
      mastery: demo.mastery,
      hintsUsed: demo.hintsUsed,
      attempts: demo.attempts,
      completedCount: demo.completedCount,
      totalObjectives: total,
      finished: demo.finished,
    }
  }

  return {
    id: s.studentId,
    name: s.displayName,
    initials: INITIALS(s.displayName),
    levelLabel: demo
      ? `${demo.finished ? 'Completed' : 'In progress'} · tier ${demo.tier ?? '—'} · prompting`
      : `Checkpoint: ${s.currentCheckpointId ?? '—'} · prompting`,
    mastery: demo?.mastery ?? buildSkill?.display ?? detail?.skills.pct ?? 0,
    status: demo?.status ?? SIGNAL_STATUS[signal] ?? 'on track',
    isLiveDemo: !!demo,
    // Real roster-level fields from getTeacherRoster (not persona fixtures):
    currentCheckpointId: s.currentCheckpointId ?? null,
    flags: s.flags ?? [],
    lastRouting: s.lastRouting ?? null,
    teacherInput: s.teacherInput ?? { mode: 'auto' },
    fromPersona: personaKey ?? null,
    detail,
  }
}

// Checkpoint ids the teacher can assign (from database/sample-skilltree.json, C-5).
// Used to populate the "assign" dropdown. The backend validates availability and
// returns the applied checkpoint + reason, so this list is just the menu.
const ASSIGNABLE_CHECKPOINTS = [
  'intro',
  'steer-it',
  'use-the-lingo',
  'keep-or-redirect',
  'give-context',
  'check-the-fix',
  'a-list-and-a-random-pick',
  'a-number-and-a-rule',
]

const SEVERITY_CLASS = {
  high: 'tv-flag--high',
  medium: 'tv-flag--mid',
  low: 'tv-flag--low',
}

const RATING_CLASS = {
  Proficient: 'tv-rating--good',
  Developing: 'tv-rating--mid',
  'Needs support': 'tv-rating--low',
}

function StatusPill({ status }) {
  const s = STATUS[status] || STATUS['on track']
  return (
    <span className="tv-status">
      <span className="tv-status-dot" style={{ background: s.dot }} />
      <span className="tv-status-label" style={{ color: s.ink }}>{s.label}</span>
    </span>
  )
}

function RosterRow({ student, selected, onOpen }) {
  const s = STATUS[student.status] || STATUS['on track']
  return (
    <li>
      <button
        type="button"
        className={`tv-row ${selected ? 'is-selected' : ''}`}
        onDoubleClick={() => onOpen(student.id)}
        onClick={() => onOpen(student.id)}
        aria-pressed={selected}
        title="Double-click to open student detail"
      >
        <span className="tv-row-avatar" style={selected ? { background: 'var(--wf-blue)' } : undefined}>
          {student.initials}
        </span>
        <span className="tv-row-main">
          <span className="tv-row-name">
            {student.name}
            {student.isLiveDemo && <span className="tv-demo-live" title="Live data from the automated demo run">live</span>}
          </span>
          <span className="tv-row-sub">{student.levelLabel}</span>
        </span>
        <span className="tv-row-mastery">
          <span className="wf-bar">
            <span
              className="wf-bar-fill"
              style={{ width: `${student.mastery}%`, background: s.dot }}
            />
          </span>
        </span>
        <StatusPill status={student.status} />
      </button>
    </li>
  )
}

function SkillChip({ label, kind }) {
  return <span className={`tv-chip tv-chip--${kind}`}>{label}{kind === 'mastered' ? ' ✓' : kind === 'progress' ? ' · in progress' : ' · locked'}</span>
}

// "Why this checkpoint" — the routing reason. Prefers the decision returned by the
// most recent setTeacherInput call for this student; otherwise the roster's
// lastRouting (both come from the backend's routing_decision rows, C-19.5).
function RoutingReason({ routing, student }) {
  const decision = routing?.result?.decision ?? student.lastRouting ?? null
  if (!decision) {
    return (
      <section className="tv-block">
        <h3 className="wf-card-title">Why this checkpoint</h3>
        <div className="wf-card tv-routing-reason">
          <p className="wf-muted">No routing decision recorded yet for {student.name.split(' ')[0]}.</p>
        </div>
      </section>
    )
  }
  return (
    <section className="tv-block">
      <h3 className="wf-card-title">Why this checkpoint</h3>
      <div className="wf-card tv-routing-reason">
        <div className="tv-routing-head">
          <span className="tv-routing-applied">{decision.appliedCheckpointId}</span>
          {decision.proposedCheckpointId && decision.proposedCheckpointId !== decision.appliedCheckpointId && (
            <span className="wf-tiny">proposed: {decision.proposedCheckpointId}</span>
          )}
        </div>
        <p className="tv-routing-text">{decision.reason}</p>
        {decision.teacherInput?.mode && (
          <p className="wf-tiny">Teacher input: {decision.teacherInput.mode}
            {decision.teacherInput.checkpointId ? ` → ${decision.teacherInput.checkpointId}` : ''}</p>
        )}
      </div>
    </section>
  )
}

// Open remediation flags for the student, straight from the roster response.
function FlagsBlock({ flags }) {
  if (!flags || flags.length === 0) return null
  return (
    <section className="tv-block">
      <h3 className="wf-card-title">Remediation flags</h3>
      <div className="wf-card tv-flags">
        {flags.map((f, i) => (
          <div key={`${f.skillId}-${i}`} className={`tv-flag ${SEVERITY_CLASS[f.severity] ?? 'tv-flag--mid'}`}>
            <div className="tv-flag-head">
              <strong>{f.skillId}</strong>
              <span className="tv-flag-sev">{f.severity}</span>
            </div>
            <p className="tv-flag-reason">{f.reason}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// The one real teacher write path: hold / assign / auto, sent through
// services.setTeacherInput (P-8.2, C-19.4). The parent owns the async call and
// passes back `routing` { pending, error, result } so we can show status + the
// applied decision.
function RoutingControls({ student, activeMode, assignTarget, setAssignTarget, onRouting, routing }) {
  const pending = routing?.pending
  const error = routing?.error
  const applied = routing?.result?.decision

  return (
    <section className="tv-block">
      <h3 className="wf-card-title">Routing control</h3>
      <p className="wf-tiny">
        Hold keeps {student.name.split(' ')[0]} put; Assign sends them to a checkpoint; Auto follows the routing rule (P-8.2).
      </p>
      <div className="wf-card tv-routing">
        <div className="tv-routing-modes" role="group" aria-label="Routing mode">
          <button
            type="button"
            className={`wf-btn ${activeMode === 'auto' ? 'wf-btn--blue' : 'wf-btn--light'}`}
            aria-pressed={activeMode === 'auto'}
            disabled={pending}
            onClick={() => onRouting(student.id, { mode: 'auto' })}
          >
            Auto
          </button>
          <button
            type="button"
            className={`wf-btn ${activeMode === 'hold' ? 'wf-btn--blue' : 'wf-btn--light'}`}
            aria-pressed={activeMode === 'hold'}
            disabled={pending}
            onClick={() => onRouting(student.id, { mode: 'hold' })}
          >
            Hold
          </button>
        </div>

        <div className="tv-routing-assign">
          <label className="tv-control-label" htmlFor={`assign-${student.id}`}>Assign checkpoint</label>
          <div className="tv-control-row">
            <select
              id={`assign-${student.id}`}
              className="tv-select"
              value={assignTarget}
              disabled={pending}
              onChange={(e) => setAssignTarget(e.target.value)}
            >
              {ASSIGNABLE_CHECKPOINTS.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            <button
              type="button"
              className={`wf-btn ${activeMode === 'assign' ? 'wf-btn--blue' : 'wf-btn--light'}`}
              aria-pressed={activeMode === 'assign'}
              disabled={pending}
              onClick={() => onRouting(student.id, { mode: 'assign', checkpointId: assignTarget })}
            >
              Assign
            </button>
          </div>
        </div>

        <div className="tv-routing-status" aria-live="polite">
          {pending && <span className="wf-tiny">Applying…</span>}
          {error && <span className="wf-tiny tv-routing-err" role="alert">{error}</span>}
          {!pending && !error && applied && (
            <span className="wf-tiny">
              Applied: <strong>{applied.appliedCheckpointId}</strong> — {applied.reason}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

function StudentDetail({ student, onRouting, routing }) {
  const d = student.detail
  const [timeout_, setTimeoutMin] = useState(5)
  const [seeAnswer, setSeeAnswer] = useState(true)
  // The checkpoint chosen in the assign dropdown (local until "Assign" is clicked).
  const [assignTarget, setAssignTarget] = useState(
    student.teacherInput?.checkpointId ?? ASSIGNABLE_CHECKPOINTS[0],
  )

  // The live teacher input: the pending result of the last setTeacherInput call for
  // this student (from the parent), falling back to what the roster reported.
  const activeMode = routing?.result?.decision?.teacherInput?.mode ?? student.teacherInput?.mode ?? 'auto'

  if (!d) {
    // Students without a matching persona fixture still get the real roster-driven
    // routing controls, flags and routing reason below; only the demo detail panel
    // (skills/code/standards/timeline) is unavailable.
    return (
      <div className="tv-detail">
        <header className="tv-detail-head">
          <span className="tv-detail-avatar">{student.initials}</span>
          <div className="tv-detail-id">
            <h2 className="tv-detail-name">{student.name}</h2>
            <p className="wf-muted">
              Checkpoint: {student.currentCheckpointId ?? '—'} · no demo detail for this student
            </p>
          </div>
        </header>
        <div className="tv-detail-grid">
          <div className="tv-summary">
            <RoutingReason routing={routing} student={student} />
            <FlagsBlock flags={student.flags} />
          </div>
          <div className="tv-help">
            <RoutingControls
              student={student}
              activeMode={activeMode}
              assignTarget={assignTarget}
              setAssignTarget={setAssignTarget}
              onRouting={onRouting}
              routing={routing}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tv-detail">
      {/* Detail header */}
      <header className="tv-detail-head">
        <span className="tv-detail-avatar">{student.initials}</span>
        <div className="tv-detail-id">
          <h2 className="tv-detail-name">
            {student.name}
            {d.fromPersona && <span className="tv-persona-tag">persona: {d.fromPersona}</span>}
          </h2>
          <p className="wf-muted">
            Class 7B · opened via double-click · {d.module}
            {d.live && <span className="tv-demo-live" title="Live data from the automated demo run">live demo run</span>}
          </p>
        </div>
        {d.signal && (
          <span className={`tv-signal tv-signal--${SIGNAL_INFO[d.signal]?.tone ?? 'mid'}`}>
            <span className="tv-signal-k">Passive signal</span>
            <span className="tv-signal-v">{SIGNAL_INFO[d.signal]?.label ?? d.signal}</span>
          </span>
        )}
        <button type="button" className="wf-btn wf-btn--light">Message student</button>
      </header>

      <div className="tv-detail-grid">
        {/* ---------- Summary column ---------- */}
        <div className="tv-summary">
          {/* Routing reason + open remediation flags come from the live roster
              response (getTeacherRoster), not persona fixtures. */}
          <RoutingReason routing={routing} student={student} />
          <FlagsBlock flags={student.flags} />

          {/* Skills mastered */}
          <section className="tv-block">
            <h3 className="wf-card-title">Skills mastered</h3>
            <div className="wf-card tv-skills">
              <div className="tv-chips">
                {d.skills.mastered.map((s) => <SkillChip key={s} label={s} kind="mastered" />)}
                {d.skills.inProgress.map((s) => <SkillChip key={s} label={s} kind="progress" />)}
                {d.skills.locked.map((s) => <SkillChip key={s} label={s} kind="locked" />)}
              </div>
              <p className="wf-tiny">{d.skills.summary}</p>
              <div className="wf-bar wf-bar--thin">
                <div className="wf-bar-fill wf-bar-fill--blue" style={{ width: `${d.skills.pct}%` }} />
              </div>
              <p className="wf-tiny">Skill graph progress (feeds the tutor agent)</p>
            </div>
          </section>

          {/* Code written */}
          <section className="tv-block">
            <div className="wf-card-head">
              <h3 className="wf-card-title">Code written</h3>
              <button type="button" className="wf-link">View full project · open sandbox ↗</button>
            </div>
            <div className="tv-code">
              <ol className="tv-code-lines">
                {d.code.lines.map((ln, i) => (
                  <li key={i}>
                    <span className="tv-code-num">{i + 1}</span>
                    <code className={ln.c === 'tag' ? 'tv-code-tag' : ''}>{ln.t}</code>
                    {ln.flag && <span className="tv-code-flag">{ln.flag}</span>}
                  </li>
                ))}
              </ol>
              <div className="tv-code-output">
                <p className="tv-code-output-head">● run output</p>
                <p className="tv-code-output-err">{d.code.output}</p>
                <p className="tv-code-output-note">{d.code.note}</p>
              </div>
            </div>
          </section>

          {/* CS standards */}
          <section className="tv-block">
            <h3 className="wf-card-title">CS standards assessment</h3>
            <p className="wf-tiny">Graded against CS teacher standards · fed to the tutor agent to tune help</p>
            <div className="wf-card tv-standards">
              {d.standards.map((s) => (
                <div key={s.code} className="tv-standard">
                  <span className="tv-standard-text">
                    <strong>{s.code}</strong> · {s.desc}
                  </span>
                  <span className={`tv-rating ${RATING_CLASS[s.rating]}`}>{s.rating}</span>
                </div>
              ))}
              <hr className="wf-rule" />
              <div className="tv-grade-row">
                <span className="tv-grade-label">Overall grade</span>
                <span className="tv-grade-value">{d.grade}</span>
              </div>
              <div className="tv-grade-foot">
                <span className="wf-tiny">Teacher can override before it feeds the agent</span>
                <button type="button" className="wf-btn wf-btn--light wf-btn--xs">Adjust grade</button>
              </div>
            </div>
          </section>
        </div>

        {/* ---------- Help + controls column ---------- */}
        <div className="tv-help">
          <section className="tv-block">
            <h3 className="wf-card-title">Scaffolded help timeline</h3>
            <p className="wf-tiny">How the agent is helping {student.name.split(' ')[0]} build the project</p>
            <ol className="tv-timeline">
              {d.timeline.map((step) => (
                <li key={step.n} className={`tv-step tv-step--${step.state}`}>
                  <span className="tv-step-node">{step.state === 'done' ? '✓' : step.n}</span>
                  <div className="tv-step-card">
                    <p className="tv-step-title">{step.title}</p>
                    <p className="tv-step-body">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Real routing control: hold / assign / auto via setTeacherInput (P-8.2, C-19.4). */}
          <RoutingControls
            student={student}
            activeMode={activeMode}
            assignTarget={assignTarget}
            setAssignTarget={setAssignTarget}
            onRouting={onRouting}
            routing={routing}
          />

          <section className="tv-block">
            <h3 className="wf-card-title">Teacher controls <span className="tv-demo-tag">demo</span></h3>
            <p className="wf-tiny">Not yet backed by the API — descoped for the demo (C-33).</p>
            <div className="tv-controls-row">
              <button type="button" className="wf-btn wf-btn--blue wf-btn--block" disabled>Reveal answer now</button>
              <button type="button" className="wf-btn wf-btn--light wf-btn--block" disabled>Send a custom hint</button>
            </div>

            <div className="wf-card tv-control">
              <label className="tv-control-label" htmlFor="tv-timeout">Answer timeout</label>
              <div className="tv-control-row">
                <input
                  id="tv-timeout"
                  type="range"
                  min="1"
                  max="15"
                  value={timeout_}
                  onChange={(e) => setTimeoutMin(Number(e.target.value))}
                  className="tv-slider"
                />
                <span className="tv-control-value">{timeout_} min</span>
              </div>
              <p className="wf-tiny">When to auto-reveal the worked solution · fixed from teacher_config in the product (C-33)</p>
            </div>

            <div className="wf-card tv-control">
              <div className="tv-control-row tv-control-row--between">
                <span className="tv-control-label">"See the answer" button for student</span>
                <button
                  type="button"
                  className={`tv-toggle ${seeAnswer ? 'is-on' : ''}`}
                  aria-pressed={seeAnswer}
                  onClick={() => setSeeAnswer((v) => !v)}
                >
                  {seeAnswer ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              <p className="wf-tiny">Student may opt to see the answer before timeout</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default function TeacherView({ user, onLogout }) {
  const [roster, setRoster] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(null)
  // Per-student routing call state: { [studentId]: { pending, error, result } }.
  const [routingByStudent, setRoutingByStudent] = useState({})

  // Send a hold/assign/auto decision through the services layer (setTeacherInput).
  // In http mode this hits POST /teacher/students/{id}/routing; in mock mode it
  // returns the canned routing decision. On success we also patch the student's
  // teacherInput/lastRouting in the roster so the UI reflects the applied decision.
  function handleRouting(studentId, input) {
    setRoutingByStudent((cur) => ({
      ...cur,
      [studentId]: { pending: true, error: null, result: cur[studentId]?.result ?? null },
    }))
    services
      .setTeacherInput({ studentId, input })
      .then((res) => {
        const decision = res?.decision ?? null
        setRoutingByStudent((cur) => ({
          ...cur,
          [studentId]: { pending: false, error: null, result: res },
        }))
        if (decision) {
          setRoster((cur) =>
            cur.map((s) =>
              s.id === studentId
                ? {
                    ...s,
                    teacherInput: decision.teacherInput ?? s.teacherInput,
                    lastRouting: decision,
                    currentCheckpointId: decision.appliedCheckpointId ?? s.currentCheckpointId,
                  }
                : s,
            ),
          )
        }
      })
      .catch((err) => {
        const message = err?.error?.message || err?.message || 'Could not apply the routing change.'
        setRoutingByStudent((cur) => ({
          ...cur,
          [studentId]: { pending: false, error: message, result: cur[studentId]?.result ?? null },
        }))
      })
  }

  // Load the class roster from the services layer (getTeacherRoster, seam 1).
  // In mock mode this is the contract stub's canned, schema-valid response.
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    services
      .getTeacherRoster({ courseId: 'hoai2026-adaptive' })
      .then((res) => {
        if (!active) return
        const view = (res.students || []).map(rosterStudentToView)
        setRoster(view)
        setSelectedId((cur) => cur ?? view[0]?.id ?? null)
        // getTeacherRoster isn't model-derived, so the stub omits `source`; mark
        // it as stub in mock mode for the "demo data" label.
        setSource(res.source ?? 'stub')
      })
      .catch((err) => {
        if (active) setError(err?.error?.message || err?.message || 'Could not load the roster.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const filtered = roster.filter((s) =>
    s.name.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const selected = roster.find((s) => s.id === selectedId) || null
  const classAvg = roster.length
    ? Math.round(roster.reduce((sum, s) => sum + s.mastery, 0) / roster.length)
    : 0
  const teacherName = user?.username || 'Teacher'
  const initials = teacherName.slice(0, 2).toUpperCase()

  return (
    <div className="wf tv">
      {/* Top bar */}
      <header className="wf-top">
        <div className="wf-brand">
          <BrandMark size={30} />
          <span className="wf-brand-name">AdaptAI</span>
          <span className="wf-project">Teacher · Module 2 — Build a personal site</span>
        </div>
        <div className="wf-actions">
          {source === 'stub' && <span className="tv-demo-tag" title="Served by the mock services stub">demo data</span>}
          <button type="button" className="wf-btn wf-btn--light">Export class report</button>
          <span className="wf-avatar" title={`Signed in as ${teacherName}`}>{initials}</span>
          <button type="button" className="wf-btn wf-btn--ghost" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <div className="tv-body">
        {/* Left: roster */}
        <aside className="tv-roster">
          <div className="tv-roster-head">
            <h2 className="tv-roster-title">STUDENTS</h2>
            <p className="wf-tiny">Class 7B · {roster.length} students · double-click to open</p>
          </div>

          <input
            className="tv-search"
            type="search"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search students"
          />

          <div className="wf-card tv-classavg">
            <div className="tv-classavg-row">
              <span className="wf-muted">Class avg mastery</span>
              <strong>{classAvg}%</strong>
            </div>
            <div className="wf-bar wf-bar--thin">
              <div className="wf-bar-fill wf-bar-fill--blue" style={{ width: `${classAvg}%` }} />
            </div>
          </div>

          <ul className="tv-rows">
            {loading && <li className="wf-tiny tv-empty">Loading roster…</li>}
            {error && <li className="wf-tiny tv-empty" role="alert">{error}</li>}
            {!loading && !error && filtered.map((s) => (
              <RosterRow key={s.id} student={s} selected={s.id === selectedId} onOpen={setSelectedId} />
            ))}
            {!loading && !error && filtered.length === 0 && (
              <li className="wf-tiny tv-empty">No students match "{search}".</li>
            )}
          </ul>

          <div className="tv-legend">
            <span className="wf-tiny">Legend:</span>
            <span className="tv-legend-item"><span className="tv-status-dot" style={{ background: 'var(--wf-green)' }} />on track</span>
            <span className="tv-legend-item"><span className="tv-status-dot" style={{ background: '#f5b942' }} />stuck</span>
            <span className="tv-legend-item"><span className="tv-status-dot" style={{ background: '#ef4444' }} />behind</span>
          </div>
        </aside>

        {/* Right: student detail */}
        <main className="tv-panel">
          {selected ? (
            <StudentDetail
              student={selected}
              routing={routingByStudent[selected.id] ?? null}
              onRouting={handleRouting}
            />
          ) : (
            <div className="tv-detail tv-detail--empty">
              <p className="wf-muted">
                {loading ? 'Loading student data…' : 'Select a student from the roster to see their detail.'}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
