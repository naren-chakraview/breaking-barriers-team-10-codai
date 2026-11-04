# Requirements Document

## Introduction

CodeAI is a guided learning platform where students learn coding and AI concepts
by building a small project (e.g. a personal website) inside a visually dynamic
IDE. As a student builds, they get instant feedback and short lessons tied to a
skill tree (based on the Hour of AI adaptive pathway). An AI tutor/evaluator
agent adapts to each student — slowing down or speeding up, offering examples or
guiding questions — and teachers stay in the loop, reviewing progress and
influencing how the agent routes a student to their next lesson.

This document captures the functional requirements derived from the team
planning doc, plus non-functional requirements organized around the six pillars
of the AWS Well-Architected Framework. Each requirement has a user story and
acceptance criteria written in EARS style (WHEN/IF ... THE SYSTEM SHALL ...).

Scope notes from the planning doc:

- Keep the current skill tree; mock the pathway on the Hour of AI adaptive JSON.
- Flag review topics in the user experience.
- Student and teacher logins are demoed side by side.
- Candidate agent models: Claude Sonnet (stronger code reasoning) and Claude
  Haiku (cheaper/faster, less in-depth). Final selection is a design decision.

## Glossary

- **Skill tree:** The graph of coding/AI concepts a student progresses through,
  mocked on the Hour of AI adaptive pathway.
- **Tutor/evaluator agent:** The AI that assesses a student's work, adapts the
  pace, and provides scaffolded hints.
- **Skill level:** A numeric score per student per topic, raised by correct
  practice. Repeated mistakes trigger a separate remediation/flagging mechanism
  rather than lowering the score.
- **Human-in-the-loop routing:** Combining the agent's assessment with teacher
  input to choose a student's next lesson.
- **Scaffolded help ladder:** The escalating sequence of help — inline hint,
  front-end pointer, additional hint, timed answer reveal, iteration module.
- **CS teacher standards:** An external computer-science standards framework
  (e.g. CSTA) used to grade a student's ability.
- **Validation service:** Scores a task submission against a rubric to produce a
  mastery signal, benchmarked against human raters.
- **Routing service:** Selects the next skill from human-approved trajectories
  based on accumulated mastery evidence.
- **Non-adaptive fallback path:** A working, pre-authored lesson path used when
  validation, routing, generation, or filtering fails.
- **Content safety filtering:** Filtering applied to both student input and
  model output so no unsafe or age-inappropriate content is processed or shown.
- **Intra-lesson adaptivity:** Adapting to how a student performs within the
  current lesson (the MVP focus), as opposed to across their full history.

## Requirements

### Requirement 1: Authentication and roles

**User Story:** As a user, I want to log in as either a student or a teacher, so
that I see the experience and permissions for my role.

#### Acceptance Criteria

1. WHEN a user submits a valid username and password THE SYSTEM SHALL
   authenticate them and return an access token.
2. WHEN a user is authenticated THE SYSTEM SHALL determine their role (student or
   teacher) and present the corresponding interface.
3. IF the username or password is invalid THEN THE SYSTEM SHALL reject the login
   and show an error without revealing which field was wrong.
4. WHEN an authenticated request is made THE SYSTEM SHALL require the access
   token, user id, and role in the request header.
5. THE SYSTEM SHALL support a side-by-side student and teacher demo, and WHEN
   demo mode is active THE SYSTEM SHALL allow both roles to be used in the same
   session without requiring user authentication.

### Requirement 2: Student homepage and lesson navigation

**User Story:** As a student, I want a homepage that shows my lesson module and
the skill tree, so that I know where I am and what to do next.

#### Acceptance Criteria

1. WHEN a student logs in THE SYSTEM SHALL display a homepage with at least one
   lesson module.
2. WHEN a student opens the lesson view THE SYSTEM SHALL display the skill tree
   (mocked on the Hour of AI adaptive pathway).
3. THE SYSTEM SHALL show a pointer indicating the current lesson to work on.
4. THE SYSTEM SHALL visually flag topics that are up for review.

### Requirement 3: Formative placement and background assessment

**User Story:** As a student, I want the platform to gauge my level without
making me feel constantly tested, so that the experience stays open-ended and
engaging while still adapting to me.

