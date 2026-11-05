import { useEffect, useState } from 'react'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'
import WeblabLesson from './weblab/WeblabLesson.jsx'
import CourseOverview from './weblab/CourseOverview.jsx'
import SkillTree from './weblab/SkillTree.jsx'
import { clearProfile } from './weblab/profileStore.js'
import { writeProgress } from './weblab/progressStore.js'
import DemoPicker from './weblab/DemoPicker.jsx'
import DemoPlayback from './weblab/DemoPlayback.jsx'
import { useDemoRunner } from './weblab/useDemoRunner.js'

// The signed-in user (and current screen) are kept in sessionStorage so a page
// reload — including the dev server's HMR reconnects behind the proxy — restores
// the session instead of dropping the user back to the login screen. This is a
// demo convenience, not real authentication: it lives only for the browser tab
// and is cleared on Sign out.
const USER_KEY = 'adaptai.user'
const VIEW_KEY = 'adaptai.view'

function readStored(key) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function App() {
  // Restore { username, role } from the tab's session, if present.
  const [user, setUser] = useState(() => readStored(USER_KEY))
  // Which screen the signed-in student is on:
  // 'dashboard' | 'course' | 'lesson' | 'skilltree'.
  const [view, setView] = useState(() => readStored(VIEW_KEY) || 'dashboard')

  // Automated demo mode. 'pick' shows the 4-student chooser; while the autopilot
  // runs, the DemoPlayback banner is shown. The runner writes the same stores the
  // UI uses, then we sign in as the student so the real screens render the result.
  const [demoPhase, setDemoPhase] = useState('off') // off | pick | running | complete
  const demo = useDemoRunner({ pace: 1000 })

  // Opening the lesson. 'start' means a fresh lesson: clear the saved interests
  // profile + skill-check placement HERE (once, on the click) so the intro
  // quizzes are asked again. 'continue' changes nothing, so a reload mid-lesson
  // can never re-trigger the quizzes. The reset is not in the lesson component,
  // so remounts/HMR can't repeat it.
  const openLesson = (mode) => {
    if (mode === 'start') {
      try { clearProfile(user?.username); writeProgress(user?.username, { placedTier: null }) } catch { /* ignore */ }
    }
    setView('lesson')
  }

  // Start the autopilot for a chosen demo student. When it finishes, sign in as
  // that student and drop straight into the lesson (via 'continue' semantics so
  // the just-written profile/placement are NOT cleared), letting the viewer see
  // the populated UI. The teacher page can then be opened to see it reflected.
  function startDemo(student) {
    setDemoPhase('running')
    demo.run(student, {
      onComplete: () => {
        setDemoPhase('complete')
        setUser({ username: student.username, role: 'student' })
        setView('lesson') // 'continue' semantics: do not clear the demo's state
      },
    })
  }

  function stopDemo() {
    demo.stop()
    setDemoPhase('off')
  }

  // Persist the session so a reload keeps the user signed in.
  useEffect(() => {
    try {
      if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user))
      else sessionStorage.removeItem(USER_KEY)
    } catch { /* storage unavailable: fall back to in-memory only */ }
  }, [user])

  useEffect(() => {
    try { sessionStorage.setItem(VIEW_KEY, JSON.stringify(view)) } catch { /* ignore */ }
  }, [view])

  function logout() {
    setUser(null)
    setView('dashboard')
    setDemoPhase('off')
    try { sessionStorage.removeItem(USER_KEY); sessionStorage.removeItem(VIEW_KEY) } catch { /* ignore */ }
  }

  // The playback banner persists through sign-in so the viewer keeps context; it
  // hides itself when the runner is idle.
  const playback = (
    <DemoPlayback
      student={demo.student}
      stage={demo.stage}
      progress={demo.progress}
      running={demo.running}
      onStop={stopDemo}
    />
  )

  if (!user) {
    return (
      <>
        <Login onLogin={setUser} onPlayDemo={() => setDemoPhase('pick')} />
        {demoPhase === 'pick' && (
          <DemoPicker onPick={startDemo} onCancel={() => setDemoPhase('off')} />
        )}
        {playback}
      </>
    )
  }

  if (view === 'lesson') {
    return (
      <>
        <WeblabLesson
          user={user}
          onExit={() => setView('dashboard')}
          onViewSkillTree={() => setView('skilltree')}
        />
        {playback}
      </>
    )
  }

  if (view === 'skilltree') {
    return (
      <>
        <SkillTree
          user={user}
          onExit={() => setView('dashboard')}
          onOpenLesson={() => openLesson('continue')}
        />
        {playback}
      </>
    )
  }

  if (view === 'course') {
    return (
      <>
        <CourseOverview
          user={user}
          onBack={() => setView('dashboard')}
          onContinueLesson={() => openLesson('continue')}
        />
        {playback}
      </>
    )
  }

  return (
    <>
      <Dashboard
        user={user}
        onLogout={logout}
        onContinueLesson={() => openLesson('continue')}
        onStartLesson={() => openLesson('start')}
        onViewCourse={() => setView('course')}
      />
      {playback}
    </>
  )
}
