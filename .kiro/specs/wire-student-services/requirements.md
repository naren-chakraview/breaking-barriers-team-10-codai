# Requirements Document

## Introduction

The student-facing web UI currently reads its lesson content, tutor replies, validation and code generation directly from in-browser mock modules (`src/weblab/engine.js`, `src/weblab/tools.js`, `src/weblab/courseData.js`). The frozen service contracts in `shared/contracts` define seam 1 (the Services layer): eight functions the UI calls, their request/response schemas, a stub implementation, and a contract suite. The real HTTP client does not exist yet.

This feature introduces a **services provider** in `src/services/` that returns an object with exactly the eight seam-1 functions, selected at runtime by `VITE_SERVICE_MODE` through `resolveModes`. In `mock` mode it delegates to `createStubServices`; in `http` mode it returns a clearly-marked not-yet-implemented client that throws. A React context and hook expose the provider to components without prop-drilling.

The student screens (the WeblabLesson flow, the dashboard, and the course overview) are rewired to consume the services layer for their data and actions instead of calling `engine.js` directly. Because the contract tree model (checkpoints / steps / skills with `evidenceLevels`) differs from the current four-objective `courseData` model, a small adapter maps `TreeResponse` and `SubmitResponse` into the props the existing components already expect, so the existing visual design is preserved. Every response carries a `source` label and may carry a `notice` and `fallbackActive`, which the UI must surface visibly so canned/stub or fallback data can never pass as live (architecture 1.8).

`shared/contracts` and its schemas are frozen: this feature only consumes them. The teacher view must keep working. Everything stays JavaScript/JSX with no new dependencies.

## Glossary

- **Services_Provider**: The module in `src/services/` exporting a factory that returns a `Services` object with the eight seam-1 functions, chosen by mode.
- **Services**: An object implementing exactly the eight `SERVICE_FUNCTIONS` from `shared/contracts/seams.js`: `getTree`, `submitStep`, `askTutor`, `verifyPrompt`, `generate`, `getTeacherRoster`, `setTeacherInput`, `health`.
- **Mock_Mode**: `VITE_SERVICE_MODE === 'mock'`; the provider delegates to `createStubServices` from `shared/contracts/stubs/services.stub.js`. This is the default.
- **Http_Mode**: `VITE_SERVICE_MODE === 'http'`; the provider returns a not-yet-implemented client whose functions throw a `ContractError`-style "not implemented" error.
- **Services_Context**: The React context carrying the `Services` object; **useServices** is the hook that reads it.
- **Tree_Adapter**: The module mapping `TreeResponse` + `SubmitResponse` (contract models) into the props the existing student components expect (lesson/objective/progress shapes).
- **Source_Badge**: An accessible banner/badge that labels the `source` of displayed model-derived data (`stub`, `bedrock`, `rules`, `cache`, `none`) and surfaces `notice` and `fallbackActive`/health.
- **TreeResponse**: The `getTree` response: `{ tree, progress, evidence, current, fallbackActive, correlationId }` per `services.schema.json`.
- **SubmitResponse**: The `submitStep` response: `{ stepId, outcome, evidence, masteryDisplay, completed, next, hint, passive, notice, source, correlationId }`.
- **masteryDisplay**: An integer 0–100, `round(100 * level / max)`; display-only (C-11), never stored, never used to show a decreasing skill level.
- **Student_Screens**: The WeblabLesson flow (`src/weblab/*`), the student dashboard (`src/StudentDashboard.jsx`), and the course overview (`src/weblab/CourseOverview.jsx`).
- **Teacher_View**: `src/teacher/TeacherView.jsx`, reached through `src/Dashboard.jsx` when `role === 'teacher'`.
- **ContractError**: The error type in `shared/contracts/errors.js` whose `.error` is `{ code, message }`.

## Requirements

### Requirement 1: Services provider with mode selection

**User Story:** As a frontend developer, I want a single provider that returns the eight seam-1 service functions chosen by mode, so that the UI consumes one stable interface and the real HTTP client can later drop in behind the same signatures.

#### Acceptance Criteria