#### Acceptance Criteria

1. WHEN a student begins a lesson THE SYSTEM SHALL establish a starting baseline
   for the relevant skills, optionally via a short formative diagnostic.
2. THE SYSTEM SHALL capture assessment signals continuously and quietly in the
   background from the student's work (task submissions, time on task, revisions,
   and where they get stuck) rather than relying on explicit summative tests.
3. THE SYSTEM SHALL keep assessment formative, so the student should not feel
   they are being constantly evaluated.
4. WHEN the system gives the student feedback THE SYSTEM SHALL frame it
   constructively, naming what they did well.

### Requirement 4: Visually dynamic build-and-feedback IDE

**User Story:** As a student, I want to build my project in a dynamic IDE with
live feedback, so that I form a mental connection between code and UI.

#### Acceptance Criteria

1. WHILE a student is building their project THE SYSTEM SHALL provide instant
   feedback and surface concept lessons drawn from the lesson skill tree.
2. WHEN a student changes their code THE SYSTEM SHALL reflect the change in a
   live visual preview of the UI.
3. WHEN a student runs their code THE SYSTEM SHALL test it for both compile-time
   (syntax) errors and runtime/logic errors, including conceptual errors
   relative to the project goal.

### Requirement 5: Adaptive AI tutor/evaluator agent

**User Story:** As a student, I want the tutor agent to adapt to how I'm doing,
so that I get the right amount of help for my level.

#### Acceptance Criteria

1. WHEN the agent detects a student is struggling THE SYSTEM SHALL slow the pace
   and favor more example-based guidance.
2. WHEN the agent detects a student is advanced THE SYSTEM SHALL reduce guidance
   and favor guiding questions over examples.
3. IF a student is over-focused on a non-essential detail (e.g. a color choice)
   THEN THE SYSTEM SHALL actively redirect the student away from that detail
   with a visible change in guidance, not merely log the flag.
4. WHEN a run produces an error THE SYSTEM SHALL first determine the problem
   topic from the error, then tailor the hint to the student's skill level in
   that topic (guiding questions for advanced students, examples for slower
   students).

### Requirement 6: Skill-level scoring model

**User Story:** As the platform, I want a numeric skill level per topic per
student, so that adaptation varies the depth of shared objectives rather than
racing some students ahead of the class.

#### Acceptance Criteria

1. THE SYSTEM SHALL maintain a numerical skill-level score for each student in
   each topic.
2. WHEN a student practices a topic correctly THE SYSTEM SHALL increase their
   score for that topic.
3. WHEN a student makes repeated mistakes on the same topic THE SYSTEM SHALL
   trigger a separate remediation/flagging mechanism for that topic rather than
   decreasing their skill-level score.
4. THE SYSTEM SHALL keep learning objectives consistent across students, so that
   lower-level and higher-level students work toward the same objectives.
5. WHEN a student has a higher skill level THE SYSTEM SHALL increase the depth of
   the shared objectives (deeper practice, less scaffolding) rather than
   advancing them into future content ahead of the class.
6. THE SYSTEM SHALL allow students to complete different quantities of levels
   while converging on the same objectives.
7. THE SYSTEM SHALL store student performance to inform routing within the
   current lesson (intra-lesson adaptivity), with cross-lesson use a later step.

### Requirement 7: Prompting coaching and two-stage generation

**User Story:** As a student, I want the agent to coach my prompting, so that I
learn to prompt step by step instead of asking for a full solution.

#### Acceptance Criteria

1. WHEN a student writes a prompt THE SYSTEM SHALL route it through a
   verification agent before any code is generated.
2. THE SYSTEM SHALL use a separate model for actual code generation than the one
   used for prompt verification.
3. IF a student's prompt is too vague or too broad THEN THE SYSTEM SHALL suggest
   better guidelines and encourage a narrower, step-by-step prompt.
4. THE SYSTEM SHALL discourage prompting for a full solution at once.

### Requirement 8: Human-in-the-loop routing

**User Story:** As a teacher, I want my input to influence how the agent routes a
student, so that routing combines AI assessment with my judgment.

#### Acceptance Criteria

