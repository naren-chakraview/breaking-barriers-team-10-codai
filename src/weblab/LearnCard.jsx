// Teach-first panel shown at the top of the center column when a new skill
// begins, BEFORE the student is asked to do the task. It explains the concept,
// walks a worked example, and lists the key terms — so a beginner who has never
// seen HTML/CSS is taught the basics first. "Got it — start the task" reveals
// the editor task; it can be reopened later with "Review the lesson".
import { getObjective } from './courseData.js'

export default function LearnCard({ objectiveId, onStart }) {
  const obj = getObjective(objectiveId)
  const lesson = obj?.lesson
  if (!obj || !lesson) return null

  return (
    <section className="wf-learn2" aria-labelledby="wf-learn2-title">
      <div className="wf-learn2-head">
        <span className="wf-learn2-eyebrow"><span aria-hidden="true">📘</span> Learn this first</span>
        <h2 id="wf-learn2-title" className="wf-learn2-title">{obj.title}</h2>
      </div>

      <p className="wf-learn2-intro">{lesson.intro}</p>

      <ol className="wf-learn2-points">
        {lesson.points.map((pt, i) => (
          <li key={i}><span className="wf-learn2-num" aria-hidden="true">{i + 1}</span><span>{pt}</span></li>
        ))}
      </ol>

      {lesson.example && (
        <div className="wf-learn2-example">
          <span className="wf-learn2-example-label">Worked example</span>
          <pre>{lesson.example.code}</pre>
          {lesson.example.caption && <p className="wf-learn2-example-cap">{lesson.example.caption}</p>}
        </div>
      )}

      {obj.terms?.length > 0 && (
        <div className="wf-learn2-terms">
          <p className="wf-learn2-terms-label">Key words</p>
          <dl>
            {obj.terms.map((t) => (
              <div key={t.term} className="wf-learn2-term">
                <dt>{t.term}</dt>
                <dd>{t.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="wf-learn2-actions">
        <button type="button" className="wf-btn wf-btn--blue" onClick={onStart}>
          Got it — start the task →
        </button>
      </div>
    </section>
  )
}
