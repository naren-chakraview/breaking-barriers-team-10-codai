import { useCallback, useEffect, useRef, useState } from 'react'
import { LESSON, FIRST_LEVEL_ID, getLevel } from './courseData.js'
import { routeNextLevel, buildNudge } from './engine.js'
import { buildProject } from './tools.js'
import { useServices } from '../services/ServicesContext.jsx'
import { adaptTree, adaptSubmit } from '../services/treeAdapter.js'
import SourceBadge from '../services/SourceBadge.jsx'
import LessonTopBar from './LessonTopBar.jsx'
import LessonPanel from './LessonPanel.jsx'
import RequirementsBox from './RequirementsBox.jsx'
import CodeWorkspace from './CodeWorkspace.jsx'
import Preview from './Preview.jsx'
import Tutor from './Tutor.jsx'
import ProgressReport from './ProgressReport.jsx'
import './lessonTheme.css'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Adaptive Web Lab laid out per wireframe-design.md:
//   top bar  — project, lesson progress, Save / Deploy
//   left     — lesson + objectives + "My outcomes"
//   center   — requirements box, then Code / Files / Build log + status strip
//   right    — live preview, then the AI Tutor
const COURSE_ID = 'hoai2026-adaptive'

export default function WeblabLesson({ user, onExit, onViewSkillTree }) {
  const services = useServices()
  const [levelId, setLevelId] = useState(FIRST_LEVEL_ID)
  const level = getLevel(levelId)

  // Content + progress sourced from the services layer (seam 1). The editor
  // scaffolding (starter code, inline hints, build log) stays UI-local because
  // seam 1 has no equivalent for it; the graded actions below go through services.
  const [tree, setTree] = useState(null)          // adapted TreeResponse
  const [loadingTree, setLoadingTree] = useState(true)
  const [loadError, setLoadError] = useState(null)
  // The seam-1 step the current editor level maps to. Seeded from getTree.current,
  // then advanced by each submitStep response's `next`.
  const [stepRef, setStepRef] = useState({ checkpointId: 'steer-it', stepId: 'steer-it-project' })
  // Latest source/notice/fallback to surface in the badge.
  const [serviceStatus, setServiceStatus] = useState({ source: null, notice: null, fallbackActive: false })

  useEffect(() => {
    let alive = true
    setLoadingTree(true)
    services
      .getTree({ courseId: COURSE_ID })
      .then((res) => {
        if (!alive) return
        const adapted = adaptTree(res)
        setTree(adapted)
        if (adapted.current) setStepRef(adapted.current)
        setServiceStatus({ source: adapted.source, notice: null, fallbackActive: adapted.fallbackActive })
        setLoadError(null)
      })
      .catch((err) => { if (alive) setLoadError(err?.message || 'Could not load the lesson.') })
      .finally(() => { if (alive) setLoadingTree(false) })
    return () => { alive = false }
  }, [services])

  // Code buffers (carried forward across levels) and editor view state.
  const [html, setHtml] = useState(level.starter?.html ?? '')
  const [css, setCss] = useState(level.starter?.css ?? '')
  const [activeFile, setActiveFile] = useState('index.html')
  const [tab, setTab] = useState('code') // code | files | buildLog
  const [editorScrollTop, setEditorScrollTop] = useState(0)

  // Preview + build.
  const [rendered, setRendered] = useState({ html: '', css: '' })
  const [hasOutput, setHasOutput] = useState(false)
  const [outOfDate, setOutOfDate] = useState(false)
  const [device, setDevice] = useState('web')
  const [build, setBuild] = useState({ status: 'idle', log: [] })

  // Save / deploy (mock — nothing is persisted).
  const [saveState, setSaveState] = useState({ status: 'saved' })
  const [deployState, setDeployState] = useState('idle') // idle | deploying | deployed

  // Outcomes + adaptive flow.
  const [completed, setCompleted] = useState({})
  const [mastery, setMastery] = useState(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [history, setHistory] = useState([FIRST_LEVEL_ID])
  const [phase, setPhase] = useState('working') // working | validating | routing | complete
  const [banner, setBanner] = useState(null)
  const [nudge, setNudge] = useState(null)

  // Guidance: manual "show me where", the revealed hint step, undo/reset.
  const [showWhere, setShowWhere] = useState(false)
  const [activeStepTarget, setActiveStepTarget] = useState(null)
  const [undoStack, setUndoStack] = useState([])
  const [levelStart, setLevelStart] = useState({
    html: level.starter?.html ?? '',
    css: level.starter?.css ?? '',
  })

  // Messages to the tutor from other cards, and the progress report modal.
  const [incoming, setIncoming] = useState(null)
  const [reportOpen, setReportOpen] = useState(false)

  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const bannerTimer = useRef(null)
  const flash = useCallback((msg, ms = 4000) => {
    setBanner(msg)
    clearTimeout(bannerTimer.current)
    bannerTimer.current = setTimeout(() => setBanner(null), ms)
  }, [])
  useEffect(() => () => clearTimeout(bannerTimer.current), [])

  // Proactive nudge after a stretch of inactivity (typing resets the timer).
  const idleRef = useRef(null)
  useEffect(() => {
    clearTimeout(idleRef.current)
    if (phase !== 'working' || nudge) return undefined
    idleRef.current = setTimeout(() => setNudge(buildNudge(level, { html, css })), 18000)
    return () => clearTimeout(idleRef.current)
  }, [levelId, phase, nudge, level, html, css])

  // Autosave indicator: edits mark "dirty", then settle to "saved".
  useEffect(() => {
    if (saveState.status !== 'dirty') return undefined
    const t = setTimeout(() => setSaveState({ status: 'saved' }), 1200)
    return () => clearTimeout(t)
  }, [saveState])

  // A hint step that points at a file switches the editor to Code + that file.
  useEffect(() => {
    const f = activeStepTarget?.code?.file
    if (!f) return
    setTab('code')
    setActiveFile(f)
  }, [activeStepTarget])

  const markDirty = () => setSaveState({ status: 'dirty' })

  function loadLevel(next, reason) {
    setLevelId(next.id)
    setHistory((h) => [...h, next.id])
    // Fresh starter if the level ships one; otherwise carry the code forward.
    const startHtml = next.starter ? (next.starter.html ?? '') : html
    const startCss = next.starter ? (next.starter.css ?? '') : css
    if (next.starter) {
      setHtml(startHtml)
      setCss(startCss)
    }
    setLevelStart({ html: startHtml, css: startCss })
    setUndoStack([])
    setPhase('working')
    setNudge(null)
    const labels = {
      support: "Let's try this a different way — here's some extra scaffolding.",
      stretch: "Nice work! Here's a tougher take on the next skill.",
      advance: 'Great — on to the next skill.',
      retry: 'Give it another go. Check the hint if you need it.',
    }
    if (labels[reason]) flash(labels[reason])
  }

  // Run / Build: check both files, write a build log, refresh the preview on
  // success. On failure the preview keeps its last good render.
  async function run() {
    if (build.status === 'building') return
    setBuild({ status: 'building', log: ['Starting build…'] })
    const result = await buildProject({ html, css })
    setBuild({ status: result.ok ? 'passed' : 'failed', log: result.log })
    if (result.ok) {
      setRendered({ html, css })
      setHasOutput(true)
      setOutOfDate(false)
    }
  }

  async function submit() {
    setRendered({ html, css })
    setHasOutput(true)
    setOutOfDate(false)
    setPhase('validating')

    // Send the submission through the services layer (seam 1) instead of the
    // local engine. Project steps submit as kind 'prompt' with the current code.
    let res
    try {
      const raw = await services.submitStep({
        stepId: stepRef.stepId,
        courseId: COURSE_ID,
        checkpointId: stepRef.checkpointId,
        kind: 'prompt',
        text: `Submission for ${level.title}`,
        project: { html, css, js: '' },
      })
      res = adaptSubmit(raw)
    } catch (err) {
      setPhase('working')
      flash(err?.message || 'We could not check your work just now — your code is safe. Try again.', 6000)
      return
    }

    // masteryDisplay is display-only (C-11): show it verbatim, never decreasing.
    if (typeof res.mastery === 'number') setMastery(res.mastery)
    if (res.completed) setCompleted((c) => ({ ...c, [level.objectiveId]: true }))
    setServiceStatus({ source: res.source, notice: res.notice, fallbackActive: res.outcome === 'fallback' })

    // A 'blocked' submission did not score: keep the student on this step.
    if (res.outcome === 'blocked') {
      setPhase('working')
      return
    }
    // For 'fallback' we still continue along the standard path (next target).
    if (res.next) setStepRef({ checkpointId: res.next.checkpointId, stepId: res.next.stepId })

    setPhase('routing')
    // The editor scaffolding is UI-local, so the local router still chooses which
    // starter/hint level to show next; the service response drives grading above.
    const signal = { objectiveId: level.objectiveId, passing: res.completed || typeof res.mastery === 'number', score: res.mastery ?? 0 }
    const result = await routeNextLevel(level, signal, history)
    if (result.reason === 'complete') {
      setPhase('complete')
      setBanner(null)
      return
    }
    loadLevel(result.level, result.reason)
  }

  // Edits, undo and reset.
  const activeCode = activeFile === 'styles.css' ? css : html
  function onEdit(val) {
    setUndoStack((st) => [...st.slice(-49), { html, css }])
    if (activeFile === 'styles.css') setCss(val)
    else setHtml(val)
    setOutOfDate(true)
    markDirty()
  }
  function undo() {
    setUndoStack((st) => {
      if (st.length === 0) return st
      const prev = st[st.length - 1]
      setHtml(prev.html)
      setCss(prev.css)
      setOutOfDate(true)
      markDirty()
      return st.slice(0, -1)
    })
  }
  function resetLevel() {
    setHtml(levelStart.html)
    setCss(levelStart.css)
    setUndoStack([])
    setOutOfDate(true)
    markDirty()
  }
  const canUndo = undoStack.length > 0
  const isDirty = html !== levelStart.html || css !== levelStart.css

  // Requirements box: draft code from plain language (undoable). Routed through the
  // services layer: verify the prompt first (P-7.1), then generate (P-7.2) only if
  // the verifier says it is clear enough.
  async function generate(text) {
    if (isDirty && !window.confirm('Generate will replace the code in your editor. You can Undo it afterwards. Continue?')) {
      return { cancelled: true }
    }
    let verify
    try {
      verify = await services.verifyPrompt({
        courseId: COURSE_ID,
        checkpointId: stepRef.checkpointId,
        stepId: stepRef.stepId,
        prompt: text,
      })
    } catch (err) {
      setIncoming({ id: Date.now(), kind: 'say', text: err?.message || 'The verifier is unavailable right now. Try again shortly.' })
      return { cancelled: true }
    }
    setServiceStatus((s) => ({ ...s, source: verify.source, notice: verify.notice }))
    if (verify.verdict === 'needs_narrowing') {
      // Do NOT generate: show the narrowing guidance in the tutor and stop.
      setIncoming({ id: Date.now(), kind: 'say', text: verify.guidance })
      return { cancelled: true }
    }

    let gen
    try {
      gen = await services.generate({
        courseId: COURSE_ID,
        checkpointId: stepRef.checkpointId,
        stepId: stepRef.stepId,
        prompt: text,
        project: { html, css, js: '' },
      })
    } catch (err) {
      setIncoming({ id: Date.now(), kind: 'say', text: err?.message || 'Code generation is unavailable right now. Your text is still here.' })
      return { cancelled: true }
    }
    setServiceStatus((s) => ({ ...s, source: gen.source, notice: gen.notice }))
    if (!gen.project) {
      setIncoming({ id: Date.now(), kind: 'say', text: gen.explanation || 'No code was generated this time.' })
      return { cancelled: true }
    }
    setUndoStack((st) => [...st.slice(-49), { html, css }])
    setHtml(gen.project.html ?? '')
    setCss(gen.project.css ?? '')
    setOutOfDate(true)
    markDirty()
    setTab('code')
    setActiveFile('index.html')
    setIncoming({ id: Date.now(), kind: 'say', text: gen.explanation })
    return { cancelled: false }
  }
  const askFromRequirements = (text) => setIncoming({ id: Date.now(), kind: 'ask', text })

  // Tutor question routed through the services layer (seam 1). Returns the reply
  // text; a local hint still accompanies it so the step-by-step guidance works.
  const askTutorService = useCallback(async (question) => {
    try {
      const res = await services.askTutor({
        courseId: COURSE_ID,
        checkpointId: stepRef.checkpointId,
        stepId: stepRef.stepId,
        question,
      })
      setServiceStatus((s) => ({ ...s, source: res.source, notice: res.notice ?? s.notice }))
      return { reply: res.answer, hint: level.hint }
    } catch (err) {
      return { reply: err?.message || 'The tutor is unavailable right now. Try again shortly.', hint: null }
    }
  }, [services, stepRef, level.hint])

  // Save + Deploy (mock).
  function save() { setSaveState({ status: 'saved' }); flash('Saved.', 2000) }
  async function deploy() {
    if (deployState === 'deploying') return
    if (build.status !== 'passed') {
      flash('Press ▶ Run / Build and get a passing build before you deploy.')
      return
    }
    setDeployState('deploying')
    await sleep(1400)
    setDeployState('deployed')
    flash(`Deployed! Your site is live at ${url}`, 6000)
  }

  const slug = (user?.username || 'you').split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'you'
  const url = `codeai.dev/u/${slug}/my-site`

  // Inline guidance: the revealed hint step wins; otherwise the manual toggle.
  const stepCode = activeStepTarget?.code || null
  const stepWeb = activeStepTarget?.web || null
  const codeTarget = tab !== 'code' ? null : stepCode
    ? (stepCode.file === activeFile ? stepCode : null)
    : (showWhere && level.targets?.code?.file === activeFile ? level.targets.code : null)
  const webHighlight = stepWeb || (showWhere ? level.targets?.web : null)

  const completedCount = Object.keys(completed).length
  const totalObjectives = LESSON.objectives.length
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

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
            <div><strong>{clock}</strong><span>time on task</span></div>
          </div>
          <button type="button" className="btn btn--primary" onClick={onExit}>Back to dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="wf wfl">
      <LessonTopBar
        user={user}
        completedCount={completedCount}
        total={totalObjectives}
        onExit={onExit}
        onViewSkillTree={onViewSkillTree}
        saveStatus={saveState.status}
        onSave={save}
        deployState={deployState}
        onDeploy={deploy}
      />

      {banner && <div className="wf-banner" role="status">{banner}</div>}

      <div className="wf-banner-wrap" aria-live="polite">
        {loadingTree && <div className="wf-banner" role="status">Loading your lesson…</div>}
        {loadError && <div className="wf-banner" role="alert">{loadError}</div>}
        <SourceBadge
          source={serviceStatus.source}
          notice={serviceStatus.notice}
          fallbackActive={serviceStatus.fallbackActive}
        />
      </div>

      <main className="wf-grid">
        <div className="wf-col wf-col--left">
          <LessonPanel
            lesson={LESSON}
            level={level}
            completed={completed}
            mastery={mastery}
            hintsUsed={hintsUsed}
            seconds={seconds}
            onOpenReport={() => setReportOpen(true)}
          />
        </div>

        <div className="wf-col wf-col--center">
          <RequirementsBox onGenerate={generate} onAsk={askFromRequirements} />
          <CodeWorkspace
            tab={tab}
            onTab={setTab}
            activeFile={activeFile}
            onActiveFile={setActiveFile}
            files={{ 'index.html': html, 'styles.css': css }}
            activeCode={activeCode}
            onChange={onEdit}
            scrollTop={editorScrollTop}
            onScroll={setEditorScrollTop}
            codeTarget={codeTarget}
            showWhere={showWhere}
            onToggleWhere={() => setShowWhere((v) => !v)}
            canUndo={canUndo}
            onUndo={undo}
            isDirty={isDirty}
            onReset={resetLevel}
            phase={phase}
            onRun={run}
            onSubmit={submit}
            build={build}
            url={url}
            saveStatus={saveState.status}
            deployState={deployState}
            onShowLog={() => setTab('buildLog')}
          />
        </div>

        <div className="wf-col wf-col--right">
          <Preview
            html={rendered.html}
            css={rendered.css}
            device={device}
            onDeviceChange={setDevice}
            outOfDate={outOfDate}
            hasOutput={hasOutput}
            highlight={hasOutput ? webHighlight : null}
            url={url}
          />
          <Tutor
            level={level}
            code={{ html, css }}
            nudge={nudge}
            onDismissNudge={() => setNudge(null)}
            onHintRevealed={() => setHintsUsed((n) => n + 1)}
            onActiveStepTarget={setActiveStepTarget}
            incoming={incoming}
            onAsk={askTutorService}
          />
        </div>
      </main>

      <ProgressReport
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        lesson={LESSON}
        completed={completed}
        mastery={mastery}
        hintsUsed={hintsUsed}
        timeLabel={clock}
        levelsVisited={history.length}
      />
    </div>
  )
}
