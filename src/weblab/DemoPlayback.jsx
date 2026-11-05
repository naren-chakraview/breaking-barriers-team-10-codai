import { stageLabel } from './useDemoRunner.js'
import { UNDERSTANDING_LABEL } from './demoStudents.js'
import './demo.css'

// A small fixed banner shown while the autopilot runs, so the viewer can see
// who is being demoed and what stage the run is at, and can stop it.
export default function DemoPlayback({ student, stage, progress, running, onStop }) {
  if (!student || stage === 'idle') return null
  const pct = progress.total ? Math.round((100 * progress.done) / progress.total) : 0
  return (
    <div className="demo-playback" role="status" aria-live="polite">
      <span className="demo-playback-dot" aria-hidden="true" />
      <div className="demo-playback-text">
        <strong className="demo-playback-name">
          Demo: {student.name}
          <span className="demo-playback-level"> · {UNDERSTANDING_LABEL[student.understanding]}</span>
        </strong>
        <span className="demo-playback-stage">
          {stageLabel(stage)}
          {stage === 'lesson' && progress.total ? ` — objective ${progress.done} of ${progress.total} (${pct}%)` : ''}
        </span>
      </div>
      {running && (
        <button type="button" className="wf-btn wf-btn--light wf-btn--xs demo-playback-stop" onClick={onStop}>
          Stop
        </button>
      )}
    </div>
  )
}
