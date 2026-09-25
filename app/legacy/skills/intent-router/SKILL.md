---
name: intent-router
description: Recognises what a Service Desk manager is asking for and routes it to the right tool, module or template; includes a dictionary of 15 typical manager questions with the expected answer path. Use on every free-text request after the dashboard exists.
---

# Intent router: what the manager wants and how to answer

First classify the request into one intent, then follow its path. Numbers always come from tools. If an
intent needs data that does not exist, say so and suggest the closest available answer.

| Intent | Typical wording | Path |
|---|---|---|
| **status** | “how are we doing”, “are we on target” | `kpi_summary` → 3–5 headline numbers vs target + the attention strip |
| **why** | “why is X low/high”, “what happened in March” | `drill_down` (metric, month) → reasons, top contributors, one example ticket |
| **compare** | “vs last month”, “trend”, “best month” | `kpi_summary` for both months → change in pp; point to the trend chart |
| **where** | “which group/category”, “worst team” | `drill_down` with `by` group / category / service / source |
| **operational** | “what is breaching”, “backlog”, “this week” | `choose_template weekly` or point to the at-risk / backlog modules |
| **warnings** | “what needs my attention”, “red flags” | `choose_template warnings` + explain the attention items |
| **layout** | “move”, “hide”, “highlight”, “bigger”, “colour” | `update_dashboard` → `render_dashboard` |
| **version** | “save this”, “keep this for management” | `save_version` |
| **definition** | “what is FCR”, “how is SLA calculated” | glossary / kpi-cards; mention the ⓘ tooltip and the Verification tab |
| **trust** | “are these numbers right”, “same as the Excel report?” | `verify_numbers` → match table + sample tickets; list possible differences (snapshot, timezone, exclusions) |
| **export** | “send”, “download”, “brief” | `render_dashboard` + `get_brief` |
| **out of scope** | “connect to the ITSM system live”, “e-mail it every Monday” | say it is not part of this PoC and record it as a next-step idea (`record_decision` pytania) |

## Dictionary: 15 typical manager questions
1. *“Give me the IT support monthly.”* → status (monthly template), headline numbers.
2. *“Give me current IT weekly.”* → operational: `choose_template weekly`; last 8 weeks, breaches, backlog.
3. *“Support: identify warnings.”* → warnings: `choose_template warnings`; list critical/warning items with the reason.
4. *“Why did FCR drop this month?”* → why: `drill_down fcr` → transfers vs slow, top categories, change in pp.
5. *“Which team breaches P3 most?”* → where: `drill_down sla_p3 by group`.
6. *“Are we meeting the SLA for P4?”* → status: `kpi_summary`, P4 % vs 90 %.
7. *“How does August compare to July?”* → compare: two `kpi_summary` calls, differences in pp.
8. *“What is our worst category for first-call resolution?”* → where: `drill_down fcr by category`.
9. *“How many incidents are breaching right now?”* → operational: the at-risk module, counts from `kpi_summary`.
10. *“Is customer satisfaction going down?”* → compare: the CSAT trend + `drill_down csat` distribution.
11. *“How is FCR calculated?”* → definition: 30 business minutes, no transfer, initial group Service Desk.
12. *“Are these the same numbers as the monthly Excel report?”* → trust: `verify_numbers` + known reasons for differences.
13. *“Show me only what I need for the management meeting.”* → layout + version: monthly template, hide extras, `save_version` “Management”.
14. *“Which channel brings most incidents?”* → where: the volume module / `drill_down` by source.
15. *“Can this update itself every month?”* → out of scope for the PoC: explain the monthly routine (upload the export → approve → done) and record the idea.
