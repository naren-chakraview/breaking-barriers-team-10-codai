# Implementation Plan: Adaptive Diagnostic Placement & Confidence Probing

## Overview

This plan extends the local, fully-mocked adaptive lesson engine under `src/weblab/` to add
diagnostic placement and confidence-driven probing. Work proceeds in strict dependency order:
first the probe-pool data in `courseData.js`, then the pure decision helpers in `engine.js`, then
the `routeNextLevel`/`describeRoute` extension, then the `WeblabLesson.jsx` state wiring, then the
`ProgressReport.jsx` rendering, and finally a verification pass. Every task builds on the prior
ones and ends wired into the lesson. The 12 existing `LEVELS` stay untouched and remain the
canonical first member of each pool.

All property-test sub-tasks are OPTIONAL (marked `*`) and run as an in-repo seeded loop with
**>=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary
`--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config,
deleted after with `package.json`/`package-lock.json` restored**.

## Tasks

- [ ] 1. Add probe pools to `courseData.js`
  - In `src/weblab/courseData.js`, add the `PROBES` map keyed by `` `${objectiveId}:${tier}` ``, with
    1–2 interchangeable variant level objects per objective+tier used by placement/probing.
  - Each variant REUSES the canonical level's `rubric` (same needle set) and differs in at least one
    of `title`, `instructions`, or `starter`; variant `objectiveId`/`tier` equal the pool key.
  - Add `poolKey(objectiveId, tier)` returning `` `${objectiveId}:${tier}` ``.
  - Add `getPool(objectiveId, tier)` returning `[canonical LEVELS member, ...PROBES variants]`
    (length 2–3), falling back to just the canonical member when a `PROBES` key is absent/malformed.
  - Leave the 12 existing `LEVELS` and `getLevel`/`getObjective`/`FIRST_LEVEL_ID` untouched.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.8_

  - [ ]* 1.1 Write property test for probe pool interchangeability invariants
    - **Property 8: Every probe pool satisfies its interchangeability invariants**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    - Assert pool size 2–3, shared objectiveId+tier, rubric-needle counts within 1, each distinct
      pair differs in >=1 of title/instructions/starter; also assert the 12 canonical ids remain
      pool members and resolve via `getLevel` (Req 2.8).
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

- [ ] 2. Add pure decision helpers to `engine.js`
  - [ ] 2.1 Implement `computeConfidence(signal, tier)`
    - Return `'low'` when `!signal.passing`; `'high'` only when `passing && hintsOnLevel === 0 &&
      attempts === 1 && tier !== 'support'`; otherwise `'borderline'`.
    - Total, pure, deterministic; returns exactly one of `high|borderline|low`.
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 2.2 Write property test — confidence is a pure total function into a 3-element set
    - **Property 1: Confidence is a pure total function into a 3-element set**
    - **Validates: Requirements 3.1**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ]* 2.3 Write property test — clean first-try non-support pass is high confidence
    - **Property 2: Clean first-try non-support pass is high confidence**
    - **Validates: Requirements 3.2**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ]* 2.4 Write property test — any non-passing signal is low confidence
    - **Property 3: Any non-passing signal is low confidence**
    - **Validates: Requirements 3.3**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ]* 2.5 Write property test — helped / multi-attempt / support pass is borderline
    - **Property 4: Helped / multi-attempt / support pass is borderline**
    - **Validates: Requirements 3.4**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ] 2.6 Implement `placeFromEvidence(evidence, skipped)`
    - Return `'core'` when skipped or empty; `'support'` when any entry is non-passing; `'stretch'`
      when every entry is a clean first-try pass; otherwise `'core'`.
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 2.7 Write property test — placement maps evidence to the correct tier
    - **Property 5: Placement maps evidence to the correct tier**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ] 2.8 Implement `TIER_ORDER` and `applyEstablished(raw, established)`
    - Define `TIER_ORDER = { support: 0, core: 1, stretch: 2 }`; return the max of `raw` and
      `established` (never below established; `raw` when established is absent).
    - _Requirements: 1.7, 4.6_

  - [ ]* 2.9 Write property test — placement never lowers the Established_Level
    - **Property 6: Placement never lowers the Established_Level**
    - **Validates: Requirements 1.7, 4.6**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ] 2.10 Implement `buildDiagnosticPlan(objectiveId)`
    - Return `{ objectiveId, probeTierSequence: Tier[] }` with sequence length always in [2,3].
    - _Requirements: 1.1, 1.8_

  - [ ]* 2.11 Write property test — diagnostic plan length is bounded to 2–3
    - **Property 7: Diagnostic plan length is bounded to 2–3**
    - **Validates: Requirements 1.1, 1.8**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ] 2.12 Implement `selectProbe(objectiveId, tier, shownIds, seed)`
    - Use `getPool`; return `null` on empty pool. Prefer unshown members and exclude the pool's
      most-recently-shown id (no immediate repeat); pick deterministically via `seed mod len`; when
      all members are shown, return the least-recently-shown member (ignores seed).
    - _Requirements: 2.5, 2.6, 2.7_

  - [ ]* 2.13 Write property test — probe selection never immediately repeats when an unshown level exists
    - **Property 9: Probe selection never immediately repeats when an unshown level exists**
    - **Validates: Requirements 2.5**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ]* 2.14 Write property test — probe selection is deterministic
    - **Property 10: Probe selection is deterministic**
    - **Validates: Requirements 2.6**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ]* 2.15 Write property test — exhausted pool selects the least-recently-shown level
    - **Property 11: Exhausted pool selects the least-recently-shown level**
    - **Validates: Requirements 2.7**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

- [ ] 3. Checkpoint — pure helpers
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Extend `routeNextLevel` and `describeRoute` in `engine.js`
  - Change the signature to `routeNextLevel(currentLevel, signal, history, ctx = {})` where
    `ctx = { confidence, probeCount, diagnostic, established, shownIds, seed }`; when `ctx` is
    omitted/empty, behavior is byte-for-byte identical to today.
  - Decision order: (1) diagnostic pending -> `selectProbe` with reason `'diagnostic'` while the
    queue has entries, else resolve placed level with reason `'placement'`; (2) `confidence ===
    'borderline' && (probeCount || 0) < 2` -> `selectProbe` at `currentLevel.tier` with reason
    `'probe'`; (3) otherwise the EXISTING logic unchanged; (4) clamp any non-null level up to the
    objective's established tier.
  - Guarantee `diagnostic`/`placement`/`probe` always return a non-null level.
  - Extend `describeRoute` with non-empty messages for `diagnostic`, `placement`, and `probe` while
    keeping the five existing messages; unknown reasons still return `''`.
  - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1_

  - [ ]* 4.1 Write property test — borderline with budget routes to exactly one probe
    - **Property 12: Borderline with budget routes to exactly one probe**
    - **Validates: Requirements 3.5, 4.5**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ]* 4.2 Write property test — high confidence with no diagnostic reproduces legacy routing
    - **Property 13: High confidence with no diagnostic reproduces legacy routing**
    - **Validates: Requirements 3.6, 4.1**
    - Use the legacy `routeNextLevel(currentLevel, signal, history)` as the oracle; assert field-for-field equality with the extended call under empty/high ctx.
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ]* 4.3 Write property test — legacy routing decisions are preserved (non-borderline, no diagnostic)
    - **Property 14: Legacy routing decisions are preserved when no diagnostic is pending and confidence is not borderline**
    - **Validates: Requirements 4.2, 4.3, 4.4**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ]* 4.4 Write property test — probe count is capped and the borderline loop terminates
    - **Property 15: Probe count is capped and the borderline loop terminates**
    - **Validates: Requirements 3.7, 3.8**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ]* 4.5 Write property test — a passed probe restores high confidence
    - **Property 16: A passed probe restores high confidence**
    - **Validates: Requirements 3.9**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ]* 4.6 Write property test — diagnostic, placement, and probe routes always carry a level
    - **Property 17: Diagnostic, placement, and probe routes always carry a level**
    - **Validates: Requirements 4.5**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ]* 4.7 Write property test — every routed non-null level respects the Established_Level floor
    - **Property 18: Every routed non-null level respects the Established_Level floor**
    - **Validates: Requirements 4.6**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ]* 4.8 Write property test — signal augmentation preserves all existing fields and adds only `seconds`
    - **Property 19: Signal augmentation preserves all existing fields and adds only `seconds`**
    - **Validates: Requirements 4.7**
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ]* 4.9 Write property test — describeRoute returns a non-empty message for every reason
    - **Property 20: describeRoute returns a non-empty message for every reason**
    - **Validates: Requirements 5.1**
    - Cover `{support, retry, advance, stretch, complete, diagnostic, placement, probe}`.
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

- [ ] 5. Checkpoint — routing and describeRoute
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Wire placement, confidence, and probing into `WeblabLesson.jsx`
  - Add per-objective state: `placements`, `confidence`, `probeCount`, `established`, `shownIds`,
    and `diagnostic`.
  - On submit, compute `secondsOnStep` and attach it as `signal.seconds`; call `computeConfidence`
    and update `confidence[objectiveId]`.
  - The first time an objective is reached and not yet placed, set `diagnostic` from
    `buildDiagnosticPlan`, run the diagnostic probes (reason `diagnostic`), then compute placement
    via `placeFromEvidence` + `applyEstablished`, record it in `placements`, and raise `established`.
  - Route through `routeNextLevel(level, signal, history, ctx)` with the assembled `ctx`; append
    `stepLog` entries whose `routeReason` records `diagnostic`/`placement`/`probe` without removing
    any existing field; update `shownIds`/`probeCount` accordingly.
  - Show placement and probe banners reusing the existing `role="status"` banner inside the
    `aria-live="polite"` region via the existing `flash`/`loadLevel` path; errors keep `role="alert"`.
  - Add a skip-diagnostic control (keyboard operable) that places the objective at `core`.
  - Pass `placements` to `ProgressReport`.
  - _Requirements: 1.1, 1.6, 3.1, 4.7, 5.2, 5.3, 5.4, 6.1, 6.2, 6.6_

  - [ ]* 6.1 Write property test — stepLog routeReason faithfully records the route decision
    - **Property 21: stepLog routeReason faithfully records the route decision**
    - **Validates: Requirements 5.4, 5.6**
    - Drive the pure stepLog-mapping logic so each appended entry's `routeReason` equals the route
      result's `reason`, making the `routeReason === 'probe'` set exactly the probe steps.
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

  - [ ]* 6.2 Write component tests for placement and probe banners
    - Assert a `role="status"` banner inside `aria-live="polite"` names the assigned tier + reason
      after placement (Req 5.2), the probe banner conveys a confirmation re-check (Req 5.3), errors
      render `role="alert"`, and controls are keyboard operable (Req 6.6).
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

- [ ] 7. Render placement and probe explanations in `ProgressReport.jsx`
  - Accept a `placements` prop; for each placed objective show its assigned tier and the
    `describeRoute(reason)` explanation.
  - Widen `adaptiveSteps` to include `probe` (and optionally `diagnostic`/`placement`) so re-checks
    appear in the "How the lesson adapted to you" list, reusing the existing `describeRoute` pattern
    and `.pr-path-step--{routeReason}` classes.
  - Keep all styling scoped under `.pr` in `progressReport.css`.
  - _Requirements: 5.5, 5.6_

  - [ ]* 7.1 Write component test for placement + probe rendering in the report
    - Assert each placed objective shows its tier + `describeRoute` text (Req 5.5) and that
      `routeReason === 'probe'` steps are listed (Req 5.6).
    - >=100 iterations, no new dependency (in-repo seeded loop); component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10 jsdom@25` + throwaway vitest config, deleted after with package.json/package-lock.json restored.

