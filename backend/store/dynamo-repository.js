// DynamoDB repository adapter (STORE_MODE=dynamodb). Task 7.
//
// It implements the same seam-4 interface as the JSON adapter and the in-memory stub, and
// passes the SAME runRepositoryContract suite, so swapping it in is a mode switch plus a
// green test run (ADR-014). Records are the camelCase shapes in
// contracts/schemas/records.schema.json; they are mapped to/from snake_case columns by
// ./mapping.js, driven by TABLES in seams.js.
//
// The adapter does NOT construct an AWS client itself. It takes a DynamoDBDocumentClient
// (the @aws-sdk/lib-dynamodb document client) and a table-name map, so:
//   - the contract test can inject an in-memory fake with the same send(command) interface;
//   - the real deploy injects the real document client (see ./index.js).
//
// Seam 4. Architecture 2.9.

import {
  REPOSITORY_METHODS,
  LIMITS,
  TABLES,
} from '../../shared/contracts/seams.js'
import { toItem, fromItem } from './mapping.js'

/**
 * Logical table -> the attribute names used for the DynamoDB partition/sort keys. Append-only
 * tables sort by a composite `sk` so a Query returns items in time order; keyed tables use a
 * natural composite key so writes are idempotent upserts.
 */
export const KEY_SHAPE = {
  student: { pk: 'student_id' },
  student_skill_evidence: { pk: 'student_id', sk: 'sk', append: true },
  step_attempt: { pk: 'student_id', sk: 'sk', append: true },
  checkpoint_progress: { pk: 'student_id', sk: 'checkpoint_id' },
  remediation_flag: { pk: 'student_id', sk: 'sk', append: true },
  routing_decision: { pk: 'student_id', sk: 'sk', append: true },
  fallback_event: { pk: 'student_id', sk: 'sk', append: true },
  passive_signal: { pk: 'student_id', sk: 'sk', append: true },
  hint_event: { pk: 'student_id', sk: 'sk', append: true },
  teacher_input: { pk: 'student_id' },
  teacher_config: { pk: 'teacher_id' },
}

/**
 * @param {object} deps
 * @param {{ send: (command: object) => Promise<any> }} deps.docClient a DynamoDBDocumentClient
 * @param {Record<string, string>} deps.tableNames logical table key -> physical table name
 * @param {object} deps.commands the lib-dynamodb command classes
 *   { PutCommand, GetCommand, QueryCommand }
 * @returns {object} a repository implementing REPOSITORY_METHODS
 */