1. THE Services_Provider SHALL export a factory function that returns a Services object exposing exactly the eight functions named in SERVICE_FUNCTIONS and no additional functions.
2. WHEN the factory is invoked, THE Services_Provider SHALL select the implementation by reading VITE_SERVICE_MODE through resolveModes from `shared/contracts/modes.js`.
3. WHERE the resolved service mode is `mock`, THE Services_Provider SHALL return the object produced by createStubServices from `shared/contracts/stubs/services.stub.js`.
4. WHERE VITE_SERVICE_MODE is unset or empty, THE Services_Provider SHALL resolve the service mode to `mock`.
5. WHERE the resolved service mode is `http`, THE Services_Provider SHALL return a Services object whose eight functions each reject with a ContractError whose code is `INTERNAL` and whose message states that the HTTP client is not implemented.
6. IF VITE_SERVICE_MODE holds a value outside the set {`mock`, `http`}, THEN THE Services_Provider SHALL propagate the ContractError raised by resolveModes.
7. THE Services_Provider SHALL accept an injected environment object so that a test can construct the provider in a chosen mode without relying on `import.meta.env`.

### Requirement 2: Services React context and hook

**User Story:** As a component author, I want to read the services object from React context, so that screens get their data source without prop-drilling.

#### Acceptance Criteria

1. THE Services_Context SHALL provide a React context Provider component that supplies a Services object to its descendants.
2. WHERE no explicit services object is passed to the Provider, THE Services_Context SHALL build one from the Services_Provider factory using the ambient environment.
3. WHEN useServices is called by a component rendered inside the Provider, THE Services_Context SHALL return the same Services object supplied by the nearest Provider.
4. IF useServices is called by a component rendered outside any Provider, THEN THE Services_Context SHALL throw an Error that names the missing Provider.
5. THE application entry point SHALL wrap the student and teacher screens in the Services_Context Provider so that every screen can call useServices.

### Requirement 3: Tree adapter maps contract models to component props

**User Story:** As a frontend developer, I want an adapter that maps the contract tree and submit models to the existing component prop shapes, so that the existing student components keep their markup and visual design.

#### Acceptance Criteria

1. WHEN the Tree_Adapter receives a TreeResponse, THE Tree_Adapter SHALL produce a lesson view object containing an ordered list of objectives derived from the tree checkpoints.
2. WHEN the Tree_Adapter derives objectives from a TreeResponse, THE Tree_Adapter SHALL set each objective's completion state from the matching entry in the TreeResponse `progress` map.
3. WHEN the Tree_Adapter computes course progress percent from a TreeResponse, THE Tree_Adapter SHALL return an integer between 0 and 100 equal to `round(100 * completedCheckpoints / totalCheckpoints)`.
4. WHEN the Tree_Adapter receives a SubmitResponse whose `masteryDisplay` is a number, THE Tree_Adapter SHALL expose that number unchanged as the mastery value for display.
5. IF the Tree_Adapter receives a SubmitResponse whose `masteryDisplay` is null, THEN THE Tree_Adapter SHALL report no mastery value rather than a zero or decreased value.
6. THE Tree_Adapter SHALL expose the SubmitResponse `next` target so that the lesson flow can advance to the next checkpoint and step.
7. WHEN the Tree_Adapter maps a TreeResponse `evidence` map, THE Tree_Adapter SHALL preserve each skill's level so that no displayed skill level is lower than the level reported by getTree.

### Requirement 4: Lesson flow reads content and sends actions through services

**User Story:** As a student, I want the lesson to load its content and process my actions through the services layer, so that the lesson reflects contract data and later works against the real backend unchanged.

#### Acceptance Criteria

1. WHEN the lesson flow mounts, THE Student_Screens SHALL call getTree through useServices to source the lesson content and progress.
2. WHILE getTree has not yet resolved, THE Student_Screens SHALL present an accessible loading state announced through an `aria-live` region.
3. WHEN the student submits a step, THE Student_Screens SHALL call submitStep through useServices with the `stepId`, `courseId`, `checkpointId`, and `kind` required by SubmitStepArgs.
4. WHEN submitStep resolves with a `next` target, THE Student_Screens SHALL advance the lesson to the checkpoint and step named in `next`.
5. WHEN the student asks the tutor a question, THE Student_Screens SHALL call askTutor through useServices and display the returned `answer`.
6. WHEN the student requests code generation from a requirements prompt, THE Student_Screens SHALL call verifyPrompt through useServices before calling generate through useServices.
7. IF verifyPrompt returns a verdict of `needs_narrowing`, THEN THE Student_Screens SHALL display the returned `guidance` and SHALL NOT call generate for that prompt.
8. WHEN generate resolves with a non-null `project`, THE Student_Screens SHALL load the returned project into the editor.
9. IF a service call rejects, THEN THE Student_Screens SHALL present an accessible error message and SHALL keep the student's current work in the editor.

