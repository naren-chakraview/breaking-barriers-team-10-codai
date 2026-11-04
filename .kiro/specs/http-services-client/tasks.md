# Implementation Plan: HTTP Services Client

## Overview

Build the real `http` branch of the seam-1 services provider as a fetch-based client under
`src/services/`, implemented incrementally so each step builds on the previous one and ends
with the provider rewire and a green contract run. The order mirrors the design's dependency
chain: the two pure modules first (`httpConfig`, `httpRoutes`), then the single I/O module
(`httpRequest`), then the factory (`httpClient`) and the one-line `provider.js` rewire, then
the contract test, then a final verification task that enforces the guardrails.

All new modules are JavaScript only (no TypeScript, C-30). No new runtime or dev dependency
is added — the platform `fetch`, `AbortController`, `AbortSignal.timeout`, and
`crypto.randomUUID` cover every need, and `vitest` is already present. Property tests are
plain Vitest loops (no PBT library). Test files live under `src/` so the existing
`vitest.config.js` include glob `src/**/*.test.js` (node environment) discovers them under
`npm test`.

Nothing under `shared/contracts/` or `shared/contracts/schemas/` is edited; the frozen
sources (`seams.js`, `errors.js`, `services.schema.json`, `common.schema.json`, `modes.js`,
`harness.js`, fixtures) are imported and reused only.

## Tasks

- [ ] 1. Implement the config reader `src/services/httpConfig.js`
  - Create `src/services/httpConfig.js` exporting `readConfig(env)` that reads only the
    `VITE_`-prefixed keys `VITE_API_BASE_URL`, `VITE_DEMO_TOKEN`, `VITE_DEMO_USER_ID`,
    `VITE_DEMO_ROLE` into a frozen `ClientConfig` `{ baseUrl, token, userId, role }`.
  - Trim `baseUrl`; treat any field that is absent or empty-after-trim as invalid and throw
    `ContractError('CONFIG_ERROR', <generic message>)` (import `ContractError` from
    `../../shared/contracts/errors.js`).
  - Validate `role` is exactly `student` or `teacher`; otherwise throw
    `ContractError('CONFIG_ERROR', ...)`.
  - Never read or reference AWS keys/secrets/session tokens, model ids, or prompts; `Object.freeze`
    the returned config; issue no request.
  - _Requirements: 3.5, 3.6, 3.7, 3.8_

  - [ ]* 1.1 Write property test for config validation in `src/services/httpConfig.test.js`
    - **Property 13: Config validation rejects missing, empty, or invalid-role config**
    - **Validates: Requirements 3.7, 3.8**
    - >=100 iterations, no new PBT dependency (loop + local generators; Vitest fake timers for the timeout property)
    - Generate envs that drop/blank one of the four fields, and envs with a non-empty role other than `student`/`teacher`; assert each throws `CONFIG_ERROR` and that no `fetch` occurs.

  - [ ]* 1.2 Write unit tests for `readConfig` happy path and each trigger in `src/services/httpConfig.test.js`
    - Cover the happy path (frozen config, correct fields) and each `CONFIG_ERROR` trigger: missing base URL, empty token, empty user id, missing role, role `admin`.
    - _Requirements: 3.5, 3.7, 3.8_

