import './studentDashboard.css'
import './teacherClasses.css'
import { Icon, HeroArt } from './weblab/courseArt.jsx'
import { BrandMark, BrandLogo } from './Brand.jsx'

// The teacher's home screen: the classes they teach. For now there is one class
// (Hour of AI 2026); each class card has a "View course" button that opens the
// classroom dashboard (roster + per-student detail). Reuses the student
// dashboard's visual language (.sd-* tokens, palette, fonts) so teacher and
// student screens feel like one product.

const CLASSES = [
  {
    id: 'hour-of-ai-2026',
    title: 'Hour of AI 2026 - Adaptive Weblab',
    unit: 'Class 7B',
    blurb: 'An hour-long adaptive lesson on prompting an AI to build a web page. Open the course to see your class roster and each student’s progress.',
    students: 4,
    objectives: 8,
    minutes: 60,
  },
]

// "ms.r@school.edu" -> "ms.r"; empty -> "there" in the greeting, "MS" on the avatar
const localPart = (username = '') => username.split('@')[0].trim()
const displayName = (username) => localPart(username) || 'there'
const initialsOf = (username) => (localPart(username).replace(/[^a-zA-Z0-9]/g, '').slice(0, 2) || 'MS').toUpperCase()

export default function TeacherClasses({ user, onLogout, onViewCourse }) {
  const name = displayName(user?.username)

  return (
    <div className="sd">
      <header className="sd-top">
        <div className="sd-brand">
          <BrandMark size={32} />
          <span className="sd-brand-name">AdaptAI</span>
        </div>
        <div className="sd-user">
          <span className="sd-role">Teacher</span>
          <span className="sd-avatar" aria-hidden="true">{initialsOf(user?.username)}</span>
          <span className="sd-username">{user?.username}</span>
          <button type="button" className="sd-signout" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <main className="sd-page">
        <div className="sd-wrap">
          {/* ---------------- Welcome hero ---------------- */}
          <section className="sd-hero" aria-labelledby="tc-hi">
            <div className="sd-hero-text">
              <p className="sd-pill"><Icon name="users" size={13} />Teacher · {CLASSES.length} class{CLASSES.length === 1 ? '' : 'es'}</p>
              <h1 id="tc-hi" className="sd-hi">Hi, {name}</h1>
              <p className="sd-lede">
                Here are the classes you teach. Open a course to see your class roster, each
                student’s mastery and flags, and the routing controls.
              </p>
            </div>
            <div className="sd-logo-panel">
              <BrandLogo width={210} />
            </div>
          </section>

          {/* ---------------- My classes ---------------- */}
          <section aria-labelledby="tc-classes">
            <header className="sd-sec-head">
              <p className="sd-kicker">MY CLASSES</p>
              <h2 id="tc-classes" className="sd-sec-title">Classes you teach</h2>
            </header>

            <ul className="tc-list">
              {CLASSES.map((c) => (
                <li key={c.id}>
                  <article className="sd-course" aria-labelledby={`tc-class-${c.id}`}>
                    <div className="sd-course-art" aria-hidden="true">
                      <span className="sd-unit">{c.unit}</span>
                      <HeroArt />
                    </div>
                    <div className="sd-course-body">
                      <h3 id={`tc-class-${c.id}`} className="sd-course-title">{c.title}</h3>
                      <p className="sd-course-sub">{c.blurb}</p>

                      <ul className="sd-stats" aria-label={`${c.title}: class at a glance`}>
                        <li className="sd-stat">
                          <span className="sd-stat-icon sd-stat-icon--blue"><Icon name="users" size={22} /></span>
                          <div className="sd-stat-text">
                            <span className="sd-stat-label">Students</span>
                            <span className="sd-stat-value">{c.students}</span>
                          </div>
                        </li>
                        <li className="sd-stat">
                          <span className="sd-stat-icon sd-stat-icon--green"><Icon name="layers" size={22} /></span>
                          <div className="sd-stat-text">
                            <span className="sd-stat-label">Objectives</span>
                            <span className="sd-stat-value">{c.objectives}</span>
                          </div>
                        </li>
                        <li className="sd-stat">
                          <span className="sd-stat-icon sd-stat-icon--blue"><Icon name="clock" size={22} /></span>
                          <div className="sd-stat-text">
                            <span className="sd-stat-label">Lesson length</span>
                            <span className="sd-stat-value">~{c.minutes} min</span>
                          </div>
                        </li>
                      </ul>

                      <div className="sd-course-actions">
                        <button type="button" className="sd-btn sd-btn--solid" onClick={() => onViewCourse?.(c.id)}>
                          <Icon name="arrow" size={14} />View course
                        </button>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