### Requirement 5: Dashboard and course overview reflect services progress

**User Story:** As a student, I want my dashboard and course overview to reflect my real progress and evidence from the services layer, so that what I see matches the contract data.

#### Acceptance Criteria

1. WHEN the student dashboard mounts, THE Student_Screens SHALL call getTree through useServices and derive the displayed course progress percent from the TreeResponse through the Tree_Adapter.
2. WHEN the course overview mounts, THE Student_Screens SHALL call getTree through useServices and derive the displayed progress and objective states from the TreeResponse through the Tree_Adapter.
3. WHERE the TreeResponse `evidence` map contains a skill level, THE Student_Screens SHALL display a skill or mastery value no lower than that level.
4. WHILE getTree has not yet resolved on the dashboard or course overview, THE Student_Screens SHALL present an accessible loading state.

### Requirement 6: Visible source, notice, and fallback labeling

**User Story:** As a student, I want canned or fallback content to be visibly labeled, so that stub data is never mistaken for live data (architecture 1.8).

#### Acceptance Criteria

1. WHEN a displayed model-derived response carries a `source` of `stub`, THE Source_Badge SHALL display a visible label identifying the content as sample or stub data.
2. WHEN a service response carries a non-null `notice` whose code is `ADAPTIVE_UNAVAILABLE`, THE Source_Badge SHALL display the notice `message` to the student.
3. WHEN a service response carries a non-null `notice` whose code is `CONTENT_BLOCKED`, THE Source_Badge SHALL display the notice `message` to the student.
4. WHEN a TreeResponse reports `fallbackActive` true, THE Source_Badge SHALL display a visible indication that adaptive features are currently unavailable.
5. THE Source_Badge SHALL expose its status text through an `aria-live` region so that assistive technology announces changes.
6. WHEN a SubmitResponse carries an `outcome` of `fallback`, THE Student_Screens SHALL continue the lesson along the `next` target rather than halting.

### Requirement 7: Provider satisfies the seam-1 contract suite

**User Story:** As a maintainer, I want the new provider proven against the seam-1 contract suite in mock mode, so that swapping the stub for the real HTTP client later is a green test run, not a rewrite.

#### Acceptance Criteria

1. THE repository SHALL contain a test that runs runServicesContract from `shared/contracts/harness.js` against the Services_Provider constructed in Mock_Mode.
2. THE provider contract test SHALL be located so that the existing `npm test` command discovers and runs it.
3. WHEN the provider contract test constructs the provider, THE provider contract test SHALL supply a mock-mode environment rather than depending on `import.meta.env`.
4. WHEN `npm test` runs, THE test suite SHALL keep the 87 pre-existing tests passing and SHALL additionally pass the provider contract test.

### Requirement 8: Constraints, accessibility, and verification

**User Story:** As a maintainer, I want the change to respect the frozen contracts, accessibility, and the existing toolchain, so that the system stays consistent and reviewable.

#### Acceptance Criteria

1. THE feature SHALL add no files and SHALL make no edits under `shared/contracts` or under the schema files.
2. THE feature SHALL add no entries to the `dependencies` or `devDependencies` of `package.json`.
3. THE feature SHALL keep the Teacher_View reachable and functional through `src/Dashboard.jsx`.
4. THE Student_Screens SHALL preserve the existing accessibility affordances, including roles, `aria-live` regions for asynchronous states, and keyboard support, consistent with the existing components.
5. THE feature SHALL keep all added source files in JavaScript or JSX with no TypeScript (C-30).
6. WHEN `npm run build` runs, THE build SHALL complete successfully.
7. WHEN `npm run test:contracts` runs, THE contract suite SHALL pass.
