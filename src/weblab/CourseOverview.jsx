import { LESSON, LEVELS } from './courseData.js'

// The "View course" page: a map of the whole course so a student can see the
// unit, its lessons, the objectives within, and the adaptive levels that back
// each objective — plus overall progress. Content is derived from the same
// courseData the lesson uses, so the two screens stay consistent.

// Group the authored levels under the objective they target.
function levelsByObjective(objectiveId) {
  return LEVELS.filter((l) => l.objectiveId === objectiveId)
}

const TIER_LABEL = {
  support: 'Support',
  core: 'Core',
  stretch: 'Stretch',
}

export default function CourseOverview({ user, progress = 15, onBack, onContinueLesson }) {
  const totalObjectives = LESSON.objectives.length

  return (
    <div className="dash">
      <header className="dash-header">
        <div className="dash-brand">
          <span className="badge badge--student">student</span>
          <span className="dash-user">{user?.username}</span>
        </div>
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← Back to dashboard
        </button>
      </header>

      <main className="dash-main">
        {/* Course header / banner */}
        <section className="co-hero">
          <div className="co-hero-main">
            <p className="co-eyebrow">{LESSON.unitTitle}</p>
            <h1 className="co-title">{LESSON.title}</h1>
            <p className="co-desc">
              Build your own webpage with HTML and CSS while an AI Tutor helps
              you learn, debug, and level up. The lesson adapts to what you show
              you know — everyone works toward the same objectives, with extra
              support or tougher challenges along the way.
            </p>
            <div className="co-meta">
              <span>⏱ ~{LESSON.estimatedMinutes} min</span>
              <span>🎯 {totalObjectives} objectives</span>
              <span>🧩 {LEVELS.length} adaptive levels</span>
            </div>
          </div>
          <div className="co-hero-side">
            <div className="co-progress-ring" aria-label={`${progress}% complete`}>
              <span className="co-progress-num">{progress}%</span>
              <span className="co-progress-sub">complete</span>
            </div>
            <button type="button" className="btn btn--primary co-cta" onClick={onContinueLesson}>
              Continue lesson
            </button>
          </div>
        </section>

        {/* Unit → lesson → objectives outline */}
        <section className="co-outline">
          <h2 className="co-section-title">Course outline</h2>

          <div className="co-unit">
            <div className="co-unit-head">
              <span className="co-unit-badge">Unit 1</span>
              <span className="co-unit-name">{LESSON.unitTitle}</span>
            </div>

            <div className="co-lesson">
              <div className="co-lesson-head">
                <span className="co-lesson-badge">Lesson 1</span>
                <span className="co-lesson-name">{LESSON.title}</span>
                <span className="co-lesson-pill">In progress</span>
              </div>

              <ol className="co-objectives">
                {LESSON.objectives.map((obj, i) => {
                  const levels = levelsByObjective(obj.id)
                  return (
                    <li key={obj.id} className="co-objective">
                      <div className="co-objective-head">
                        <span className="co-objective-num">{i + 1}</span>
                        <div>
                          <p className="co-objective-title">{obj.title}</p>
                          <p className="co-objective-code">{obj.code}</p>
                        </div>
                      </div>
                      <ul className="co-levels">
                        {levels.map((lvl) => (
                          <li key={lvl.id} className={`co-level co-level--${lvl.tier}`}>
                            <span className="co-level-tier">{TIER_LABEL[lvl.tier] || lvl.tier}</span>
                            <span className="co-level-title">{lvl.title}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </section>

        {/* How adaptivity works — a quick explainer for the demo */}
        <section className="co-explainer">
          <h2 className="co-section-title">How this course adapts to you</h2>
          <div className="co-cards">
            <div className="co-card">
              <span className="co-card-icon" aria-hidden="true">🎯</span>
              <h3>Same objectives for everyone</h3>
              <p>You and your classmates all work toward the same goals — nobody races ahead of the class.</p>
            </div>
            <div className="co-card">
              <span className="co-card-icon" aria-hidden="true">🪜</span>
              <h3>Extra support when you need it</h3>
              <p>If a step is tricky, the lesson gives you more scaffolding instead of moving on.</p>
            </div>
            <div className="co-card">
              <span className="co-card-icon" aria-hidden="true">🚀</span>
              <h3>Tougher challenges when you're ready</h3>
              <p>Breeze through a skill and you'll get a deeper version of it to keep things interesting.</p>
            </div>
            <div className="co-card">
              <span className="co-card-icon" aria-hidden="true">🤖</span>
              <h3>An AI Tutor beside you</h3>
              <p>Ask questions anytime and get step-by-step hints that help you learn — not just answers.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
