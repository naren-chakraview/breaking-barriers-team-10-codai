import { useEffect, useState } from 'react'
import './courseOverview.css'
import { LESSON, LEVELS } from './courseData.js'
import { NEEDLE_INFO } from './engine.js'
import { Icon, HeroArt, SiteArt } from './courseArt.jsx'
import { BrandMark } from '../Brand.jsx'
import { useServices } from '../services/ServicesContext.jsx'
import { adaptTree } from '../services/treeAdapter.js'
import SourceBadge from '../services/SourceBadge.jsx'

const COURSE_ID = 'hoai2026-adaptive'

// "View course": the visual landing page for the whole course, built around how
// a student actually learns it: know where you are and what is next, know what
// "done" looks like for each objective, learn the key words, and know exactly
// what to do when you get stuck. Same design system as the lesson and teacher
// screens (it reuses the `.wf` tokens and shared classes in index.css, so the
// page root must keep the `wf` class).
//
// Sections: hero > stats > up next > roadmap > outline (per objective: "I can",
// "you've got it when", key words, levels) > when you get stuck > what you'll
// build > how it adapts > closing call to action.

const TIERS = {
  support: { label: 'Support', note: 'Extra scaffolding if a step is tricky', icon: 'lifebuoy', rank: 1 },
  core: { label: 'Core', note: 'The main path for everyone', icon: 'target', rank: 2 },
  stretch: { label: 'Stretch', note: 'A deeper take when you are ready', icon: 'trending', rank: 3 },
}
const STATE_LABEL = { done: 'Mastered', progress: 'In progress', todo: 'Not started' }

// Each objective gets its own icon and colour theme (decoration only; state and
// tier are always spelled out in text as well).
const OBJ_VISUAL = {
  'obj-structure': { icon: 'code', theme: 'blue' },
  'obj-style': { icon: 'drop', theme: 'violet' },
  'obj-layout': { icon: 'layout', theme: 'teal' },
  'obj-polish': { icon: 'star', theme: 'rose' },
}
const visualFor = (id) => OBJ_VISUAL[id] || { icon: 'target', theme: 'blue' }

// What one step of the lesson looks like, in the order the lesson screen shows it.
const STEPS = [
  { icon: 'book', title: 'Read the goal', body: 'It is on the left of the lesson screen.' },
  { icon: 'code', title: 'Write your code', body: 'Type in the editor, or describe it and press Generate / Update.' },
  { icon: 'play', title: 'Press Run / Build', body: 'See your page and check the build log.' },
  { icon: 'check', title: 'Submit & continue', body: 'The tutor checks your work and picks what is next.' },
]

// The help ladder: start at 1 and only go further down if you need to. Every
// item here is a real control on the lesson screen.
const HELP = [
  { icon: 'pencil', tone: 'blue', title: 'Try it yourself', body: 'Give it a go first. Mistakes are how you learn, and Undo is always there.' },
  { icon: 'help', tone: 'amber', title: 'Get a hint', body: 'Reveal one step at a time. Each hint is a nudge, not the answer.' },
  { icon: 'pin', tone: 'violet', title: 'Show me where', body: 'See exactly which line of code and which part of the page to look at.' },
  { icon: 'chat', tone: 'green', title: 'Ask the tutor', body: 'Type a question in your own words. The tutor reads your code before it answers.' },
  { icon: 'undo', tone: 'rose', title: 'Undo or reset', body: 'Step back one change, or start the step over from the beginning.' },
]

const ADAPTS = [
  { icon: 'users', tone: 'blue', title: 'Same objectives for everyone', body: 'You and your classmates work toward the same goals, so nobody races ahead of the class.' },
  { icon: 'lifebuoy', tone: 'amber', title: 'Extra support when you need it', body: 'If a step is tricky, the lesson adds scaffolding instead of moving on.' },
  { icon: 'trending', tone: 'green', title: 'A deeper challenge when you are ready', body: 'Breeze through a skill and you get a deeper version of it to keep things interesting.' },
  { icon: 'chat', tone: 'purple', title: 'An AI Tutor beside you', body: 'Ask anytime and get step-by-step hints that help you learn, not just answers.' },
]

const levelsFor = (objectiveId) => LEVELS.filter((l) => l.objectiveId === objectiveId)
const stateFor = (i, done) => (i < done ? 'done' : i === done ? 'progress' : 'todo')
const coreLevel = (objectiveId) => levelsFor(objectiveId).find((l) => l.tier === 'core') || levelsFor(objectiveId)[0]

