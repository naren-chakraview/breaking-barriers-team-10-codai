import { useState } from 'react'
import { BrandLogo } from './Brand.jsx'

export default function Login({ onLogin }) {
  const [role, setRole] = useState('student')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('Please enter your username.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    // Placeholder auth. Replace with a real backend call that verifies
    // credentials and returns the user's role from the server.
    onLogin({ username: username.trim(), role })
  }

  return (
    <div className="page">
      <form className="card" onSubmit={handleSubmit} noValidate>
        <BrandLogo width={220} />
        <h1 className="title">School Portal</h1>
        <p className="subtitle">Sign in to continue</p>

        <div className="roles" role="group" aria-label="Account type">
          <button
            type="button"
            aria-pressed={role === 'student'}
            className={`role ${role === 'student' ? 'role--active' : ''}`}
            onClick={() => setRole('student')}
          >
            Student
          </button>
          <button
            type="button"
            aria-pressed={role === 'teacher'}
            className={`role ${role === 'teacher' ? 'role--active' : ''}`}
            onClick={() => setRole('teacher')}
          >
            Teacher
          </button>
        </div>

        <label className="field">
          <span className="label">Username</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={role === 'teacher' ? 'teacher@school.edu' : 'student@school.edu'}
          />
        </label>

        <label className="field">
          <span className="label">Password</span>
          <div className="password-row">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
            <button
              type="button"
              className="toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="submit">
          Sign in as {role}
        </button>

        <p className="footer">
          Forgot your password? <a href="#reset">Reset it</a>
        </p>
      </form>
    </div>
  )
}
