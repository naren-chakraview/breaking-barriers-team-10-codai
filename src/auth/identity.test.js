import { describe, it, expect } from 'vitest'
import { roleFromGroups, appUserFromOidc, requestIdentityFromOidc } from './identity.js'

describe('roleFromGroups', () => {
  it('maps the teacher group to teacher', () => {
    expect(roleFromGroups(['teacher'])).toBe('teacher')
  })
  it('maps the student group to student', () => {
    expect(roleFromGroups(['student'])).toBe('student')
  })
  it('prefers teacher when both groups are present (more privilege)', () => {
    expect(roleFromGroups(['student', 'teacher'])).toBe('teacher')
  })
  it('is case-insensitive', () => {
    expect(roleFromGroups(['Teacher'])).toBe('teacher')
  })
  it('defaults to student for unknown or empty groups', () => {
    expect(roleFromGroups(['admin'])).toBe('student')
    expect(roleFromGroups([])).toBe('student')
    expect(roleFromGroups(undefined)).toBe('student')
  })
})

describe('appUserFromOidc', () => {
  it('derives username/role/userId from profile claims', () => {
    const oidc = { profile: { sub: 'sub-123', email: 'sam@school.edu', 'cognito:groups': ['teacher'] } }
    expect(appUserFromOidc(oidc)).toEqual({ username: 'sam@school.edu', role: 'teacher', userId: 'sub-123' })
  })
  it('prefers preferred_username, falls back through email then sub', () => {
    expect(appUserFromOidc({ profile: { sub: 's', preferred_username: 'quinn' } }).username).toBe('quinn')
    expect(appUserFromOidc({ profile: { sub: 's', email: 'e@x.edu' } }).username).toBe('e@x.edu')
    expect(appUserFromOidc({ profile: { sub: 'only-sub' } }).username).toBe('only-sub')
  })
})

describe('requestIdentityFromOidc', () => {
  it('returns the access token, sub as userId, and the group role', () => {
    const oidc = { access_token: 'tok-abc', profile: { sub: 'sub-9', 'cognito:groups': ['student'] } }
    expect(requestIdentityFromOidc(oidc)).toEqual({ token: 'tok-abc', userId: 'sub-9', role: 'student' })
  })
  it('returns null when there is no access token (unauthenticated)', () => {
    expect(requestIdentityFromOidc(null)).toBeNull()
    expect(requestIdentityFromOidc({ profile: { sub: 's' } })).toBeNull()
  })
})
