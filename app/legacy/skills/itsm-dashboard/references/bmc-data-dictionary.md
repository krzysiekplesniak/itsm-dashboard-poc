# BMC Helix ITSM export — data dictionary and traps

Source form for incidents: `HPD:Help Desk` (BMC Helix ITSM). Column names in CSV exports vary with the report definition; the engine proposes a mapping and the user approves it.

| Concept | Typical column names | Values / format | Traps |
|---|---|---|---|
| incident_id | Incident ID, Incident Number | `INC000000123456` | duplicates if the export joins audit rows |
| submit_date | Submit Date, Reported Date | `DD/MM/YYYY HH:mm` or ISO | locale switches; timezone of export unknown (UTC?) |
| resolved_date | Last Resolved Date, Resolved Date | date | "Last" = after a reopen; empty for open tickets |
| closed_date | Closed Date | date | not used for KPIs |
| priority | Priority | Critical/High/Medium/Low (or 1-Critical…) | map to P1–P4; "Medium" = P3, "Low" = P4 |
| status | Status | New, Assigned, In Progress, Pending, Resolved, Closed, Cancelled | Cancelled/Rejected are excluded |
| initial_group | Initial Assigned Group, First Assigned Group | group name | often NOT in default exports — needed for FCR |
| assigned_group | Assigned Group | group name | final owner, not necessarily the resolver |
| transfer_count | Group Transfers, Reassignment Count | integer | alternative: group audit trail |
| pending_minutes | Total Pending Duration | minutes | unit (business vs calendar) to confirm |
| sla_status | SLM Status | Met / Missed / In Process | BMC's own calculation; use for cross-check |
| surveys | Survey ID, Incident ID, Sent Date, Response Date, Rating | rating 2–10 (Vendor) or 1–5 | unanswered surveys must be in the file |

Personal data that may appear and is removed by anonymisation: Customer/Requester name, e-mail, phone, login, assignee, summary/description/work notes, hostnames.
