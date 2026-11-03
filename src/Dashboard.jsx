import StudentDashboard from './StudentDashboard.jsx'

export default function Dashboard({ user, onLogout }) {
  if (user.role === 'student') {
    return <StudentDashboard user={user} onLogout={onLogout} />
  }

  // Teacher view
  const teacherActions = [
    'Create and grade assignments',
    'Manage your class roster',
    'Post announcements',
  ]

  return (
    <div className="page">
      <div className="card">
        <span className="badge badge--teacher">teacher</span>
        <h1 className="title">Welcome, {user.username}</h1>
        <p className="subtitle">You are signed in to the teacher dashboard.</p>

        <ul className="actions">
          {teacherActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>

        <button type="button" className="submit" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </div>
  )
}
