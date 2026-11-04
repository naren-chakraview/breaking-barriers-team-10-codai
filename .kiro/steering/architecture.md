---
inclusion: auto
name: architecture
description: System architecture, component designs, MVP/deferred scope and ADRs for CodeAI. Use when designing, changing or building any backend, agent, safety, routing, database, observability, IaC or CI/CD component, or when making an architectural decision.
---

# Architecture document (pointer)

The architecture lives in `docs/architecture/architecture.md`. It is a living document. Read the
section for the component you are touching before you change it.

- Sections: 1 System overview, 2 Component designs, 3 MVP and deferred items, 4 ADRs.
- When your change alters a component's behavior, interface, data or failure handling, update its
  section in section 2 in the same PR (C-36).
- When your change moves work between MVP, stretch and full, update the table in section 3.
- When you make or reverse a significant decision, add a new ADR in section 4. Do not edit an accepted
  ADR. Add a new one that supersedes it and update the old one's status.
- Add a row to the change log at the bottom of the document.
- Status and ownership live in `docs/architecture/implementation-plan.md`, a living checklist. Tick a
  box only for work you have verified, in the same PR that does the work, and update the progress
  counts.
- Mark a design `Built` only once the code is merged and the demo path works.
- If the architecture document and `docs/constraints/implementation-constraints.md` disagree, the
  constraints win until the team edits one of them out loud.
