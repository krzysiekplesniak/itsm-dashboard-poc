# BMC Helix ITSM — fields in exports and their traps

Incidents live in form `HPD:Help Desk`; SLA results in SLM (`SLM:Measurement`); surveys in the survey module.
Column names depend on the report definition (Smart Reporting / AR report), so map by meaning, not by name.

| Concept | Typical column names | Values / format | Traps |
|---|---|---|---|
| incident_id | Incident ID, Incident Number | `INC000000123456` | several rows per incident when SLAs or audit rows are joined |
| submit_date | Submit Date, Reported Date | `DD/MM/YYYY HH:mm` or ISO | locale; export timezone (UTC vs local) |
| resolved_date | Last Resolved Date, Resolved Date | date | "Last" = after a reopen; empty for open tickets |
| closed_date | Closed Date | date | not for KPIs |
| priority | Priority | Critical/High/Medium/Low or 1-Critical… | Medium = P3, Low = P4 |
| status | Status | New, Assigned, In Progress, Pending, Resolved, Closed, Cancelled | exclude Cancelled/Rejected |
| initial_group | Initial / First Assigned Group | group | often missing in default exports — needed to compute FCR from raw data |
| assigned_group | Assigned Group | group | final owner |
| transfer_count | Group Transfers, Reassignment Count | integer | or derive from audit trail |
| pending_time | Total Pending Duration | minutes | business vs calendar minutes? |
| sla_name | SLA Name, SLM Title, Service Target | "Service Desk - P3 Resolution Time" | response and resolution SLAs mixed; other teams' SLAs present |
| sla_status | SLA Status, SLM Status, "SLA met?" | Met / Missed / In Process, Yes / No | In Process = still running → exclude |
| survey | Survey ID, Incident ID, Sent Date, Response Date, Rating/Score | 1–5 or 2–10 | unanswered surveys needed for response rate |

Personal data that may appear (removed by `itsm-anonymize`): customer/requester name, e-mail, phone, login,
assignee, summary/description/work notes, host names, "Last Modified By".

Pre-computed exports (one file per KPI with a Met/Missed or Yes/No column) are the simplest input: the KPI is the
monthly share of Met, and the only rules are the scope filter (e.g. SLA name starts with "Service Desk"), the date
column for the month and the score conversion.
