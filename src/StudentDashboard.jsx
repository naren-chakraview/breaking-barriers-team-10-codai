import './studentDashboard.css'
import { LESSON } from './weblab/courseData.js'
import { Icon, HeroArt } from './weblab/courseArt.jsx'
import { BrandMark, BrandLogo } from './Brand.jsx'

// The student's home screen: a welcome hero with the AdaptAI logo and the next
// thing to do, three at-a-glance stats, and the course card with the objective
// path. Same visual language as the View course page. Progress is the shared
// mock value (nothing is stored yet), so this page never claims it will resume.

const COURSES = [
  {
    id: 'hour-of-ai-2026',
    title: 'Hour of AI 2026 - Adaptive Weblab',
    currentUnit: 'Unit 1 - Hour of AI 2026 - Adaptive Weblab',
    progress: 15,
  },
]

const STATE_LABEL = { done: 'Mastered', progress: 'In progress', todo: 'Not started' }
const stateFor = (i, done) => (i < done ? 'done' : i === done ? 'progress' : 'todo')

// "ms.r@school.edu" -> "ms.r"; empty -> "there" in the greeting, "ST" on the avatar
const localPart = (username = '') => username.split('@')[0].trim()
const displayName = (username) => localPart(username) || 'there'
const initialsOf = (username) => (localPart(username).replace(/[^a-zA-Z0-9]/g, '').slice(0, 2) || 'ST').toUpperCase()

const RING_R = 26
const RING_C = 2 * Math.PI * RING_R

function Ring({ pct }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sd-ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f8cff" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r={RING_R} fill="none" stroke="#e3e6ea" strokeWidth="7" />
      {pct > 0 && (
        <circle
          className="sd-ring-bar"
          cx="32"
          cy="32"
          r={RING_R}
          fill="none"
          stroke="url(#sd-ring-grad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(RING_C * pct) / 100} ${RING_C}`}
          transform="rotate(-90 32 32)"
        />
      )}
    </svg>
  )
}

export default function StudentDashboard({ user, onLogout, onContinueLesson, onViewCourse }) {
  const name = displayName(user?.username)
  const total = LESSON.objectives.length
  const course = COURSES[0]
  const pct = Math.max(0, Math.min(100, course.progress))
  const exact = (pct / 100) * total
  const done = Math.min(total, Math.floor(exact))
  const next = LESSON.objectives[Math.min(done, total - 1)]
  const finished = done >= total

  return (
    <div className="sd">
      <header className="sd-top">
        <div className="sd-brand">
          <BrandMark size={32} />
          <span className="sd-brand-name">AdaptAI</span>
        </div>
        <div className="sd-user">
          <span className="sd-role">Student</span>
          <span className="sd-avatar" aria-hidden="true">{initialsOf(user?.username)}</span>
          <span className="sd-username">{user?.username}</span>
          <button type="button" className="sd-signout" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <main className="sd-page">
        <div className="sd-wrap">
          {/* ---------------- Welcome hero ---------------- */}
          <section className="sd-hero" aria-labelledby="sd-hi">
            <div className="sd-hero-text">
              <p className="sd-pill"><Icon name="star" size={13} />Hour of AI 2026</p>
              <h1 id="sd-hi" className="sd-hi">Hi, {name}</h1>
              <p className="sd-lede">
                {finished
                  ? 'You have mastered every objective in this course. Review any step, or try a Stretch level.'
                  : `Ready to keep learning? Up next: ${next.title}, about ${next.minutes} minutes.`}
              </p>
              <div className="sd-actions">
                <button type="button" className="sd-cta" onClick={onContinueLesson}>
                  <Icon name="play" size={14} />{finished ? 'Review lesson' : 'Continue lesson'}
                </button>
                <button type="button" className="sd-ghost" onClick={onViewCourse}>
                  View course<Icon name="arrow" size={15} />
                </button>
              </div>
            </div>
            <div className="sd-logo-panel">
              <BrandLogo width={210} />
            </div>
          </section>

          {/* ---------------- At a glance ---------------- */}
          <ul className="sd-stats" aria-label="Your progress at a glance">
            <li className="sd-stat">
              <div className="sd-ring" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Course progress">
                <Ring pct={pct} />
              </div>
              <div className="sd-stat-text">
                <span className="sd-stat-label">Course progress</span>
                <span className="sd-stat-value">{pct}%</span>
              </div>
            </li>
            <li className="sd-stat">
              <span className="sd-stat-icon sd-stat-icon--green"><Icon name="award" size={22} /></span>
              <div className="sd-stat-text">
                <span className="sd-stat-label">Objectives mastered</span>
                <span className="sd-stat-value">{done} / {total}</span>
              </div>
            </li>
            <li className="sd-stat">
              <span className="sd-stat-icon sd-stat-icon--blue"><Icon name="clock" size={22} /></span>
              <div className="sd-stat-text">
                <span className="sd-stat-label">Estimated time</span>
                <span className="sd-stat-value">~{LESSON.estimatedMinutes} min</span>
              </div>
            </li>
          </ul>

          {/* ---------------- My courses ---------------- */}
          <section aria-labelledby="sd-courses">
            <header className="sd-sec-head">
              <p className="sd-kicker">MY COURSES</p>
              <h2 id="sd-courses" className="sd-sec-title">Continue where it counts</h2>
            </header>

            {COURSES.map((c) => (
              <article key={c.id} className="sd-course" aria-labelledby={`sd-course-${c.id}`}>
                <div className="sd-course-art" aria-hidden="true">
                  <span className="sd-unit">Unit 1</span>
                  <HeroArt />
                </div>
                <div className="sd-course-body">
                  <h3 id={`sd-course-${c.id}`} className="sd-course-title">{c.title}</h3>
                  <p className="sd-course-sub">You are currently working on {c.currentUnit}.</p>

                  <div className="sd-progress">
                    <div className="sd-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.progress} aria-label={`${c.title} progress`}>
                      <div className="sd-bar-fill" style={{ width: `${c.progress}%` }} />
                    </div>
                    <span className="sd-progress-label">{c.progress}% complete</span>
                  </div>

                  <ol className="sd-path" aria-label="Objectives in this course">
                    {LESSON.objectives.map((o, i) => {
                      const state = stateFor(i, done)
                      return (
                        <li key={o.id} className={`sd-step sd-step--${state}`}>
                          <span className="sd-node" aria-hidden="true">
                            {state === 'done' ? <Icon name="check" size={14} strokeWidth={2.5} /> : i + 1}
                          </span>
                          <span className="sd-step-text">
                            <span className="sd-step-title">{o.title}</span>
                            <span className="sd-step-meta">{STATE_LABEL[state]} · about {o.minutes} min</span>
                          </span>
                        </li>
                      )
                    })}
                  </ol>

                  <div className="sd-course-actions">
                    <button type="button" className="sd-btn sd-btn--outline" onClick={onViewCourse}>View course</button>
                    <button type="button" className="sd-btn sd-btn--solid" onClick={onContinueLesson}>
                      <Icon name="play" size={13} />{finished ? 'Review lesson' : 'Continue lesson'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>
      </main>
    </div>
  )
}