export function createDynamoRepository({ docClient, tableNames, commands }) {
  if (!docClient?.send) throw new TypeError('docClient with a send() method is required')
  if (!tableNames) throw new TypeError('tableNames map is required')
  if (!commands?.PutCommand || !commands?.GetCommand || !commands?.QueryCommand) {
    throw new TypeError('commands { PutCommand, GetCommand, QueryCommand } are required')
  }
  const { PutCommand, GetCommand, QueryCommand } = commands

  const physical = (table) => {
    const name = tableNames[table]
    if (!name) throw new Error(`no physical table name configured for ${table}`)
    return name
  }

  // A monotonic-ish suffix so two rows with the same createdAt keep a stable order.
  let seq = 0
  const sortKey = (createdAt, id) => `${createdAt}#${id ?? String(++seq).padStart(6, '0')}`

  /** Put a record, adding the key attributes the table's KEY_SHAPE needs. */
  const put = async (table, record, { id } = {}) => {
    const item = toItem(table, record)
    const shape = KEY_SHAPE[table]
    if (shape.append) item.sk = sortKey(record.createdAt, id)
    await docClient.send(new PutCommand({ TableName: physical(table), Item: item }))
    return record
  }

  /** Query every row for a partition key, mapped back to records in sort order. */
  const queryByStudent = async (table, studentId) => {
    const shape = KEY_SHAPE[table]
    const res = await docClient.send(
      new QueryCommand({
        TableName: physical(table),
        KeyConditionExpression: '#pk = :pk',
        ExpressionAttributeNames: { '#pk': shape.pk },
        ExpressionAttributeValues: { ':pk': studentId },
      }),
    )
    return (res.Items ?? []).map((item) => fromItem(table, item))
  }

  const getByKey = async (table, keyRecord) => {
    const res = await docClient.send(
      new GetCommand({ TableName: physical(table), Key: toItem(table, keyRecord) }),
    )
    return res.Item ? fromItem(table, res.Item) : null
  }

  const repo = {
    async putStudent(s) {
      return put('student', s)
    },
    async listStudents() {
      // Students are not partitioned by studentId for a list; a Scan is acceptable at demo
      // scale. The fake and the real client both support ScanCommand-less Query fallback via
      // a table-wide scan emulated by QueryCommand on the fake; the real factory wires Scan.
      const res = await docClient.send(
        new QueryCommand({ TableName: physical('student'), scanAll: true }),
      )
      return (res.Items ?? []).map((item) => fromItem('student', item))
    },

    async appendEvidence(row) {
      return put('student_skill_evidence', row)
    },
    async getEvidence(studentId) {
      const rows = await queryByStudent('student_skill_evidence', studentId)
      const out = {}
      for (const r of rows) out[r.skillId] = Math.max(out[r.skillId] ?? 0, r.level) // C-10
      return out
    },

    async getProgress(studentId) {
      const rows = await queryByStudent('checkpoint_progress', studentId)
      const out = {}
      for (const r of rows) out[r.checkpointId] = r.status
      return out
    },
    async upsertProgress(row) {
      // PutCommand on the natural key (student_id, checkpoint_id) is an idempotent upsert.
      await docClient.send(
        new PutCommand({ TableName: physical('checkpoint_progress'), Item: toItem('checkpoint_progress', row) }),
      )
      return row
    },

    async saveAttempt(a) {
      return put('step_attempt', a, { id: a.attemptId })
    },
    async getHistory(studentId) {
      return sortByTime(await queryByStudent('step_attempt', studentId))
    },

    async writeHintEvent(h) {
      return put('hint_event', h, { id: h.hintId })
    },
    async listHintEvents(studentId) {
      return sortByTime(await queryByStudent('hint_event', studentId))
    },

    async writeRoutingDecision(d) {
      return put('routing_decision', d, { id: d.decisionId })
    },
    async listRoutingDecisions(studentId) {
      return sortByTime(await queryByStudent('routing_decision', studentId))
    },

    async writeFallbackEvent(e) {
      return put('fallback_event', e)
    },
    async listFallbackEvents(studentId) {
      return sortByTime(await queryByStudent('fallback_event', studentId))
    },

    async writePassiveSignal(s) {
      return put('passive_signal', s, { id: s.signalId })
    },
    async getLatestPassiveSignal(studentId) {
      const rows = sortByTime(await queryByStudent('passive_signal', studentId))
      return rows.at(-1) ?? null
    },
    async getCachedPassiveSignal(studentId, featuresHash, promptVersion) {
      const rows = await queryByStudent('passive_signal', studentId)
      return (
        rows.find((s) => s.featuresHash === featuresHash && s.promptVersion === promptVersion) ??
        null
      )
    },

    async writeRemediationFlag(f) {
      return put('remediation_flag', f)
    },
    async listOpenFlags(studentId) {
      const rows = await queryByStudent('remediation_flag', studentId)
      return sortByTime(rows.filter((f) => !f.resolvedAt))
    },

    async getTeacherInput(studentId) {
      return (await getByKey('teacher_input', { studentId })) ?? { mode: 'auto' }
    },
    async setTeacherInput(studentId, input) {
      const row = {
        studentId,
        mode: input.mode,
        checkpointId: input.checkpointId ?? null,
        updatedAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
      }
      await docClient.send(
        new PutCommand({ TableName: physical('teacher_input'), Item: toItem('teacher_input', row) }),
      )
      return row
    },

    async getTeacherConfig(teacherId) {
      return (
        (await getByKey('teacher_config', { teacherId })) ?? {
          teacherId,
          answerTimeoutSeconds: LIMITS.ANSWER_TIMEOUT_SECONDS_DEFAULT,
        }
      )
    },
  }

  for (const m of REPOSITORY_METHODS) {
    if (typeof repo[m] !== 'function') throw new Error(`dynamo repository is missing ${m}`)
  }
  return repo
}

function sortByTime(rows) {
  return [...rows].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
}

/** The physical table names this adapter needs, keyed by logical table. Used by CDK + factory. */
export const DYNAMO_TABLE_KEYS = Object.freeze(Object.keys(TABLES))
