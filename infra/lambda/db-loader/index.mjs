// CloudFormation custom resource: loads database/schema.sql and database/seed.sql
// into Aurora through the RDS Data API (no VPC, no database password in code).
//
// Safety: schema.sql starts with DROP TABLE statements. This handler therefore runs the
// files ONLY when the database has no tables yet. If the tables already exist it does
// nothing and says so. It never drops or reloads a database that holds data.
import { readFile } from 'node:fs/promises';
import { RDSDataClient, ExecuteStatementCommand, BeginTransactionCommand, CommitTransactionCommand, RollbackTransactionCommand } from '@aws-sdk/client-rds-data';

import { splitStatements } from './split.mjs';


const client = new RDSDataClient({});
const { CLUSTER_ARN, SECRET_ARN, DATABASE } = process.env;
const target = { resourceArn: CLUSTER_ARN, secretArn: SECRET_ARN, database: DATABASE };

const isTxControl = (s) => /^(BEGIN|COMMIT)$/i.test(s);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The cluster scales to zero (ADR-016). The first call after a pause raises
// DatabaseResumingException while it wakes, so retry for up to ~2 minutes.
async function withResumeRetry(fn) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.name !== 'DatabaseResumingException' || attempt >= 12) throw err;
      console.log(`Database resuming, retry ${attempt} in 10 s`);
      await sleep(10_000);
    }
  }
}

async function run(sql, transactionId) {
  return client.send(new ExecuteStatementCommand({ ...target, sql, transactionId }));
}

async function tablesExist() {
  const res = await run("SELECT to_regclass('public.course') IS NOT NULL AS present");
  return res.records?.[0]?.[0]?.booleanValue === true;
}

async function loadFile(name, transactionId) {
  const text = await readFile(new URL(`./${name}`, import.meta.url), 'utf8');
  const statements = splitStatements(text).filter((s) => !isTxControl(s));
  for (const [i, statement] of statements.entries()) {
    try {
      await run(statement, transactionId);
    } catch (err) {
      throw new Error(`${name} statement ${i + 1} of ${statements.length} failed: ${err.message}\n${statement.slice(0, 200)}`);
    }
  }
  return statements.length;
}

export async function handler(event) {
  console.log('Request type:', event.RequestType);
  const physicalId = event.PhysicalResourceId ?? 'codeai-db-load';

  if (event.RequestType === 'Delete') {
    return { PhysicalResourceId: physicalId, Data: { Message: 'Nothing to remove. The database is retained.' } };
  }

  if (await withResumeRetry(tablesExist)) {
    const message = 'Skipped: tables already exist. Existing data was not touched.';
    console.log(message);
    return { PhysicalResourceId: physicalId, Data: { Message: message } };
  }

  // One transaction, so a failure leaves the database empty and the next deploy can retry.
  const { transactionId } = await client.send(new BeginTransactionCommand(target));
  try {
    const schemaCount = await loadFile('schema.sql', transactionId);
    const seedCount = await loadFile('seed.sql', transactionId);
    await client.send(new CommitTransactionCommand({ resourceArn: CLUSTER_ARN, secretArn: SECRET_ARN, transactionId }));
    const message = `Loaded ${schemaCount} schema statements and ${seedCount} seed statements.`;
    console.log(message);
    return { PhysicalResourceId: physicalId, Data: { Message: message } };
  } catch (err) {
    await client
      .send(new RollbackTransactionCommand({ resourceArn: CLUSTER_ARN, secretArn: SECRET_ARN, transactionId }))
      .catch((rollbackErr) => console.error('Rollback failed:', rollbackErr.message));
    throw err;
  }
}
