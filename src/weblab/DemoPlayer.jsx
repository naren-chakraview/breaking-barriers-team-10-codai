import { useEffect, useRef, useState } from 'react'

// Dock + fake cursor that plays a scripted scenario against the real lesson.
// The script talks to a small driver (say / type / click / hint ...). All
// waiting goes through `wait`, which honors Pause, Speed and Stop.

const CANCEL = new Error('demo-cancelled')
const TIER = {
  support: { label: 'Slower · extra help', cls: 'support' },
  core: { label: 'Standard pace', cls: 'core' },
  stretch: { label: 'Deeper challenge', cls: 'stretch' },
}
const WHY = {
  support: 'Missed it, so an easier version of the same skill',
  retry: 'Still not there, so the same step again with help',
  advance: 'Passed, so on to the next skill',
  stretch: 'Full marks with no hints, so a deeper challenge',
}
const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function DemoPlayer({ scenario, api, onExit, onPick, onReplay }) {
  const [caption, setCaption] = useState({ title: scenario.name, text: scenario.blurb })
  const [status, setStatus] = useState('playing') // playing | paused | done | error
  const [speed, setSpeed] = useState(1)
  const [snap, setSnap] = useState({ ...api.current.live.current })
  const [cursor, setCursor] = useState({ x: 0, y: 0, show: false, tap: 0 })
  const ctl = useRef({ paused: false, speed: 1, skip: false })
  const dockRef = useRef(null)

  // Mirror the session's live signals into the dock a few times a second.
  useEffect(() => {
    const t = setInterval(() => setSnap({ ...api.current.live.current }), 250)
    return () => clearInterval(t)
  }, [api])

  useEffect(() => {
    const token = { cancelled: false }
    const c = ctl.current
    const reduced = reduceMotion()
    const root = () => api.current.rootRef.current
    const live = () => api.current.live.current

    async function wait(ms, { skippable = false } = {}) {
      let left = ms
      while (left > 0) {
        if (token.cancelled) throw CANCEL
        await new Promise((r) => setTimeout(r, 50))
        if (skippable && c.skip) break
        if (!c.paused) left -= 50 * c.speed
      }
      c.skip = false
      if (token.cancelled) throw CANCEL
    }

    async function waitFor(test, what, timeout = 20000) {
      let spent = 0
      while (!test(live())) {
        await wait(100)
        spent += 100
        if (spent > timeout) throw new Error(`Timed out waiting for ${what}`)
      }
    }

    const findButton = (re) =>
      [...(root()?.querySelectorAll('button') || [])].find((b) => re.test(b.textContent || ''))

    async function moveTo(el) {
      el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
      const r = el.getBoundingClientRect()
      setCursor((cur) => ({ ...cur, x: r.left + Math.min(r.width / 2, 60), y: r.top + r.height / 2, show: true }))
      await wait(reduced ? 80 : 650)
    }
    async function press(el) {
      await moveTo(el)
      setCursor((cur) => ({ ...cur, tap: cur.tap + 1 }))
      await wait(reduced ? 60 : 250)
      el.click()
    }
    async function clickButton(re, what) {
      await waitFor(() => { const b = findButton(re); return b && !b.disabled }, what)
      await press(findButton(re))
    }

    const driver = {
      live,
      waitFor,
      async say(text, opts = {}) {
        setCaption({ title: opts.title || null, text })
        if (opts.hold) return
        await wait(1800 + text.length * 38, { skippable: true })
      },
      async type(file, text) {
        api.current.setBuffer(file, live()[file === 'styles.css' ? 'css' : 'html'])
        await wait(150)
        const ta = root()?.querySelector('textarea.wf-textarea')
        if (ta) await moveTo(ta)
        const step = reduced ? text.length : 3 * c.speed
        for (let i = 0; i < text.length; i += step) {
          api.current.setBuffer(file, text.slice(0, i + step))
          await wait(40)
        }
        api.current.setBuffer(file, text)
        await wait(300)
      },
      async run() {
        await clickButton(/Run \/ Build/, 'the Run button')
        await wait(200)
        await waitFor((l) => l.buildStatus !== 'building', 'the build')
        await wait(500)
      },
      async showLog() {
        await clickButton(/^Build log$/, 'the Build log tab')
        await wait(400)
      },
      async submit() {
        await clickButton(/Submit & continue/, 'the Submit button')
        await wait(400)
      },
      async hint() {
        await clickButton(/Get a hint|Next hint step/, 'the hint button')
        await wait(500)
      },
      async ask(text) {
        const input = root()?.querySelector('.wf-chat-input input')
        if (input) await moveTo(input)
        api.current.ask(text)
        await wait(1800)
      },
    }

    setStatus('playing')
    scenario.play(driver).then(
      () => { if (!token.cancelled) { setStatus('done'); setCursor((cur) => ({ ...cur, show: false })) } },
      (err) => {
        if (err === CANCEL || token.cancelled) return
        setCaption({ title: 'The demo stopped', text: `Something got in the way (${err.message}). You can replay it or go back to your lesson.` })
        setStatus('error')
        setCursor((cur) => ({ ...cur, show: false }))
      },
    )
    return () => { token.cancelled = true }
  }, [scenario, api])

  // Escape stops the demo. While it plays, keystrokes aimed at the lesson
  // are swallowed so the viewer cannot disturb it; the dock stays usable.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { onExit(); return }
      if (dockRef.current?.contains(e.target)) return
      if (e.key === 'Tab' || e.key.startsWith('Shift')) return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onExit])

  useEffect(() => { dockRef.current?.querySelector('button')?.focus() }, [])

  const togglePause = () => {
    ctl.current.paused = !ctl.current.paused
    setStatus(ctl.current.paused ? 'paused' : 'playing')
  }
  const toggleSpeed = () => {
    const next = speed === 1 ? 2 : 1
    ctl.current.speed = next
    setSpeed(next)
  }
  const finished = status === 'done' || status === 'error'
  const tier = TIER[snap.tier] || TIER.core
  const other = scenario.id === 'steady' ? 'Quick Quinn' : 'Steady Sam'
  const flagged = (snap.streak || 0) >= 2
  const route = snap.lastRoute

  return (
    <>
      <div className="demo-shield" aria-hidden="true" />
      {cursor.show && (
        <div className="demo-cursor" style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }} aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L9.4 19z" fill="#fff" stroke="#111827" strokeWidth="1.6" strokeLinejoin="round" /></svg>
          <span key={cursor.tap} className={cursor.tap ? 'demo-tap' : ''} />
        </div>
      )}

      <section className="demo-dock" ref={dockRef} aria-label={`Demo: ${scenario.name}`}>
        <div className="demo-main">
          <p className="demo-eyebrow">
            <span className="demo-live" aria-hidden="true" />
            Demo · {scenario.name} · {scenario.tagline}
          </p>
          {caption.title && <h2 className="demo-title">{caption.title}</h2>}
          <p className="demo-text" role="status" aria-live="polite">{caption.text}</p>
          <div className="demo-controls">
            {!finished && (
              <>
                <button type="button" className="demo-btn demo-btn--primary" onClick={togglePause}>
                  {status === 'paused' ? '▶ Resume' : '❚❚ Pause'}
                </button>
                <button type="button" className="demo-btn" onClick={() => { ctl.current.skip = true }}>Skip ▸</button>
                <button type="button" className="demo-btn" onClick={toggleSpeed} aria-pressed={speed === 2}>
                  Speed {speed}×
                </button>
              </>
            )}
            {finished && (
              <>
                <button type="button" className="demo-btn demo-btn--primary" onClick={onReplay}>↺ Replay</button>
                <button type="button" className="demo-btn" onClick={onPick}>Watch {other}</button>
              </>
            )}
            <button type="button" className="demo-btn demo-btn--quiet" onClick={onExit}>
              {finished ? 'Back to my lesson' : 'Stop demo'}
            </button>
          </div>
        </div>

        <dl className="demo-signals" aria-label="What the lesson is tracking">
          <div className="demo-sig demo-sig--wide">
            <dt>Pace</dt>
            <dd><span className={`demo-pill demo-pill--${tier.cls}`}>{tier.label}</span></dd>
          </div>
          <div className="demo-sig"><dt>Best score</dt><dd>{snap.topScore ?? '—'}<small> never drops</small></dd></div>
          <div className="demo-sig"><dt>Hints used</dt><dd>{snap.hintsUsed}<small> ({snap.levelHints} this step)</small></dd></div>
          <div className="demo-sig"><dt>Misses in a row</dt><dd>{snap.streak}</dd></div>
          <div className="demo-sig"><dt>Steps taken</dt><dd>{snap.levelsVisited}</dd></div>
          {flagged && (
            <div className="demo-sig demo-sig--wide"><dt>Teacher</dt><dd><span className="demo-pill demo-pill--flag">Remediation flag raised</span></dd></div>
          )}
          <div className="demo-sig demo-sig--wide demo-why">
            <dt>Last decision</dt>
            <dd>{route ? WHY[route.reason] || route.reason : 'Waiting for the first answer'}</dd>
          </div>
        </dl>
      </section>
    </>
  )
}
