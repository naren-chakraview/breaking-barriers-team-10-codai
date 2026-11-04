import Ajv2020 from 'ajv/dist/2020.js'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Node-side schema validation, used by tests and by the backend. The browser never
// validates against these files directly (it would pull Ajv into the bundle for no
// benefit); the services layer relies on the server's validation instead.

const here = dirname(fileURLToPath(import.meta.url))
const schemaDir = join(here, 'schemas')
export const SCHEMA_BASE = 'https://codeai.local/contracts/'

let ajvInstance

/** One shared Ajv with every schema in schemas/ registered. */
export function getAjv() {
  if (ajvInstance) return ajvInstance
  // strictRequired is off because if/then blocks legitimately require properties that
  // are declared in the parent schema, which Ajv's check cannot see.
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictTypes: false,
    strictRequired: false,
  })
  for (const file of readdirSync(schemaDir).filter((f) => f.endsWith('.schema.json'))) {
    ajv.addSchema(JSON.parse(readFileSync(join(schemaDir, file), 'utf8')))
  }
  ajvInstance = ajv
  return ajv
}

export function loadSchemaFile(name) {
  return JSON.parse(readFileSync(join(schemaDir, `${name}.schema.json`), 'utf8'))
}

/**
 * Get a validator for `file#/$defs/Name`, e.g. getValidator('services', 'SubmitResponse').
 * Pass no `def` to validate against the whole file (error, tree).
 * @param {string} file schema file name without `.schema.json`
 * @param {string} [def] name under $defs
 */
export function getValidator(file, def) {
  const id = `${SCHEMA_BASE}${file}.schema.json${def ? `#/$defs/${def}` : ''}`
  const fn = getAjv().getSchema(id)
  if (!fn) throw new Error(`No schema registered for ${id}`)
  return fn
}

/**
 * Validate and return a readable list of problems ([] when valid).
 * @param {string} file
 * @param {string | undefined} def
 * @param {unknown} data
 * @returns {string[]}
 */
export function problems(file, def, data) {
  const fn = getValidator(file, def)
  if (fn(data)) return []
  return (fn.errors ?? []).map((e) => `${e.instancePath || '(root)'} ${e.message}`)
}

/** True when `data` is valid. */
export function isValid(file, def, data) {
  return getValidator(file, def)(data) === true
}