- [ ] 2. Implement the pure request-plan builder `src/services/httpRoutes.js`
  - Create `src/services/httpRoutes.js` exporting pure `buildRequestPlan(fnName, args)` →
    `{ method, path, query, body, adaptive }` with no I/O, mirroring the `_ROUTES` mapping in
    `backend/api/http.py`.
  - Map the eight functions exactly: `getTree` → `GET /courses/{courseId}`;
    `submitStep` → `POST /steps/{stepId}/submit` with body = `SubmitStepArgs` minus `stepId`;
    `askTutor` → `POST /tutor/ask`; `verifyPrompt` → `POST /prompts/verify`;
    `generate` → `POST /prompts/generate`; `getTeacherRoster` → `GET /teacher/students` with
    `query.courseId`; `setTeacherInput` → `POST /teacher/students/{studentId}/routing` with
    body `{ input }` only (no `studentId`); `health` → `GET /health`.
  - URL-encode each interpolated path segment with `encodeURIComponent` so it occupies exactly
    one segment; GET plans carry `body: null`; `adaptive` is true only for `submitStep`,
    `askTutor`, `verifyPrompt`, `generate`.
  - Preserve camelCase field names verbatim; add/drop/rename nothing.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 2.1 Write property test for route and method mapping in `src/services/httpRoutes.test.js`
    - **Property 2: Route and method are a pure function of (fnName, args)**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**
    - >=100 iterations, no new PBT dependency (loop + local generators; Vitest fake timers for the timeout property)
    - For each `SERVICE_FUNCTIONS` name with generated valid args, assert the fixed method/path template and that two equal inputs give deep-equal plans.

  - [ ]* 2.2 Write property test for path-segment encoding in `src/services/httpRoutes.test.js`
    - **Property 3: Path-segment arguments are URL-encoded into exactly one segment**
    - **Validates: Requirements 2.1, 2.2, 2.6, 2.7**
    - >=100 iterations, no new PBT dependency (loop + local generators; Vitest fake timers for the timeout property)
    - Generate `courseId`/`stepId`/`studentId` values containing `/`, spaces, and unicode; assert the path contains their `encodeURIComponent` and introduces no extra unescaped `/`.

  - [ ]* 2.3 Write property test for body shape in `src/services/httpRoutes.test.js`
    - **Property 4: Request body matches the method and omits path-only fields**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**
    - >=100 iterations, no new PBT dependency (loop + local generators; Vitest fake timers for the timeout property)
    - Assert GET plans (`getTree`, `getTeacherRoster`, `health`) have null body; POST plans carry the camelCase body, with `submitStep` omitting `stepId` and `setTeacherInput` sending `{ input }` only.

