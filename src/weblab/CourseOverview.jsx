import './courseOverview.css'
import { LESSON, LEVELS } from './courseData.js'

// "View course": the visual map of the whole course. Same design system as the
// lesson and teacher screens (it reuses the `.wf` tokens and shared classes in
// index.css, so the page root must keep the `wf` class), with a hero banner,
// a progress ring, a step path through the objectives, a journey-style
// outline with one card per adaptive level, and icon tiles on how it adapts.

const TIERS = { support: 'Support', core: 'Core', stretch: 'Stretch' }
const TIER_NOTE = {
  support: 'Extra scaffolding if a step is tricky',
  core: 'The main path for everyone',
  stretch: 'A deeper take when you are ready',
}
const STATE_LABEL = { done: 'Mastered', progress: 'In progress', todo: 'Not started' }

const ADAPTS = [
  { icon: 'users', tone: 'blue', title: 'Same objectives for everyone', body: 'You and your classmates work toward the same goals, so nobody races ahead of the class.' },
  { icon: 'lifebuoy', tone: 'amber', title: 'Extra support when you need it', body: 'If a step is tricky, the lesson adds scaffolding instead of moving on.' },
  { icon: 'trending', tone: 'green', title: 'A deeper challenge when you are ready', body: 'Breeze through a skill and you get a deeper version of it to keep things interesting.' },
  { icon: 'chat', tone: 'purple', title: 'An AI Tutor beside you', body: 'Ask anytime and get step-by-step hints that help you learn, not just answers.' },
]

// Simple stroke icons (decorative; always aria-hidden).
const ICONS = {
  clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  layers: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  lifebuoy: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><line x1="4.93" y1="4.93" x2="9.17" y2="9.17" /><line x1="14.83" y1="14.83" x2="19.07" y2="19.07" /><line x1="14.83" y1="9.17" x2="19.07" y2="4.93" /><line x1="4.93" y1="19.07" x2="9.17" y2="14.83" /></>,
  trending: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>,
  chat: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
  check: <polyline points="20 6 9 17 4 12" />,
  play: <polygon points="6 3 20 12 6 21 6 3" />,
}