- [ ] 8. Final verification
  - Run `npm run build` and `npm test`; fix any failures so both gates pass.
  - Confirm only JS/JSX files under `src/weblab/` changed; the Python backend, services/contract
    tree, and frozen shared contracts are untouched.
  - Confirm no new runtime or dev dependency is persisted (`package.json`/`package-lock.json`
    restored after any temporary `--no-save` component-test install; throwaway vitest config removed).
  - Confirm the 12 existing levels still resolve and grade through the existing teaching flow, the
    existing lesson flow is unchanged under empty/high ctx, and the existing 132 tests stay green.
  - Never stage `vite.config.js` or `.vite/`.
  - _Requirements: 2.8, 4.1, 6.1, 6.3, 6.4, 6.5_

## Notes

- Tasks marked with `*` are optional (property-based and component tests) and can be skipped for a
  faster MVP; core implementation tasks are never optional.
- Property-based tests run an in-repo seeded loop of >=100 iterations with no new dependency; each
  references `Feature: diagnostic-placement, Property {number}` in a comment.
- Component tests use the temporary `--no-save @testing-library/react@16 @testing-library/dom@10
  jsdom@25` + throwaway vitest config pattern, deleted afterward with `package.json`/
  `package-lock.json` restored so the no-dependency constraint holds.
- Each task references specific requirements for traceability; checkpoints ensure incremental
  validation; all 21 design properties are mapped to `*` property-test sub-tasks.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.6", "2.8", "2.10", "2.12"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.7", "2.9", "2.11", "2.13", "2.14", "2.15"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9"] },
    { "id": 4, "tasks": ["6.1", "6.2"] },
    { "id": 5, "tasks": ["7.1"] }
  ]
}
```