- [x] 3. Implement the request helper `src/services/httpRequest.js` (the only I/O)
  - Create `src/services/httpRequest.js` exporting `sendRequest(config, plan)` and a helper
    `generateCorrelationId()` that returns a value matching `^[A-Za-z0-9_-]{8,64}$` (derive from
    `crypto.randomUUID`), used only for the `X-Correlation-Id` request header.
  - Build the URL by joining `config.baseUrl` and `plan.path` with exactly one `/` (trim a
    trailing `/` on the base), then append the query string when `plan.query` is set.
  - Always set the three P-1.4 headers (`Authorization: Bearer <token>`, `X-User-Id`,
    `X-Role`) plus `X-Correlation-Id`; add `Content-Type: application/json` only when a body is
    sent; `JSON.stringify(plan.body)` for POST, no body for GET.
  - For `plan.adaptive === true` pass `signal: AbortSignal.timeout(LIMITS.TIMEOUT_MS)` (import
    `LIMITS` from `../../shared/contracts/seams.js`); non-adaptive plans pass no signal.
  - Map outcomes to a resolved response or a `ContractError` per the design's Error Handling
    decision procedure (see sub-tasks 3.x); build only fixed, generic messages that never
    interpolate the token or student text.
  - _Requirements: 2.9, 2.10, 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3_

  - [x] 3.1 Implement the 2xx parse-and-validate path in `src/services/httpRequest.js`
    - On 2xx, parse JSON (reject `ContractError('UPSTREAM_ERROR', ...)` on invalid JSON);
      reject `UPSTREAM_ERROR` when `correlationId` is missing or fails
      `^[A-Za-z0-9_-]{8,64}$`; otherwise resolve the parsed object unchanged, preserving
      `correlationId`, `source`, `notice`, and `fallbackActive` verbatim.
    - _Requirements: 2.9, 4.4, 6.1, 6.2, 6.4, 9.6, 9.7, 9.8_

  - [x] 3.2 Implement the non-2xx error mapping in `src/services/httpRequest.js`
    - When the body is `{ error: { code, message } }` and `code ∈ ENUMS.ErrorCode`, reject with
      that exact code/message in preference to the status; when `code ∉ ENUMS.ErrorCode` or the
      body does not match that shape, use the status-derived code map (401→`UNAUTHORIZED`,
      403→`FORBIDDEN`, 404→`NOT_FOUND`, 429→`RATE_LIMITED`, 502→`UPSTREAM_ERROR`,
      504→`TIMEOUT`, any other non-2xx→`INTERNAL`).
    - _Requirements: 4.1, 4.2, 4.3, 4.7_

  - [x] 3.3 Implement the network-failure and abort paths in `src/services/httpRequest.js`
    - A rejected `fetch` that is not an abort → `ContractError('UPSTREAM_ERROR', ...)`; an
      `AbortError` (adaptive timeout fired) → `ContractError('TIMEOUT', ...)` with no parsed
      body.
    - _Requirements: 4.5, 5.2_

  - [ ]* 3.4 Write property test for the P-1.4 and correlation headers in `src/services/httpRequest.test.js`
    - **Property 5: Every request carries the three P-1.4 headers and the correlation header**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 6.3**
    - >=100 iterations, no new PBT dependency (loop + local generators; Vitest fake timers for the timeout property)
    - With a mocked global `fetch` recording `(url, options)`, assert `Authorization` = `Bearer <token>`, `X-User-Id`, `X-Role`, an `X-Correlation-Id` matching the pattern, and `Content-Type: application/json` whenever a body is sent.

  - [ ]* 3.5 Write property test for URL join in `src/services/httpRequest.test.js`
    - **Property 6: The base URL and path join with exactly one separator**
    - **Validates: Requirements 2.10**
    - >=100 iterations, no new PBT dependency (loop + local generators; Vitest fake timers for the timeout property)
    - Generate base URLs with and without a trailing `/` and assorted paths/queries; assert exactly one `/` joins base and path and the query is appended after the path.

  - [ ]* 3.6 Write property test for the adaptive abort signal in `src/services/httpRequest.test.js`
    - **Property 7: Only adaptive calls receive an abort signal**
    - **Validates: Requirements 5.1, 5.5**
    - >=100 iterations, no new PBT dependency (loop + local generators; Vitest fake timers for the timeout property)
    - With a mocked `fetch`, assert the options carry an `AbortSignal` iff the plan is adaptive (`submitStep`, `askTutor`, `verifyPrompt`, `generate`) and no signal otherwise.

  - [ ]* 3.7 Write property test for the timeout behavior in `src/services/httpRequest.test.js`
    - **Property 8: An adaptive call that exceeds the budget rejects with TIMEOUT and no body**
    - **Validates: Requirements 5.2, 5.3, 5.4**
    - >=100 iterations, no new PBT dependency (loop + local generators; Vitest fake timers for the timeout property)
    - Use Vitest fake timers to advance strictly past `LIMITS.TIMEOUT_MS` for a pending adaptive call (assert `TIMEOUT`, no body) and to settle at/before the budget (assert no `TIMEOUT` conversion).

  - [ ]* 3.8 Write property test for the status→code mapping in `src/services/httpRequest.test.js`
    - **Property 9: The error-status → code mapping is total and deterministic**
    - **Validates: Requirements 4.3**
    - >=100 iterations, no new PBT dependency (loop + local generators; Vitest fake timers for the timeout property)
    - Generate non-2xx statuses across the range with bodies that do not match `{ error: { code, message } }`; assert the exact status-derived code and that equal inputs map identically every run.

  - [ ]* 3.9 Write property test for error-body precedence in `src/services/httpRequest.test.js`
    - **Property 10: A well-formed error body wins over the status-derived code**
    - **Validates: Requirements 4.1, 4.2**
    - >=100 iterations, no new PBT dependency (loop + local generators; Vitest fake timers for the timeout property)
    - Generate non-2xx responses whose body is `{ error: { code, message } }`; assert an in-`ENUMS.ErrorCode` code is honored verbatim regardless of status, and an out-of-enum code falls back to the status-derived code.

  - [ ]* 3.10 Write property test for unparseable/invalid bodies in `src/services/httpRequest.test.js`
    - **Property 11: Invalid or unparseable response bodies reject with UPSTREAM_ERROR**
    - **Validates: Requirements 4.4, 4.5, 6.4**
    - >=100 iterations, no new PBT dependency (loop + local generators; Vitest fake timers for the timeout property)
    - Generate non-JSON 2xx bodies, network-layer `fetch` rejections, and 2xx bodies with missing/invalid `correlationId`; assert each rejects `UPSTREAM_ERROR`.

  - [ ]* 3.11 Write property test for clean rejection shape in `src/services/httpRequest.test.js`
    - **Property 12: Every rejection is a ContractError with a clean wire shape**
    - **Validates: Requirements 4.6, 4.7**
    - >=100 iterations, no new PBT dependency (loop + local generators; Vitest fake timers for the timeout property)
    - For generated failing calls, assert the rejection is a `ContractError` whose `.error` deep-equals `{ code, message }` with `code ∈ ENUMS.ErrorCode`, and whose `message` contains neither the configured token nor any raw student text from the args.

  - [ ]* 3.12 Write unit tests for representative timeout and network-failure examples in `src/services/httpRequest.test.js`
    - Add one concrete adaptive-timeout example (fake timers) and one concrete network-failure example alongside the properties.
    - _Requirements: 5.2, 4.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement the factory `src/services/httpClient.js`
  - Create `src/services/httpClient.js` exporting `createHttpServices(env)` that calls
    `readConfig(env)` first (propagating `CONFIG_ERROR` before any request), then builds a plain
    object whose own-enumerable keys are exactly the eight `SERVICE_FUNCTIONS`, each an async
    `(args) => sendRequest(config, buildRequestPlan(name, args))`.
  - Define the frozen `ADAPTIVE = new Set(['submitStep', 'askTutor', 'verifyPrompt', 'generate'])`
    constant consistent with `buildRequestPlan`'s `adaptive` flag.
  - Import `createHttpServices` dependencies from the new modules and `SERVICE_FUNCTIONS` from
    `../../shared/contracts/seams.js`.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1_

  - [ ]* 5.1 Write property test for the factory's function set in `src/services/httpClient.test.js`
    - **Property 1: The factory exposes exactly the eight functions**
    - **Validates: Requirements 1.2, 7.2**
    - >=100 iterations, no new PBT dependency (loop + local generators; Vitest fake timers for the timeout property)
    - For generated valid configs, assert the returned object's own-enumerable keys equal `SERVICE_FUNCTIONS` (no missing/extra) and every value is a function.

  - [ ]* 5.2 Write property test for pass-through of a 2xx response in `src/services/httpClient.test.js`
    - **Property 14: A 2xx response is returned unchanged, preserving labeling fields**
    - **Validates: Requirements 2.9, 6.1, 6.2, 9.6, 9.7, 9.8**
    - >=100 iterations, no new PBT dependency (loop + local generators; Vitest fake timers for the timeout property)
    - With a mocked `fetch` returning schema-valid 2xx bodies, assert the resolved object preserves `correlationId` and, when present, `source`/`notice`/`fallbackActive` byte-for-byte.

