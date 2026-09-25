---
name: itsm-brief
description: >
  Produces BRIEF.md for an ITSM dashboard from the conversation and the workspace: objective and audience, technical
  constraints, visual design, KPI definitions, period logic, data sources and rules, validation, assumptions, open
  questions, learned rules. Use when the user asks for a brief, specification, documentation for the team, "napisz
  brief", "what did we decide", or at the export step.
metadata:
  version: "0.3.0"
---

# Brief

The brief replaces a hand-written specification: the owner never has to write one. Quality bar: the PoC brief
(sections 1–10 below). Generate it with `itsm_brief` (or `node scripts/itsm.mjs brief`); it reads `spec.json`,
`decisions.json` / `ORG_PROFILE.md`, `kpi_results.json` and `verify.md`.

| Section | Filled from |
|---|---|
| 1. Objective & audience | spec.audience + decisions (purpose) |
| 2. Technical constraints | fixed (offline HTML, computed by code, anonymised CSV) + decisions (privacy) |
| 3. Visual design | spec.panels + decisions (presentation) |
| 4. KPI definitions | spec.kpis (`how`, target) + decisions (kpi) |
| 5. Period logic | defaultMonth, trendMonths, lowVolume, months covered |
| 6. Data sources and rules | spec.sources (file, month column, filters, breakdown) + decisions (data) |
| 7. Validation & transparency | verify.md result + decisions (trust) |
| 8. Assumptions to confirm | spec.assumptions |
| 9. Open questions | decisions (open-questions) |
| 10. Learned rules | decisions (learned) |

Before generating: make sure every decision from the conversation was recorded (`itsm_record_decision`), and that
verification ran on the final build. After generating: tell the user which assumptions are still open (section 8)
— those are the questions for the next meeting with the owner.