1. WHEN the agent proposes a routing decision THE SYSTEM SHALL allow a teacher to
   review and influence it before it is applied.
2. WHEN choosing a student's next lesson THE SYSTEM SHALL compute the routing
   decision as a precise, deterministic function of the agent's skill
   assessment and the teacher input (e.g. a defined combining rule such as a
   logical AND), rather than considering the inputs in an unspecified way.

### Requirement 9: Teacher view student summary

**User Story:** As a teacher, I want a summary of each student's mastered skills
and code written, so that I can see their progress at a glance.

#### Acceptance Criteria

1. WHEN a teacher opens a student THE SYSTEM SHALL display a summary of the
   skills that student has mastered.
2. WHEN a teacher opens a student THE SYSTEM SHALL display the code the student
   has written.
3. THE SYSTEM SHALL grade the student's ability against CS teacher standards and
   make that grade available to feed the agent.
4. THE SYSTEM SHALL allow the teacher to review and adjust the standards-based
   grade before it feeds the agent.

### Requirement 10: Teacher-tunable scaffolded help ladder

**User Story:** As a teacher, I want control over how help escalates while a
student builds, so that students get real scaffolding before seeing an answer.

#### Acceptance Criteria

1. WHEN a student runs their code and it is wrong THE SYSTEM SHALL provide an
   in-line hint.
2. WHEN a hint is warranted THE SYSTEM SHALL be able to point the student toward
   the visual portion of the front-end, or provide an additional hint.
3. WHEN a student remains stuck for a configured amount of time THE SYSTEM SHALL
   provide the answer and walk through the solution.
4. WHEN a student has seen the worked solution THE SYSTEM SHALL offer a next
   module that is an iteration of what they just learned.
5. THE SYSTEM SHALL make the "See the answer" option visible to the student only
   after a teacher-configured escalation step has occurred (e.g. after a hint or
   a stuck-time threshold), via a button or on timeout.
6. THE SYSTEM SHALL allow the teacher to reveal the answer immediately, send a
   custom hint, and configure the answer timeout.

### Requirement 11: Platform API

**User Story:** As the UI, I want an API to call, so that I can drive login,
course/lesson/skill browsing, and progress recording.

#### Acceptance Criteria

1. WHEN the UI calls POST /login with a username and password THE SYSTEM SHALL
   return an access token.
2. WHEN the UI calls GET /courses with a valid header (access token, user id,
   role) THE SYSTEM SHALL return the list of courses with each course's progress.
3. WHEN the UI calls GET /courses/{course_id} THE SYSTEM SHALL return the course
   with its lessons and progress.
4. WHEN the UI calls GET /courses/{course_id}/lessons/{lesson_id} THE SYSTEM
   SHALL return the lesson with its objectives/skills and whether each is met.
5. WHEN the UI calls POST /courses/{course_id}/lessons/{lesson_id} with a
   success/failure result THE SYSTEM SHALL record progress and respond 200 OK.
6. IF a protected endpoint is called without a valid access token THEN THE SYSTEM
   SHALL reject the request.

### Requirement 18: Content safety filtering

**User Story:** As a student (a minor) and a program owner, I want all content
filtered for safety, so that nothing harmful or age-inappropriate reaches a
student and AI-generated content stays fair and appropriate.

#### Acceptance Criteria

1. WHEN a student submits input (prompt, code, chat) THE SYSTEM SHALL apply
   content filtering to that input before it is processed by any model.
2. WHEN a model produces output intended for a student THE SYSTEM SHALL apply
   content filtering to that output before it is delivered.
3. IF content filtering flags student input or model output as unsafe or
   age-inappropriate THEN THE SYSTEM SHALL block or replace it and SHALL NOT
   deliver the flagged content to the student.
4. THE SYSTEM SHALL ensure AI-generated routing decisions and content are fair,
   safe, and appropriate for a K-12 student audience.
5. THE SYSTEM SHALL NOT share student data for commercial purposes.

### Requirement 19: Validation service and mastery signal

**User Story:** As the platform, I want a validation service that scores a
student's task submission against a rubric, so that routing has a trustworthy
mastery signal.

#### Acceptance Criteria

