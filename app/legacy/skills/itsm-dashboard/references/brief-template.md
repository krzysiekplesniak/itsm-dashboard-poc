# Brief template (quality bar = the project BRIEF.md, 22.09.2026)

The conversation must produce a brief with these sections. The engine generates BRIEF.md from recorded decisions, approved mapping, rules and the dashboard spec (`get_brief`). Record decisions under these section keys:

| Section | Key for `record_decision` | Content |
|---|---|---|
| 1. Objective & audience | `cel` | who, why, how often, decision supported |
| 2. Technical constraints | `techniczne` | single offline HTML, CSV input, two files joined on Incident ID, anonymisation |
| 3. Visual design | `wyglad` | panels, cards, charts, highlights (from the spec) |
| 4. Business-time calendar | (from rules) | Mon–Fri 08–18, LU holidays, pending excluded |
| 5. KPI definitions | `kpi` | formulas, targets, thresholds (from rules) |
| 6. Period logic | `okresy` | default last complete month, month picker, 12-month trends, month assignment |
| 7. At-risk incidents | (from rules) | open P3/P4, Breached / At risk ≥ 75 % |
| 8. Data validation & transparency | (automatic) | load summary, low volume < 10, "how calculated", verification |
| 9. Field mapping | (from approved mapping) | concept → column |
| 10. Open questions | `pytania` | everything not yet confirmed |

Acceptance criteria to keep in mind (brief §10): works offline; all cards and trends populate; business-time verified on examples (weekend, 23 June, 17:50 → 08:15 = 25 min, Easter-based holidays 2025–2027); target lines on all charts, values below target highlighted; explicit notices for missing data, never fabricated values; list missing fields and wait for confirmation before building.
