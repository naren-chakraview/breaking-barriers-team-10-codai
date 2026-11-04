# Implementation Constraints (Day 3 build: Wed Nov 4, 2026)

Binding rules for everyone (people and coding agents) building tomorrow. Cite them as `C-<n>` in
PRs. Kiro loads this file through `.kiro/steering/implementation-constraints.md`; point other
tools here directly. If a rule blocks you, raise it with the team. Don't work around it quietly.
Items marked **DEFAULT** are decisions taken so nobody is blocked; the team can overturn one, but
only out loud and only by editing this file.

Reviewed 2026-11-03 against: platform requirements + sequence diagrams, frontend spec
(requirements/design/tasks), `database/`, `src/`, README.

---

## 1. Source of truth

**C-1 Precedence.** When documents disagree, the higher one wins:
1. `docs/platform/requirements.md` and `docs/platform/sequence-diagrams.md`
2. `database/sample-skilltree.json` and `database/data-model.mmd` (content model)
3. `docs/architecture/architecture.md` (system and component design, MVP scope, ADRs; a living document)
4. `.kiro/specs/codeai-frontend/requirements.md` (UI behavior and timings, where not in conflict)
5. Everything else: frontend `design.md`, `tasks.md`, `README.md`, wireframes

**C-2 Known stale.** Do not build from these until they are updated:
- `README.md` "Data model" section and frontend `design.md` "Data Models" (old UNIT/LESSON/LEVEL/OBJECTIVE/SKILL_EDGE model)
- frontend `design.md` "Locked technical decisions" (TypeScript, CSS Modules), superseded by C-30
- frontend `tasks.md` status: every task shows `[~]` and the files it names (`src/services/index.ts`, ...) do not exist; it is not a progress tracker
- `src/weblab/courseData.js` content (invented HTML lesson, see C-7)

**C-3 Requirement IDs are stable.** Platform requirement numbers stay as they are (18-21 sit before 12-17). Never renumber; cite as `P-19.4`, frontend as `F-14.1`.

---

## 2. Vocabulary and content model

**C-4 One glossary.** Use these words in code, API, DB and UI copy:

| Term (vision / UI) | Canonical entity | ID example | API path name |
|---|---|---|---|
| Lesson (the ~1-hour adaptive experience) | `SKILL_TREE` | `hoai2026-adaptive` | `course_id` |
| Checkpoint (a group of steps aimed at one skill) | `CHECKPOINT` | `steer-it` | `lesson_id` |
| Level / step | `STEP` (`kind`: `panels`, `questions`, `level`) | `steer-it-project` | `step_id` |
| Skill | `SKILL` + `SKILL_EVIDENCE_LEVEL` rubric | `build`, `language`, `debug` | `skill_id` |
| Objective | a checkpoint's `targetEvidenceLevels` (skill at level) | `build ≥ 2` | — |
| Mastery signal | an evidence level for (student, skill) from a `MEASURE` | `{skill:"build", level:2}` | — |

The platform API's "course" and "lesson" path names are kept (P-11) but **mean** tree and
checkpoint. In UI copy, say "checkpoint", never "lesson", for a checkpoint.

**C-5 IDs are the JSON string slugs.** No bigint keys, no new ID schemes, no renamed ids.
`src/weblab/skillTreeData.js` must use checkpoint ids (`list-pick` → `a-list-and-a-random-pick`,
`load-point` "Load with the point" → `lead-with-the-point` "Lead with the point", etc.).

**C-6 Content is data, loaded from `sample-skilltree.json`.** Never hand-copy titles, instructions,
questions or rubrics into JS. UI-only data (node x/y, cluster boxes, icons) may live in a UI file
**keyed by checkpoint id**; node `state` is computed from progress, never hard-coded.

**C-7 The lesson is about prompting, not hand-coding.** The tree's project steps are judged on the
student's **prompts and decisions** ("The tutor reads the prompt"). Retire the
`courseData.js` HTML levels (`<h1>`/`<p>` rubric); `engine.js` becomes the mock implementation of
the services in C-28.

