import { useEffect, useState } from 'react'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'
import WeblabLesson from './weblab/WeblabLesson.jsx'
import CourseOverview from './weblab/CourseOverview.jsx'
import SkillTree from './weblab/SkillTree.jsx'

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
    try { sessionStorage.removeItem(USER_KEY); sessionStorage.removeItem(VIEW_KEY) } catch { /* ignore */ }
  }

  if (!user) {
    return <Login onLogin={setUser} />
  }

  if (view === 'lesson') {
    return (
      <WeblabLesson
        user={user}
        onExit={() => setView('dashboard')}
        onViewSkillTree={() => setView('skilltree')}
      />
    )
  }

  if (view === 'skilltree') {
    return (
      <SkillTree
        user={user}
        onExit={() => setView('dashboard')}
        onOpenLesson={() => setView('lesson')}
      />
    )
  }

  if (view === 'course') {
    return (
      <CourseOverview
        user={user}
        onBack={() => setView('dashboard')}
        onContinueLesson={() => setView('lesson')}
      />
    )
  }

  return (
    <Dashboard
      user={user}
      onLogout={logout}
      onContinueLesson={() => setView('lesson')}
      onViewCourse={() => setView('course')}
    />
  )
}
