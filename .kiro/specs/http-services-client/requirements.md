# Requirements Document

## Introduction

This feature implements the real `http` branch of the seam-1 services provider. A previous
feature added the frontend services seam: `createServices(env)` selects an implementation by
`VITE_SERVICE_MODE` via `resolveModes`; `mock` delegates to the frozen stub, and `http`
currently returns a placeholder client whose eight functions throw `ContractError('INTERNAL')`.
The student and teacher screens already call the eight seam-1 functions through `useServices`.

This feature replaces that throwing placeholder with a fetch-based HTTP client in
`src/services/` that talks to the live backend API. The eight functions keep their existing
signatures, so flipping `VITE_SERVICE_MODE=http` connects the existing views to the real
backend, domain core and database with no UI changes. The models and database are reached
**only** through the backend API this client calls; the browser never calls a model and holds
no secrets (C-26).

The client is bound to these frozen, authoritative sources (which this feature does not edit):
`shared/contracts/seams.js` (`SERVICE_FUNCTIONS`, `ENUMS.ErrorCode`, `LIMITS`),
`shared/contracts/schemas/services.schema.json` (wire shapes), `src/services/types.js`
(JSDoc mirror), `shared/contracts/errors.js` (`ContractError`, wire shape
`{ error: { code, message } }`), `shared/contracts/modes.js` (`resolveModes`),
`shared/contracts/harness.js` (`runServicesContract`), `docs/constraints/implementation-constraints.md`,
and the deployed API described by `infra/lib/api-stack.ts` and `infra/README.md`.

### Assumptions (stated per the request; grounded in the constraints)

- **A1** The base API URL, the demo bearer token, the demo user id, and the demo role are
  supplied through `VITE_`-prefixed environment config. These values are public (C-26); no
  AWS keys, model IDs, or prompts are present in frontend code or config.
- **A2** CI has no live backend, so the contract suite and client tests run against a mocked
  `fetch` or a local fake endpoint that conforms to `services.schema.json` and the C-29 wire
  shape.
- **A3** The deployed API is a single API Gateway REST API with a `{proxy+}` catch-all to one
  Python Lambda router (`backend/api/http.py`), which owns the C-29 route table. The client
  targets those exact routes.

### Non-Goals (explicitly out of scope — no requirements build these)

- Real user authentication or login. Demo mode uses a configured demo identity only (C-33).
- Building or changing the backend Lambda/router, the model layer (seam 3), or the
  database/repository (seam 4). Those are separate backend tracks.
- The browser calling a model directly (forbidden by C-26). Models and the database are
  reached only through the backend API.
- Any edit to `shared/contracts/` or its schemas, or any change to the student/teacher
  components that already call `useServices`.

## Glossary

- **HTTP_Services_Client**: The fetch-based implementation of the eight `SERVICE_FUNCTIONS`,
  returned by `createServices` when `VITE_SERVICE_MODE` is `http`. Replaces the throwing
  placeholder in `src/services/provider.js`.
- **Services_Provider**: `createServices(env)` in `src/services/provider.js`, which selects
  the mock stub or the HTTP_Services_Client via `resolveModes`.
- **Service_Function**: One of the eight names in `SERVICE_FUNCTIONS`: `getTree`, `submitStep`,
  `askTutor`, `verifyPrompt`, `generate`, `getTeacherRoster`, `setTeacherInput`, `health`.
- **Adaptive_Call**: A Service_Function whose backend work may invoke a model —
  `submitStep`, `askTutor`, `verifyPrompt`, `generate`. These are the calls bound by the 10 s
  timeout (C-22, C-29).
- **Contract_Error**: A `ContractError` instance (`shared/contracts/errors.js`) whose `.error`
  is `{ code, message }` and whose `code` is one of `ENUMS.ErrorCode`.
- **Error_Code**: A member of `ENUMS.ErrorCode`: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
  `VALIDATION_ERROR`, `CONTENT_BLOCKED`, `RATE_LIMITED`, `TIMEOUT`, `UPSTREAM_ERROR`,
  `CONFIG_ERROR`, `INTERNAL`.
