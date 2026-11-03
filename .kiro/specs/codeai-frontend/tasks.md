# Implementation Plan: CodeAI Frontend

## Overview

This plan builds the CodeAI frontend bottom-up: first scaffold the Vite + React + TypeScript project and test tooling, then lay down pure data models, the typed service layer with mock implementations, and the timing/orchestration utilities. On top of that foundation we build the state layer (contexts, reducers, and behavior hooks), then the presentational components, then compose them into the responsive three-column layout, and finally wire everything together into the running app.

Each task builds on the previous ones and ends integrated into the app — no orphaned code. Property-based tests (fast-check, min 100 iterations, tagged `Feature: codeai-frontend, Property N: ...`) are placed next to the pure logic they verify; example/edge/integration/accessibility tests follow the components they exercise. Test sub-tasks are marked optional with `*`.

## Tasks

- [ ] 1. Scaffold project and test tooling
  - [~] 1.1 Initialize Vite + React + TypeScript SPA
    - Create the Vite React-TS project (package.json, tsconfig, vite.config.ts, index.html, src/main.tsx, src/App.tsx)
    - Establish the `src/` folder layout: `src/types`, `src/services`, `src/state`, `src/hooks`, `src/utils`, `src/components`, `src/styles`
    - Add npm scripts for dev, build, and `test` (Vitest single-pass `--run`)
    - _Requirements: 1.1 / Design: Overview, Locked technical decisions_
  - [~] 1.2 Configure CSS Modules and design tokens
    - Set up CSS Modules support and a global tokens stylesheet (`src/styles/tokens.css`) exposing color, text, focus-indicator, and spacing CSS custom properties
    - Define the token values that the contrast property (Property 25) will validate
    - _Requirements: 15.4, 15.6 / Design: Locked technical decisions, Three-column layout composition_
  - [~] 1.3 Configure Vitest + React Testing Library + fast-check + jest-axe
    - Install and configure Vitest with jsdom, fake-timer helpers, user-event, jest-axe matchers, and fast-check
    - Create a test setup file registering RTL cleanup and jest-axe
    - Add a trivial smoke test to confirm the toolchain runs via `vitest --run`
    - _Requirements: all (test infrastructure) / Design: Testing Strategy — Tooling_

- [ ] 2. Define domain and UI data models
  - [~] 2.1 Implement domain entity and outcomes types
    - Create `src/types` with `Id`, `Unit`, `Lesson`, `LearningObjective`, `Level`, `Skill`, `Outcomes`, `MasterySignal`
    - Create build/preview/deploy types: `BuildOutcome`, `BuildResult`, `PreviewState`, `Viewport`, `ViewportDimensions`, `VIEWPORTS` constant (web 1280×800, phone 375×667), `DeployResult`
    - Create editor/tutor/availability types: `EditorTab`, `EditorState`, `FileEntry`, `HintStep`, `ScaffoldedHint`, `Nudge`, `TutorMessage`, `ServiceAvailability`, and the top-level `AppState` shape
    - _Requirements: 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14 / Design: Data Models_

- [ ] 3. Build the typed service layer with mocks
  - [~] 3.1 Define service interfaces and error contracts
    - Create `src/services` with `ServiceError`, `TimeoutError`, and interfaces: `ContentService`, `ContentFilterService`, `ValidationService`, `RoutingService`, `GenerationService`, `BuildDeployService`, `TutorService`, `PersistenceService`
    - Define the aggregate `Services` type and `ServicesConfig`
    - _Requirements: 3, 5, 6, 8, 9, 11, 12, 13, 14 / Design: Service interfaces_
  - [~] 3.2 Implement mock service implementations with latency and error/hang toggles
    - Implement each interface as a mock honoring `MockBehavior` (`latencyMs`, `mode: ok|error|hang`) and canned payloads
    - Implement `ValidationService.health` / `RoutingService.health` with a flippable toggle to drive fallback entry/resume
    - Implement `createServices(config)` factory selecting mocks via an env/query-string flag
    - _Requirements: 3, 5, 6, 8, 9, 11, 12, 13, 14 / Design: Mock implementation behavior_
  - [ ]* 3.3 Write unit tests for mock service behavior
    - Assert `mode: "error"` rejects with `ServiceError`, `mode: "hang"` never resolves, latency delays resolution, and health toggle flips
    - _Requirements: 4.6, 5.4, 6.4, 8.3, 9.2, 9.5, 13.4, 13.8 / Design: Mock implementation behavior_

