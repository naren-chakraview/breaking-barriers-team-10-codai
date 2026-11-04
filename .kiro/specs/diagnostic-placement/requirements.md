# Requirements Document

## Introduction

This feature adds **adaptive diagnostic placement** and **confidence-driven probing** to the local, fully-mocked frontend lesson engine that powers the "Hour of AI 2026 — Adaptive Web Lab" (`src/weblab/`). Today every student starts each objective at the `core` tier and routing only reacts after a graded submission. This feature lets the engine (a) run a short diagnostic that **places** a student at `support`, `core`, or `stretch` for an objective based on quick evidence, and (b) when it is **unsure** of a student's level, route to **one randomized probe task** drawn from a pool of interchangeable tasks to confirm the level before committing to advance or stretch.

The work extends the existing symbols — `routeNextLevel`, `validateSubmission`, the `signal` object, `describeRoute`, the per-step `stepLog`, and `ProgressReport` — rather than replacing them. It is JavaScript/JSX only, runs entirely in the browser behind the dev proxy, adds no dependencies, no backend, and no real model. It does not touch the Python backend, the services/contract tree, or the frozen shared contracts.

The design decisions below reflect the stated, sensible defaults: the diagnostic is a short placement check per objective (not a single whole-lesson gate), the probe pool holds 2–3 interchangeable tasks per objective+tier, and confidence is a simple scored heuristic. Probe/placement selection is seeded/rotating (deterministic-enough to test), not truly random.

## Glossary

- **Lesson_Engine**: The local adaptive engine in `src/weblab/engine.js` (validation, routing, diagnostics, tutor). The system that owns placement, confidence, and probe-selection logic.
- **Lesson_UI**: The React lesson driver `src/weblab/WeblabLesson.jsx` that calls the engine, records `stepLog`, and renders banners.
- **Progress_Report**: The report component `src/weblab/ProgressReport.jsx` that reads `stepLog` and summarizes performance.
- **Objective**: One of the four skills in `LESSON.objectives` — `obj-structure`, `obj-style`, `obj-layout`, `obj-polish`.
- **Tier**: A level's difficulty band: `support` (scaffolded), `core` (standard), or `stretch` (deeper). Defined on each level in `LEVELS`.
- **Level**: A single task object in `LEVELS` with `{ id, objectiveId, tier, title, instructions, starter, rubric, targets, hint }`.
- **Signal**: The per-submission object produced by `validateSubmission` and augmented by `Lesson_UI`: `{ objectiveId, passing, score, met, total, hintsOnLevel, attempts }`. This feature may add `seconds` to the signal.
- **Placement**: The act of choosing a student's **starting Tier** for an Objective before graded work on that Objective begins.
- **Diagnostic**: A short sequence of 2–3 quick probe tasks used to produce a Placement for an Objective.
- **Probe_Task**: A Level selected from a Probe_Pool to re-check a student's level mid-flow; a confirmation task, not a new teaching step.
- **Probe_Pool**: A set of 2–3 interchangeable Levels for the same Objective+Tier that test the same skill at the same rubric difficulty with different surface content.
- **Confidence**: A numeric or categorical measure (`high` | `borderline` | `low`) the Lesson_Engine computes about how sure it is of the student's level on an Objective, derived from Signal evidence.
- **Route_Reason**: A string returned by `routeNextLevel` describing the routing decision. Existing values: `support`, `retry`, `advance`, `stretch`, `complete`. This feature adds `diagnostic`, `placement`, and `probe`.
- **Established_Level**: The highest Tier a student has demonstrably reached for an Objective during the session; used to enforce that placement never lowers an already-earned level.

## Requirements

### Requirement 1: Diagnostic placement at the start of an objective

**User Story:** As a student, I want a short diagnostic before I dig into a new skill, so that I start at a tier that matches what I can already do instead of always starting at the standard level.

#### Acceptance Criteria

1. WHEN a student begins an Objective that has not yet been placed, THE Lesson_Engine SHALL run a Diagnostic of between 2 and 3 Probe_Tasks before assigning graded teaching work for that Objective.
2. WHEN a Diagnostic completes, THE Lesson_Engine SHALL assign a Placement of exactly one Tier from the set {`support`, `core`, `stretch`} for that Objective.
3. WHEN the Diagnostic evidence for an Objective is a clean first-try pass (`passing` true, `hintsOnLevel === 0`, `attempts === 1`) on every Probe_Task, THE Lesson_Engine SHALL set the Placement to `stretch`.
4. WHEN the Diagnostic evidence for an Objective is a pass that used help (`passing` true with `hintsOnLevel >= 1` or `attempts >= 2`) and includes no miss, THE Lesson_Engine SHALL set the Placement to `core`.
5. WHEN the Diagnostic evidence for an Objective includes any miss (`passing` false on a Probe_Task), THE Lesson_Engine SHALL set the Placement to `support`.
6. WHERE a student chooses to skip the Diagnostic, THE Lesson_Engine SHALL assign a Placement of `core` for that Objective.
7. IF a computed Placement Tier is lower than the student's Established_Level for that Objective, ordered `support` < `core` < `stretch`, THEN THE Lesson_Engine SHALL assign the Established_Level instead.
8. THE Diagnostic SHALL present no more than 3 Probe_Tasks for an Objective.

