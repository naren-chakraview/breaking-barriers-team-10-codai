// App auth context (ADR-018). One hook, `useAuth()`, exposes the session the whole app uses:
//   { user, status, login, logout, getIdentity }
//     user     -> { username, role } | null   (what App.jsx and the dashboards read)
//     status   -> 'loading' | 'authenticated' | 'unauthenticated' | 'error'
//     login()  -> start sign-in (mock: set a demo user; cognito: redirect to Hosted UI)
//     logout() -> clear the session (mock: drop state; cognito: end the OIDC session)
//     getIdentity() -> { token, userId, role } | null  for the services layer (P-1.4 headers)
//
// Two modes (authConfig.authMode): `mock` preserves the no-AWS demo login (C-33) and is the
// default; `cognito` runs the real authorization-code + PKCE flow via react-oidc-context.
// The rest of the app is identical in both modes — it only ever sees `user`.

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AuthProvider as OidcProvider, useAuth as useOidcAuth } from 'react-oidc-context'
import { authMode, cognitoSettings } from './authConfig.js'
import { appUserFromOidc, requestIdentityFromOidc } from './identity.js'

const AppAuthContext = createContext(null)

/**
 * Top-level provider. Chooses the mock or Cognito implementation once from VITE_AUTH_MODE.
 */
export function AuthProvider({ children }) {
  if (authMode() === 'cognito') {
    return (
      <OidcProvider {...cognitoSettings()}>
        <CognitoAuthBridge>{children}</CognitoAuthBridge>
      </OidcProvider>
    )
  }
  return <MockAuthProvider>{children}</MockAuthProvider>
}

/**
 * Read the app auth context.
 * @returns {{ user: object|null, status: string, login: Function, logout: Function, getIdentity: () => object|null }}
 */
export function useAuth() {
  const ctx = useContext(AppAuthContext)
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>.')
  return ctx
}

// --- mock mode: the demo login, no AWS (C-33) ------------------------------------------

function MockAuthProvider({ children }) {
  // Demo session held in sessionStorage so a reload does not drop the user (the bug this
  // work fixes). sessionStorage, not localStorage: scoped to the tab, cleared on close.
  const [user, setUser] = useState(() => readStoredMockUser())

  const login = useCallback((who) => {
    // `who` is { username, role } from the demo login form.
    const next = { username: String(who?.username ?? 'student').trim(), role: who?.role === 'teacher' ? 'teacher' : 'student' }
    sessionStorage.setItem(MOCK_KEY, JSON.stringify(next))
    setUser(next)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(MOCK_KEY)
    setUser(null)
  }, [])

  // In mock mode the services layer uses the static VITE_DEMO_* identity, so no live
  // identity is supplied (getIdentity returns null and createHttpServices keeps its config).
  const getIdentity = useCallback(() => null, [])

  const value = useMemo(
    () => ({ user, status: user ? 'authenticated' : 'unauthenticated', login, logout, getIdentity }),
    [user, login, logout, getIdentity],
  )
  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>
}

const MOCK_KEY = 'codeai.demo.user'

function readStoredMockUser() {
  try {
    const raw = sessionStorage.getItem(MOCK_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.username === 'string' && (parsed.role === 'student' || parsed.role === 'teacher')) {
      return parsed
    }
  } catch {
    /* ignore malformed/absent storage */
  }
  return null
}

// --- cognito mode: real OIDC (authorization code + PKCE) --------------------------------

/**
 * Bridges react-oidc-context's auth state to our app-shaped context. Lives INSIDE the OIDC
 * provider so it can call useOidcAuth(). Keeps the latest OIDC user in a ref so getIdentity
 * returns a fresh (silently-renewed) access token per request without re-rendering callers.
 */
function CognitoAuthBridge({ children }) {
  const oidc = useOidcAuth()
  const userRef = useRef(null)
  userRef.current = oidc.user ?? null

  const login = useCallback(() => {
    // Redirect to the Cognito Hosted UI; returns to the configured redirect_uri with ?code=.
    void oidc.signinRedirect()
  }, [oidc])

  const logout = useCallback(() => {
    // End the OIDC session (clears local state and redirects to the post-logout URI).
    void oidc.signoutRedirect()
  }, [oidc])

  const getIdentity = useCallback(() => requestIdentityFromOidc(userRef.current), [])

  const status = oidc.isLoading
    ? 'loading'
    : oidc.error
      ? 'error'
      : oidc.isAuthenticated
        ? 'authenticated'
        : 'unauthenticated'

  const user = oidc.isAuthenticated && oidc.user ? toAppUser(oidc.user) : null

  const value = useMemo(
    () => ({ user, status, login, logout, getIdentity, error: oidc.error ?? null }),
    [user, status, login, logout, getIdentity, oidc.error],
  )
  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>
}

function toAppUser(oidcUser) {
  const { username, role } = appUserFromOidc(oidcUser)
  return { username, role }
}