- [ ] 4. Implement timing and orchestration utilities
  - [~] 4.1 Implement withDeadline utility and timer hooks
    - Implement `withDeadline(promise, ms)` rejecting with `TimeoutError` when the deadline wins, resolving with the value otherwise
    - Implement `useTimeout`, `useInterval`, and `useCooldown` hooks in `src/hooks`
    - _Requirements: 3.6, 5.6, 6.5, 8.6, 9.5, 12.5, 14.1, 14.2, 14.5 / Design: Timing and orchestration strategy_
  - [ ]* 4.2 Write unit tests for timing utilities with fake timers
    - Assert `withDeadline` resolves on fast settle and rejects with `TimeoutError` on deadline; assert `useTimeout`/`useInterval`/`useCooldown` fire deterministically under `vi.useFakeTimers`
    - _Requirements: 3.6, 5.6, 6.5, 8.6, 9.5, 12.5, 14.5 / Design: Testing the timing / timeout criteria_

- [ ] 5. Implement pure logic functions and their property tests
  - [~] 5.1 Implement progress, outcomes, and time-format logic
    - Write pure functions: progress count derivation (completed/total from objectives), outcomes value normalization, and HH:MM:SS time formatting/parsing
    - _Requirements: 2.1, 4.1 / Design: Data Models, Correctness Properties 1, 5, 6_
  - [ ]* 5.2 Write property tests for progress, outcomes, and time format
    - **Property 1: Progress count invariant** — **Validates: Requirements 2.1**
    - **Property 5: Time-on-task format round-trip** — **Validates: Requirements 4.1**
    - **Property 6: Outcomes value invariants** — **Validates: Requirements 4.1**
  - [~] 5.3 Implement input validators (requirements and question gating)
    - Write pure validators: whitespace-only requirements rejection, non-empty requirements pass-through, and question length gate (1–2000 inclusive)
    - _Requirements: 5.2, 5.3, 6.2, 11.7 / Design: Correctness Properties 8, 9, 10_
  - [ ]* 5.4 Write property tests for input validators
    - **Property 8: Whitespace-only requirements are rejected** — **Validates: Requirements 5.2**
    - **Property 9: Non-empty requirements are filtered before processing** — **Validates: Requirements 5.3**
    - **Property 10: Question length gate** — **Validates: Requirements 6.2, 11.7**
  - [~] 5.5 Implement hint-stepper reducer and viewport mapping
    - Write the pure hint-stepper state machine (start at step 1, reveal-next capped at total, idempotent at last step) and the viewport→dimensions mapping with web default
    - _Requirements: 10.3, 10.4, 10.5, 11.1, 11.3, 11.4 / Design: Correctness Properties 15, 16, 17, 18_
  - [ ]* 5.6 Write property tests for hint stepper and viewport mapping
    - **Property 15: Viewport maps to fixed dimensions** — **Validates: Requirements 10.3, 10.4, 10.5**
    - **Property 16: Hint stepper starts at step one** — **Validates: Requirements 11.1**
    - **Property 17: Reveal-next advances by exactly one until the last step** — **Validates: Requirements 11.3**
    - **Property 18: Reveal-next at the last step is idempotent** — **Validates: Requirements 11.4**
  - [~] 5.7 Implement cooldown predicate, fallback schedule, and contrast calculator
    - Write the pure nudge cooldown predicate (60s suppression after dismissal per objective), the fallback health-check schedule helper (interval ≤30s), and the contrast-ratio calculator over theme tokens
    - _Requirements: 12.5, 14.5, 15.4, 15.6 / Design: Correctness Properties 20, 23, 25_
  - [ ]* 5.8 Write property tests for cooldown, schedule, and contrast
    - **Property 20: Nudge cooldown suppression** — **Validates: Requirements 12.5**
    - **Property 23: Fallback health-check interval bound** — **Validates: Requirements 14.5**
    - **Property 25: Theme text contrast meets thresholds** — **Validates: Requirements 15.4, 15.6**

- [~] 6. Checkpoint - Ensure all tests pass
  - Ensure all pure-logic, utility, and mock-service tests pass. Ask the user if questions arise.

- [ ] 7. Implement state layer: contexts and reducers
  - [~] 7.1 Implement ServicesContext and AppState reducer
    - Create `ServicesContext`/`ServicesProvider` wrapping `createServices`
    - Implement the `AppState` reducer and `AppStateProvider` covering lesson, outcomes, progress, editor, build, preview, requirements, ask, tutor, adaptive, save, and deploy slices
    - _Requirements: 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14 / Design: Architecture — State layer, Application state shape_
  - [ ]* 7.2 Write unit tests for the AppState reducer
    - Assert key state transitions (objective completion, build lifecycle, preview out-of-date, fallback flags) produce the expected state
    - _Requirements: 7.7, 8.5, 13.2, 14.3 / Design: Application state shape_

