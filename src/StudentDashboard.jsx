import { useEffect, useRef, useState } from 'react'
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

// A lesson the student has not opened yet. It is featured in the hero so the
// top card is always "start something new", while the course card below is
// always "pick up what you began". Only the Web Lab is built so far, so
// Start lesson opens it; swap in this lesson's own handlers when it exists.
const NEW_LESSON = {
  unit: 'Unit 2',
  title: 'Give the AI context',
  minutes: 20,
  blurb: 'Learn how adding the right details makes an AI answer fit what you actually need.',
}
// Rule: a student has at most ONE lesson in progress. Starting a different
// lesson replaces it (they start over), so Start lesson asks first.
const inProgressCourse = COURSES.find((c) => c.progress > 0 && c.progress < 100) || null
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

function ConfirmStart({ current, next, onConfirm, onCancel }) {
  const ref = useRef(null)
  useEffect(() => {
    const opener = document.activeElement
    ref.current?.querySelector('button')?.focus()
    function onKey(e) {
      if (e.key === 'Escape') { onCancel(); return }
      if (e.key !== 'Tab') return
      const b = [...ref.current.querySelectorAll('button')]
      if (e.shiftKey && document.activeElement === b[0]) { e.preventDefault(); b[b.length - 1].focus() }
      else if (!e.shiftKey && document.activeElement === b[b.length - 1]) { e.preventDefault(); b[0].focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.() }
  }, [onCancel])
  return (
    <div className="sd-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="sd-dialog" role="alertdialog" aria-modal="true" aria-labelledby="sd-dlg-title" aria-describedby="sd-dlg-desc" ref={ref}>
        <h2 id="sd-dlg-title">Start a new lesson?</h2>
        <p id="sd-dlg-desc">
          You can only have one lesson in progress. Starting “{next}” will replace “{current.title}”
          ({current.progress}% done), and you will start over on the new one.
        </p>
        <div className="sd-dialog-actions">
          <button type="button" className="sd-btn sd-btn--outline" onClick={onCancel}>Keep my current lesson</button>
          <button type="button" className="sd-btn sd-btn--solid" onClick={onConfirm}>Start new lesson</button>
        </div>
      </div>
    </div>
  )
}

export default function StudentDashboard({ user, onLogout, onContinueLesson, onViewCourse, onStartLesson, onViewNewCourse }) {
  const startLesson = onStartLesson || onContinueLesson
  const [confirming, setConfirming] = useState(false)
  const requestStart = () => (inProgressCourse ? setConfirming(true) : startLesson())
  const viewNewCourse = onViewNewCourse || onViewCourse
  const name = displayName(user?.username)
  const total = LESSON.objectives.length
  const course = COURSES[0]
  const pct = Math.max(0, Math.min(100, course.progress))
  const exact = (pct / 100) * total
  const done = Math.min(total, Math.floor(exact))
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
              <p className="sd-pill"><Icon name="star" size={13} />New lesson · {NEW_LESSON.unit}</p>
              <h1 id="sd-hi" className="sd-hi">Hi, {name}</h1>
              <p className="sd-lede">
                Ready for something new? Up next: {NEW_LESSON.title}, about {NEW_LESSON.minutes} minutes. {NEW_LESSON.blurb}{inProgressCourse ? ' Starting it replaces the lesson you have in progress.' : ''}
              </p>
              <div className="sd-actions">
                <button type="button" className="sd-cta" onClick={requestStart}>
                  <Icon name="play" size={14} />Start lesson
                </button>
                <button type="button" className="sd-ghost" onClick={viewNewCourse}>
                  View course<Icon name="arrow" size={15} />
                </button>
              </div>
            </div>
            <div className="sd-logo-panel">
              <BrandLogo width={210} />
            </div>
          </section>

          {/* ---------------- At a glance ---------------- */}
          {/* ---------------- My courses ---------------- */}
          {(inProgressCourse || COURSES.some((c) => c.progress >= 100)) && (
          <section aria-labelledby="sd-courses">
            <header className="sd-sec-head">
              <p className="sd-kicker">MY COURSES</p>
              <h2 id="sd-courses" className="sd-sec-title">Your lesson in progress</h2>
            </header>

            {COURSES.filter((c) => c === inProgressCourse || c.progress >= 100).map((c) => (
              <article key={c.id} className="sd-course" aria-labelledby={`sd-course-${c.id}`}>
                <div className="sd-course-art" aria-hidden="true">
                  <span className="sd-unit">Unit 1</span>
                  <HeroArt />
                </div>
                <div className="sd-course-body">
                  <h3 id={`sd-course-${c.id}`} className="sd-course-title">{c.title}</h3>
                  <p className="sd-course-sub">You are currently working on {c.currentUnit}.</p>

                  <ul className="sd-stats" aria-label={`${c.title}: your progress at a glance`}>
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
          )}
        </div>
      </main>
      {confirming && inProgressCourse && (
        <ConfirmStart
          current={inProgressCourse}
          next={NEW_LESSON.title}
          onCancel={() => setConfirming(false)}
          onConfirm={() => { setConfirming(false); startLesson() }}
        />
      )}
    </div>
  )
}
