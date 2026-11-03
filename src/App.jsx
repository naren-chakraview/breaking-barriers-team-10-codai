import { useState } from 'react'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'

export default function App() {
  // When a user signs in, we store { username, role } here.
  const [user, setUser] = useState(null)

  if (user) {
    return <Dashboard user={user} onLogout={() => setUser(null)} />
  }

  return <Login onLogin={setUser} />
}