- [ ] 8. Implement behavior hooks
  - [~] 8.1 Implement useRequirementsSubmission and useAskQuestion
    - `useRequirementsSubmission`: empty guard → content-filter → generate; 30s deadline; disable control; surface no-code result (Req 5)
    - `useAskQuestion`: 1–2000 guard → content-filter (10s) → route to tutor; preserve input on timeout (Req 6)
    - _Requirements: 5.2–5.8, 6.1–6.5 / Design: State-layer hooks_
  - [ ]* 8.2 Write unit tests for submission and ask hooks
    - Assert content-filter-before-generation ordering, timeout handling, and input preservation using mock toggles and fake timers
    - _Requirements: 5.4, 5.6, 5.8, 6.4, 6.5 / Design: Testing the timing / timeout criteria_
  - [~] 8.3 Implement useBuild and useSaveDeploy
    - `useBuild`: start build; 120s deadline; disable/re-enable button; mark preview out-of-date → fresh on success (Req 8)
    - `useSaveDeploy`: save (5s) + ≥3s confirmation; deploy (120s); retain last URL / unsaved state on failure (Req 9)
    - _Requirements: 8.1–8.6, 9.1–9.5 / Design: State-layer hooks_
  - [ ]* 8.4 Write unit tests for build and save/deploy hooks
    - Assert build-timeout at 120s re-enables the button, save failure keeps project dirty, and failed deploy retains last URL
    - **Property 13: Build button disabled exactly while building** — **Validates: Requirements 8.5**
    - **Property 14: Failed deploy retains last successful URL** — **Validates: Requirements 9.5**
  - [~] 8.5 Implement useScaffoldedHint and useStuckDetection
    - `useScaffoldedHint`: drive the stepper and gate tutor output through `ContentFilterService` before display (Req 11)
    - `useStuckDetection`: detect stuck-state, emit nudge within 1s, enforce 60s cooldown via `useCooldown` (Req 12)
    - _Requirements: 11.1–11.7, 12.1–12.5 / Design: State-layer hooks_
  - [ ]* 8.6 Write property/unit tests for hint and stuck hooks
    - **Property 7: Revealing a hint increments hints-used by exactly one** — **Validates: Requirements 4.3**
    - **Property 19: Tutor output is filtered before display** — **Validates: Requirements 11.5**
    - Assert nudge offered within 1s and cooldown suppression (complements Property 20)
    - _Requirements: 11.5, 11.6, 12.1, 12.4, 12.5_
  - [~] 8.7 Implement useAdaptiveFlow with fallback state machine
    - Validating/routing indicators within 1s; switch to Fallback_Path within 2s on 10s timeout/error; retain submitted work; advance along `isFallback` levels; 30s health re-check; resume within 2s when both services healthy
    - _Requirements: 13.1–13.8, 14.1–14.5 / Design: Fallback_Path strategy, State-layer hooks_
  - [ ]* 8.8 Write unit tests for adaptive flow and fallback transitions
    - Using `mode: "hang"`/`mode: "error"` + health toggle under fake timers, assert fallback entry, continuity, health re-check gap, and resume
    - **Property 21: Objective completion tracks the passing signal** — **Validates: Requirements 13.2, 13.4**
    - _Requirements: 13.1, 13.3, 13.5–13.8, 14.1, 14.2, 14.4_

- [~] 9. Checkpoint - Ensure all tests pass
  - Ensure all state-layer and hook tests pass. Ask the user if questions arise.

