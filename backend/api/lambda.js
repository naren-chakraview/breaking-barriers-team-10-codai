// AWS Lambda handler for API Gateway (REST, proxy integration). It normalizes the API
// Gateway event into the router's request shape and serializes the router's response back.
//
// The app is built once per cold start (module scope) so the tree parse, store client and
// config reads are reused across invocations. The domain core (shared/core, Track B) is
// imported here; if it has not landed, this import fails fast with a clear message — that is
// the intended IC2 coupling.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildApp } from './app.js'

// Track B's domain core. Wrapped so a missing module gives a clear operational error rather
// than a cryptic import failure at the first request.
let core
try {
  core = await import('../../shared/core/index.js')
} catch (err) {
  core = null
  // eslint-disable-next-line no-console
  console.error('shared/core (Track B) is not available yet:', err.message)
}

const here = dirname(fileURLToPath(import.meta.url))
const treePath = join(here, '..', '..', 'database', 'sample-skilltree.json')
const tree = JSON.parse(readFileSync(treePath, 'utf8'))

const app = core ? buildApp({ tree, core }) : null

/**
 * API Gateway REST proxy handler.
 * @param {object} event
 * @returns {Promise<{statusCode: number, headers: object, body: string}>}
 */
export async function handler(event) {
  if (!app) {
    return respond(500, { error: { code: 'CONFIG_ERROR', message: 'Domain core is not deployed.' } })
  }

  const req = {
    method: event.httpMethod ?? event.requestContext?.http?.method ?? 'GET',
    path: event.path ?? event.rawPath ?? '/',
    headers: lowerCaseHeaders(event.headers ?? {}),
    query: event.queryStringParameters ?? {},
    body: parseBody(event),
  }

  const res = await app.router(req)
  return respond(res.status, res.body, res.headers)
}

function respond(statusCode, body, headers = { 'content-type': 'application/json' }) {
  return { statusCode, headers, body: JSON.stringify(body) }
}

function lowerCaseHeaders(headers) {
  const out = {}
  for (const [k, v] of Object.entries(headers)) out[k.toLowerCase()] = v
  return out
}

function parseBody(event) {
  if (!event.body) return {}
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}