- **Demo_Identity**: The configured demo token, user id, and role used for the P-1.4 request
  headers in demo mode (C-33), supplied via `VITE_` environment config.
- **Env_Config**: The `VITE_`-prefixed environment values read by the frontend. All are public
  (C-26).
- **Correlation_Id**: The `correlationId` string that every seam-1 response carries
  (`common.schema.json#/$defs/CorrelationId`), used to trace a single call.
- **Services_Contract_Suite**: `runServicesContract` in `shared/contracts/harness.js`, the
  seam-1 suite any services implementation must pass.
- **Timeout_Ms**: `LIMITS.TIMEOUT_MS` (10000), the adaptive-call timeout budget.
- **Source_Badge**: The existing `src/services/SourceBadge.jsx` UI element that labels the
  source/notice/fallback state.

## Requirements

### Requirement 1: Real HTTP implementation selected for `http` mode

**User Story:** As a frontend developer, I want the `http` branch to return a working fetch client with the eight existing signatures, so that switching `VITE_SERVICE_MODE=http` connects the existing UI to the live backend without any component change.

#### Acceptance Criteria

1. WHERE `VITE_SERVICE_MODE` is `http`, THE Services_Provider SHALL return an HTTP_Services_Client object instead of the throwing placeholder, and that object SHALL NOT be the mock stub implementation.
2. THE HTTP_Services_Client SHALL expose own-enumerable properties whose names equal exactly the eight Service_Function names in `SERVICE_FUNCTIONS` (`getTree`, `submitStep`, `askTutor`, `verifyPrompt`, `generate`, `getTeacherRoster`, `setTeacherInput`, `health`), with no additional and no missing names, and the value of each SHALL satisfy `typeof value === 'function'`.
3. THE HTTP_Services_Client SHALL accept, for every Service_Function, the argument object defined for that function in `src/services/types.js` and `services.schema.json` without adding required arguments, removing accepted arguments, or renaming any argument field.
4. WHEN a Service_Function of the HTTP_Services_Client resolves, THE HTTP_Services_Client SHALL return a value that validates against that function's response definition in `services.schema.json`.
5. WHEN a student or teacher component invokes a Service_Function through `useServices`, THE HTTP_Services_Client SHALL perform the corresponding backend call using the same function name, arity, and Promise-returning call shape as the mock stub, so that the component source requires no change (C-28).

### Requirement 2: Route, method, and camelCase JSON mapping

**User Story:** As a backend integrator, I want each Service_Function mapped to its exact C-29 route and method with camelCase JSON on the wire, so that the client and the Python router agree on the contract.

#### Acceptance Criteria

1. WHEN `getTree` is called, THE HTTP_Services_Client SHALL issue a `GET` request to `/courses/{courseId}`, where the `course` path name means the skill tree (C-4), the `{courseId}` segment is the URL-encoded `courseId` argument occupying exactly one path segment, and no request body is sent.
2. WHEN `submitStep` is called, THE HTTP_Services_Client SHALL issue a `POST` request to `/steps/{stepId}/submit`, where the `{stepId}` segment is the URL-encoded `stepId` argument occupying exactly one path segment, with the `SubmitStepArgs` fields other than `stepId` as a camelCase JSON body that omits `stepId`.
3. WHEN `askTutor` is called, THE HTTP_Services_Client SHALL issue a `POST` request to `/tutor/ask` with all `AskTutorArgs` fields as a camelCase JSON body.
4. WHEN `verifyPrompt` is called, THE HTTP_Services_Client SHALL issue a `POST` request to `/prompts/verify` with all `VerifyPromptArgs` fields as a camelCase JSON body.
5. WHEN `generate` is called, THE HTTP_Services_Client SHALL issue a `POST` request to `/prompts/generate` with all `GenerateArgs` fields as a camelCase JSON body.
6. WHEN `getTeacherRoster` is called, THE HTTP_Services_Client SHALL issue a `GET` request to `/teacher/students` with the URL-encoded `courseId` argument as the `courseId` query parameter and no request body.
7. WHEN `setTeacherInput` is called, THE HTTP_Services_Client SHALL issue a `POST` request to `/teacher/students/{studentId}/routing`, where the `{studentId}` segment is the URL-encoded `studentId` argument occupying exactly one path segment, with the `input` object as a camelCase JSON body under the `input` property and no `studentId` field in the body.
8. WHEN `health` is called, THE HTTP_Services_Client SHALL issue a `GET` request to `/health` with no request body.
9. WHEN a backend response returns a 2xx status with a JSON body, THE HTTP_Services_Client SHALL parse the camelCase JSON body and return the object matching the corresponding response definition in `services.schema.json`.
10. THE HTTP_Services_Client SHALL resolve each route path against the base API URL from Env_Config (A1), such that a single `/` separates the base URL from the route path.

