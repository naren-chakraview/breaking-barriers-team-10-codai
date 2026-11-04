# Discrepancy fix checklist

The 18 inconsistencies found in the 2026-11-03 review, written as fixes. Each item names the
constraint in [`implementation-constraints.md`](./implementation-constraints.md) that decides how
to fix it. Put your name on an item before you start, and tick it in the PR that fixes it.

Order: **Before building** items unblock everyone, so do them first on Wednesday morning.
**During the build** items are part of the feature work. **After the demo** items are doc
updates that can wait until judging is over.

## Before building (Wed morning)

- [ ] **1. Normalize line endings.** All 22 "modified" files in the working tree differ only by
  CRLF/LF. Add `.gitattributes` with `* text=auto eol=lf`, run `git add --renormalize .`, commit
  alone. Nobody commits the CRLF churn. *C-35* · Owner: ____
- [ ] **2. Rename the package.** `package.json` `name`: `login-app` → `codeai-adaptive`. *C-38* · Owner: ____
- [ ] **3. Add the student-state tables.** `database/data-model.mmd` has content tables only. Add
  `student_skill_evidence`, `step_attempt`, `checkpoint_progress`, `remediation_flag`,
  `routing_decision`, `fallback_event` and `teacher_config` as specified. *C-8* · Owner: ____
- [ ] **4. Create the service layer.** Add `src/services/` (one function per call, mock + HTTP
  implementations) and `src/services/types.js` (JSDoc typedefs). Move `engine.js` in as the mock.
  Components stop calling the engine directly. *C-28, C-30* · Owner: ____

## During the build

- [ ] **5. Replace the invented lesson.** `src/weblab/courseData.js` teaches hand-written HTML
  (`<h1>`/`<p>` rubric). Load checkpoints, steps and questions from
  `database/sample-skilltree.json` instead; the lesson is about prompting. *C-6, C-7* · Owner: ____
- [ ] **6. Fix the skill-tree ids and states.** `src/weblab/skillTreeData.js` uses its own ids
  (`list-pick` → `a-list-and-a-random-pick`, etc.), has the typo "Load with the point" (→ "Lead
  with the point"), and hard-codes node states. Key the layout by checkpoint id and compute
  `state` from progress. *C-5, C-6* · Owner: ____
- [ ] **7. Switch mastery to evidence levels.** Replace the 0-100 rubric-percentage score with
  per-skill evidence levels (0..max), never decreasing; repeated misses raise a remediation flag.
  The 0-100 number becomes display only. *C-9 to C-12* · Owner: ____
- [ ] **8. Build validation for the real tree.** Multiple-choice questions map answers to levels
  directly; project steps go to the LLM judge with the step condition and skill rubric. Cover the
  10 project steps with no `validation` block (use the `Evidence:` line) and skip the 12
  questions without `measures`. *C-13 to C-16* · Owner: ____
- [ ] **9. Rewrite routing.** `engine.js` routes by support/stretch tiers and a 100% score. Replace
  it with the pure function: `requires`, `skippable` + `targetEvidenceLevels`, largest skill gap,
  teacher hold/assign, a logged reason. *C-18, C-19* · Owner: ____
- [ ] **10. Add content filtering.** None exists yet. Filter all student free text before any
  model call and all model output before display, server-side, failing closed. *C-25, C-26* · Owner: ____
- [ ] **11. Split verify and codegen.** The frontend design has a single generation service; the
  platform requires prompt verification and code generation on different models. *C-27* · Owner: ____
- [ ] **12. Let the preview run JavaScript.** `src/weblab/Preview.jsx` uses `sandbox=""`, which
  blocks the interactive checkpoints. Use `sandbox="allow-scripts"` with `srcdoc`, never
  `allow-same-origin`. *C-32* · Owner: ____
- [ ] **13. Hide Deploy.** The frontend spec's build/deploy to a live sandbox URL is descoped; the
  in-browser preview is the build. *C-32* · Owner: ____
- [ ] **14. Build the minimal teacher view.** `Dashboard.jsx` teacher screen is a placeholder.
  Roster with mastery and flags, plus the hold/assign routing control. *C-33* · Owner: ____
- [ ] **15. Demo-mode login.** `Login.jsx` lets the user pick their role client-side. Make it an
  explicit demo mode with both roles side by side; real auth is out of scope. *C-33* · Owner: ____
- [ ] **16. Re-shape the model contract.** `codeai-starter/contracts/model-contract.yaml` still
  describes the Python loops placeholder lesson. Change the validator output to
  `{skillId, evidenceLevel, conditionMet, confidence, evidence}`. *C-16* · Owner: ____

## After the demo (doc updates)

- [ ] **17. Update the stale data-model docs.** `README.md` "Data model" and the frontend
  `design.md` "Data Models" still show UNIT/LESSON/LEVEL/OBJECTIVE/SKILL_EDGE. Replace them with
  the SKILL_TREE/CHECKPOINT/STEP/MEASURE model plus the student-state tables. *C-1, C-2, C-4* · Owner: ____
- [ ] **18. Bring the frontend spec in line with the code.**
  - "Locked technical decisions": JavaScript + plain CSS, not TypeScript + CSS Modules *(C-30)*
  - Req 1.2 to 1.4: the layout as built *(C-31)*
  - Req 2.3 and 4: the monotonic mastery model *(C-12)*
  - Req 8 and 9: Deploy descoped *(C-32)*
  - `tasks.md`: reset the status markers to what actually exists *(C-2)*

  Owner: ____
