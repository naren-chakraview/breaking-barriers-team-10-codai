// Maps a Cognito/OIDC user into the app's identity shape and the P-1.4 request identity.
//
// The app uses { username, role } everywhere (App.jsx, dashboards). The services layer
// needs { token, userId, role } for the Authorization / X-User-Id / X-Role headers. Both
// derive from the OIDC user's tokens and claims:
//   - role: from the `cognito:groups` claim (server-issued; a user cannot pick it), mapped
//     to the app's 'student' | 'teacher'. Defaults to 'student' if no known group.
//   - userId: the token `sub` (stable per user), sent as X-User-Id.
//   - token: the access token, sent as the bearer (what the backend's JWT authorizer
//     verifies).

const KNOWN_ROLES = Object.freeze(['student', 'teacher'])

/**
 * Pick the app role from a Cognito groups claim. Teacher wins if present (more privilege),
 * else student. Unknown/empty groups default to student.
 * @param {unknown} groups the `cognito:groups` claim (array of strings) or undefined
 * @returns {'student'|'teacher'}
 */
export function roleFromGroups(groups) {
  const list = Array.isArray(groups) ? groups.map((g) => String(g).toLowerCase()) : []
  if (list.includes('teacher')) return 'teacher'
  if (list.includes('student')) return 'student'
  return 'student'
}

/**
 * The app-facing user object { username, role } from an OIDC user's profile claims.
 * @param {import('oidc-client-ts').User} oidcUser
 * @returns {{ username: string, role: 'student'|'teacher', userId: string }}
 */
export function appUserFromOidc(oidcUser) {
  const profile = oidcUser?.profile ?? {}
  const role = roleFromGroups(profile['cognito:groups'])
  const username =
    profile.preferred_username ||
    profile.email ||
    profile['cognito:username'] ||
    profile.sub ||
    'user'
  return { username: String(username), role, userId: String(profile.sub ?? username) }
}

/**
 * The request identity the services layer needs { token, userId, role }.
 * @param {import('oidc-client-ts').User} oidcUser
 * @returns {{ token: string, userId: string, role: 'student'|'teacher' } | null}
 */
export function requestIdentityFromOidc(oidcUser) {
  if (!oidcUser || !oidcUser.access_token) return null
  const { role, userId } = appUserFromOidc(oidcUser)
  return { token: oidcUser.access_token, userId, role }
}

export { KNOWN_ROLES }