### Requirement 2: Randomized interchangeable probe tasks

**User Story:** As a student, I want re-checks to use different tasks than the one I just did, so that the engine measures my skill rather than my memory of one specific task.

#### Acceptance Criteria

1. THE Lesson_Engine SHALL define a Probe_Pool containing between 2 and 3 interchangeable Levels for each Objective+Tier combination used by Placement and probing.
2. THE Lesson_Engine SHALL ensure that every Level within a single Probe_Pool shares the same `objectiveId` and the same `tier`.
3. THE Lesson_Engine SHALL ensure that every Level within a single Probe_Pool targets the same number of `rubric` checks, where no Level requires more than one additional or fewer `rubric` check than any other Level in that Probe_Pool.
4. THE Lesson_Engine SHALL ensure that every Level within a single Probe_Pool differs in at least one of `title`, `instructions`, or `starter` from every other Level in that Probe_Pool.
5. WHEN the Lesson_Engine selects a Probe_Task from a Probe_Pool that contains at least one Level not yet shown in the current session, THE Lesson_Engine SHALL select a Level different from the Level most recently shown from that Probe_Pool.
6. WHEN the Lesson_Engine selects a Probe_Task, THE Lesson_Engine SHALL compute the selection from a seeded or rotating selection function such that a given seed combined with a given prior-shown state for that Probe_Pool always yields the same selected Level.
7. IF every Level in a Probe_Pool has already been shown in the current session, THEN THE Lesson_Engine SHALL select the Level whose most recent shown position is earliest among the Levels in that Probe_Pool.
8. THE Lesson_Engine SHALL keep all 12 existing Levels available and functional for the standard teaching flow.

### Requirement 3: Confidence computation and confirmation probing

**User Story:** As a student, I want the engine to double-check my level with one more task only when it is unsure, so that I am neither over-promoted nor made to repeat tasks unnecessarily.

#### Acceptance Criteria

1. WHEN a graded submission produces a Signal for an Objective, THE Lesson_Engine SHALL compute a Confidence value that is exactly one of `high`, `borderline`, or `low` from the Signal fields `score`, `hintsOnLevel`, `attempts`, `seconds`, and the Tier at which the submission was graded.
2. WHEN the Signal for an Objective shows `passing` is true, `hintsOnLevel` equals 0, and `attempts` equals 1, THE Lesson_Engine SHALL set Confidence for that Objective to `high`.
3. WHEN the Signal for an Objective shows `passing` is false, THE Lesson_Engine SHALL set Confidence for that Objective to `low`.
4. WHEN the Signal for an Objective shows `passing` is true and at least one of the following holds — `hintsOnLevel` is greater than 0, `attempts` is greater than 1, or the pass occurred at the `support` Tier — THE Lesson_Engine SHALL set Confidence for that Objective to `borderline`.
5. WHILE Confidence for an Objective is `borderline` and the Objective has had fewer than 2 consecutive Probe_Tasks, THE Lesson_Engine SHALL route the student to exactly one Probe_Task from the relevant Probe_Pool with Route_Reason `probe` before advancing or stretching.
6. WHEN Confidence for an Objective is `high`, THE Lesson_Engine SHALL NOT route to a Probe_Task and SHALL continue with the existing advance, stretch, or support routing.
7. THE Lesson_Engine SHALL cap the number of consecutive Probe_Tasks per Objective at 2.
8. WHEN the consecutive Probe_Task count for an Objective reaches 2, THE Lesson_Engine SHALL commit to a routing decision using the most recent Signal and SHALL NOT issue a further Probe_Task for that Objective.
9. WHEN a Probe_Task is passed, THE Lesson_Engine SHALL set Confidence for that Objective to `high` and SHALL resolve the Objective's Level using the passing probe outcome.

### Requirement 4: Integration with existing routing

**User Story:** As a developer, I want placement and probing to compose with the current routing logic, so that existing support, stretch, and advance behavior keeps working and mastery never drops.

#### Acceptance Criteria

