import { useState } from 'react'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'
import WeblabLesson from './weblab/WeblabLesson.jsx'
import CourseOverview from './weblab/CourseOverview.jsx'
import SkillTree from './weblab/SkillTree.jsx'

export default function App() {
  // When a user signs in, we store { username, role } here.
  const [user, setUser] = useState(null)
  // Which screen the signed-in student is on:
  // 'dashboard' | 'course' | 'lesson' | 'skilltree'.
  const [view, setView] = useState('dashboard')

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
      onLogout={() => { setUser(null); setView('dashboard') }}
      onContinueLesson={() => setView('lesson')}
      onViewCourse={() => setView('course')}
    />
  )
}