### Requirement 3: P-1.4 request headers and demo identity from public env config

**User Story:** As an operator running the demo, I want every backend call to carry the P-1.4 headers from a configured demo identity, so that the API authorizes the call in demo mode without a real login and without any secret in the browser.

#### Acceptance Criteria

1. WHEN the HTTP_Services_Client issues any backend request, THE HTTP_Services_Client SHALL set the header `Authorization` to the string `Bearer ` immediately followed by the Demo_Identity token value.
2. WHEN the HTTP_Services_Client issues any backend request, THE HTTP_Services_Client SHALL set the header `X-User-Id` to the Demo_Identity user id value.
3. WHEN the HTTP_Services_Client issues any backend request, THE HTTP_Services_Client SHALL set the header `X-Role` to the Demo_Identity role value.
4. WHEN the HTTP_Services_Client sends a request that includes a body, THE HTTP_Services_Client SHALL set the header `Content-Type` to `application/json`.
5. THE HTTP_Services_Client SHALL read the base API URL, the Demo_Identity token, the Demo_Identity user id, and the Demo_Identity role exclusively from `VITE_`-prefixed Env_Config values (C-26, C-33).
6. THE HTTP_Services_Client SHALL exclude any AWS access key, AWS secret key, AWS session token, model ID, and model prompt from its source, from its Env_Config inputs, and from the headers, query string, and body of every request it sends (C-26).
7. IF, when the HTTP_Services_Client is constructed, the Env_Config value for the base API URL, the Demo_Identity token, the Demo_Identity user id, or the Demo_Identity role is absent or an empty string, THEN THE HTTP_Services_Client SHALL raise a Contract_Error with code `CONFIG_ERROR` and SHALL not issue any backend request.
8. IF, when the HTTP_Services_Client is constructed, the Demo_Identity role Env_Config value is neither `student` nor `teacher`, THEN THE HTTP_Services_Client SHALL raise a Contract_Error with code `CONFIG_ERROR` and SHALL not issue any backend request.

### Requirement 4: Error handling mapped to the C-29 wire shape

**User Story:** As a UI developer, I want every backend failure surfaced as a Contract_Error with a known Error_Code, so that the existing notice and fallback behavior keeps working unchanged.

#### Acceptance Criteria

1. WHEN a backend response returns a non-2xx status carrying a body of shape `{ error: { code, message } }` whose `code` is a member of `ENUMS.ErrorCode`, THE HTTP_Services_Client SHALL reject the call with a Contract_Error carrying that `code` and `message`, in preference to any HTTP-status-derived code.
2. IF a backend response returns a non-2xx status carrying a body of shape `{ error: { code, message } }` whose `code` is NOT a member of `ENUMS.ErrorCode`, THEN THE HTTP_Services_Client SHALL reject the call with a Contract_Error whose code is derived from the HTTP status per criterion 3.
3. IF a backend response returns a non-2xx status without a body matching `{ error: { code, message } }`, THEN THE HTTP_Services_Client SHALL reject the call with a Contract_Error whose code is `UNAUTHORIZED` for `401`, `FORBIDDEN` for `403`, `NOT_FOUND` for `404`, `RATE_LIMITED` for `429`, `UPSTREAM_ERROR` for `502`, `TIMEOUT` for `504`, and `INTERNAL` for any other non-2xx status.
4. IF the response body is present but is not valid JSON, THEN THE HTTP_Services_Client SHALL reject the call with a Contract_Error with code `UPSTREAM_ERROR`.
5. IF the `fetch` call fails at the network layer, THEN THE HTTP_Services_Client SHALL reject the call with a Contract_Error with code `UPSTREAM_ERROR`.
6. WHEN the HTTP_Services_Client constructs a Contract_Error message, THE HTTP_Services_Client SHALL exclude secrets and raw student text from that message.
7. WHEN the HTTP_Services_Client rejects a call, THE HTTP_Services_Client SHALL reject with a `ContractError` whose `.error` property equals `{ code, message }` (C-29).

