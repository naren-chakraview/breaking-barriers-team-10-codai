import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider, useAuth } from './auth/AuthContext.jsx'
import { ServicesProvider } from './services/ServicesContext.jsx'
import './index.css'

// Bridge the auth layer's live identity into the services layer: in http+cognito mode the
// real (silently-renewed) access token / role are sent per request; in mock mode getIdentity
// returns null and the services layer keeps its static demo config (ADR-018).
function AuthedServices({ children }) {
  const { getIdentity } = useAuth()
  return <ServicesProvider identityProvider={getIdentity}>{children}</ServicesProvider>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AuthedServices>
        <App />
      </AuthedServices>
    </AuthProvider>
  </React.StrictMode>,
)