- [ ] 6. Rewire the `http` branch in `src/services/provider.js`
  - Replace the `notImplementedServices()` branch so `createServices` returns
    `createHttpServices(env ?? ambientEnv())` for `http` mode; remove the
    `notImplementedServices` placeholder.
  - Keep the `resolveModes` call, the mock branch, and the `ambientEnv()` helper exactly as they
    are; change no other provider behavior.
  - _Requirements: 1.1, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 6.1 Write unit tests for provider mode selection in `src/services/provider.test.js`
    - Assert `http` returns the HTTP client (not the stub), unset/empty/whitespace returns the stub, and a typo throws `CONFIG_ERROR`, reusing the existing provider behavior.
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 7. Add the contract test `src/services/httpClient.contract.test.js`
  - Mirror `provider.contract.test.js` and call `runServicesContract` (from
    `../../shared/contracts/harness.js`) against `createHttpServices` pointed at an in-memory
    fake `fetch`.
  - The fake `fetch` routes by `(method, path)` using the same table as `buildRequestPlan` and
    returns schema-valid canned bodies, reusing
    `shared/contracts/fixtures/services/responses.json` for submit/tutor/verify/generate/roster/
    routing/health and `database/sample-skilltree.json` for the `getTree` tree payload; each
    canned body carries a `correlationId` matching `^[A-Za-z0-9_-]{8,64}$`.
  - Construct the client with a valid demo env (`VITE_API_BASE_URL`, `VITE_DEMO_TOKEN`,
    `VITE_DEMO_USER_ID`, `VITE_DEMO_ROLE`); the suite must pass with zero failing and zero
    skipped assertions, including the eight-function enumeration, each schema-valid response with
    a pattern-valid `correlationId`, and `submitStep` returning `outcome: 'recorded'`,
    `evidence: null`, `masteryDisplay: null`.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.5_

  - [ ]* 7.1 Add a negative contract check in `src/services/httpClient.contract.test.js`
    - In a separate test (keeping the green run green), point the client at a fake `fetch` that returns a deliberately malformed body for one function and assert at least one failing assertion for the affected function, so a non-conforming endpoint cannot pass as live.
    - _Requirements: 7.6_

