---
name: itsm-intent-router
description: >
  Recognises what a Service Desk manager asks about an existing ITSM dashboard and routes it to the right answer
  path (status, why, compare, where, operational, warnings, layout, version, definition, trust, export, out of scope),
  with a dictionary of 15 typical manager questions. Use on every free-text question once a dashboard exists:
  "how are we doing", "why is FCR low", "which team breaches P3", "same as the Excel report?", "jak nam idzie".
metadata:
  version: "0.3.0"
---

# Intent router

Classify the request into one intent, then follow its path. Numbers always come from the engine
(`itsm_kpis`, `itsm_findings`, `itsm_records`, `itsm_verify` — or the CLI equivalents). If an intent needs data
that does not exist, say so and offer the closest available answer.

| Intent | Typical wording | Path |
|---|---|---|
| **status** | "how are we doing", "are we on target", "jak nam idzie" | `itsm_kpis` → 3–5 headline numbers vs target + the worst finding |
| **why** | "why is X low", "what happened in March" | `itsm_records` (kpi, month) → misses, breakdown, sample IDs; one hypothesis, one next step |
| **compare** | "vs last month", "trend", "best month", "rok do roku" | `itsm_kpis` for both months or `itsm_findings` (m/m, YoY, streaks) |
| **where** | "which group", "worst team", "która grupa" | `itsm_records` with `by` = group / priority / category |
| **filtered view** | "only VIP", "tylko P3" | `itsm_kpis` with `filters`; point to the filter chips on the page |
| **warnings** | "what needs my attention", "red flags" | `itsm_findings` → critical and warning items only |
| **layout** | "move", "hide", "rename", "colour", "title" | `itsm_patch_spec` → `itsm_build` → `itsm_verify` |
| **target / rule** | "target 80", "only Service Desk SLAs", "exclude In Process" | `itsm_patch_spec` + `itsm_record_decision` (kpi) → rebuild |
| **version** | "save this for management" | `itsm_save_version` |
| **definition** | "what is FCR", "how is SLA calculated" | `itsm-domain` + the KPI `how` text (the ⓘ on each card) |
| **trust** | "are these numbers right", "same as the Excel report?" | `itsm_verify` (with `reference` rows if the user has the report) + known reasons for differences |
| **export** | "send", "download", "brief" | `itsm_brief`; point to Download HTML / BRIEF.md / verify.md |
| **out of scope** | "connect live to BMC", "e-mail it every Monday" | not in this version: say so, `itsm_record_decision` (open-questions) |

## 15 typical manager questions → path
1. "Give me the IT support monthly." → status.
2. "Give me current IT weekly." → weekly view is not in this version: give the latest month + findings; record the wish.
3. "Support: identify warnings." → warnings.
4. "Why did FCR drop this month?" → why (fcr).
5. "Which team breaches P3 most?" → where (sla_p3 by group).
6. "Are we meeting the SLA for P4?" → status (sla_p4 vs target).
7. "How does August compare to July?" → compare.
8. "Which group has the worst first-call resolution?" → where (fcr by group).
9. "How many SLA breaches this month?" → `itsm_records` sla_p3p4 → misses.
10. "Is customer satisfaction going down?" → compare (csat, 3-month streak, YoY).
11. "How is FCR calculated?" → definition.
12. "Are these the same numbers as the monthly Excel report?" → trust.
13. "Show me only what I need for the management meeting." → layout + version.
14. "What about the VIP desk only?" → filtered view.
15. "Can this update itself every month?" → out of scope for the PoC; explain the monthly routine (drop the new exports → build → verify) and record the idea.
