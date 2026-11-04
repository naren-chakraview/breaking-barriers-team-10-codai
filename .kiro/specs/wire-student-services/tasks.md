# Implementation Plan: Wire Student Services

## Overview

Build the seam-1 services provider, a React context/hook, a pure tree adapter, and an accessible source/fallback badge; then rewire the student screens (lesson flow, dashboard, course overview) to consume the services layer while preserving the existing visual design. Prove the provider against the seam-1 contract suite in mock mode. No edits under `shared/contracts`; no new dependencies; JavaScript/JSX only.

## Tasks

- [ ] 1. Create the services provider with mode selection
  - Create `src/services/provider.js` exporting `createServices(env)`.
  - Read mode via `resolveModes(env ?? import.meta.env ?? {})`; `mock` → `createStubServices()`; `http` → object over `SERVICE_FUNCTIONS` whose functions each `async` throw `ContractError('INTERNAL', 'HTTP services client is not implemented yet (seam 1)...')` with a `// TODO` seam.
  - Default env read lazily inside the function; let an invalid mode's `ContractError` propagate.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 8.1, 8.2, 8.5_

  - [ ]* 1.1 Write property tests for the provider
    - **Property 1: Provider exposes exactly the eight service functions** (Validates: 1.1, 1.3, 1.5)
    - **Property 2: Default and invalid mode selection** (Validates: 1.2, 1.4, 1.5, 1.6)
    - **Property 3: HTTP-mode functions reject as not implemented** (Validates: 1.5)
    - ≥100 iterations each; in-repo generator loop (no new dependency); tag `// Feature: wire-student-services, Property N`.

- [ ] 2. Create the Services React context and hook
  - Create `src/services/ServicesContext.jsx` exporting `ServicesProvider` and `useServices`.
  - `ServicesProvider` uses an injected `services` prop when given, else memoizes `createServices(env)`.
  - `useServices` throws a descriptive Error when used outside a Provider.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 8.5_

  - [ ] 2.1 Wrap the app in the provider
    - Update `src/main.jsx` to render `<ServicesProvider>` around `<App/>`.
    - _Requirements: 2.5_

- [ ] 3. Create the pure tree adapter
  - Create `src/services/treeAdapter.js` exporting `adaptTree`, `adaptSubmit`, `statusToUiState`.
  - `adaptTree(TreeResponse)` → `{ courseId, title, objectives:[{id,title,status,skillIds}], progressPercent, evidence, current, fallbackActive, source }`; objectives = checkpoints with `skillIds` (exclude `intro`) in tree order; `progressPercent = round(100 * completed / total)`.
  - `adaptSubmit(SubmitResponse)` → `{ stepId, outcome, completed, mastery, next, hint, passive, notice, source }`; `mastery === masteryDisplay` (null stays null).
  - `statusToUiState`: completed/tested_out → `done`; current → `progress`; else `todo`.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.5_

  - [ ]* 3.1 Write property tests for the adapter
    - **Property 4: Adapted progress percent is a bounded integer** (Validates: 3.3)
    - **Property 5: Mastery display passes through without decreasing** (Validates: 3.4, 3.5)
    - **Property 6: Evidence levels are preserved by the adapter** (Validates: 3.7, 5.3)
    - **Property 7: Objective status reflects the progress map** (Validates: 3.1, 3.2)
    - ≥100 iterations each; synthetic TreeResponse/SubmitResponse generators; tag `// Feature: wire-student-services, Property N`.