**C-8 Student-state tables** (missing from `data-model.mmd`; add them, snake_case):

| Table | Key columns |
|---|---|
| `student_skill_evidence` | student_id, skill_id, level, source_step_id, created_at |
| `step_attempt` | attempt_id, student_id, step_id, input_text, project_snapshot_ref, evidence_level, confidence, created_at |
| `checkpoint_progress` | student_id, checkpoint_id, status (`locked`, `available`, `current`, `completed`, `tested_out`), updated_at |
| `remediation_flag` | student_id, skill_id, reason, severity, created_at, resolved_at |
| `routing_decision` | decision_id, student_id, proposed_checkpoint_id, teacher_input, applied_checkpoint_id, reason, created_at |
| `fallback_event` | student_id, step_id, component (`validation`, `routing`, `generation`, `safety`, `passive`), error, created_at |
| `teacher_config` | teacher_id, answer_timeout_seconds (DEFAULT 180) |
| `student` | student_id, display_name, synthetic (added by Task 4.6; `STUDENT_PROFILE` in SQL) |
| `passive_signal` | signal_id, student_id, signal, hint_style, angle_to_try, reason, evidence_refs, confidence, features_hash, model_id, prompt_version, created_at (added by Task 4.6) |
| `hint_event` | hint_id, student_id, step_id, style, angle, created_at (added by Task 4.6) |
| `teacher_input` | student_id, mode (`auto`, `hold`, `assign`), checkpoint_id, updated_at (added by Task 4.6) |

Storage: Aurora PostgreSQL (`database/schema.sql`, ADR-016) or a JSON file in demo mode; the shapes
above are the contract either way. Student and teacher ids are strings and skill ids are slugs
(ADR-017). In SQL each column is the record key in lower case (`student_id` here is `studentid` there).

---

## 3. Mastery and scoring

**C-9 Mastery is the evidence level per skill**, an integer 0..max from the skill's rubric
(`build` max 2, `language` max 3, `debug` max 3). Never invent a second score.

**C-10 Monotonic skill level (P-6.2, P-6.3).** Student skill level = **max** evidence observed.
It never decreases. Two consecutive attempts below target on the same skill create a
`remediation_flag` instead (severity `high` after four → teacher flag, P-sequence 7).

**C-11 0-100 is display only.** The UI's Mastery_Score (F-4) = `round(100 × level / max)` for the
current checkpoint's skill, or the mean across skills on the outcomes panel. It is never stored
and never sent to routing.

**C-12 Completion never reverses.** A checkpoint is `completed` when its project step is validated
at or above target. Frontend F-2.3 (completed → not completed) applies only to a teacher reset.
DEFAULT target for checkpoints without `targetEvidenceLevels` = **1**.

---

## 4. Validation (P-19)

**C-13 Deterministic before AI.** Multiple-choice questions with `measures.evidenceLevels` map
choice → level directly. No model call.

**C-14 Project steps use the LLM judge**, prompted with: the step's condition, the skill's evidence
descriptors, the student's prompt(s), and a before/after summary of the project.
Condition source: `validation.condition`; for the 10 project steps without one, use the
`Evidence:` line of `instructionsPrompt`. Skill: `validation.measures.skillId`, else the
checkpoint's `skillIds[0]`.

**C-15 Not scored:** `panels` steps, free-response questions without `measures`, and
`intro-starter` / `show-it-off` (no skill). They record completion only.

**C-16 Validator output contract** (enforce at runtime with JSON Schema; extend
`codeai-starter/contracts/model-contract.yaml`):
`{ "skillId": str, "evidenceLevel": int 0..max, "conditionMet": bool, "confidence": 0..1, "evidence": str ≤240 }`
Invalid JSON gets one repair retry, then fallback. `confidence < 0.6` counts as unreliable and
triggers fallback (P-19.4).

