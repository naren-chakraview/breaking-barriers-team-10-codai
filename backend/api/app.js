// Application bootstrap: assemble the dependency graph from the mode switches and build the
// HTTP router. This is the one place that chooses real vs stub for each seam, so the handlers
// stay oblivious to which is live (ADR-014).
//
//   STORE_MODE : json | dynamodb   -> backend/store
//   MODEL_MODE : stub | bedrock    -> stub shim here; bedrock is injected by Track C at IC3
//
// The domain core (Track B, shared/core) is imported by its CORE_FUNCTIONS names. If it is
// not present yet, the caller may pass a `core` override (tests do this). Nothing else in the
// backend reaches outside Track D's directories.

import { resolveModes } from '../../shared/contracts/modes.js'
import { createRepository } from '../store/index.js'
import { createServices } from './services.js'
import { createRouter } from './http.js'
import { createStubModel } from './model-stub.js'

/**
 * Build the fully wired services + router.
 * @param {object} opts
 * @param {object} opts.tree the parsed skill tree (database/sample-skilltree.json)
 * @param {import('./ports.js').CorePort} opts.core shared/core (Track B), injected
 * @param {import('./ports.js').ModelPort} [opts.model] override the model port (Track C at IC3)
 * @param {object} [opts.repo] override the repository (else built from STORE_MODE)
 * @param {Record<string, string|undefined>} [opts.env] env for resolveModes (default process.env)
 * @param {string} [opts.storeFilePath] JSON store file when STORE_MODE=json
 * @param {object} [opts.dynamo] AWS wiring when STORE_MODE=dynamodb
 * @param {number} [opts.perStudentCap]
 * @returns {{ services: object, router: Function, modes: object }}
 */
export function buildApp({ tree, core, model, repo, env = process.env, storeFilePath, dynamo, perStudentCap } = {}) {
  if (!tree) throw new Error('buildApp requires the parsed skill tree')
  if (!core) throw new Error('buildApp requires the domain core (shared/core, Track B)')

  const modes = resolveModes(env)

  const repository = repo ?? createRepository({ env, filePath: storeFilePath, dynamo })

  // MODEL_MODE=bedrock means Track C's real port must be injected; until then, stub.
  const modelPort =
    model ?? (modes.modelMode === 'bedrock'
      ? throwNeedsBedrock()
      : createStubModel())

  const deps = { core, model: modelPort, repo: repository, tree, modes }
  const services = createServices(deps)
  const router = createRouter(services, { perStudentCap })
  return { services, router, modes }
}

function throwNeedsBedrock() {
  throw new Error(
    'MODEL_MODE=bedrock but no model port was injected. Track C provides the bedrock ModelPort at IC3; pass it as buildApp({ model }).',
  )
}
