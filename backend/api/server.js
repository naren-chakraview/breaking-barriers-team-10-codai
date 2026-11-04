// Local development server (Node http). Runs the same router the Lambda uses, so a developer
// can `curl` the API without AWS (IC2: "run the API locally"). Not for production.
//
// Usage:
//   node backend/api/server.js            # STORE_MODE/MODEL_MODE from the environment
//   STORE_MODE=json MODEL_MODE=stub PORT=3000 node backend/api/server.js
//
// Needs the domain core (shared/core, Track B). Until it lands, start with a local core via
// an env flag is not provided here on purpose: the server mirrors the deployed wiring.

import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildApp } from './app.js'

const here = dirname(fileURLToPath(import.meta.url))
const tree = JSON.parse(readFileSync(join(here, '..', '..', 'database', 'sample-skilltree.json'), 'utf8'))

const core = await import('../../shared/core/index.js')
const app = buildApp({ tree, core, storeFilePath: process.env.STORE_FILE })

const port = Number(process.env.PORT ?? 3000)

const server = createServer((nodeReq, nodeRes) => {
  const chunks = []
  nodeReq.on('data', (c) => chunks.push(c))
  nodeReq.on('end', async () => {
    const url = new URL(nodeReq.url, `http://localhost:${port}`)
    const body = chunks.length ? safeJson(Buffer.concat(chunks).toString('utf8')) : {}
    const req = {
      method: nodeReq.method,
      path: url.pathname,
      headers: nodeReq.headers,
      query: Object.fromEntries(url.searchParams),
      body,
    }
    const res = await app.router(req)
    nodeRes.writeHead(res.status, res.headers)
    nodeRes.end(JSON.stringify(res.body))
  })
})

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`CodeAI backend listening on http://localhost:${port} (modes: ${JSON.stringify(app.modes)})`)
})

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}