**C-17 Launch gate (P-19.2).** At least 15 human-rated project submissions; agreement reported as
exact, within-1 and quadratic weighted kappa. DEFAULT gate: kappa ≥ 0.70. Show the number in the demo.

---

## 5. Routing (P-8, P-21)

**C-18 Routing is a pure, deterministic function** with unit tests:
`route(tree, progress, evidence, teacherInput) → { checkpointId, reason }`. No model decides routing.

**C-19 The rule:**
1. *Available* = not completed and every `requires` checkpoint is completed or tested out.
2. After `intro` (`routeAfterCompletion`), any `skippable` checkpoint whose target is already met by
   diagnostic evidence becomes `tested_out` (counts as done; depth not volume, P-6.5).
3. Proposal = stay on the `current` checkpoint while it is still available (its target not yet met), otherwise the first available checkpoint in JSON order. A student finishes the checkpoint they are on before moving to another skill (depth not volume, P-6.5), rather than hopping to whichever skill has the largest gap. (Decided in issue #24 q2; supersedes the earlier "largest gap" rule.)
4. Teacher input `{ mode: "auto" | "hold" | "assign", checkpointId? }`:
   `assign` → that checkpoint (if available); `hold` → stay; `auto` → proposal.
   (The P-8.2 AND rule: the proposal applies only if the teacher has not held or overridden it.)
5. Write a `routing_decision` row with a human-readable `reason` every time, and show it in the
   UI ("why this checkpoint").

**C-20 Only approved content (P-21).** Routing returns checkpoint or step ids that exist in the
tree. Any AI "advisor" may only pick from the available list, and its pick is validated.
Generated lesson content (option 3) is out of scope tomorrow (C-33).

---

## 6. Fallback and reliability (P-20, F-14)

**C-21 Linear fallback path** = JSON checkpoint order, respecting `requires`, no skipping,
pre-authored steps only.
**C-22 Triggers:** validation error, timeout (10 s), or low confidence; routing error or timeout
(10 s); generation failure; safety service error. Every trigger writes a `fallback_event` and
shows the "adaptive feedback temporarily unavailable" notice (F-14.1).
**C-23 Health re-check** every ≤ 30 s while on fallback; resume adaptive mode automatically (F-14.4, F-14.5).
**C-24 Student work is never lost.** Persist prompts, attempts and the project on every submit (P-14.1).

---

## 7. Safety and agents (P-7, P-18)

**C-25 Filter everything, server-side.** Every student free-text input (requirement prompt,
question, chat, free response) passes the input filter before any model call. Every model output
passes the output filter before display. Use Bedrock Guardrails: content filters, prompt-attack
filter, PII filter. **Fail closed:** if the filter errors, block the content but keep the lesson running.

**C-26 The browser never calls a model.** No AWS keys, model IDs or prompts in front-end code.
The UI talks only to our API.

**C-27 Agent roles (sequence diagrams).** The Active agent is the only voice students hear.
The Passive agent emits signals only. Prompt verification and code generation use **different
models** (P-7.2). DEFAULT: Haiku-class for verify/validate, Sonnet-class for codegen and hints.
Model IDs come from environment config behind a single `invoke(task, prompt)` wrapper.

---

## 8. API and front-end service layer

**C-28 Front-end services.** All I/O goes through `src/services/` (one function per call: `getTree`,
`submitStep`, `askTutor`, `verifyPrompt`, `generate`, `getTeacherRoster`, `setTeacherInput`,
`health`). Each has a mock implementation (today's `engine.js`, with latency + error/hang
toggles) and an HTTP implementation behind the same signature. Components never call `fetch`.

**C-29 API.** Keep the P-11 endpoints. Add only:
`POST /steps/{step_id}/submit` (validate + route, returns evidence + next),
`POST /tutor/ask`, `POST /prompts/verify`, `POST /prompts/generate`,
`GET /teacher/students`, `POST /teacher/students/{id}/routing`, `GET /health`.
Headers per P-1.4: `Authorization: Bearer <token>`, `X-User-Id`, `X-Role`.
camelCase JSON on the wire (matches the tree JSON), snake_case in the DB.
Errors: `{ "error": { "code": str, "message": str } }`. Timeouts follow the frontend spec (10 s for adaptive calls).

---

## 9. Front-end stack and UI

**C-30 Stack: stay as built.** React 18 + Vite, **JavaScript (JSX)**, plain `index.css`. No TypeScript
migration, no MUI and no CSS Modules tomorrow. Put JSDoc `@typedef`s in `src/services/types.js`.
(DEFAULT. CodeAI runs React 18 + MUI 7: mention the mapping in the pitch.)
This rule governs the **front end only**. The backend language is Python (ADR-015) and infrastructure
is CDK in TypeScript (ADR-010); neither changes the front-end stack. The shared contract schemas in
`shared/contracts/schemas/` are language-neutral JSON Schema.

**C-31 Layout: the code wins** (tutor left, workspace centre, preview right; "CodeAI studio" style).
Frontend F-1.2 to F-1.4 describe a different arrangement: update F-1 to match the code after the
demo. Keep F-1.1, F-1.5 and F-1.6 (responsive, no horizontal scroll, per-column scrolling).
(DEFAULT.)

**C-32 Preview sandbox.** Render student projects in an iframe with `srcdoc` and
`sandbox="allow-scripts"` (never with `allow-same-origin`). The current `sandbox=""` blocks the
JavaScript the "Interactive Elements" checkpoints need. No real deploy to a sandbox URL tomorrow;
F-8.2 and F-9.3 to F-9.5 are descoped and the Deploy button is hidden.

---

## 10. Scope for tomorrow

**C-33 In scope:**
- Student loop on **intro (diagnostic) → steer-it → use-the-lingo → keep-or-redirect**: prompt →
  verify → generate → preview → validate → route, with hints
- Skill tree rendered from the JSON with computed states
- Safety filtering, fallback, routing reasons
- Validation benchmark number
- Minimal teacher view: roster with mastery and flags, plus the hold/assign control that
  demonstrates the P-8.2 rule; demo mode with both roles side by side (P-1.5)

**Out of scope** (say so in the pitch):
- real authentication (demo mode only) — *being revisited: ADR-018 adds Cognito auth (authorization
  code + PKCE, roles as Cognito groups). Frontend lands first behind `VITE_AUTH_MODE` (mock stays the
  demo default); backend JWT verification and the user pool follow. Demo mode is preserved.*
- CS-standards grading (P-9.3, P-9.4): show a placeholder
- teacher help-ladder configuration UI: use a fixed timeout from `teacher_config`
- generated lesson content
- cross-lesson adaptivity
- Progress_Report page
- Deploy

**C-34 Help ladder (P-10 ↔ F-11).** One ladder: inline hint → point to preview → extra hint →
"See the answer" after the timeout → iteration step. The frontend's "step n of m" display
renders these rungs. Nudge cooldown 60 s per checkpoint (F-12.5).

---

## 11. Repo hygiene

**C-35 Line endings first.** All 22 "modified" files in the working tree differ only by CRLF/LF,
not content. First commit tomorrow: add `.gitattributes` with `* text=auto eol=lf`, then
`git add --renormalize .`. Nobody commits the CRLF churn.
**C-36 Workflow per CONTRIBUTING.md:** short branches `<type>/<name>-<desc>`, one review, squash
merge. Every PR names the P-/F- requirements and C- constraints it touches, and updates any spec
it diverges from in the same PR.
**C-37 Merge cutoffs:** feature freeze at 3:30 pm Wednesday; after that, fixes only. `main` must
build and demo at every merge.
**C-38 Housekeeping:** rename `package.json` `name` from `login-app` to `codeai-adaptive`; keep
secrets in `.env.local` (gitignored); infrastructure in CDK; repo public with a LICENSE
(DEFAULT MIT-0) before judging.

---

## Fix list

The inconsistencies found in the review are tracked as a team checklist in
[`discrepancy-checklist.md`](./discrepancy-checklist.md).
