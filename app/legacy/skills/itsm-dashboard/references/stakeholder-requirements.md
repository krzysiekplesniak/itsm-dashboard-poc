# Stakeholder requirements — typical asks of a Service Desk business owner

Generic checklist for the wizard. Organisation-specific requirements are kept outside this public repository.

## Typical explicit requirements
| # | Requirement |
|---|---|
| R1 | A small set of Service Desk KPIs (FCR, P3/P4 resolution SLA, customer satisfaction) in a layout close to an existing reference dashboard |
| R2 | Data comes from an ITSM export (CSV), not from a live connection |
| R3 | Dashboards should be quick to produce and extensible to other areas |
| R4 | No admin rights on the ITSM platform are needed; the result is a ready component |
| R5 | Something presentable for an internal showcase |
| R6 | Lightweight, local, not production-grade |
| R7 | Data is anonymised before any analysis |
| R8 | A repeatable workflow the team can reuse next month |

## Typical underlying needs (confirm gently, never assume in numbers)
| # | Need | How the wizard serves it |
|---|---|---|
| U1 | Numbers management can trust | verification tab, "how is this calculated", sample tickets |
| U2 | Minimal effort for the team | defaults for everything; one question at a time; brief generated from the conversation |
| U3 | Independence from the platform team's queue | runs locally from an export |
| U4 | Low formal risk (security, governance) | anonymisation, offline HTML, no integration |
| U5 | Monthly use replacing a manual Excel report | month picker, mapping survives format changes |

## Questions the wizard should settle (ask only when relevant, one at a time)
1. Who looks at the dashboard and how often? Is it replacing a monthly Excel/PowerPoint report? *(step 1)*
2. Is this the real anonymised extract or mock data? What is the export timezone? *(step 2)*
3. Which group name(s) are the Service Desk (exact names, sub-groups)? *(step 3)*
4. Is pending time in business or calendar minutes? Is there a status history? *(step 3)*
5. Are cancelled/rejected incidents excluded? Are there existing exclusion rules? *(step 4)*
6. Confirm targets: FCR 70 %, SLA 90 %, CSAT ≥ 4.2; thresholds 30 min / 8 h / 16 h. *(step 4)*
7. CSAT cards monthly or "this year"? *(step 5)*
8. Overview only, or drill-down/filters needed? *(step 5)*
9. Is there an existing SLA report that can be used to verify the numbers? *(step 6)*

Record answers with `record_decision`; unanswered ones go to section "pytania" of the brief.