### Requirement 5: Adaptive-call timeout

**User Story:** As a student, I want an adaptive call that stalls to stop at 10 seconds and report a timeout, so that the UI's existing fallback and Source_Badge behavior triggers instead of hanging.

#### Acceptance Criteria

1. WHEN an Adaptive_Call is issued, THE HTTP_Services_Client SHALL start a timeout bounded by `LIMITS.TIMEOUT_MS` (10000 ms) for that request.
2. IF an Adaptive_Call has not settled within `LIMITS.TIMEOUT_MS` (that is, it is still pending strictly after 10000 ms), THEN THE HTTP_Services_Client SHALL abort the in-flight request and reject the call with a Contract_Error with code `TIMEOUT` and no parsed response body.
3. WHEN an Adaptive_Call settles at or before `LIMITS.TIMEOUT_MS`, THE HTTP_Services_Client SHALL return or reject per Requirement 4 without aborting on the timeout.
4. WHEN an Adaptive_Call settles before its timeout elapses, THE HTTP_Services_Client SHALL cancel the pending timeout so that no later `TIMEOUT` rejection is raised for that call.
5. THE non-adaptive Service_Functions (`getTree`, `getTeacherRoster`, `setTeacherInput`, `health`) SHALL NOT be bound by the `LIMITS.TIMEOUT_MS` adaptive-call timeout and SHALL settle per Requirement 4.

### Requirement 6: correlationId propagation and traceability

**User Story:** As an operator debugging a demo, I want each call to carry a correlationId so that a single call can be traced across the UI and the backend.

#### Acceptance Criteria

1. WHEN a backend response includes a `correlationId` string, THE HTTP_Services_Client SHALL return that `correlationId` unchanged as the `correlationId` property of the resolved response object.
2. THE HTTP_Services_Client SHALL return response objects whose `correlationId` matches the `correlationId` definition in `services.schema.json` (pattern `^[A-Za-z0-9_-]{8,64}$`).
3. WHEN the HTTP_Services_Client issues a backend request, THE HTTP_Services_Client SHALL generate a correlation identifier and send it as the request header `X-Correlation-Id`, so the call can be correlated end to end.
4. IF a 2xx backend response is missing a `correlationId` or carries one that does not match the `services.schema.json` pattern, THEN THE HTTP_Services_Client SHALL reject the call with a Contract_Error with code `UPSTREAM_ERROR`.

### Requirement 7: Passes the seam-1 contract suite

**User Story:** As a maintainer, I want the real client to pass the same contract suite the stub passes, so that swapping stub to real is a green test run rather than a rewrite.

#### Acceptance Criteria

