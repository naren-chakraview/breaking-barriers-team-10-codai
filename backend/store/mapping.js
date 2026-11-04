// camelCase record <-> snake_case column mapping for the DynamoDB adapter.
//
// The repository records are camelCase (contracts/schemas/records.schema.json). The C-8
// tables use snake_case columns (TABLES in seams.js). This module is the single place that
// translates between them, driven by the TABLES column list so it can never drift from the
// contract: the drift test keeps TABLES and the schemas in step, and this reads TABLES.
//
// Seam 4 support. Architecture 2.9.

import { TABLES, snakeToCamel } from '../../shared/contracts/seams.js'

/** camelCase -> snake_case (inverse of seams.snakeToCamel). */
export function camelToSnake(name) {
  return name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

/**
 * Convert a camelCase record to a snake_case item for a given table. Only columns declared
 * in TABLES[table].columns are written, so an item can never carry an unexpected field.
 * @param {string} table a key of TABLES
 * @param {Record<string, unknown>} record
 * @returns {Record<string, unknown>}
 */
export function toItem(table, record) {
  const def = TABLES[table]
  if (!def) throw new Error(`unknown table ${table}`)
  const item = {}
  for (const column of def.columns) {
    const prop = snakeToCamel(column)
    if (record[prop] !== undefined) item[column] = record[prop]
  }
  return item
}

/**
 * Convert a snake_case item back to a camelCase record.
 * @param {string} table a key of TABLES
 * @param {Record<string, unknown>} item
 * @returns {Record<string, unknown> | null}
 */
export function fromItem(table, item) {
  if (!item) return null
  const def = TABLES[table]
  if (!def) throw new Error(`unknown table ${table}`)
  const record = {}
  for (const column of def.columns) {
    if (item[column] !== undefined) record[snakeToCamel(column)] = item[column]
  }
  return record
}
