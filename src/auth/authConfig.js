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
 *   VITE_COGNITO_LOGOUT_URI      post-logout landing (defaults to the redirect origin)
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