1. THE Lesson_Engine SHALL extend `routeNextLevel` to return each of the Route_Reason values `diagnostic`, `placement`, and `probe` in addition to the existing values `support`, `retry`, `advance`, `stretch`, and `complete`, and SHALL continue to return each existing value in the situations it is returned today.
2. WHEN no Diagnostic is pending for the current Objective AND Confidence for that Objective is not `borderline` AND the submission is a miss (`signal.passing` is false), THE Lesson_Engine SHALL route to the `support` Tier Level of the same Objective, or return Route_Reason `retry` when no unvisited `support` Level remains, exactly as it does today.
3. WHEN no Diagnostic is pending for the current Objective AND Confidence for that Objective is not `borderline` AND the submission is a clean first-try pass (`signal.passing` true, `signal.score` is 100, `signal.hintsOnLevel` is 0, `signal.attempts` is 1, and no prior `support` detour on this Objective), THE Lesson_Engine SHALL route to the `stretch` Tier Level of the next Objective.
4. WHEN no Diagnostic is pending for the current Objective AND Confidence for that Objective is not `borderline` AND the submission is any other pass, THE Lesson_Engine SHALL route to the `core` Tier Level of the next Objective, or return Route_Reason `complete` with a null target Level when no next Objective exists.
5. WHEN `routeNextLevel` returns Route_Reason `diagnostic`, `placement`, or `probe`, THE Lesson_Engine SHALL return a non-null resolved target Level together with that Route_Reason.
6. WHEN `routeNextLevel` returns any Route_Reason with a non-null target Level, THE Lesson_Engine SHALL ensure the target Level's Tier is greater than or equal to the student's Established_Level for that Objective, ordered `support` < `core` < `stretch`.
7. THE Lesson_Engine SHALL compute routing decisions from the existing `signal` object augmented only with the elapsed `seconds` field, SHALL read no field removed from `signal`, and SHALL preserve every existing `signal` field (`objectiveId`, `passing`, `score`, `met`, `total`, `hintsOnLevel`, `attempts`).

### Requirement 5: Visible explanation of placement and probing

**User Story:** As a student, I want the lesson and the report to tell me in plain language why I was placed where I was and why a task is a re-check, so that the adaptive behavior is understandable and demonstrable.

#### Acceptance Criteria

1. WHEN `describeRoute` is called with Route_Reason `diagnostic`, `placement`, or `probe`, THE Lesson_Engine SHALL return a non-empty plain-language message for that value, and SHALL continue to return the existing non-empty messages for `support`, `retry`, `advance`, `stretch`, and `complete`.
2. WHEN a Placement is assigned for an Objective, THE Lesson_UI SHALL display a banner that names the assigned Tier (`support`, `core`, or `stretch`) and states the reason for the Placement in plain language.
3. WHEN a Probe_Task is routed, THE Lesson_UI SHALL display a banner that states the task is a confirmation re-check prompted by the level not yet being certain.
4. WHEN a diagnostic, placement, or probe step is recorded, THE Lesson_UI SHALL append an entry to `stepLog` whose `routeReason` is `diagnostic`, `placement`, or `probe` respectively, so that these steps are distinguishable from teaching steps whose `routeReason` is `support`, `retry`, `advance`, `stretch`, or `complete`.
5. WHEN the Progress_Report is opened AND at least one Objective has a recorded Placement, THE Progress_Report SHALL display, for each placed Objective, the assigned Tier and the Placement explanation obtained from `describeRoute`.
6. WHEN the Progress_Report is opened AND the student took at least one Probe_Task, THE Progress_Report SHALL display each Probe_Task read from `stepLog` entries whose `routeReason` is `probe`, using the existing `stepLog` and `describeRoute` rendering patterns.

### Requirement 6: Constraints, accessibility, and non-goals

**User Story:** As a developer, I want this feature confined to the local mocked engine with accessible UI and no new infrastructure, so that it runs in the browser demo without touching protected or backend code.

#### Acceptance Criteria

1. THE Lesson_Engine and Lesson_UI SHALL implement this feature using only JavaScript and JSX files located within `src/weblab/`, and SHALL NOT add any runtime dependency to the project.
2. THE Lesson_Engine SHALL compute all placement, confidence, and probe behavior synchronously in the browser, and SHALL NOT issue any backend call or any real model invocation.
3. THE feature SHALL NOT read from or write to the services/contract tree or the Python backend.
4. THE feature SHALL NOT modify the frozen shared contracts.
5. THE feature SHALL keep all existing 12 Levels selectable and gradable through the existing teaching flow with their current behavior unchanged.
6. WHERE the feature introduces new UI such as diagnostic prompts and placement or probe banners, THE Lesson_UI SHALL apply the same accessibility treatment used by the existing lesson banners and report: a status banner SHALL carry `role="status"` within an `aria-live="polite"` region, an error banner SHALL carry `role="alert"`, and any interactive control SHALL be reachable and operable by keyboard.