1. WHEN `runServicesContract` is run against the HTTP_Services_Client pointed at an endpoint conforming to `services.schema.json` and the C-29 wire shape, THE HTTP_Services_Client SHALL pass every assertion in the Services_Contract_Suite with zero failing and zero skipped assertions.
2. WHEN the suite enumerates the object returned by the HTTP_Services_Client factory, THE HTTP_Services_Client SHALL expose exactly the eight Service_Function names (`getTree`, `submitStep`, `askTutor`, `verifyPrompt`, `generate`, `getTeacherRoster`, `setTeacherInput`, `health`) as callable functions, with no additional and no missing function-typed properties, satisfying the suite's "exposes exactly the eight service functions" assertion.
3. WHEN the Services_Contract_Suite runs in CI, THE test setup SHALL point the HTTP_Services_Client at a mocked `fetch` or a local fake endpoint whose responses conform to `services.schema.json` and the C-29 wire shape, such that no live backend is required for the run to complete.
4. WHEN each Service_Function resolves in the suite, THE resolved response SHALL validate against its schema definition in `services.schema.json` with zero schema violations (including rejection of any property not declared, since `additionalProperties` is false) AND SHALL carry a `correlationId` string matching `^[A-Za-z0-9_-]{8,64}$`.
5. WHEN `submitStep` resolves for a panels step in the suite, THE resolved response SHALL have `outcome` equal to `recorded`, `evidence` equal to null, and `masteryDisplay` equal to null (C-15).
6. IF the endpoint the HTTP_Services_Client is pointed at returns a response that does not conform to `services.schema.json` or the C-29 wire shape, THEN THE Services_Contract_Suite SHALL report at least one failing assertion for the affected Service_Function and SHALL NOT report the run as passing.

### Requirement 8: Mode-selection safety preserved

**User Story:** As a developer configuring a deploy, I want mode selection to behave exactly as before, so that an unset mode still defaults to mock and a typo still fails loudly.

#### Acceptance Criteria

1. WHERE `VITE_SERVICE_MODE` is unset, empty, or a string containing only whitespace, THE Services_Provider SHALL return the mock stub implementation and SHALL NOT construct an HTTP_Services_Client.
2. IF `VITE_SERVICE_MODE` holds a non-empty value that is not exactly `mock` or `http`, THEN THE Services_Provider SHALL raise a Contract_Error with code `CONFIG_ERROR`.
3. WHEN the Services_Provider raises the `CONFIG_ERROR` for an out-of-range `VITE_SERVICE_MODE`, THE Services_Provider SHALL NOT return any Service_Function implementation and SHALL NOT issue any backend request.
4. WHEN `VITE_SERVICE_MODE` is changed from `mock` to `http`, THE student components SHALL invoke the eight Service_Functions through `useServices` with no change to any component source file (C-28).
5. WHEN `VITE_SERVICE_MODE` is changed from `mock` to `http`, THE teacher components SHALL invoke the eight Service_Functions through `useServices` with no change to any component source file (C-28).

### Requirement 9: Constraint and compatibility guardrails

**User Story:** As a reviewer, I want the implementation to respect the frozen contracts, the frontend stack, and the existing UI labeling, so that this change is additive and safe.

#### Acceptance Criteria

1. THE HTTP_Services_Client implementation SHALL make no edit to any file under `shared/contracts/` or `shared/contracts/schemas/`.
2. THE HTTP_Services_Client SHALL be written in JavaScript or JSX only, containing no TypeScript syntax and no TypeScript source files (C-30).
3. WHERE the platform `fetch` is sufficient, THE HTTP_Services_Client SHALL add no new runtime dependency to the frontend package manifest.
4. IF a new runtime dependency is required for the HTTP_Services_Client, THEN THE design document SHALL name the dependency and state its justification before the dependency is added.
5. WHEN a teacher component invokes `getTeacherRoster` or `setTeacherInput` through `useServices` in `http` mode, THE HTTP_Services_Client SHALL resolve each call with a response object matching the corresponding `services.schema.json` response definition.
6. WHEN a Service_Function whose `services.schema.json` response definition includes a `source` field resolves, THE HTTP_Services_Client SHALL return that `source` value unchanged from the backend response so the Source_Badge labeling is preserved.
7. WHEN a Service_Function whose `services.schema.json` response definition includes a `notice` field resolves, THE HTTP_Services_Client SHALL return that `notice` value (object or null) unchanged from the backend response so the Source_Badge notice labeling is preserved.
8. WHEN a Service_Function whose `services.schema.json` response definition includes a `fallbackActive` field resolves, THE HTTP_Services_Client SHALL return that `fallbackActive` boolean unchanged from the backend response so the existing fallback labeling and accessibility behavior are preserved.
