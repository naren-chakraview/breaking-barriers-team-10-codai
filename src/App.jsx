import { useState } from 'react'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'
import WeblabLesson from './weblab/WeblabLesson.jsx'
import CourseOverview from './weblab/CourseOverview.jsx'
import SkillTree from './weblab/SkillTree.jsx'
import { useAuth } from './auth/AuthContext.jsx'

export default function App() {
  // The session is owned by the auth layer (ADR-018): mock demo login or real Cognito.
  // `user` is { username, role } | null; the app is otherwise unchanged by the mode.
  const { user, status, login, logout } = useAuth()
  // Which screen the signed-in student is on:
  // 'dashboard' | 'course' | 'lesson' | 'skilltree'.
  const [view, setView] = useState('dashboard')

  // While a real OIDC session restores (cognito mode), avoid flashing the login screen.
  if (status === 'loading') {
    return <AuthSplash message="Signing you in…" />
  }

  if (status === 'error') {
    return <AuthSplash message="Sign-in could not be completed. Please try again." onRetry={login} />
  }

  if (!user) {
    return <Login onLogin={login} />
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
      onLogout={() => { logout(); setView('dashboard') }}
      onContinueLesson={() => setView('lesson')}
      onViewCourse={() => setView('course')}
    />
  )
}

// Minimal interstitial for the OIDC loading/error states (cognito mode only).
function AuthSplash({ message, onRetry }) {
  return (
    <div className="page">
      <div className="card" role="status" aria-live="polite">
        <p className="subtitle">{message}</p>
        {onRetry && (
          <button type="button" className="submit" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  )
}