- [ ] 4. Create the SourceBadge component
  - Create `src/services/SourceBadge.jsx` + `src/services/sourceBadge.css` (scoped `sb-*` classes).
  - Props `{ source, notice, fallbackActive, health }`; show stub/sample label for `source==='stub'`, notice `message` for `ADAPTIVE_UNAVAILABLE`/`CONTENT_BLOCKED`, and an "adaptive unavailable" line when `fallbackActive` or `health.status !== 'ok'`.
  - Root `role="status"` + `aria-live="polite"`.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.4, 8.5_

  - [ ]* 4.1 Write unit tests for SourceBadge
    - Render with stub/notice/fallback prop combinations; assert label/message and `aria-live` present.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 5. Add the provider contract test
  - Create `src/services/provider.contract.test.js` calling `runServicesContract('provider (mock)', () => createServices({ VITE_SERVICE_MODE: 'mock' }))`.
  - Placed under `src/` so `vitest.config.js` include globs discover it under `npm test`.
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 6. Checkpoint - provider, context, adapter, badge green
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Rewire the lesson flow to services
  - [ ] 7.1 Source lesson content and progress from getTree
    - In `WeblabLesson.jsx`, call `useServices().getTree({courseId})` on mount; feed `adaptTree` output to the left rail (objectives, progress) and seed `current`.
    - Add an accessible loading state via an `aria-live` region while pending.
    - _Requirements: 4.1, 4.2, 8.4_

  - [ ] 7.2 Route submit through submitStep
    - Replace the `validateSubmission`/`routeNextLevel` calls in `submit()` with `submitStep({stepId,courseId,checkpointId,kind})`; advance using `adaptSubmit(...).next`; mastery from `masteryDisplay`.
    - On `outcome==='fallback'`, continue along `next`; keep local build log/hint targets intact.
    - On rejection, show an accessible error and keep editor contents.
    - _Requirements: 4.3, 4.4, 6.6, 4.9_

  - [ ] 7.3 Route tutor through askTutor
    - In `Tutor.jsx` (or via a prop from the lesson), replace the `engine.askTutor` call with `useServices().askTutor({...})`; display the returned `answer`.
    - _Requirements: 4.5, 8.4_

  - [ ] 7.4 Route generation through verifyPrompt then generate
    - In the lesson `generate(text)` path, call `verifyPrompt` first; if `needs_narrowing`, show `guidance` and stop; if `ok`, call `generate` and load a non-null `project` into the editor.
    - _Requirements: 4.6, 4.7, 4.8, 4.9_

  - [ ] 7.5 Surface source/notice/fallback in the lesson
    - Render `SourceBadge` under the lesson top bar, fed by the latest tree/submit `source`, `notice`, and `fallbackActive`/health.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 8. Rewire the dashboard to services
  - In `StudentDashboard.jsx`, call `useServices().getTree` on mount; derive the progress ring, objectives list, and mastered count from `adaptTree`; show a loading state while pending; render `SourceBadge`; never show a skill level below the reported evidence.
  - _Requirements: 5.1, 5.3, 5.4, 6.1, 6.4, 8.4_

- [ ] 9. Rewire the course overview to services
  - In `CourseOverview.jsx`, source progress and objective states from `adaptTree(getTree(...))`; keep all existing sections; show a loading state while pending; render `SourceBadge`.
  - _Requirements: 5.2, 5.3, 5.4, 6.1, 6.4, 8.4_

- [ ] 10. Keep the teacher view working
  - Verify `src/Dashboard.jsx` still routes teachers to `TeacherView` unchanged; the provider wraps both paths but the teacher view behavior is untouched.
  - _Requirements: 8.3_

- [ ] 11. Final checkpoint - full verification
  - Run `npm run build`, `npm test` (87 existing + new stay green), and `npm run test:contracts`.
  - Confirm no edits under `shared/contracts`, no new dependencies, and `package.json`/`package-lock.json` unchanged; never stage `vite.config.js` or `.vite/`.
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (test-only) and can be skipped for a faster MVP; core wiring tasks are never optional.
- Property tests use an in-repo randomized loop (≥100 iterations) because no PBT dependency may be added.
- Each property task references its design property number and the requirements it validates.
- The adapter is the single place the checkpoint/step model is translated to the component prop shapes, preserving the existing visual design.
- Component/accessibility tests (if written) require temporary `--no-save` install of testing-library/jsdom and a throwaway vitest config that must be deleted afterward, restoring `package.json`/`package-lock.json`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "3", "4"] },
    { "id": 1, "tasks": ["1.1", "2", "3.1", "4.1", "5"] },
    { "id": 2, "tasks": ["2.1", "7.1", "8", "9", "10"] },
    { "id": 3, "tasks": ["7.2", "7.3", "7.4", "7.5"] }
  ]
}
```
