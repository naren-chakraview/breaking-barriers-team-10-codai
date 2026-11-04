import { runRepositoryContract } from '../../shared/contracts/harness.js'
import { createJsonRepository } from './json-repository.js'
import { createDynamoRepository, DYNAMO_TABLE_KEYS, KEY_SHAPE } from './dynamo-repository.js'
import { createFakeDynamo } from './fake-doc-client.js'

// Track D's real store adapters must pass the SAME seam-4 suite the in-memory stub passes
// (ADR-014). The JSON adapter runs in-memory (no filePath). The DynamoDB adapter runs
// against an in-memory fake document client so it needs no AWS account (IC2).

runRepositoryContract('json (in-memory)', () => createJsonRepository())

runRepositoryContract('dynamodb (fake client)', () => {
  const { docClient, tableNames, commands } = createFakeDynamo(DYNAMO_TABLE_KEYS, KEY_SHAPE)
  return createDynamoRepository({ docClient, tableNames, commands })
})
