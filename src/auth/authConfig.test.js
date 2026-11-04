import { describe, it, expect } from 'vitest'
import { authMode, cognitoSettings } from './authConfig.js'

describe('authMode', () => {
  it('defaults to mock when unset (no-AWS demo, C-33)', () => {
    expect(authMode({})).toBe('mock')
    expect(authMode({ VITE_AUTH_MODE: 'something' })).toBe('mock')
  })
  it('is cognito only when explicitly set', () => {
    expect(authMode({ VITE_AUTH_MODE: 'cognito' })).toBe('cognito')
  })
})

describe('cognitoSettings', () => {
  const env = {
    VITE_COGNITO_AUTHORITY: 'https://cognito-idp.us-west-2.amazonaws.com/pool-123',
    VITE_COGNITO_CLIENT_ID: 'client-abc',
    VITE_COGNITO_REDIRECT_URI: 'https://app.example.com/',
  }

  it('builds authorization-code + PKCE settings from env (no client secret)', () => {
    const s = cognitoSettings(env)
    expect(s.authority).toBe(env.VITE_COGNITO_AUTHORITY)
    expect(s.client_id).toBe('client-abc')
    expect(s.redirect_uri).toBe('https://app.example.com/')
    expect(s.response_type).toBe('code') // authorization code grant
    expect(s.scope).toBe('openid profile email')
    expect('client_secret' in s).toBe(false) // public client, never a secret
    expect(s.automaticSilentRenew).toBe(true)
  })

  it('defaults post_logout to the redirect uri and allows a scope override', () => {
    const s = cognitoSettings({ ...env, VITE_COGNITO_SCOPE: 'openid' })
    expect(s.post_logout_redirect_uri).toBe('https://app.example.com/')
    expect(s.scope).toBe('openid')
  })

  it('throws a clear error listing every missing required value', () => {
    expect(() => cognitoSettings({})).toThrow(/VITE_COGNITO_AUTHORITY.*VITE_COGNITO_CLIENT_ID.*VITE_COGNITO_REDIRECT_URI/)
  })
})
