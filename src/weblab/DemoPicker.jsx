import { DEMO_STUDENTS, UNDERSTANDING_LABEL } from './demoStudents.js'
import './demo.css'

// The 4-student chooser shown when "Play demo" is clicked on the login page.
// Each card names the student, their website topic, and their understanding
// level so a viewer knows what to expect before the autopilot runs.
const UNDERSTANDING_CLASS = {
  strong: 'demo-card--strong',
  detail: 'demo-card--detail',
  struggling: 'demo-card--low',
  low: 'demo-card--low',
}

export default function DemoPicker({ onPick, onCancel }) {
  return (
    <div className="demo-overlay" role="dialog" aria-modal="true" aria-labelledby="demo-pick-title">
      <div className="demo-modal">
        <div className="demo-modal-head">
          <span className="demo-badge">▶ Automated demo</span>
          <h1 id="demo-pick-title" className="demo-title">Pick a student to watch</h1>
          <p className="demo-sub">
            Each student has a different project and a different grasp of the topic. The demo
            signs them in, answers the quizzes, and builds their site automatically — students who
            understand less lean on hints more and finish with lower mastery.
          </p>
        </div>

        <ul className="demo-grid">
          {DEMO_STUDENTS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={`demo-card ${UNDERSTANDING_CLASS[s.understanding] || ''}`}
                onClick={() => onPick(s)}
              >
                <span className="demo-card-avatar" aria-hidden="true">
                  {s.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <span className="demo-card-name">{s.name}</span>
                <span className="demo-card-topic">{s.topicLabel}</span>
                <span className="demo-card-level">{UNDERSTANDING_LABEL[s.understanding]}</span>
                <span className="demo-card-cta">Watch demo →</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="demo-modal-actions">
          <button type="button" className="wf-btn wf-btn--ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
