import { useEffect, useMemo, useState } from 'react'
import { SIGNAL_INFO, activeHint, replayNudges } from './adaptation.js'

const PLAY_MS = 1600

function clock(iso) {
  return new Date(iso).toISOString().slice(11, 19)
}

function SignalBadge({ signal, small }) {
  const info = SIGNAL_INFO[signal] ?? { label: signal, tone: 'mid' }
  return (
    <span className={`tv-chip-signal tv-chip-signal--${info.tone} ${small ? 'is-small' : ''}`}>{info.label}</span>
  )
}

// Replay control (Task 8c): steps through a persona's events in server-timestamp order and
// shows, after each one, what the deterministic engine produced: signal + reason + evidence,
// the hint style/angle it selects, the student-visible nudge (60 s cooldown per checkpoint),
// the route and its reason, tested-out checkpoints and remediation flags. Frames come from
// shared/core/replay.py via the committed fixture, so this view never re-implements a rule.
export default function PersonaReplay({ replay }) {
  const frames = replay.frames
  const [i, setI] = useState(frames.length - 1)
  const [playing, setPlaying] = useState(false)
  const nudges = useMemo(() => replayNudges(frames), [frames])

  useEffect(() => {
    if (!playing) return undefined
    if (i >= frames.length - 1) { setPlaying(false); return undefined }
    const t = setTimeout(() => setI((n) => Math.min(n + 1, frames.length - 1)), PLAY_MS)
    return () => clearTimeout(t)
  }, [playing, i, frames.length])

  const f = frames[i]
  const prev = i > 0 ? frames[i - 1] : null
  const sig = f.signal
  const changed = prev?.signal && sig && prev.signal.signal !== sig.signal
  const hint = activeHint(sig, f.anglesTried)
  const nudge = nudges[i]
  const first = replay.student.displayName.split(' ')[0]

  function play() {
    if (i >= frames.length - 1) setI(0)
    setPlaying(true)
  }

  return (
    <div className="rp">
      <div className="rp-head">
        <div>
          <h3 className="wf-card-title">Replay {first}'s history</h3>
          <p className="wf-tiny">Each step is one recorded event. The panel shows what the adaptive engine (rule baseline) decided after it.</p>
        </div>
        <span className="tv-synthetic-tag">synthetic student history</span>
      </div>

      <div className="rp-controls" role="group" aria-label="Replay controls">
        <button type="button" className="wf-btn wf-btn--light" onClick={() => { setPlaying(false); setI(0) }} aria-label="Back to the first event">⏮</button>
        <button type="button" className="wf-btn wf-btn--light" disabled={i === 0} onClick={() => { setPlaying(false); setI(i - 1) }} aria-label="Previous event">◀</button>
        {playing
          ? <button type="button" className="wf-btn wf-btn--blue rp-play" onClick={() => setPlaying(false)}>⏸ Pause</button>
          : <button type="button" className="wf-btn wf-btn--blue rp-play" onClick={play}>▶ Play</button>}
        <button type="button" className="wf-btn wf-btn--light" disabled={i === frames.length - 1} onClick={() => { setPlaying(false); setI(i + 1) }} aria-label="Next event">▶</button>
        <input
          className="rp-scrub"
          type="range"
          min={0}
          max={frames.length - 1}
          value={i}
          onChange={(e) => { setPlaying(false); setI(Number(e.target.value)) }}
          aria-label="Replay position"
        />
        <span className="wf-tiny rp-pos">Event {i + 1} of {frames.length} · {clock(f.event.at)}</span>
      </div>

      <div className="rp-grid">
        <ol className="rp-events" aria-label="Event history">
          {frames.map((fr, n) => (
            <li key={fr.event.id} className={`rp-event ${n === i ? 'is-current' : n > i ? 'is-future' : ''}`}>
              <button type="button" className="rp-event-btn" onClick={() => { setPlaying(false); setI(n) }}>
                <span className="rp-event-time">{clock(fr.event.at)}</span>
                <span className={`rp-event-kind rp-event-kind--${fr.event.kind}`}>{fr.event.kind === 'hint' ? 'hint' : 'submit'}</span>
                <span className="rp-event-main">
                  <span className="rp-event-step">{fr.event.stepId}</span>
                  <span className="rp-event-text">“{fr.event.text}”</span>
                </span>
                {fr.event.kind === 'attempt' && fr.event.evidenceLevel != null && (
                  <span className="rp-event-level" title="Evidence level for this attempt">L{fr.event.evidenceLevel}</span>
                )}
                {fr.signal && <SignalBadge signal={fr.signal.signal} small />}
              </button>
            </li>
          ))}
        </ol>

        <div className="rp-now" aria-live="polite">
          {sig && (
            <section className={`rp-card rp-card--${SIGNAL_INFO[sig.signal]?.tone ?? 'mid'}`}>
              <div className="rp-card-head">
                <span className="rp-k">Passive signal</span>
                <SignalBadge signal={sig.signal} />
                {changed && <span className="rp-changed">changed from {SIGNAL_INFO[prev.signal.signal]?.label}</span>}
                <span className="wf-tiny rp-conf">confidence {sig.confidence}</span>
              </div>
              <p className="rp-reason">{sig.reason}</p>
              <p className="wf-tiny">Evidence: {sig.evidenceRefs.length ? sig.evidenceRefs.join(', ') : 'no scored attempts yet'}
                {f.timing.projectSubmits > 0 && ` · cosmetic edits ${Math.round(f.timing.cosmeticEditShare * 100)}%`}
                {f.timing.rapidSubmits > 0 && ` · ${f.timing.rapidSubmits} rapid submits`}
                {f.timing.maxGapSeconds >= 600 && ` · longest gap ${Math.round(f.timing.maxGapSeconds / 60)} min`}
              </p>
            </section>
          )}

          {hint && (
            <section className="rp-card">
              <div className="rp-card-head">
                <span className="rp-k">Next hint style</span>
                <strong>{hint.label}</strong>
                {hint.tried.length > 0 && hint.isNewAngle && <span className="rp-new">new angle</span>}
              </div>
              {hint.angle && hint.angle !== hint.style && <p className="wf-tiny">Angle: {hint.angle}</p>}
              {hint.tried.length > 0 && <p className="wf-tiny">Already tried: {hint.tried.join(', ')}</p>}
              <p className="rp-student-sees"><span className="rp-k">Student sees</span> {hint.sample}</p>
            </section>
          )}

          <section className="rp-card">
            <div className="rp-card-head"><span className="rp-k">Redirect nudge</span></div>
            {nudge.show && (
              <div className="rp-nudge" role="note">
                <span aria-hidden="true">💡</span> {nudge.text}
              </div>
            )}
            {!nudge.show && nudge.text && (
              <p className="wf-tiny">Held back: a nudge was shown on {f.event.checkpointId} {Math.round((60000 - nudge.remainingMs) / 1000)} s ago (60 s cooldown per checkpoint, {Math.ceil(nudge.remainingMs / 1000)} s left).</p>
            )}
            {!nudge.text && <p className="wf-tiny">No nudge: this signal changes the hint style, not the screen.</p>}
          </section>

          <section className="rp-card">
            <div className="rp-card-head">
              <span className="rp-k">{f.route.phase === 'diagnostic' ? 'Diagnostic' : 'Route'}</span>
              <strong>{f.route.checkpointId ?? 'lesson complete'}</strong>
            </div>
            <p className="rp-reason">{f.route.reason}</p>
            {f.testedOut.length > 0 && (
              <div className="rp-tags">
                <span className="wf-tiny">Tested out:</span>
                {f.testedOut.map((c) => <span key={c} className="rp-tag rp-tag--good">{c}</span>)}
              </div>
            )}
          </section>

          <section className="rp-card">
            <div className="rp-card-head"><span className="rp-k">Evidence vs target</span></div>
            <div className="rp-evidence">
              {Object.entries(replay.targets).map(([skill, target]) => {
                const level = f.evidence[skill] ?? 0
                return (
                  <div key={skill} className="rp-ev-row">
                    <span className="rp-ev-skill">{skill}</span>
                    <span className="wf-bar wf-bar--thin rp-ev-bar">
                      <span className="wf-bar-fill" style={{ width: `${Math.min(100, (level / target) * 100)}%`, background: level >= target ? 'var(--wf-green)' : 'var(--wf-blue)' }} />
                    </span>
                    <span className="wf-tiny">{level} / {target}</span>
                  </div>
                )
              })}
            </div>
            {f.flags.map((fl) => (
              <p key={fl.stepId + fl.skillId} className={`rp-flag rp-flag--${fl.severity}`}>
                ⚑ {fl.skillId} flag · {fl.severity} — {fl.reason}
              </p>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