1. WHEN a student submits work on a task THE SYSTEM SHALL score the submission
   against the task's rubric and produce a mastery signal for the relevant
   objective.
2. THE SYSTEM SHALL measure the validation service's agreement with human raters
   on a benchmark set, and THE SYSTEM SHALL meet a defined agreement threshold as
   a launch gate.
3. WHEN a mastery signal is produced THE SYSTEM SHALL record it as the evidence
   used for routing.
4. IF validation cannot produce a reliable mastery signal THEN THE SYSTEM SHALL
   trigger the non-adaptive fallback path.

### Requirement 20: Non-adaptive fallback path

**User Story:** As a student, I want a working lesson even when adaptivity fails,
so that a failure never leaves me on a broken path.

#### Acceptance Criteria

1. IF validation, routing, content generation, or content filtering fails THEN
   THE SYSTEM SHALL fall back to a working non-adaptive path for the current
   objective rather than a broken state.
2. WHEN the fallback path is active THE SYSTEM SHALL deliver pre-authored,
   human-approved content for the objective.
3. WHEN a failure triggers the fallback THE SYSTEM SHALL record the failure so it
   can be audited later.

### Requirement 21: Human-authored content and approved-trajectory routing

**User Story:** As the curriculum team, I want routing to draw only from
human-authored and human-approved content, so that students only ever receive
safe, high-quality material.

#### Acceptance Criteria

1. THE SYSTEM SHALL route students only among human-authored, human-approved
   learning trajectories.
2. WHEN the routing service selects the next skill THE SYSTEM SHALL deliver
   pre-authored, pre-approved content for that skill.
3. IF content is generated on the fly (exploratory) THEN THE SYSTEM SHALL keep
   the objective fixed, stay within approved concept and skill boundaries, and
   pass the generated content through safety filtering and a curriculum-quality
   check before it reaches the student.
4. IF generated content fails the quality check or safety filtering THEN THE
   SYSTEM SHALL fall back to approved pre-authored content for that objective.

## Non-Functional Requirements

These requirements are organized around the six pillars of the AWS
Well-Architected Framework: Operational Excellence, Security, Reliability,
Performance Efficiency, Cost Optimization, and Sustainability.

### Requirement 12: Operational Excellence

**User Story:** As an operator, I want the platform to be observable and safe to
change, so that we can run it during a live classroom session and improve it
without disruption.

#### Acceptance Criteria

1. THE SYSTEM SHALL emit structured logs, metrics, and traces for API requests
   and for each agent interaction (active hints, passive interventions, codegen
   calls, escalations).
2. WHEN an agent intervention or escalation occurs THE SYSTEM SHALL record it
   with enough context (student, topic, trigger, severity) to audit and debug
   later.
3. THE SYSTEM SHALL be deployable through an automated, repeatable pipeline that
   supports rollback of a failed release.
4. WHEN a classroom session is in progress THE SYSTEM SHALL surface operational
   health (error rate, agent/model latency) so operators can react.

### Requirement 13: Security

**User Story:** As a student, teacher, and administrator, I want student data and
access to be protected, so that minors' information and classroom work stay safe.

#### Acceptance Criteria

1. THE SYSTEM SHALL enforce role-based access control so a student cannot access
   another student's data and only teachers can access the teacher view.
2. THE SYSTEM SHALL encrypt data in transit (TLS) and at rest.
3. WHEN an access token is issued THE SYSTEM SHALL scope and expire it, and THE
   SYSTEM SHALL reject expired or invalid tokens on protected endpoints.
4. THE SYSTEM SHALL store credentials using a salted one-way hash and never log
   secrets, tokens, or passwords.
5. THE SYSTEM SHALL validate and sanitize student-submitted prompts and code,
   and execute student code in an isolated sandbox with no access to platform
   secrets or other students' data.
6. THE SYSTEM SHALL handle student (minor) personal data in line with applicable
   privacy requirements, collecting only what is needed.

### Requirement 14: Reliability

**User Story:** As a teacher running a lesson, I want the platform to stay
available and not lose student progress, so that a class is not derailed by a
failure.

#### Acceptance Criteria

1. THE SYSTEM SHALL persist student progress durably so that a client crash or
   reload does not lose completed work.
