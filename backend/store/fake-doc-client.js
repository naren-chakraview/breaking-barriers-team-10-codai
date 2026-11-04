// An in-memory stand-in for the @aws-sdk/lib-dynamodb DynamoDBDocumentClient, used by the
// DynamoDB adapter's contract test so it can run in CI with no AWS account (IC2: "the store
// contract suite passes on the JSON adapter, and on DynamoDB if Task 0 allowed a deploy").
//
// It understands the same command shapes the adapter sends (PutCommand, GetCommand,
// QueryCommand) and nothing more. It is deliberately minimal: a Map per table, keyed by the
// JSON of the item's key attributes. This is test scaffolding, not production code.

/** Minimal command classes matching the lib-dynamodb constructor shape (new Cmd({...})). */
export class PutCommand {
  constructor(input) {
    this.input = input
  }
}
export class GetCommand {
  constructor(input) {
    this.input = input
  }
}
export class QueryCommand {
  constructor(input) {
    this.input = input
  }
}

export const fakeCommands = { PutCommand, GetCommand, QueryCommand }

/**
 * Build a fake document client plus the table-name map the adapter expects.
 * Every logical table maps to a same-named physical table in the fake.
 * @param {string[]} tableKeys logical table keys (DYNAMO_TABLE_KEYS)
 * @param {Record<string, {pk: string, sk?: string, append?: boolean}>} keyShape
 */
export function createFakeDynamo(tableKeys, keyShape) {
  const tables = new Map() // physical name -> Map(keyJson -> item)
  const tableNames = {}
  for (const key of tableKeys) {
    tableNames[key] = key
    tables.set(key, new Map())
  }

  // physical name -> logical key, to look up the key shape for a command.
  const logicalOf = (name) => name // identity in the fake

  const keyOf = (name, item) => {
    const shape = keyShape[logicalOf(name)]
    const parts = [item[shape.pk]]
    if (shape.sk) parts.push(item[shape.sk])
    return JSON.stringify(parts)
  }

  const docClient = {
    async send(command) {
      const input = command.input
      const name = input.TableName
      const store = tables.get(name)
      if (!store) throw new Error(`fake dynamo: unknown table ${name}`)

      if (command instanceof PutCommand) {
        store.set(keyOf(name, input.Item), input.Item)
        return {}
      }

      if (command instanceof GetCommand) {
        // Key may be missing the sort key for single-key tables; match on the key JSON.
        const k = keyOf(name, input.Key)
        return { Item: store.get(k) ?? undefined }
      }

      if (command instanceof QueryCommand) {
        if (input.scanAll) {
          return { Items: [...store.values()] }
        }
        const shape = keyShape[logicalOf(name)]
        const wantPk = input.ExpressionAttributeValues[':pk']
        const items = [...store.values()].filter((item) => item[shape.pk] === wantPk)
        return { Items: items }
      }

      throw new Error('fake dynamo: unsupported command')
    },
  }

  return { docClient, tableNames, commands: fakeCommands }
}
