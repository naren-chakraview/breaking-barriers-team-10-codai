import './courseOverview.css'
import { LESSON, LEVELS } from './courseData.js'
import { Icon, SiteArt } from './courseArt.jsx'

// "View course": the landing page for the whole course. Same design system as
// the lesson and teacher screens (it reuses the `.wf` tokens and shared classes
// in index.css, so the page root must keep the `wf` class): neutral surfaces,
// one blue accent, and green / amber only to show status.
//
// Sections: course header with a progress panel > roadmap > outline (one card
// per objective, one tile per adaptive level) > what you'll build > how it
// adapts > closing call to action.

const TIERS = {
  support: { label: 'Support', note: 'Extra scaffolding if a step is tricky', icon: 'lifebuoy', rank: 1 },
  core: { label: 'Core', note: 'The main path for everyone', icon: 'target', rank: 2 },
  stretch: { label: 'Stretch', note: 'A deeper take when you are ready', icon: 'trending', rank: 3 },
}
const STATE_LABEL = { done: 'Mastered', progress: 'In progress', todo: 'Not started' }

const ADAPTS = [
  { icon: 'users', title: 'Same objectives for everyone', body: 'You and your classmates work toward the same goals, so nobody races ahead of the class.' },
  { icon: 'lifebuoy', title: 'Extra support when you need it', body: 'If a step is tricky, the lesson adds scaffolding instead of moving on.' },
  { icon: 'trending', title: 'A deeper challenge when you are ready', body: 'Breeze through a skill and you get a deeper version of it to keep things interesting.' },
  { icon: 'chat', title: 'An AI Tutor beside you', body: 'Ask anytime and get step-by-step hints that help you learn, not just answers.' },
]

const levelsFor = (objectiveId) => LEVELS.filter((l) => l.objectiveId === objectiveId)
const stateFor = (i, done) => (i < done ? 'done' : i === done ? 'progress' : 'todo')

function SectionHead({ id, kicker, title, sub }) {
  return (
    <header className="cv-sec-head">
      <p className="cv-kicker">{kicker}</p>
      <h2 id={id} className="cv-sec-title">{title}</h2>
      {sub && <p className="cv-sec-sub">{sub}</p>}
    </header>
  )
}

