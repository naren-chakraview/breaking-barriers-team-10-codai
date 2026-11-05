import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FIRST_LEVEL_ID, getLevel as baseGetLevel } from './courseData.js'
import { buildTreeLesson, startLevelId } from './treeLesson.js'
import { buildNudge, describeRoute } from './engine.js'
import { readProgress, writeProgress } from './progressStore.js'
import { buildProject } from './tools.js'
import { useServices } from '../services/ServicesContext.jsx'
import { adaptTree, adaptSubmit } from '../services/treeAdapter.js'
import { useHealthRecheck } from '../services/healthRecheck.js'
import SourceBadge from '../services/SourceBadge.jsx'
import LessonTopBar from './LessonTopBar.jsx'
import LessonPanel from './LessonPanel.jsx'
import RequirementsBox from './RequirementsBox.jsx'
import TaskCard from './TaskCard.jsx'
import LearnCard from './LearnCard.jsx'
import IntroDiagnostic from './IntroDiagnostic.jsx'
import IntroInterests from './IntroInterests.jsx'
import { readProfile, writeProfile } from './profileStore.js'
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

  // Gates are driven purely by stored state: the interests quiz shows only if no
  // profile is saved, and the skill check only if no placement is saved. App
  // clears both when the student presses "Start lesson", so a fresh start re-asks
  // them; "Continue" (and any reload/remount) leaves the saved state intact and
  // skips straight into the lesson. Seeding from storage once means a remount can
  // never bounce the student back to the quizzes.
  const [profile, setProfile] = useState(() => readProfile(user?.username))
  const [interestsDone, setInterestsDone] = useState(() => !!readProfile(user?.username))
  const [diagnosticDone, setDiagnosticDone] = useState(() => !!readProgress(user?.username)?.placedTier)

  // The lesson itself is BUILT from the four inputs (teacher assignment, skill-
  // check tier, interests profile, learn-focus), not read from a static table.
  // The lesson the student works through is BUILT FROM THE AUTHORITATIVE SKILL TREE
  // (C-6, C-7): objectives are the tree's skill checkpoints and levels are their steps,
  // with real instructions/panels/questions — not the invented courseData HTML lesson.
  // The raw tree arrives from getTree (async); until it loads we show a loading banner.
  const [rawTree, setRawTree] = useState(null)
  const built = useMemo(() => (rawTree ? buildTreeLesson(rawTree) : null), [rawTree])
  const LESSON = built?.lesson || { objectives: [], title: 'Loading…', unitTitle: '', projectTitle: '' }
  const getLevel = (id) => built?.byStep[id] || baseGetLevel(id)

  const [levelId, setLevelId] = useState(null)
  const level = getLevel(levelId) || { objectiveId: null, title: '', instructions: '', starter: null }

  const [lessonSeen, setLessonSeen] = useState({})
  const learning = level && !lessonSeen[level.objectiveId]
  const markLessonSeen = () => setLessonSeen((m) => ({ ...m, [level.objectiveId]: true }))

  function applyInterests(answers) {
    const record = writeProfile(user?.username, answers)
    setProfile(record)
    setInterestsDone(true)
  }
  function skipInterests() {
    setInterestsDone(true)
  }

  function applyDiagnostic(result) {
    // The server owns placement/routing; the diagnostic result is recorded for the
    // dashboard. The lesson starts at getTree.current (seeded on load).
    writeProgress(user?.username, { started: true, placedTier: result?.tier || 'core' })
    setDiagnosticDone(true)
  }
  function skipDiagnostic() {
    writeProgress(user?.username, { started: true, placedTier: 'core' })
    setDiagnosticDone(true)
  }
  const reviewLesson = () => setLessonSeen((m) => ({ ...m, [level.objectiveId]: false }))

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

  // Load (or reload) the tree from the services layer. Reused on mount and when health
  // recovers, so resuming adaptive mode is just a fresh getTree (C-23, F-14.5).
  const refreshTree = useCallback(() => {
    setLoadingTree(true)
    return services
      .getTree({ courseId: COURSE_ID })
      .then((res) => {
        const adapted = adaptTree(res)
        setTree(adapted)
        setRawTree(res?.tree || null)
        if (adapted.current) setStepRef(adapted.current)
        // Seed the starting step from the server's routing pointer (else the first step),
        // but only once — don't yank the student back when they reload mid-lesson.
        const tl = res?.tree ? buildTreeLesson(res.tree) : null
        if (tl) {
          setLevelId((cur) => cur || startLevelId(tl, res.current))
        }
        setServiceStatus({ source: adapted.source, notice: null, fallbackActive: adapted.fallbackActive })
        setLoadError(null)
        return adapted
      })
      .catch((err) => { setLoadError(err?.message || 'Could not load the lesson.'); return null })
      .finally(() => { setLoadingTree(false) })
  }, [services])

  useEffect(() => { refreshTree() }, [refreshTree])

  // C-23 / F-14.4: while on the fallback path, re-check health every 30 s and resume
  // adaptive mode automatically when the service is healthy again — no reload needed.
  useHealthRecheck({
    active: serviceStatus.fallbackActive,
    health: services.health,
    onRecover: () => { refreshTree() },
  })

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
  // Per-step performance: hints and attempts on the CURRENT level, a running
  // best mastery, and a full log of every step for the progress report.
  const [levelHints, setLevelHints] = useState(0)
  const [levelAttempts, setLevelAttempts] = useState(0)
  const [bestMastery, setBestMastery] = useState(0)
  const [stepLog, setStepLog] = useState([])
  const levelStartRef = useRef(Date.now())
  // Diagnostic placement + confidence probing (diagnostic-placement feature).
  const [confidence, setConfidence] = useState({})   // objectiveId -> high|borderline|low
  const [probeCount, setProbeCount] = useState({})    // objectiveId -> consecutive probes
  const [established, setEstablished] = useState({})  // objectiveId -> highest tier reached
  const [placements, setPlacements] = useState({})    // objectiveId -> { tier, reason }
  const [shownIds, setShownIds] = useState([FIRST_LEVEL_ID])
  const probeSeedRef = useRef(0)
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

  // Persist that the lesson has been started so the dashboard reflects real state.
  useEffect(() => { writeProgress(user?.username, { started: true }) }, [user])

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
    if (!next) { setPhase('complete'); setBanner(null); return }
    setLevelId(next.id)
    setHistory((h) => [...h, next.id])
    // Carry the project forward across steps (the tree steps have no per-step starter).
    setLevelStart({ html, css })
    setUndoStack([])
    setLevelHints(0)
    setLevelAttempts(0)
    levelStartRef.current = Date.now()
    setPhase('working')
    setNudge(null)
    if (reason) flash(reason, 5000)
  }

  // Advance to the next step. The server's routing decides the next CHECKPOINT
  // (via submitStep.next / getTree.current); within a checkpoint we walk the tree's
  // step order. `nextRef` is {checkpointId, stepId} from the submit response, or null.
  function advance(nextRef) {
    const levels = built?.levels || []
    const idx = levels.findIndex((l) => l.id === levelId)
    // Prefer the next step in the SAME checkpoint (tree order).
    const sameCp = levels[idx + 1]
    if (sameCp && sameCp.checkpointId === level.checkpointId) {
      return loadLevel(sameCp, null)
    }
    // Otherwise jump to the server's next checkpoint's first step.
    if (nextRef?.stepId && built?.byStep[nextRef.stepId]) {
      return loadLevel(built.byStep[nextRef.stepId], nextRef.reason)
    }
    // Fall back to the next level in tree order, else complete.
    return loadLevel(levels[idx + 1] || null, null)
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

    const attempts = levelAttempts + 1
    setLevelAttempts(attempts)

    // Grade through the services layer against the authoritative curriculum (C-14):
    // project steps go to the validator; questions/panels/review record completion.
    // The server also routes (C-18/C-19) and returns the next step.
    let res
    try {
      const raw = await services.submitStep({
        courseId: COURSE_ID,
        checkpointId: level.checkpointId,
        stepId: level.id,
        kind: level.project ? 'prompt' : 'complete',
        text: level.project ? `Submission for ${level.title}` : undefined,
        project: level.project ? { html, css, js: '' } : undefined,
      })
      res = adaptSubmit(raw)
    } catch (err) {
      setPhase('working')
      flash(err?.message || 'We could not check your work just now — your code is safe. Try again.', 6000)
      return
    }

    // masteryDisplay is display-only (C-11): show it verbatim, never decreasing.
    if (typeof res.mastery === 'number') {
      setMastery(res.mastery)
      setBestMastery((m) => Math.max(m, res.mastery))
    }
    if (res.completed) setCompleted((c) => ({ ...c, [level.objectiveId]: true }))
    setServiceStatus({ source: res.source, notice: res.notice, fallbackActive: res.outcome === 'fallback' })

    writeProgress(user?.username, {
      bestMastery: typeof res.mastery === 'number' ? Math.max(bestMastery, res.mastery) : bestMastery,
      completed: res.completed ? { [level.objectiveId]: true } : {},
    })

    // Record this step for the progress report.
    const secondsOnStep = Math.max(1, Math.round((Date.now() - levelStartRef.current) / 1000))
    setStepLog((log) => [...log, {
      id: `${level.id}-${log.length}`,
      levelId: level.id,
      objectiveId: level.objectiveId,
      title: level.title,
      score: res.mastery ?? 0,
      passing: res.completed,
      hints: levelHints,
      attempts,
      seconds: secondsOnStep,
      routeReason: res.outcome,
    }])

    // A blocked submission did not score: keep the student on this step (C-25).
    if (res.outcome === 'blocked') { setPhase('working'); return }

    setPhase('routing')
    advance(res.next)
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

  // Gate the whole lesson behind the one-time skill check.
  if (!interestsDone) {
    return <IntroInterests user={user} onComplete={applyInterests} onSkip={skipInterests} />
  }
  if (!diagnosticDone) {
    return <IntroDiagnostic user={user} onComplete={applyDiagnostic} onSkip={skipDiagnostic} />
  }

  if (phase === 'complete') {
    return (
      <div className="ca-complete">
        <div className="card wl-complete-card">
          <span className="badge badge--student">lesson complete</span>
          <h1 className="title">Nice work, {user?.username || 'coder'}! 🎉</h1>
          <p className="subtitle">You completed all {totalObjectives} objectives in {LESSON.title}.</p>
          <div className="wl-complete-stats">
            <div><strong>{completedCount}/{totalObjectives}</strong><span>objectives</span></div>
            <div><strong>{bestMastery}</strong><span>mastery</span></div>
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
          {learning ? (
            <LearnCard objectiveId={level.objectiveId} objective={LESSON.objectives.find((o) => o.id === level.objectiveId)} projectTitle={LESSON.projectTitle} onStart={markLessonSeen} />
          ) : (
          <>
            <TaskCard
              level={level}
              objectives={LESSON.objectives}
              completed={completed}
              projectTitle={LESSON.projectTitle}
              onReviewLesson={reviewLesson}
            />
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
          </>
          )}
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
            onHintRevealed={() => { setHintsUsed((n) => n + 1); setLevelHints((n) => n + 1) }}
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
        bestMastery={bestMastery}
        hintsUsed={hintsUsed}
        timeLabel={clock}
        levelsVisited={history.length}
        stepLog={stepLog}
        placements={placements}
      />
    </div>
  )
}
