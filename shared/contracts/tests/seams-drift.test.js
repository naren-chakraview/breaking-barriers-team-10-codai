import { describe, it, expect } from 'vitest'
import { ENUMS, TABLES, snakeToCamel } from '../seams.js'
import { loadSchemaFile } from '../validate.js'

// Guard against the JS vocabulary and the JSON Schemas drifting apart. If someone adds
// an enum value or a table column in one place but not the other, this fails.

const common = loadSchemaFile('common')
const records = loadSchemaFile('records')

const enumToDef = {
  Source: 'Source',
  HintStyle: 'HintStyle',
  PassiveSignalName: 'PassiveSignalName',
  ProgressStatus: 'ProgressStatus',
  RoutingMode: 'RoutingMode',
  FallbackComponent: 'FallbackComponent',
  Severity: 'Severity',
}

describe('enum drift: seams.js vs common.schema.json', () => {
  for (const [name, def] of Object.entries(enumToDef)) {
    it(`${name} matches`, () => {
      expect(common.$defs[def].enum).toEqual(ENUMS[name])
    })
  }
  it('ErrorCode matches error.schema.json', () => {
    const err = loadSchemaFile('error')
    expect(err.properties.error.properties.code.enum).toEqual(ENUMS.ErrorCode)
  })
})

describe('table columns vs record schemas', () => {
  for (const [table, meta] of Object.entries(TABLES)) {
    it(`${table} columns map to ${meta.record} properties`, () => {
      const def = records.$defs[meta.record]
      expect(def, `${meta.record} missing from records.schema.json`).toBeTruthy()
      const props = new Set(Object.keys(def.properties))
      for (const col of meta.columns) {
        expect(props.has(snakeToCamel(col)), `${table}.${col} -> ${snakeToCamel(col)} missing from ${meta.record}`).toBe(true)
      }
    })
  }
})