2. IF a model or agent call fails or times out THEN THE SYSTEM SHALL degrade
   gracefully (e.g. retry, fall back, or queue) without breaking the student's
   session.
3. WHEN a dependency is temporarily unavailable THE SYSTEM SHALL present a clear
   state to the user rather than failing silently.
4. THE SYSTEM SHALL recover student session state after a transient outage so the
   student can resume where they left off.

### Requirement 15: Performance Efficiency

**User Story:** As a student, I want fast feedback while I build, so that hints
and previews feel responsive during the lesson.

#### Acceptance Criteria

1. WHEN a student runs code THE SYSTEM SHALL return error detection and an inline
   hint within a target interactive latency (e.g. a few seconds).
2. WHEN a student edits code THE SYSTEM SHALL update the live preview promptly
   enough to preserve the code-to-UI connection.
3. THE SYSTEM SHALL route work to an appropriately sized model for the task
   (e.g. a faster/cheaper model for lightweight checks, a stronger model for
   complex code reasoning).
4. THE SYSTEM SHALL support the expected concurrent classroom load without
   material degradation of interactive latency.

### Requirement 16: Cost Optimization

**User Story:** As a program owner, I want model and infrastructure spend kept
efficient, so that the platform is affordable to run for classrooms.

#### Acceptance Criteria

1. THE SYSTEM SHALL select the lowest-cost model that meets the quality bar for
   each task (e.g. prompt verification vs. code generation).
2. THE SYSTEM SHALL attribute and track model/token and infrastructure usage so
   cost can be monitored per lesson or per student cohort.
3. THE SYSTEM SHALL avoid redundant model calls (e.g. cache or reuse results)
   where it does not reduce learning quality.
4. THE SYSTEM SHALL scale compute with demand so idle classroom capacity does not
   incur unnecessary cost.

### Requirement 17: Sustainability

**User Story:** As a responsible team, I want the platform to minimize wasted
compute, so that its environmental footprint is kept low.

#### Acceptance Criteria

1. THE SYSTEM SHALL prefer the smallest model and compute footprint that meets a
   task's quality bar.
2. THE SYSTEM SHALL scale resources down during idle periods (e.g. outside class
   hours) rather than running continuously.
3. THE SYSTEM SHALL avoid unnecessary recomputation by reusing cached assessments
   and generated content where valid.

## Open Questions

- Which model powers each role — prompt-verification agent vs. code-generation
  agent (Claude Sonnet vs. Claude Haiku)?
- Which specific CS teacher standards framework is used for grading (e.g. CSTA),
  and at what grade band?
- How is the Hour of AI adaptive pathway JSON mapped onto the internal skill
  tree and data model?
- What are the exact thresholds for raising/lowering a topic skill score, and the
  default answer-timeout duration?
- What is the human-agreement threshold the validation service must meet as a
  launch gate (Req 19)?
- Which adaptivity approach should be built: pre-written pathways, AI-selects-
  next-step, or AI-generates-within-constraints — or the hint/coaching middle
  ground that keeps one authored path but personalizes coaching along it?
- Should the formative diagnostic in Requirement 3 be required or optional for
  the MVP, and how light can it be while still placing students accurately?
- How many tasks/skills should the MVP skill tree contain, and which sample
  lesson is the best MVP candidate?
- NOTE (scope): the teacher view (Requirements 9-10) exceeds the vision's MVP,
  which defers teacher dashboards and class-wide views. Keep intentionally or
  defer?

## Sequence Diagrams

Interaction and intervention flows for these requirements are maintained as a
companion document: [`sequence-diagrams.md`](./sequence-diagrams.md). It covers
login/role routing, the student build loop, prompt coaching and delegated code
generation, run/error/skill-aware hints, skill scoring and remediation, the
passive agent's adaptive-pacing and checkpoint interventions, the scaffolded
help ladder, teacher escalation, teacher review and controls, and
human-in-the-loop routing. Each diagram maps back to the requirements above.

## Source

Derived from the team planning doc "AWS CodeAI Hackathon Planning Doc" and
aligned with the recipients' "Vision Document: CodeAI Adaptive Learning Engine"
(Hackathon MVP draft from the CodeAI AWS Imagine Grant, Round 2).