- [ ] 10. Implement left-column components
  - [~] 10.1 Implement ProgressMeter
    - Show completed/total; empty-state label with no count; error-state label retaining last count; update within 1s on objective transitions
    - _Requirements: 2.1–2.5 / Design: Component responsibilities_
  - [~] 10.2 Implement LessonPanel and ObjectivesChecklist
    - `LessonPanel`: render current Level content; loading indicator ≤10s; error + retry control; replace content on new Level
    - `ObjectivesChecklist`: completed/not-completed indicators; distinct active objective; validating/not-passed state
    - _Requirements: 3.1–3.6, 13.2, 13.4 / Design: Component responsibilities_
  - [ ]* 10.3 Write property/example tests for lesson components
    - **Property 2: Lesson panel renders current level content** — **Validates: Requirements 3.1**
    - **Property 3: Objective indicator matches completion** — **Validates: Requirements 3.2**
    - **Property 4: Exactly one active objective** — **Validates: Requirements 3.3**
    - Example tests for loading/error/retry and new-level replacement
    - _Requirements: 3.4, 3.5, 3.6_
  - [~] 10.4 Implement OutcomesPanel, MasteryScore, and ProgressReportLink
    - Show concepts mastered, hints used, time on task (HH:MM:SS), mastery 0–100; unavailable-state and retain-last-on-error for mastery; open Progress_Report; error indication on report-open failure
    - _Requirements: 4.1–4.7 / Design: Component responsibilities_
  - [ ]* 10.5 Write example tests for outcomes components
    - Assert mastery update within 1s, hints-used increment within 1s, unavailable/error states, and report-open success/failure
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 11. Implement center-column components
  - [~] 11.1 Implement RequirementsBox and AskButton
    - `RequirementsBox`: ≤5000 chars; empty guard; processing indicator + disabled control; 30s timeout message; code result wiring (via `useRequirementsSubmission`)
    - `AskButton`: 1–2000 char question; invalid message; route to tutor (via `useAskQuestion`)
    - _Requirements: 5.1–5.8, 6.1–6.5 / Design: Component responsibilities_
  - [ ]* 11.2 Write example tests for requirements and ask inputs
    - Assert empty/whitespace guard, processing indicator, timeout re-enable + text retention, no-code message
    - _Requirements: 5.2, 5.5, 5.6, 5.8, 6.2, 6.5_
  - [~] 11.3 Implement CodeEditor with tabs
    - Exactly three tabs (Code, Files, Build log); ≤500ms switch; active-tab indication; mutual-exclusion content; editable Code tab; read-only Files/Build log; edit marks preview out-of-date; unavailable-content message retaining prior tab
    - _Requirements: 7.1–7.9 / Design: Component responsibilities, EditorState_
  - [ ]* 11.4 Write property/example tests for CodeEditor
    - **Property 11: Tab content mutual exclusion** — **Validates: Requirements 7.3**
    - **Property 12: Edit then successful build clears out-of-date** — **Validates: Requirements 7.7, 7.8**
    - Example tests for ≤500ms switch, read-only tabs, and unavailable-content handling
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.6, 7.9_
  - [~] 11.5 Implement BuildButton and StatusStrip
    - `BuildButton`: start build; disabled while running; re-enabled on any result (via `useBuild`)
    - `StatusStrip`: build/deploy result + live sandbox URL; failure state; route build errors to Build log
    - _Requirements: 8.1–8.6, 9.4 / Design: Component responsibilities_
  - [ ]* 11.6 Write example tests for build feedback
    - Assert in-progress indicator within 1s, success URL, failure routing errors to Build log, and preview re-render on success
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 12. Implement right-column components
  - [~] 12.1 Implement PreviewPanel and ViewportToggles
    - Render current output; web default (1280×800) and phone (375×667) toggles; re-render within 2s on output change; rendering indicator; error state retaining last output; empty-state message; out-of-date indicator handling
    - _Requirements: 10.1–10.9, 7.7, 7.8 / Design: Component responsibilities, VIEWPORTS_
  - [ ]* 12.2 Write example tests for preview panel
    - Assert default web viewport, toggle dimensions, re-render within 2s, rendering indicator, error retention, and empty state
    - _Requirements: 10.1, 10.2, 10.6, 10.7, 10.8, 10.9_
  - [~] 12.3 Implement AiTutor, ScaffoldedHint, and NudgeBubble
    - `AiTutor`: free-form chat input (1–2000); display scaffolded hints; withhold content-filter-blocked output with unavailable indication
    - `ScaffoldedHint`: step N of M; reveal-next; no-more-steps indication (via `useScaffoldedHint`)
    - `NudgeBubble`: offered on stuck-state; accept → scaffolded hint; dismiss within 500ms (via `useStuckDetection`)
    - _Requirements: 6.3, 11.1–11.7, 12.1–12.5 / Design: Component responsibilities_
  - [ ]* 12.4 Write example tests for tutor components
    - Assert hint reveal/no-more-steps, blocked-output unavailable indication, nudge accept/dismiss (≤500ms), and cooldown behavior at the UI level
    - _Requirements: 11.2, 11.6, 12.1, 12.2, 12.3, 12.4_

