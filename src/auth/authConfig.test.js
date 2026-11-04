import { describe, it, expect } from 'vitest'
import { authMode, cognitoSettings, cognitoLogoutUrl } from './authConfig.js'

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

describe('cognitoLogoutUrl', () => {
  const env = {
    VITE_COGNITO_DOMAIN: 'https://codeai.auth.us-west-2.amazoncognito.com',
    VITE_COGNITO_CLIENT_ID: 'client-abc',
    VITE_COGNITO_REDIRECT_URI: 'https://app.example.com/',
  }

  it('builds the Hosted-UI /logout url with client_id and logout_uri', () => {
    const url = new URL(cognitoLogoutUrl(env))
    expect(url.origin + url.pathname).toBe('https://codeai.auth.us-west-2.amazoncognito.com/logout')
    expect(url.searchParams.get('client_id')).toBe('client-abc')
    expect(url.searchParams.get('logout_uri')).toBe('https://app.example.com/')
  })

  it('prefers VITE_COGNITO_LOGOUT_URI when set, and trims a trailing slash on the domain', () => {
    const url = new URL(cognitoLogoutUrl({ ...env, VITE_COGNITO_DOMAIN: env.VITE_COGNITO_DOMAIN + '/', VITE_COGNITO_LOGOUT_URI: 'https://app.example.com/bye' }))
    expect(url.origin + url.pathname).toBe('https://codeai.auth.us-west-2.amazoncognito.com/logout')
    expect(url.searchParams.get('logout_uri')).toBe('https://app.example.com/bye')
  })

  it('returns null when no domain is configured (falls back to local-only sign-out)', () => {
    expect(cognitoLogoutUrl({ VITE_COGNITO_CLIENT_ID: 'c', VITE_COGNITO_REDIRECT_URI: 'https://a/' })).toBeNull()
  })
})