- [x] 8. Final verification - enforce guardrails and run the gates
  - Confirm no edits were made under `shared/contracts/` or `shared/contracts/schemas/`, and no
    change to any student/teacher component (requirement 9.1, C-28).
  - Confirm all new files are `.js` with no TypeScript syntax (C-30) and that `package.json`
    gained no new runtime or dev dependency (platform `fetch`/`AbortController`/
    `AbortSignal.timeout`/`crypto` and the existing `vitest` suffice; requirement 9.3).
  - Confirm `.env.example` documents the new public `VITE_` keys only if already covered; do not
    add secrets.
  - Run the verification gates and ensure every pre-existing test stays green: `npm run build`,
    `npm test` (discovers the new `src/**/*.test.js` files), and `npm run test:contracts`.
  - Never stage `vite.config.js` or `.vite/`.
  - _Requirements: 7.1, 9.1, 9.2, 9.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; a coding agent MUST NOT implement `*` sub-tasks and MUST implement the non-`*` ones.
- Every property sub-task cites its design Property number and the requirements it validates, and runs ">=100 iterations, no new PBT dependency (loop + local generators; Vitest fake timers for the timeout property)".
- Each task builds on the prior ones: pure modules (`httpConfig`, `httpRoutes`) → I/O helper (`httpRequest`) → factory (`httpClient`) → provider rewire → contract test → final verification.
- Test files live under `src/` and are discovered by the existing `vitest.config.js` include glob `src/**/*.test.js` (node environment) under `npm test`.
- No file under `shared/contracts/` or its schemas is edited; frozen sources are imported and reused only.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["1.1", "1.2", "2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["3"] },
    { "id": 3, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 4, "tasks": ["3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "3.10", "3.11", "3.12"] },
    { "id": 5, "tasks": ["5"] },
    { "id": 6, "tasks": ["5.1", "5.2", "6"] },
    { "id": 7, "tasks": ["6.1", "7"] },
    { "id": 8, "tasks": ["7.1"] },
    { "id": 9, "tasks": ["8"] }
  ]
}
```
