// Auth configuration (ADR-018). Reads the public VITE_ Cognito settings and decides the
// mode: `mock` keeps the no-AWS demo login (C-33, the default), `cognito` turns on the real
// authorization-code + PKCE flow against a Cognito user pool.
//
// Only VITE_-prefixed, public values are read (C-26): the user-pool OIDC authority, the
// public app-client id (no secret — a browser is a public client), and the redirect URIs.
// No AWS keys, no client secret.

/**
 * @typedef {'mock' | 'cognito'} AuthMode
 */

/** Read `import.meta.env` safely (undefined under Node/tests). */
function ambientEnv() {
  try {
    // eslint-disable-next-line no-undef
    return import.meta.env ?? {}
  } catch {
    return {}
  }
}

/**
 * The configured auth mode. Defaults to `mock` so local/offline work needs no Cognito
 * (C-33). Set VITE_AUTH_MODE=cognito to enable the real flow.
 * @param {Record<string, string|undefined>} [env]
 * @returns {AuthMode}
 */
export function authMode(env = ambientEnv()) {
  return env.VITE_AUTH_MODE === 'cognito' ? 'cognito' : 'mock'
}

/**
 * Build the oidc-client-ts UserManager settings from env. Only called in `cognito` mode.
 * Uses the authorization code grant with PKCE (response_type 'code'); no client secret.
 * Throws a clear error if a required value is missing, so a misconfigured deploy fails
 * loudly rather than silently falling back to an unauthenticated state.
 *
 * Required env:
 *   VITE_COGNITO_AUTHORITY  e.g. https://cognito-idp.us-west-2.amazonaws.com/<userPoolId>
 *   VITE_COGNITO_CLIENT_ID  the public app-client id
 *   VITE_COGNITO_REDIRECT_URI    where Cognito returns the ?code= (this app's callback)
 * Optional:
 *   VITE_COGNITO_DOMAIN          the Hosted-UI domain, e.g.
 *                                https://<prefix>.auth.<region>.amazoncognito.com — needed for
 *                                a true Hosted-UI sign-out (ends the Cognito session, not just
 *                                the local one); see cognitoLogoutUrl().
 *   VITE_COGNITO_LOGOUT_URI      post-logout landing (defaults to the redirect URI)
 *   VITE_COGNITO_SCOPE           defaults to "openid profile email"
 *
 * @param {Record<string, string|undefined>} [env]
 * @returns {import('oidc-client-ts').UserManagerSettings}
 */
export function cognitoSettings(env = ambientEnv()) {
  const authority = (env.VITE_COGNITO_AUTHORITY || '').trim()
  const clientId = (env.VITE_COGNITO_CLIENT_ID || '').trim()
  const redirectUri = (env.VITE_COGNITO_REDIRECT_URI || '').trim()

  const missing = []
  if (!authority) missing.push('VITE_COGNITO_AUTHORITY')
  if (!clientId) missing.push('VITE_COGNITO_CLIENT_ID')
  if (!redirectUri) missing.push('VITE_COGNITO_REDIRECT_URI')
  if (missing.length) {
    throw new Error(
      `VITE_AUTH_MODE=cognito requires ${missing.join(', ')}. These are the public user-pool ` +
        'OIDC settings (no client secret). See docs/aws-access.md once the pool is provisioned.',
    )
  }

  return {
    authority,
    client_id: clientId,
    redirect_uri: redirectUri,
    post_logout_redirect_uri: (env.VITE_COGNITO_LOGOUT_URI || redirectUri).trim(),
    response_type: 'code', // authorization code grant (+ PKCE, enabled by default in oidc-client-ts)
    scope: (env.VITE_COGNITO_SCOPE || 'openid profile email').trim(),
    // Keep refresh tokens out of localStorage (XSS, ADR-018). oidc-client-ts stores the
    // user in sessionStorage by default; the access token is used from memory per request.
    // Silent renew keeps the session alive across reloads without a full redirect.
    automaticSilentRenew: true,
    // Clean the ?code=&state= query out of the URL after a successful callback.
    onSigninCallback: () => {
      window.history.replaceState({}, document.title, window.location.pathname)
    },
  }
}

/**
 * The Cognito Hosted-UI logout URL, or null if no domain is configured.
 *
 * Cognito does not expose a standard OIDC `end_session_endpoint`; signing out only at the
 * client leaves the Cognito session cookie alive, so the next sign-in silently re-logs the
 * same user in (a real hazard on shared/school devices). The fix is to send the browser to
 * Cognito's `/logout?client_id=...&logout_uri=...` endpoint, which clears the Cognito session
 * and then returns to `logout_uri` (which must be registered as an allowed sign-out URL on the
 * app client). When no domain is configured we return null and fall back to a local-only
 * sign-out.
 *
 * @param {Record<string, string|undefined>} [env]
 * @returns {string | null}
 */
export function cognitoLogoutUrl(env = ambientEnv()) {
  const domain = (env.VITE_COGNITO_DOMAIN || '').trim().replace(/\/+$/, '')
  const clientId = (env.VITE_COGNITO_CLIENT_ID || '').trim()
  const logoutUri = (env.VITE_COGNITO_LOGOUT_URI || env.VITE_COGNITO_REDIRECT_URI || '').trim()
  if (!domain || !clientId || !logoutUri) return null
  const qs = new URLSearchParams({ client_id: clientId, logout_uri: logoutUri })
  return `${domain}/logout?${qs.toString()}`
}
