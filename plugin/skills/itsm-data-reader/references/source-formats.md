# Source formats and how to turn them into KPIs

## A. Pre-computed result files (simplest, preferred for a PoC)
One row per measured record with the tool's own verdict.
| Signal in profile | Meaning | KPI spec |
|---|---|---|
| flag column with Met/Missed or Yes/No | the record kept / broke the promise | `type: rate`, `positive: ["Met"]` (or Yes), `negative: ["Missed"]` to exclude "In Process" |
| SLA name column with prefixes "Team - Pn …" | several teams' SLAs in one file | source filter `startsWith` the team in scope; per-priority KPIs with `where contains "P3"` or on the Priority column |
| score column 1–10 | survey answer | `type: mean`, `divide: 2` when reported out of 5 |
| duplicate Incident IDs | one incident, several SLA rows | expected; never dedupe unless the user says so |

## B. Raw incident export (timestamps)
Needs business-hours calendar, holidays, pending subtraction, initial group and transfers to compute SLA/FCR.
The v1 template does not compute durations. Options: (1) ask for the pre-computed SLM export; (2) use the raw-data
engine from the chat/agent track (wave 2); (3) compute only volume/backlog KPIs (`type: count`).

## C. Survey export
Sent + responded dates and a score. CSAT average by response month; response rate needs unanswered rows.

## Month assignment rules (default)
SLA and FCR → resolved date. CSAT → survey/response date. Volume created → submit date. State the choice.

## Date formats
ISO (`2026-08-03 10:22`), European (`03/08/2026 10:22`), US (`8/3/2026 10:22 AM`). The scripts detect the order from
values > 12; if ambiguous they assume DD/MM and report it — confirm with the user.
