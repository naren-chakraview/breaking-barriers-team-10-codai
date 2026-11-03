import { useEffect, useRef, useState } from 'react'
import { LESSON, FIRST_LEVEL_ID, getLevel } from './courseData.js'
import { validateSubmission, routeNextLevel, buildNudge } from './engine.js'
import Preview from './Preview.jsx'
import Tutor from './Tutor.jsx'

// Adaptive Web Lab, styled to match the CodeAI studio layout:
//  top bar  — CODE∆I logo, skill-tree / project pills, user menu
//  left     — AI TUTOR (chat, scaffolded hints, adaptive tracking)
//  center   — WORKSPACE (Code/Preview/Split toggles, Files, tabs, editor)
//  right    — browser-style live preview
export default function WeblabLesson({ user, onExit }) {
  const [levelId, setLevelId] = useState(FIRST_LEVEL_ID)
  const level = getLevel(levelId)

  const [html, setHtml] = useState(level.starter?.html ?? '')
  const [css, setCss] = useState(level.starter?.css ?? '')
  const [activeFile, setActiveFile] = useState('index.html')
  const [workspaceView, setWorkspaceView] = useState('split') // code | preview | split

  const [rendered, setRendered] = useState({ html: '', css: '' })
  const [outOfDate, setOutOfDate] = useState(false)

  const [completed, setCompleted] = useState({})
  const [mastery, setMastery] = useState(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [history, setHistory] = useState([FIRST_LEVEL_ID])

  const [phase, setPhase] = useState('working') // working | validating | routing | complete
  const [banner, setBanner] = useState(null)
  const [nudge, setNudge] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const idleRef = useRef(null)
  useEffect(() => {
    clearTimeout(idleRef.current)
    if (phase !== 'working' || nudge) return
    idleRef.current = setTimeout(() => setNudge(buildNudge(level)), 18000)
    return () => clearTimeout(idleRef.current)
  }, [levelId, phase, nudge, level])

  function loadLevel(next, reason) {
    setLevelId(next.id)
    setHistory((h) => [...h, next.id])
    if (next.starter) {
      setHtml(next.starter.html ?? '')
      setCss(next.starter.css ?? '')
    }
    setPhase('working')
    setNudge(null)
    const labels = {
      support: "Let's try this a different way — here's some extra scaffolding.",
      stretch: "Nice work! Here's a tougher take on the next skill.",
      advance: 'Great — on to the next skill.',
      retry: 'Give it another go. Check the hint if you need it.',
    }
    setBanner(labels[reason] ?? null)
    setTimeout(() => setBanner(null), 4000)
  }

  function run() {
    setRendered({ html, css })
    setOutOfDate(false)
  }

  async function submit() {
    setRendered({ html, css })
    setOutOfDate(false)
    setPhase('validating')
    const signal = await validateSubmission(level, { html, css })
    setMastery(signal.score)
    if (signal.passing) setCompleted((c) => ({ ...c, [level.objectiveId]: true }))
    setPhase('routing')
    const result = await routeNextLevel(level, signal, history)
    if (result.reason === 'complete') {
      setPhase('complete')
      setBanner(null)
      return
    }
    loadLevel(result.level, result.reason)
  }

  const completedCount = Object.keys(completed).length
  const totalObjectives = LESSON.objectives.length
  const timeStr = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const busy = phase === 'validating' || phase === 'routing'

  const activeCode = activeFile === 'styles.css' ? css : html
  const setActiveCode = (val) => {
    if (activeFile === 'styles.css') setCss(val)
    else setHtml(val)
    setOutOfDate(true)
  }
  const lineCount = activeCode.split('\n').length

  if (phase === 'complete') {
    return (
      <div className="ca-complete">
        <div className="card wl-complete-card">
          <span className="badge badge--student">lesson complete</span>
          <h1 className="title">Nice work, {user?.username || 'coder'}! 🎉</h1>
          <p className="subtitle">You completed all {totalObjectives} objectives in {LESSON.title}.</p>
          <div className="wl-complete-stats">
            <div><strong>{completedCount}/{totalObjectives}</strong><span>objectives</span></div>
            <div><strong>{mastery ?? 0}</strong><span>mastery</span></div>
            <div><strong>{hintsUsed}</strong><span>hints used</span></div>
            <div><strong>{timeStr}</strong><span>time on task</span></div>
          </div>
          <button type="button" className="btn btn--primary" onClick={onExit}>Back to dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="ca">
      <header className="ca-topbar">
        <div className="ca-logo">CODE<span className="ca-logo-tri">∆</span>I</div>
        <div className="ca-topbar-center">
          <button type="button" className="ca-pill">⛏ View skill tree</button>
          <button type="button" className="ca-pill ca-pill--project">My Project ☁</button>
        </div>
        <div className="ca-topbar-right">
          <div className="ca-user" onClick={() => setMenuOpen((o) => !o)}>
            {user?.username || 'Student'} ▾
            {menuOpen && (
              <div className="ca-user-menu">
                <button type="button" onClick={onExit}>Exit to dashboard</button>
              </div>
            )}
          </div>
          <button type="button" className="ca-icon" aria-label="Help">?</button>
          <button type="button" className="ca-icon" aria-label="Menu">☰</button>
        </div>
      </header>

      {banner && <div className="ca-banner" role="status">{banner}</div>}

      <div className="ca-columns">
        <Tutor
          level={level}
          objectives={LESSON.objectives}
          completed={completed}
          mastery={mastery}
          hintsUsed={hintsUsed}
          timeStr={timeStr}
          nudge={nudge}
          onDismissNudge={() => setNudge(null)}
          onHintRevealed={() => setHintsUsed((n) => n + 1)}
          onBackToMap={onExit}
        />

        <main className="ca-workspace">
          <div className="ca-ws-head">
            <div className="ca-ws-toggles" role="group" aria-label="Workspace view">
              <button type="button" className={`ca-ws-toggle ${workspaceView === 'code' ? 'is-active' : ''}`} onClick={() => setWorkspaceView('code')}>&lt;/&gt; Code</button>
              <button type="button" className={`ca-ws-toggle ${workspaceView === 'preview' ? 'is-active' : ''}`} onClick={() => setWorkspaceView('preview')}>◉ Preview</button>
              <button type="button" className={`ca-ws-toggle ${workspaceView === 'split' ? 'is-active' : ''}`} onClick={() => setWorkspaceView('split')}>▣ Split View</button>
            </div>
            <span className="ca-ws-label">WORKSPACE</span>
          </div>

          <div className={`ca-ws-body ca-ws-body--${workspaceView}`}>
            {workspaceView !== 'preview' && (
              <div className="ca-editor-wrap">
                <aside className="ca-files">
                  <div className="ca-files-head">
                    <span>Files</span>
                    <span className="ca-files-ctl">+ ⇤</span>
                  </div>
                  <ul className="ca-files-list">
                    {['index.html', 'styles.css'].map((f) => (
                      <li key={f}>
                        <button type="button" className={`ca-file ${activeFile === f ? 'is-active' : ''}`} onClick={() => setActiveFile(f)}>📄 {f}</button>
                      </li>
                    ))}
                  </ul>
                </aside>

                <div className="ca-editor">
                  <div className="ca-tabs">
                    {['index.html', 'styles.css'].map((f) => (
                      <button key={f} type="button" className={`ca-tab ${activeFile === f ? 'is-active' : ''}`} onClick={() => setActiveFile(f)}>
                        {f} <span className="ca-tab-x">×</span>
                      </button>
                    ))}
                  </div>
                  <div className="ca-code">
                    <div className="ca-gutter" aria-hidden="true">
                      {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
                    </div>
                    <textarea
                      className="ca-code-area"
                      aria-label={`${activeFile} editor`}
                      spellCheck={false}
                      value={activeCode}
                      onChange={(e) => setActiveCode(e.target.value)}
                    />
                  </div>
                  <div className="ca-runbar">
                    <button type="button" className="ca-btn ca-btn--outline ca-btn--sm" onClick={run} disabled={busy}>▸ Run</button>
                    <button type="button" className="ca-btn ca-btn--primary ca-btn--sm" onClick={submit} disabled={busy}>
                      {phase === 'validating' ? 'Checking…' : phase === 'routing' ? 'Finding next step…' : 'Submit & continue'}
                    </button>
                    {busy && <span className="ca-run-status">{phase === 'validating' ? 'AI is checking your work…' : 'Choosing your next step…'}</span>}
                  </div>
                </div>
              </div>
            )}

            {workspaceView !== 'code' && (
              <Preview html={rendered.html} css={rendered.css} onRun={run} outOfDate={outOfDate} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