// "You've got it when...": read straight from the rubric the checker uses, so
// what the student sees here can never drift from what actually counts.
function criteriaFor(objectiveId) {
  const rubric = coreLevel(objectiveId)?.rubric || {}
  const label = (n) => NEEDLE_INFO[n]?.label ?? n
  return {
    anyOf: !!rubric.anyOf,
    items: [
      ...(rubric.html || []).map((n) => `Your HTML has ${label(n)}`),
      ...(rubric.css || []).map((n) => `Your CSS has ${label(n)}`),
    ],
  }
}

const RING_R = 26
const RING_C = 2 * Math.PI * RING_R

function MiniRing({ pct }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="mr-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f8cff" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r={RING_R} fill="none" stroke="#e3e6ea" strokeWidth="7" />
      {pct > 0 && (
        <circle
          className="cv-mini-bar"
          cx="32"
          cy="32"
          r={RING_R}
          fill="none"
          stroke="url(#mr-grad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(RING_C * pct) / 100} ${RING_C}`}
          transform="rotate(-90 32 32)"
        />
      )}
    </svg>
  )
}

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
  const services = useServices()

  // Progress reflects the services layer (seam 1) via getTree; the `progress`
  // prop is the fallback until getTree resolves.
  const [adapted, setAdapted] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    setLoading(true)
    services
      .getTree({ courseId: COURSE_ID })
      .then((res) => { if (alive) setAdapted(adaptTree(res)) })
      .catch(() => { /* keep the prop fallback */ })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [services])

  const total = LESSON.objectives.length
  const pct = Math.max(0, Math.min(100, adapted ? adapted.progressPercent : progress))
  const exact = (pct / 100) * total
  const done = Math.min(total, Math.floor(exact))
  const partial = done < total ? Math.round((exact - done) * 100) : 0
  const unitName = LESSON.unitTitle.replace(/^Unit \d+\s*·\s*/, '')
  const initials = (user?.username || 'You').slice(0, 2).toUpperCase()
  const finished = done >= total
  const nextObjective = LESSON.objectives[Math.min(done, total - 1)]
  const nextLevel = finished ? null : coreLevel(nextObjective.id)
  const nextVisual = visualFor(nextObjective.id)
  const nextLabel = finished ? 'Review lesson' : done > 0 || partial > 0 ? 'Keep going' : 'Start this step'

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
          <BrandMark size={30} />
          <span className="wf-brand-name">AdaptAI</span>
          <span className="wf-project">Student · Course overview</span>
        </div>
        <div className="wf-actions">
          <button type="button" className="wf-btn wf-btn--light" onClick={onBack}>← Back to dashboard</button>
          <span className="wf-avatar" aria-label={`Signed in as ${user?.username || 'you'}`}>{initials}</span>
        </div>
      </header>

      <main className="cv-page">
        <div className="cv-wrap">
          <div aria-live="polite">
            {loading && <p className="cv-sec-sub" role="status">Loading your progress…</p>}
            {adapted && (
              <SourceBadge source={adapted.source} fallbackActive={adapted.fallbackActive} />
            )}
          </div>
          {/* ---------------- Hero ---------------- */}
          <section className="cv-hero" aria-labelledby="cv-title">
            <div className="cv-hero-inner">
              <div className="cv-hero-text">
                <p className="cv-badge-pill"><Icon name="star" size={13} />Hour of AI 2026</p>
                <h1 id="cv-title" className="cv-title">{LESSON.title}</h1>
                <p className="cv-lede">
                  Build your own webpage with HTML and CSS while an AI Tutor helps you learn, debug,
                  and level up. The lesson adapts to what you show you know: everyone works toward
                  the same objectives, with extra support or a tougher challenge along the way.
                </p>
                <div className="cv-hero-actions">
                  <button type="button" className="cv-cta" onClick={onContinueLesson}>
                    <Icon name="play" size={14} />Continue lesson
                  </button>
                  <button type="button" className="cv-ghost" onClick={showBuild}>
                    See what you'll build<Icon name="arrow" size={15} />
                  </button>
                </div>
              </div>
              <div className="cv-hero-art"><HeroArt /></div>
            </div>
          </section>

          {/* ---------------- Floating stats ---------------- */}
          <ul className="cv-stats" aria-label="Course at a glance">
            <li className="cv-stat">
              <div
                className="cv-mini"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label="Course progress"
              >
                <MiniRing pct={pct} />
              </div>
              <div className="cv-stat-text">
                <span className="cv-stat-label">Course progress</span>
                <span className="cv-stat-value">{pct}%</span>
              </div>
            </li>
            <li className="cv-stat">
              <span className="cv-stat-icon cv-stat-icon--green"><Icon name="award" size={22} /></span>
              <div className="cv-stat-text">
                <span className="cv-stat-label">Objectives mastered</span>
                <span className="cv-stat-value">{done} / {total}</span>
              </div>
            </li>
            <li className="cv-stat">
              <span className="cv-stat-icon cv-stat-icon--blue"><Icon name="clock" size={22} /></span>
              <div className="cv-stat-text">
                <span className="cv-stat-label">Estimated time</span>
                <span className="cv-stat-value">~{LESSON.estimatedMinutes} min</span>
              </div>
            </li>
            <li className="cv-stat">
              <span className="cv-stat-icon cv-stat-icon--violet"><Icon name="layers" size={22} /></span>
              <div className="cv-stat-text">
                <span className="cv-stat-label">Adaptive levels</span>
                <span className="cv-stat-value">{LEVELS.length}</span>
              </div>
            </li>
          </ul>

          {/* ---------------- Up next: what to do right now ---------------- */}
          <section className={`cv-next cv-theme--${nextVisual.theme}`} aria-labelledby="cv-next-h">
            <div className="cv-next-main">
              <p className="cv-next-pill"><Icon name="flag" size={13} />{finished ? 'All objectives mastered' : 'Up next'}</p>
              <h2 id="cv-next-h" className="cv-next-title">{finished ? 'Review or go deeper' : nextObjective.title}</h2>
              {finished ? (
                <p className="cv-next-sub">Revisit any objective, or try a Stretch level for a deeper challenge.</p>
              ) : (
                <>
                  <p className="cv-next-sub">{nextLevel.title} · about {nextObjective.minutes} min</p>
                  <p className="cv-can">
                    <Icon name="checkcircle" size={18} />
                    <span><strong>By the end, I can</strong> {nextObjective.canDo}</span>
                  </p>
                </>
              )}
              <ol className="cv-steps" aria-label="What each step of the lesson looks like">
                {STEPS.map((s, i) => (
                  <li key={s.title}>
                    <span className="cv-step-icon" aria-hidden="true"><Icon name={s.icon} size={16} /></span>
                    <span className="cv-step-text"><strong>{i + 1}. {s.title}</strong><span>{s.body}</span></span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="cv-next-cta">
              <button type="button" className="cv-cta cv-cta--solid" onClick={onContinueLesson}>
                <Icon name="play" size={14} />{nextLabel}
              </button>
              <span className="cv-next-hint">{finished ? 'Jump back in any time.' : 'Your tutor is ready when you are.'}</span>
            </div>
          </section>

          {/* ---------------- Roadmap ---------------- */}
          <section className="cv-section" aria-labelledby="cv-path-h">
            <SectionHead
              id="cv-path-h"
              kicker="YOUR PATH"
              title={`${total} objectives, one project`}
              sub="Everyone works toward the same goals. Here is where you are on the way."
            />
            <ol className="cv-road" aria-label="Your path through the lesson">
              {LESSON.objectives.map((o, i) => {
                const state = stateFor(i, done)
                const v = visualFor(o.id)
                return (
                  <li
                    key={o.id}
                    className={`cv-stop cv-stop--${state} cv-theme--${v.theme}`}
                    style={{ '--fill': `${state === 'progress' ? partial : 0}%` }}
                  >
                    {state === 'progress' && <span className="cv-here"><Icon name="flag" size={12} />You are here</span>}
                    <span className="cv-stop-node" aria-hidden="true">
                      <Icon name={state === 'done' ? 'check' : v.icon} size={26} />
                    </span>
                    <span className="cv-stop-num">Objective {i + 1} · ~{o.minutes} min</span>
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
              kicker="COURSE OUTLINE"
              title="What's inside"
              sub={`Unit 1 · ${unitName} · Lesson 1 · ~${LESSON.estimatedMinutes} min. For each objective: what you will be able to do, how you know you have got it, and the words to learn.`}
            />
            <ul className="cv-key" aria-label="What the level types mean">
              {Object.keys(TIERS).map((t) => (
                <li key={t}>
                  <span className={`cv-tier cv-tier--${t}`}><Icon name={TIERS[t].icon} size={12} />{TIERS[t].label}</span>
                  <span className="cv-key-note">{TIERS[t].note}</span>
                </li>
              ))}
            </ul>

            <ol className="cv-objs">
              {LESSON.objectives.map((o, i) => {
                const state = stateFor(i, done)
                const v = visualFor(o.id)
                const crit = criteriaFor(o.id)
                return (
                  <li key={o.id} className={`cv-oc cv-oc--${state} cv-theme--${v.theme}`}>
                    <div className="cv-oc-side" aria-hidden="true">
                      <span className="cv-oc-num">{String(i + 1).padStart(2, '0')}</span>
                      <Icon name={v.icon} size={30} strokeWidth={1.75} />
                    </div>
                    <div className="cv-oc-body">
                      <div className="cv-oc-head">
                        <div className="cv-oc-text">
                          <h3 className="cv-oc-title">{o.title}</h3>
                          <p className="cv-oc-code">{o.code} · about {o.minutes} min</p>
                        </div>
                        <span className={`cv-state cv-state--${state}`}>{STATE_LABEL[state]}</span>
                      </div>

                      <p className="cv-ican"><Icon name="checkcircle" size={17} /><span><strong>I can</strong> {o.canDo}</span></p>

                      <div className="cv-learn">
                        <section className="cv-learn-col" aria-label={`You have got it when, for ${o.title}`}>
                          <h4 className="cv-h4">You've got it when</h4>
                          <p className="cv-learn-lead">{crit.anyOf ? 'At least one of these is true:' : 'All of these are true:'}</p>
                          <ul className="cv-criteria">
                            {crit.items.map((c) => <li key={c}><Icon name="check" size={14} strokeWidth={2.5} /><span>{c}</span></li>)}
                          </ul>
                        </section>
                        <section className="cv-learn-col" aria-label={`Key words for ${o.title}`}>
                          <h4 className="cv-h4">Key words</h4>
                          <dl className="cv-terms">
                            {o.terms.map((t) => (
                              <div key={t.term}><dt>{t.term}</dt><dd>{t.meaning}</dd></div>
                            ))}
                          </dl>
                        </section>
                      </div>

                      <ul className="cv-levels" aria-label={`Levels for ${o.title}`}>
                        {levelsFor(o.id).map((l) => {
                          const t = TIERS[l.tier]
                          return (
                            <li key={l.id} className={`cv-level cv-level--${l.tier}`}>
                              <div className="cv-level-top">
                                <span className={`cv-tier cv-tier--${l.tier}`}><Icon name={t.icon} size={12} />{t.label}</span>
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
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>

          {/* ---------------- When you get stuck ---------------- */}
          <section className="cv-section" aria-labelledby="cv-stuck-h">
            <SectionHead
              id="cv-stuck-h"
              kicker="GETTING HELP"
              title="Stuck? Here's what to try, in order"
              sub="You do not need to do all of these. Start at 1 and only go further down if you need to. Getting stuck is a normal part of coding."
            />
            <ol className="cv-ladder">
              {HELP.map((h, i) => (
                <li key={h.title} className={`cv-rung cv-rung--${h.tone}`}>
                  <span className="cv-rung-num" aria-hidden="true">{i + 1}</span>
                  <span className="cv-rung-icon" aria-hidden="true"><Icon name={h.icon} size={20} /></span>
                  <p className="cv-rung-title">{h.title}</p>
                  <p className="cv-rung-body">{h.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* ---------------- What you'll build ---------------- */}
          <section id="cv-build" tabIndex={-1} className="cv-build" aria-labelledby="cv-build-h">
            <div className="cv-build-text">
              <p className="cv-kicker">WHAT YOU'LL BUILD</p>
              <h2 id="cv-build-h" className="cv-sec-title">Your own personal website</h2>
              <p className="cv-sec-sub">
                By the end you will have a real page you wrote yourself, with the help of the tutor
                but never copied from it.
              </p>
              <ul className="cv-outcomes">
                {LESSON.objectives.map((o, i) => (
                  <li key={o.id} className={`cv-theme--${visualFor(o.id).theme}`}>
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
            <SectionHead id="cv-adapt-h" kicker="PERSONALISED" title="How this course adapts to you" />
            <ul className="cv-tiles">
              {ADAPTS.map((a) => (
                <li key={a.title} className="cv-tile">
                  <span className={`cv-tile-icon cv-tile-icon--${a.tone}`}><Icon name={a.icon} size={22} /></span>
                  <p className="cv-tile-title">{a.title}</p>
                  <p className="cv-tile-body">{a.body}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* ---------------- Closing call to action ---------------- */}
          <section className="cv-final" aria-labelledby="cv-final-h">
            <div>
              <h2 id="cv-final-h" className="cv-final-title">{finished ? 'You finished the lesson' : 'Ready to keep going?'}</h2>
              <p className="cv-final-sub">
                {finished ? 'Jump back in any time to review or try a stretch level.' : 'Your tutor is ready when you are.'}
              </p>
            </div>
            <button type="button" className="cv-cta" onClick={onContinueLesson}>
              <Icon name="play" size={14} />{finished ? 'Review lesson' : 'Continue lesson'}
            </button>
          </section>
        </div>
      </main>
    </div>
  )
}