- [ ] 13. Implement top bar
  - [~] 13.1 Implement TopBar with ProjectName, SaveAction, and DeployAction
    - Host project name and the ProgressMeter; `SaveAction` (persist 5s, confirmation ≥3s, keep unsaved state on failure); `DeployAction` (deploy 120s, progress indicator, retain last URL on failure) via `useSaveDeploy`
    - _Requirements: 1.1, 9.1–9.5 / Design: Component responsibilities_
  - [ ]* 13.2 Write example tests for top-bar actions
    - Assert save confirmation remains ≥3s, save failure marks dirty, deploy progress indicator, and deploy failure retains last URL
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [ ] 14. Compose the responsive three-column layout
  - [~] 14.1 Implement Layout grid shell and columns
    - Build the CSS Grid shell (`layout.module.css`): full-width top bar + three columns ≥768px with no horizontal page scroll; single-column stacking <768px (lesson → code → preview-and-tutor); per-column `overflow-y: auto` + `min-height: 0`
    - Place left/center/right column components in the required top-to-bottom order
    - _Requirements: 1.1–1.6 / Design: Three-column layout composition_
  - [ ]* 14.2 Write layout example tests
    - Assert three-column composition and ordering ≥768px, single-column stacking order <768px, and per-column scroll containment styling
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 15. Wire the application together
  - [~] 15.1 Compose providers and mount the app
    - Wire `App → ServicesProvider → AppStateProvider → Layout` and mount in `main.tsx`; add the dev panel / query-string flags to flip service modes (ok/error/hang) and health toggles live
    - Load initial lesson/level content on mount via `ContentService`
    - _Requirements: 1.1, 3.1, 3.4, 13.5, 14.3 / Design: Component hierarchy, Mock implementation behavior_
  - [ ]* 15.2 Write integration tests for the full learning loop
    - Drive describe → generate → build → preview → hint flows end-to-end against mocks; assert adaptive validating/routing states and fallback entry/resume
    - _Requirements: 5, 8, 10, 11, 13, 14 / Design: Testing Strategy — dual testing approach_

- [ ] 16. Implement and verify accessibility
  - [~] 16.1 Apply accessible names, live regions, and focus styles
    - Add programmatically associated text alternatives (≤150 chars) to non-text controls; add `aria-live` regions for Status_Strip / Progress_Meter / Outcomes_Panel announcing within 2s without moving focus; ensure keyboard operability and visible focus indicators (≥3:1) using the design tokens
    - _Requirements: 15.1–15.6 / Design: Testing the accessibility criteria_
  - [ ]* 16.2 Write accessibility property/example tests
    - **Property 22: Fallback keeps the build/learn surface rendered** — **Validates: Requirements 14.3**
    - **Property 24: Every interactive control has a bounded accessible name** — **Validates: Requirements 15.1**
    - jest-axe scan; keyboard operability (tab/Enter/Space) with no pointer events; no focus trap; live-region announcement within 2s without focus change
    - _Requirements: 15.2, 15.3, 15.5_

- [~] 17. Final checkpoint - Ensure all tests pass
  - Ensure all property, example, integration, and accessibility tests pass via `vitest --run`. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (test tasks) and can be skipped for a faster MVP, though they verify the design's correctness properties and timing/accessibility criteria.
- Each task references specific requirements and design sections for traceability.
- All 25 correctness properties are covered as fast-check property tests (≥100 iterations, tagged `Feature: codeai-frontend, Property N: ...`): P1/5/6 (5.2), P8/9/10 (5.4), P15/16/17/18 (5.6), P20/23/25 (5.8), P13/14 (8.4), P7/19 (8.6), P21 (8.8), P2/3/4 (10.3), P11/12 (11.4), P22/24 (16.2).
- Checkpoints (tasks 6, 9, 17) ensure incremental validation at each major layer boundary.
- The bottom-up order (types → services/mocks → utilities → state/hooks → components → layout → wiring → accessibility) ensures every task builds on prior work with no orphaned code.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["3.1", "5.1", "5.3", "5.5", "5.7"] },
    { "id": 4, "tasks": ["3.2", "4.1", "5.2", "5.4", "5.6", "5.8"] },
    { "id": 5, "tasks": ["3.3", "4.2", "7.1"] },
    { "id": 6, "tasks": ["7.2", "8.1", "8.3", "8.5", "8.7"] },
    { "id": 7, "tasks": ["8.2", "8.4", "8.6", "8.8", "10.1", "10.2", "10.4", "11.3", "12.1", "12.3"] },
    { "id": 8, "tasks": ["10.3", "10.5", "11.1", "11.5", "12.2", "12.4", "13.1"] },
    { "id": 9, "tasks": ["11.2", "11.4", "11.6", "13.2", "14.1"] },
    { "id": 10, "tasks": ["14.2", "15.1"] },
    { "id": 11, "tasks": ["15.2", "16.1"] },
    { "id": 12, "tasks": ["16.2"] }
  ]
}
```