function Icon({ name, size = 18 }) {
  return (
    <svg
      className="cv-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  )
}

const RING_R = 52
const RING_C = 2 * Math.PI * RING_R

const levelsFor = (objectiveId) => LEVELS.filter((l) => l.objectiveId === objectiveId)
const stateFor = (i, done) => (i < done ? 'done' : i === done ? 'progress' : 'todo')

export default function CourseOverview({ user, progress = 15, onBack, onContinueLesson }) {
  const total = LESSON.objectives.length
  const pct = Math.max(0, Math.min(100, progress))
  const done = Math.min(total, Math.floor((pct / 100) * total))
  const unitName = LESSON.unitTitle.replace(/^Unit \d+\s*·\s*/, '')
  const initials = (user?.username || 'You').slice(0, 2).toUpperCase()

  return (
    <div className="wf cv">
      <header className="wf-top">
        <div className="wf-brand">
          <span className="wf-logo" aria-hidden="true" />
          <span className="wf-brand-name">CodeAI</span>
          <span className="wf-project">Student · Course overview</span>
        </div>
        <div className="wf-actions">
          <button type="button" className="wf-btn wf-btn--light" onClick={onBack}>← Back to dashboard</button>
          <span className="wf-avatar" aria-label={`Signed in as ${user?.username || 'you'}`}>{initials}</span>
        </div>
      </header>

      <main className="cv-page">
        <div className="cv-wrap">
          <section className="cv-hero" aria-labelledby="cv-title">
            <div className="cv-hero-grid">
              <div className="cv-hero-text">
                <p className="cv-eyebrow">COURSE · UNIT 1</p>
                <h1 id="cv-title" className="cv-title">{LESSON.title}</h1>
                <p className="cv-lede">
                  Build your own webpage with HTML and CSS while an AI Tutor helps you learn, debug,
                  and level up. The lesson adapts to what you show you know: everyone works toward
                  the same objectives, with extra support or a tougher challenge along the way.
                </p>
                <ul className="cv-chips" aria-label="Course facts">
                  <li><Icon name="clock" size={15} />~{LESSON.estimatedMinutes} min</li>
                  <li><Icon name="target" size={15} />{total} objectives</li>
                  <li><Icon name="layers" size={15} />{LEVELS.length} adaptive levels</li>
                </ul>
                <button type="button" className="cv-cta" onClick={onContinueLesson}>
                  <Icon name="play" size={14} />Continue lesson
                </button>
              </div>

              <div
                className="cv-ring"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label="Course progress"
              >
                <svg viewBox="0 0 120 120" width="148" height="148" aria-hidden="true" focusable="false">
                  <circle className="cv-ring-track" cx="60" cy="60" r={RING_R} />
                  <circle
                    className={`cv-ring-bar${pct === 0 ? ' is-empty' : ''}`}
                    cx="60"
                    cy="60"
                    r={RING_R}
                    strokeDasharray={`${(RING_C * pct) / 100} ${RING_C}`}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="cv-ring-label">
                  <strong>{pct}%</strong>
                  <span>complete</span>
                </div>
                <p className="cv-ring-sub">{done} of {total} objectives mastered</p>
              </div>
            </div>

            <ol className="cv-path" aria-label="Your path through the lesson">
              {LESSON.objectives.map((o, i) => {
                const state = stateFor(i, done)
                return (
                  <li key={o.id} className={`cv-step cv-step--${state}`}>
                    <span className="cv-node" aria-hidden="true">
                      {state === 'done' ? <Icon name="check" size={14} /> : i + 1}
                    </span>
                    <span className="cv-step-label">
                      {o.title}
                      <span className="wf-sr"> — {STATE_LABEL[state]}</span>
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>

          <section className="wf-card cv-outline" aria-labelledby="cv-outline-h">
            <div className="cv-outline-head">
              <h2 id="cv-outline-h" className="wf-card-title">Course outline</h2>
              <p className="cv-outline-sub">Unit 1 · {unitName} · Lesson 1 · ~{LESSON.estimatedMinutes} min</p>
            </div>
            <ul className="cv-key" aria-label="What the level types mean">
              {Object.keys(TIERS).map((t) => (
                <li key={t}>
                  <span className={`cv-tier cv-tier--${t}`}>{TIERS[t]}</span>
                  <span className="cv-key-note">{TIER_NOTE[t]}</span>
                </li>
              ))}
            </ul>

            <ol className="cv-objectives">
              {LESSON.objectives.map((o, i) => {
                const state = stateFor(i, done)
                return (
                  <li key={o.id} className={`cv-obj cv-obj--${state}`}>
                    <span className="cv-mark" aria-hidden="true">
                      {state === 'done' ? <Icon name="check" size={16} /> : i + 1}
                    </span>
                    <div className="cv-obj-card">
                      <div className="cv-obj-head">
                        <div className="cv-obj-text">
                          <p className="cv-obj-title">{o.title}</p>
                          <p className="cv-obj-code">{o.code}</p>
                        </div>
                        <span className={`cv-state cv-state--${state}`}>{STATE_LABEL[state]}</span>
                      </div>
                      <ul className="cv-levels" aria-label={`Levels for ${o.title}`}>
                        {levelsFor(o.id).map((l) => (
                          <li key={l.id} className={`cv-level cv-level--${l.tier}`}>
                            <span className={`cv-tier cv-tier--${l.tier}`}>{TIERS[l.tier]}</span>
                            <p className="cv-level-title">{l.title}</p>
                            <p className="cv-level-desc">{l.instructions}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>

          <section aria-labelledby="cv-adapt-h">
            <h2 id="cv-adapt-h" className="cv-section-title">How this course adapts to you</h2>
            <ul className="cv-tiles">
              {ADAPTS.map((a) => (
                <li key={a.title} className="cv-tile">
                  <span className={`cv-tile-icon cv-tile-icon--${a.tone}`}><Icon name={a.icon} size={20} /></span>
                  <p className="cv-tile-title">{a.title}</p>
                  <p className="cv-tile-body">{a.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
