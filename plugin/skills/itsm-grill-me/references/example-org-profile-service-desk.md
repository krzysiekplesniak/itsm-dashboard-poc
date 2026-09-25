# Example ORG_PROFILE — Service Desk KPI dashboard (PoC, anonymised)

What a completed interview looks like. Roles instead of names.

## Said explicitly by the business owner (Senior Service Manager, Service Desk)
| # | Requirement |
|---|---|
| R1 | KPIs: First Call Resolution, P3 and P4 resolution SLAs, customer satisfaction — look like the reference screenshot (three panels, three cards each, 12-month trend with a flat target line) |
| R2 | Data: exports from BMC Helix prepared by the team (three pre-computed CSV files: SLA P3/P4, Customer Satisfaction, FCR) |
| R3 | "Vision on creating dashboards… extensible to any other area", "reducing the time to market for dashboards" |
| R4 | No rights on the ITSM platform needed; the platform team reviews a ready component instead of receiving requirements |
| R5 | Show at the yearly innovation day (40-minute slot) |
| R6 | Lightweight: runs locally, one-off reports; no heavy process |
| R7 | Only anonymised data leaves the organisation |
| R8 | A repeatable workflow the team can reuse |
| R9 | SLA file: only SLAs whose name starts with "Service Desk"; % Met per month |
| R10 | CSAT: score ÷ 2 (1–10 → 1–5) |
| R11 | FCR file: column "SLA met?" per ticket; % per month |

## Unsaid (inferred — confirm gently, never assume in numbers)
| # | Likely need | How the kit serves it |
|---|---|---|
| U1 | A showcase for the innovation day | one prompt on stage, the kit underneath; verified numbers |
| U2 | Fast and cheap | quick mode, defaults, one question at a time |
| U3 | Independence from the platform team's queue | runs from exports, no platform rights |
| U4 | Numbers management can trust | independent re-count, comparison with the provider report |
| U5 | Minimal effort for the team | brief generated from the conversation |
| U6 | No formal risk (security, governance) | anonymisation gate, offline HTML |
| U7 | Monthly reuse without learning a method | ORG_PROFILE remembers the rules |
| U8 | Independent view of the managed-service SLA report | `reference` comparison in verification |

## Decisions still open
Targets (FCR 70 %, SLA 90 %, CSAT 4.2) · month column per file · values like "In Process" · provider report as reference.