export default function CourseOverview({ user, progress = 15, onBack, onContinueLesson }) {
  const total = LESSON.objectives.length
  const pct = Math.max(0, Math.min(100, progress))
  const exact = (pct / 100) * total
  const done = Math.min(total, Math.floor(exact))
  const partial = done < total ? Math.round((exact - done) * 100) : 0
  const unitName = LESSON.unitTitle.replace(/^Unit \d+\s*·\s*/, '')
  const initials = (user?.username || 'You').slice(0, 2).toUpperCase()
  const finished = done >= total

  function showBuild() {
    const el = document.getElementById('cv-build')
    if (!el) return
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    el.focus?.({ preventScroll: true })
  }

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
          {/* ---------------- Course header ---------------- */}
          <section className="cv-hero" aria-labelledby="cv-title">
            <div className="cv-hero-text">
              <p className="cv-eyebrow">Course · Unit 1</p>
              <h1 id="cv-title" className="cv-title">{LESSON.title}</h1>
              <p className="cv-lede">
                Build your own webpage with HTML and CSS while an AI Tutor helps you learn, debug,
                and level up. The lesson adapts to what you show you know: everyone works toward
                the same objectives, with extra support or a tougher challenge along the way.
              </p>
              <ul className="cv-facts" aria-label="Course facts">
                <li><Icon name="clock" size={15} />~{LESSON.estimatedMinutes} min</li>
                <li><Icon name="target" size={15} />{total} objectives</li>
                <li><Icon name="layers" size={15} />{LEVELS.length} adaptive levels</li>
              </ul>
              <div className="cv-hero-actions">
                <button type="button" className="cv-cta" onClick={onContinueLesson}>
                  <Icon name="play" size={13} />Continue lesson
                </button>
                <button type="button" className="cv-link" onClick={showBuild}>See what you'll build</button>
              </div>
            </div>

            <aside className="cv-progress" aria-label="Your progress">
              <p className="cv-progress-label">Your progress</p>
              <p className="cv-progress-value">{pct}<span>%</span></p>
              <div
                className="cv-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label="Course progress"
              >
                <div className="cv-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <p className="cv-progress-sub">{done} of {total} objectives mastered</p>
            </aside>
          </section>

          {/* ---------------- Roadmap ---------------- */}
          <section className="cv-section" aria-labelledby="cv-path-h">
            <SectionHead
              id="cv-path-h"
              kicker="Your path"
              title={`${total} objectives, one project`}
              sub="Everyone works toward the same goals. Here is where you are on the way."
            />
            <ol className="cv-card cv-road" aria-label="Your path through the lesson">
              {LESSON.objectives.map((o, i) => {
                const state = stateFor(i, done)
                return (
                  <li
                    key={o.id}
                    className={`cv-stop cv-stop--${state}`}
                    style={{ '--fill': `${state === 'progress' ? partial : 0}%` }}
                  >
                    {state === 'progress' && <span className="cv-here">You are here</span>}
                    <span className="cv-node" aria-hidden="true">
                      {state === 'done' ? <Icon name="check" size={18} strokeWidth={2.5} /> : i + 1}
                    </span>
                    <span className="cv-stop-num">Objective {i + 1}</span>
                    <span className="cv-stop-title">{o.title}</span>
                    <span className={`cv-state cv-state--${state}`}>{STATE_LABEL[state]}</span>
                  </li>
                )
              })}
            </ol>
          </section>

          {/* ---------------- Outline ---------------- */}
          <section className="cv-section" aria-labelledby="cv-outline-h">
            <SectionHead
              id="cv-outline-h"
              kicker="Course outline"
              title="What's inside"
              sub={`Unit 1 · ${unitName} · Lesson 1 · ~${LESSON.estimatedMinutes} min`}
            />
            <ul className="cv-key" aria-label="What the level types mean">
              {Object.keys(TIERS).map((t) => (
                <li key={t}>
                  <span className="cv-tier"><Icon name={TIERS[t].icon} size={12} />{TIERS[t].label}</span>
                  <span className="cv-key-note">{TIERS[t].note}</span>
                </li>
              ))}
            </ul>

            <ol className="cv-objs">
              {LESSON.objectives.map((o, i) => {
                const state = stateFor(i, done)
                return (
                  <li key={o.id} className={`cv-card cv-oc cv-oc--${state}`}>
                    <div className="cv-oc-head">
                      <span className="cv-oc-num" aria-hidden="true">
                        {state === 'done' ? <Icon name="check" size={16} strokeWidth={2.5} /> : i + 1}
                      </span>
                      <div className="cv-oc-text">
                        <h3 className="cv-oc-title">{o.title}</h3>
                        <p className="cv-oc-code">{o.code}</p>
                      </div>
                      <span className={`cv-state cv-state--${state}`}>{STATE_LABEL[state]}</span>
                    </div>
                    <ul className="cv-levels" aria-label={`Levels for ${o.title}`}>
                      {levelsFor(o.id).map((l) => {
                        const t = TIERS[l.tier]
                        return (
                          <li key={l.id} className="cv-level">
                            <div className="cv-level-top">
                              <span className="cv-tier"><Icon name={t.icon} size={12} />{t.label}</span>
                              <span className="cv-meter" aria-hidden="true">
                                {[1, 2, 3].map((n) => <i key={n} className={n <= t.rank ? 'is-on' : ''} />)}
                              </span>
                              <span className="wf-sr">Difficulty {t.rank} of 3</span>
                            </div>
                            <p className="cv-level-title">{l.title}</p>
                            <p className="cv-level-desc">{l.instructions}</p>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                )
              })}
            </ol>
          </section>

          {/* ---------------- What you'll build ---------------- */}
          <section id="cv-build" tabIndex={-1} className="cv-card cv-build" aria-labelledby="cv-build-h">
            <div className="cv-build-text">
              <p className="cv-kicker">What you'll build</p>
              <h2 id="cv-build-h" className="cv-sec-title">Your own personal website</h2>
              <p className="cv-sec-sub">
                By the end you will have a real page you wrote yourself, with the help of the tutor
                but never copied from it.
              </p>
              <ul className="cv-outcomes">
                {LESSON.objectives.map((o, i) => (
                  <li key={o.id}>
                    <span className="cv-outcome-dot" aria-hidden="true">{i + 1}</span>
                    <span>{o.title}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="cv-build-art"><SiteArt /></div>
          </section>

          {/* ---------------- How it adapts ---------------- */}
          <section className="cv-section" aria-labelledby="cv-adapt-h">
            <SectionHead id="cv-adapt-h" kicker="Personalised" title="How this course adapts to you" />
            <ul className="cv-tiles">
              {ADAPTS.map((a) => (
                <li key={a.title} className="cv-card cv-tile">
                  <span className="cv-tile-icon"><Icon name={a.icon} size={20} /></span>
                  <p className="cv-tile-title">{a.title}</p>
                  <p className="cv-tile-body">{a.body}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* ---------------- Closing call to action ---------------- */}
          <section className="cv-card cv-final" aria-labelledby="cv-final-h">
            <div>
              <h2 id="cv-final-h" className="cv-final-title">{finished ? 'You finished the lesson' : 'Ready to keep going?'}</h2>
              <p className="cv-final-sub">
                {finished ? 'Jump back in any time to review or try a stretch level.' : 'Pick up exactly where you left off. Your tutor is ready when you are.'}
              </p>
            </div>
            <button type="button" className="cv-cta cv-cta--solid" onClick={onContinueLesson}>
              <Icon name="play" size={13} />{finished ? 'Review lesson' : 'Continue lesson'}
            </button>
          </section>
        </div>
      </main>
    </div>
  )
}
