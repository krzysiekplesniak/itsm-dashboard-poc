# ITSM Dashboard Kit — knowledge pack

All instructions of the kit in one file, for chats without skill support. Scripts cannot run in such chats: produce spec.json and let the dashboard template compute the numbers.



---

<!-- skill: itsm-dashboard -->
# ITSM Dashboard — orchestrator

Turn a request plus data files into a dashboard the manager **trusts**: right numbers, clear story, clickable detail.
One prompt from the user must be enough; every step below runs with sensible defaults and only stops at the
gates marked **GATE**.

## Golden rules

1. **Never type a KPI number yourself.** Every value on the page and in the chat comes from
   `build_dashboard.py` / `kpi_results.json` / `verify.md`. If a number is not in those files, say "not computed".
2. **Personal data first.** Run the anonymisation check before reading any values (skill `itsm-anonymize`).
3. **Meaning before drawing.** Understand what each column means for ITSM (skills `itsm-domain`,
   `itsm-data-reader`) before choosing KPIs.
4. **Say no to the sixth widget.** 3–5 KPIs, each answering a named business question (skill `itsm-kpi-analyzer`).
5. **Verified or not shown.** Present the dashboard only after `verify_kpis.py` reports all checks matching.
6. **State assumptions.** Anything not confirmed by the user goes to the spec's `assumptions` and is shown in the page.

## Workspace

Write every artifact to `itsm-workspace/` in the current folder (create it). Files:
`ORG_PROFILE.md` (answers from the interview, reused next time) · `pii_report.md` · `profile.md` ·
`KPI_SPEC.md` (Lab 2 method) · `DESIGN.md` (from a screenshot, optional) · `spec.json` · `dashboard.html` ·
`kpi_results.json` · `verify.md` · `LEARNINGS.md`.
If `itsm-workspace/ORG_PROFILE.md` exists, read it first and apply it — it holds this organisation's decisions.

## Flow

| Step | Do | Skill | Output |
|---|---|---|---|
| 0 | Read `ORG_PROFILE.md` if present. Decide the mode: **quick** (one-prompt demo: no questions, defaults + assumptions) or **guided** (user wants to shape it, or no profile and a real audience) | — | mode |
| 1 | Anonymisation scan of every CSV; anonymised copies go to `itsm-workspace/data/` | `itsm-anonymize` | `pii_report.md` — **GATE** if columns are on hold |
| 2 | Profile the files: roles, ITSM meaning, months, flags, scores, SLA name prefixes | `itsm-data-reader` | `profile.md` |
| 3 | Interview only what the data cannot answer (audience, decision, targets, scope rules). Quick mode: max 3 questions or none | `itsm-grill-me` | `ORG_PROFILE.md` |
| 4 | Business questions → KPIs → query → widget → filter → validation | `itsm-kpi-analyzer` | `KPI_SPEC.md` — **GATE** in guided mode |
| 5 | Look: screenshot → tokens and layout; otherwise default tokens | `itsm-design-reference`, `itsm-dashboard-design` | `DESIGN.md` (optional) |
| 6 | Write `spec.json` and build | `itsm-html-builder` | `dashboard.html`, `kpi_results.json` |
| 7 | Independent re-count; optional comparison with an official report | `itsm-verify` | `verify.md` — **GATE**: all ✓ |
| 8 | Write 3–5 analyst insights from `kpi_results.json` into `spec.json` → rebuild | `itsm-insights` | final `dashboard.html` |
| 9 | Present: 2–3 sentences + headline numbers (from results) + link to the file; offer changes | — | — |
| 10 | After feedback: record what was learned | `itsm-learn` | `ORG_PROFILE.md`, `LEARNINGS.md` |
| 11 | On request: BRIEF.md for the team | `itsm-brief` | `BRIEF.md` |

Free-text questions after the dashboard exists: route them with `itsm-intent-router`.

## How to execute each step (same engine everywhere)

Use the first option available in your environment:

| Step | Tool (web app on GitHub Copilot, or this plugin's MCP server `itsm-engine`) | Node CLI (no dependencies) | Python |
|---|---|---|---|
| resume | `itsm_status`, `itsm_org_profile` | `node ${CLAUDE_PLUGIN_ROOT}/scripts/itsm.mjs status` | — |
| privacy | `itsm_scan`, `itsm_decide_privacy` | `… itsm.mjs add <csv…>` then `… itsm.mjs scan` | `itsm-anonymize/scripts/pii_scan.py` |
| understand | `itsm_profile` | `… itsm.mjs profile` | `itsm-data-reader/scripts/profile_csv.py` |
| KPIs | `itsm_propose_spec`, `itsm_patch_spec`, `itsm_set_spec` | `… itsm.mjs propose` (edit spec.json) | write spec.json by hand |
| build | `itsm_build`, `itsm_kpis` | `… itsm.mjs build` / `kpis` | `itsm-html-builder/scripts/build_dashboard.py` |
| verify | `itsm_verify` (+ `reference`) | `… itsm.mjs verify [--reference ref.csv]` | `itsm-verify/scripts/verify_kpis.py` |
| insights | `itsm_findings`, `itsm_records` | `… itsm.mjs findings` / `records --kpi fcr` | — |
| remember | `itsm_record_decision`, `itsm_brief`, `itsm_save_version` | `… itsm.mjs brief` | — |

All paths write to `itsm-workspace/`. `node … itsm.mjs all <csv…>` runs the whole quick mode in one command.
If the plugin root variable is not set (GitHub Copilot, VS Code), locate files relative to this SKILL.md (`../../scripts/itsm.mjs`).
Engine and template are shared with the web app, so a dashboard built here and one built in the app are identical.

## Quick mode (the one-prompt demo)

Target: dashboard on screen in under 5 minutes without questions.
1. Scan + profile (steps 1–2) silently; stop only if personal data is on hold.
2. Choose KPIs from the profile with the defaults in `itsm-kpi-analyzer` (flag column → rate KPI, score → mean KPI,
   SLA name prefix filter from `ORG_PROFILE.md` or the most frequent prefix + assumption).
3. Build, verify, write insights, present. List every assumption in one short block at the end of the answer.

## When code cannot be executed (e.g. a chat without tools)

Produce `spec.json` only, following `itsm-html-builder/references/spec-schema.md`, and tell the user to open
`itsm-html-builder/templates/dashboard.html` with the spec pasted in (or use the prompt pack) and drop the CSV
files onto the page: the page computes every number itself. Never compute KPI values in the answer text.

## Changes after the first version

Map requests to spec edits and rebuild: "hide/move/rename a card" → `panels`; "target 80 %" → `kpis[].target`;
"only Service Desk SLAs" → `sources.*.filters`; "add P2" → new KPI with a `where` filter; "weekly" → not supported
by the template yet: say so and record it in `LEARNINGS.md`. Re-run verify after every rebuild.

## Answering questions about the dashboard

Use `kpi_results.json` and the details table: "why is X low" → the insight for X + breakdown by group (the page's
"Show records"); "is this the same as the Excel report" → `verify.md` with `--reference`. Definitions come from
`itsm-domain`.


---

<!-- skill: itsm-domain -->
# ITSM domain knowledge

Give the model the context a Service Desk manager takes for granted. Use it to interpret data, to explain terms
in plain language (EN or PL, matching the user), and to avoid classic misreadings.

## Core model in one paragraph

A user reports a problem (incident) or asks for something standard (service request) through a channel
(phone, e-mail, portal, chat). The **Service Desk** (first line) records it in the ITSM tool (here **BMC Helix
ITSM**, form `HPD:Help Desk`), sets a **priority** (P1 Critical … P4 Low = impact × urgency) and either solves it
or **transfers** it to a second-line **assignment group**. The clock of each **SLA** (e.g. "P3 resolved within
8 business hours") runs in **business hours**, paused while the ticket is **Pending** (waiting for the user or a
supplier). When the fix is delivered the ticket is **Resolved**; days later it is **Closed**. A **survey** may be
sent after resolution (**CSAT**). Management reads monthly: *are we meeting the promises (SLA %), how much does the
first line solve itself (FCR), are users happy (CSAT), where is work piling up (backlog)*.

## Reading ITSM numbers correctly (always check)

- **Which date assigns a record to a month?** Usually the resolved date for SLA/FCR, the response date for CSAT.
  Submitted-date months give different numbers.
- **Population:** a % is only meaningful with its denominator; show counts next to rates and flag < 10 records.
- **Pre-computed flags** (SLA Status Met/Missed, "SLA met?" Yes/No) are the tool's own calculation — report the
  share of Met; do not recompute from timestamps unless asked (business hours, holidays, pending make it hard).
- **Several SLA rows per incident are normal** (response + resolution, several teams): filter by SLA name before
  counting and never dedupe blindly by Incident ID.
- **Scale of survey scores:** 1–5, or 1–10 / 2–10 (Terrible 2 … Excellent 10). A 1–10 score is often reported as
  "average out of 5" = score ÷ 2.
- **High numbers can still hide problems:** 99 % SLA with 5 misses in one group is a story; say where misses sit.
- **Snapshot effect:** the current month and open tickets are true only "as of" the export time.

## Service Desk KPI families (what managers ask for)

| Family | KPIs | Question |
|---|---|---|
| Promise keeping | SLA % by priority (P1–P4), response vs resolution SLA, breaches, at-risk open tickets | Are we keeping our promises? |
| First-line effectiveness | FCR %, first-contact resolution, transfer rate, shift-left | How much do we solve without passing on? |
| Speed | MTTR / median time to resolve, time to first response | How fast are we? |
| Load | volume by channel / category / service, backlog, backlog age | How much work and where? |
| Quality | CSAT average, response rate, reopen rate, complaints | Are users satisfied, do fixes stick? |

Details, formulas and pitfalls: `references/kpi-families.md`. Terms: `references/glossary.md`.
BMC Helix fields and export traps: `references/bmc-helix.md`.

## Explaining to non-technical users

Lead with the plain meaning, then the formula, then the trap. Example: "FCR = how many tickets the Service Desk
solved itself, quickly, without passing them to another team. In your file it is the share of 'Yes' in *SLA met?*.
Watch out: tickets resolved in a later month count in that month."


<!-- itsm-domain/references/bmc-helix.md -->
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


<!-- itsm-domain/references/glossary.md -->
# Glossary — ITSM / Service Desk terms (EN / PL, plain language)

| Term (EN) | PL | Plain explanation | Matters for |
|---|---|---|---|
| **ITSM** (IT Service Management) | zarządzanie usługami IT | How IT delivers and supports services: tickets, SLAs, changes, knowledge. Tool here: **BMC Helix ITSM**. | everything |
| **Service Desk (SD)** | Service Desk / pierwsza linia | First line that receives calls, e-mails, chats, portal tickets. Often run with a managed-service partner. | FCR population |
| **Incident** | incydent | Something broken or degraded ("Outlook does not start"). | all KPIs |
| **Service request / Work order** | zgłoszenie usługowe | A standard request ("new laptop"), not a fault. Not in incident KPIs. | scope |
| **Problem** | problem | Root cause behind repeated incidents. | future packs |
| **Change** | zmiana | Planned modification of a service. | future packs |
| **Priority P1–P4** | priorytet | Impact × urgency. Exports often say Critical / High / Medium / Low = P1 / P2 / P3 / P4. P3/P4 are the daily bulk. | SLA |
| **SLA** (Service Level Agreement) | umowa o poziomie usług | A promise, e.g. "P3 resolved within 8 business hours". **SLA %** = share of records that kept it. | SLA KPIs |
| **SLT** (Service Level Target) | poziom docelowy | Required share, e.g. 90 % of P3 within SLA; FCR SLT 70 %. | targets |
| **OLA** | umowa wewnętrzna | Internal promise between teams. | second line |
| **SLM status / SLA Status** | status SLA | Tool-computed result per record: Met / Missed / In Process. | pre-computed KPIs |
| **Business hours** | godziny robocze | E.g. Mon–Fri 08:00–18:00 minus public holidays. Fri 17:50 → Mon 08:15 = 25 business minutes. | durations |
| **Pending** | oczekiwanie | Waiting for the user or a supplier; SLA clock usually paused. | SLA, FCR |
| **Resolved vs Closed** | rozwiązany / zamknięty | Resolved = fix delivered; Closed = confirmed later. KPIs use resolved. | month assignment |
| **Assigned group / Initial group** | grupa przypisana / początkowa | Team owning the ticket now / team that received it first. | FCR, breakdowns |
| **Transfer / reassignment** | przekazanie | Ticket moved to another group; any transfer breaks FCR. | FCR |
| **FCR** (First Call / Contact Resolution) | rozwiązanie przy pierwszym kontakcie | Share of tickets the Service Desk solved itself, without passing on, quickly (e.g. < 30 business min). | FCR panel |
| **MTTR** | średni czas rozwiązania | Mean (or median) time to resolve. | speed |
| **Backlog / backlog age** | zaległości / wiek zaległości | Open tickets / how long they have been open. | load |
| **Breached / At risk** | naruszone / zagrożone | Open ticket over its SLA / at ≥ 75 % of it. | at-risk list |
| **CSAT** | satysfakcja klienta | Survey after resolution. Scale 1–5 or 1–10 (2 Terrible … 10 Excellent); often reported "out of 5" = score ÷ 2. | CSAT panel |
| **Response rate** | wskaźnik odpowiedzi | Responded ÷ sent surveys (typically 10–20 %). | CSAT cards |
| **Reopen rate** | wskaźnik ponownych otwarć | Share of resolved tickets reopened — fixes that did not stick. | quality |
| **Shift-left** | przesunięcie w lewo | Moving resolution to earlier/cheaper levels (self-service, SD). | strategy |
| **Low volume** | mała próba | < 10 records behind a %: one ticket moves it a lot. | all cards |
| **Snapshot** | migawka | Export moment; current month and open tickets valid only as of then. | current month |
| **Managed-service report** | raport dostawcy | Official monthly SLA report from the outsourcing partner — the reference to verify against. | verification |


<!-- itsm-domain/references/kpi-families.md -->
# KPI families — formulas, inputs, pitfalls

Each KPI: formula · typical target · input (pre-computed or raw) · pitfalls. Targets are examples: confirm per
organisation (interview → ORG_PROFILE.md).

## Promise keeping
- **SLA % (per priority)** = Met ÷ (Met + Missed) × 100. Target 90–95 %. Input: SLA Status per record, filtered to
  the SLAs in scope (name prefix, priority). Pitfalls: "In Process" rows; response vs resolution SLAs mixed;
  one incident with several SLA rows.
- **Breaches (count)** = Missed records in the month. Shows the size behind a high %.
- **At-risk open tickets** = open tickets ≥ 75 % of their SLA time (raw data + business calendar needed).

## First-line effectiveness
- **FCR %** = records resolved at first contact ÷ records in the population. Target ~70 %. Pre-computed: share of
  "Yes"/"Met" in the FCR flag. Raw: initial group = Service Desk, no transfer, resolved < N business minutes.
- **Transfer rate** = transferred ÷ all. Mirror of FCR.

## Speed
- **MTTR / median resolution time** in business hours. Use the median for skewed data; show P90 for the tail.
- **Time to first response.**

## Load
- **Volume** (created / resolved per month; by channel, category, service).
- **Backlog** = open at month end; **backlog age** buckets (0–2 d, 3–7 d, 8–30 d, > 30 d).

## Quality
- **CSAT average** = mean score (converted to the reporting scale, e.g. ÷ 2). Target e.g. ≥ 4.2 / 5. Month by
  response date. Show the number of responses.
- **Response rate** = responded ÷ sent (needs unanswered surveys).
- **Reopen rate** = reopened ÷ resolved.

## Choosing KPIs for a manager
Start from the decision: monthly management review → SLA %, FCR %, CSAT with targets and 12-month trends;
daily operations → breaches, at-risk, backlog by group; improvement work → breakdowns by group/category and
"where misses concentrate". Max 5 KPIs per view.


<!-- itsm-domain/references/raw-export-rules.md -->
# Rules for RAW incident exports (timestamps instead of pre-computed flags)

Used when a file has submit/resolved timestamps, groups and transfers but no Met/Missed column. The kit v0.3 builds
pre-computed KPIs; the raw rules below are implemented in the agent's v0.2 engine (`app/legacy`) and move into the
shared engine in wave 2.

- **Business hours:** Mon–Fri 08:00–18:00, Luxembourg public holidays (incl. Easter Monday, Ascension, Whit Monday,
  23 June, 1 Nov, 25–26 Dec) from a calendar file. Fri 17:50 → Mon 08:15 = 25 business minutes.
- **Pending time** is subtracted (unit — business or calendar minutes — to confirm).
- **FCR:** population = resolved incidents whose initial group is the Service Desk; success = no transfer and
  resolved in < 30 business minutes. Target 70 %.
- **P3 SLA** = resolved P3 within 8 business hours; **P4** within 16; target 90 %. Open incidents excluded.
- **CSAT** 2–10 (Terrible 2 … Excellent 10) ÷ 2; month by response date; response rate needs unanswered surveys.
- **At risk:** open P3/P4 at ≥ 75 % of the SLA time; **Breached** above it.
- **Traps:** export timezone (UTC vs local) shifts the 30-minute rule; "initial group" often missing in default
  exports; cancelled/rejected excluded; duplicates when audit rows are joined.
- Verification oracle on the synthetic raw sample (Aug 2026): FCR 86.19 % (1,057 incidents), P3 99.71, P4 99.81, CSAT 4.88.


---

<!-- skill: itsm-data-reader -->
# ITSM data reader

The goal is not to parse CSV (the scripts do that) but to understand **what the data says about the service**
and which KPIs it can honestly support.

## Steps

1. Make sure `itsm-anonymize` has run; profile the anonymised copies in `itsm-workspace/data/` when they exist.
2. Run the profiler on all files together:
   `python ${CLAUDE_PLUGIN_ROOT}/skills/itsm-data-reader/scripts/profile_csv.py <files…> --out itsm-workspace/profile.md --json itsm-workspace/profile.json`
   > With tools available (web app, MCP `itsm-engine`) call the `itsm_*` tool instead; with Node use `node ${CLAUDE_PLUGIN_ROOT}/scripts/itsm.mjs …` (see the table in `itsm-dashboard`). Same engine, same results.

3. Read `profile.md` and identify the **source format** (see `references/source-formats.md`):
   - **pre-computed** — one file per KPI with a result flag (Met/Missed, Yes/No) or a score → KPI = monthly share / average;
   - **raw incident export** — timestamps, groups, transfers, pending → KPIs need business-hours logic (not in v1 of this kit: say so and propose the pre-computed route or the raw-data engine);
   - **survey export** — scores (+ sent/responded dates).
4. For every file write down, in `profile.md` under "Interpretation":
   - the **record** (one incident? one SLA measurement? one survey answer?);
   - the **month column** and why (resolved date for SLA/FCR, response date for CSAT);
   - the **result column** and its positive / negative / excluded values;
   - the **scope filter** (e.g. SLA name starts with "Service Desk"; priorities);
   - the **breakdown column** (assigned group, category, channel);
   - **quality notes**: duplicates (expected when one incident has several SLA rows), empty dates, low-volume months,
     ambiguous date order, partial current month.
5. List open points as questions for `itsm-grill-me` — only what the data cannot answer.

## Known organisation profiles

If the files match a profile in `references/`, apply its rules and say so. Current profile:
`references/profile-service-desk-3csv.md` (three pre-computed files: SLA P3/P4, Customer Satisfaction, FCR).

## Output to the user (short)

"3 files, 13 months (Aug 2025 – Aug 2026). SLA file: one row per SLA measurement, result in *SLA Status*
(Met/Missed), 11 % rows belong to other teams → filtered out by *SLA Name* starting with 'Service Desk'. …"
Then the KPI candidates. Never quote personal values.


<!-- itsm-data-reader/references/profile-service-desk-3csv.md -->
# Profile: Service Desk — three pre-computed exports (PoC, 24.09.2026)

Provided by the business owner (Senior Service Manager, Service Desk) as anonymised CSV files. Rules as stated
in his e-mail; column names below are expected, confirm them with the profiler.

| File | Record | Rule from the business owner | Spec |
|---|---|---|---|
| `Incident - SLA P3_P4.csv` | one SLA measurement of an incident | "consider only the SLAs whose name starts with **Service Desk**"; a column says **Met** or **Missed**; "% on a monthly basis" | source filter `SLA Name startsWith "Service Desk"`; KPIs P3, P4, P3 & P4 = share of Met |
| `Customer Satisfaction.csv` | one survey answer | "divide the score **by 2**" (scale 1–10 → 1–5) | `type: mean`, `divide: 2`, target 4.2 |
| `FCR.csv` | one ticket | column **"SLA met?"** per ticket; "% on a monthly basis" | `type: rate`, positive Yes |

Presentation reference: three panels side by side (FCR · P3 & P4 SLAs · Customer satisfaction), three cards each,
12-month trend with a flat target line (FCR 70 %, SLA 90 %, CSAT 4.2).
Open points: which date column assigns the month in each file; targets confirmed?; "In Process" values present?
Worked example with synthetic data: `examples/mock-3csv/` (spec.json + generator).


<!-- itsm-data-reader/references/source-formats.md -->
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


---

<!-- skill: itsm-anonymize -->
# Anonymisation gate

**Hard rule:** do not open, quote or analyse values of a file before this scan. Even "already anonymised" files
are scanned — the check is cheap and the owner may have missed a column.

## Steps
1. Run: `python ${CLAUDE_PLUGIN_ROOT}/skills/itsm-anonymize/scripts/pii_scan.py <files…> --out-dir itsm-workspace/data --report itsm-workspace/pii_report.md`
   > With tools available (web app, MCP `itsm-engine`) call the `itsm_*` tool instead; with Node use `node ${CLAUDE_PLUGIN_ROOT}/scripts/itsm.mjs …` (see the table in `itsm-dashboard`). Same engine, same results.

2. Read `pii_report.md`.
   - Nothing on hold → one line to the user: "Personal data check: removed X, hashed Y, nothing on hold." Continue
     with the copies in `itsm-workspace/data/`.
   - Columns **on hold** → **GATE**: show the table *file · column · why · masked examples*; recommend **drop** unless
     a KPI needs the column; ask keep / hash / drop per column; re-run with `--keep/--hash/--drop` accordingly.
3. Record decisions in `itsm-workspace/ORG_PROFILE.md` under "Data privacy decisions" so the next run applies them.

## Classes
| Class | When | Effect |
|---|---|---|
| drop | name suggests personal data or free text; ≥ 20 % e-mails/phones/IPs/IBANs; long free text | removed |
| hash | login, assignee, owner, agent, "modified by" | `anon_xxxxxxxx` (same person → same code) |
| review | many values look like person or host names, some contact data, unknown text | ON HOLD, dropped by default |
| keep | IDs, dates, priority, group, status, SLA, score, category, channel | kept |

## Never
- Show raw personal values, even when the user pastes them ("the value you pasted").
- Keep an on-hold column "to be helpful".
- Promise perfection: say uncertain columns are held for the user's decision.
- Put real client data into a public repository or share link.


---

<!-- skill: itsm-kpi-analyzer -->
# KPI analyzer (Lab 2 method)

A widget exists only if it answers a question someone actually asks. Work in this order and write the result to
`itsm-workspace/KPI_SPEC.md` using `references/kpi-spec-template.md`.

## 1. Persona and decision
From `ORG_PROFILE.md` or the request: who looks, when, for how long, what decision follows.
Default when unknown: "Service Desk manager, monthly management review, 2 minutes, decides where to act".

## 2. Business questions (3–5, never more)
Pick from `references/question-bank.md` what the data can answer (profile!) and the persona needs. Keep the user's
wording when given. A sixth question goes to "Out of scope — next dashboard".

## 3. KPI per question
For each: ID (K1…), one-sentence definition, unit, formula on the actual columns, target and direction,
month column, scope filter, population. Only fields that exist in `profile.md` — **never invent a column**.
Mark every rule as *confirmed* (user / ORG_PROFILE / e-mail) or *assumption*.

## 4. Query (descriptive, no SQL)
"Share of rows with SLA Status = Met among Met+Missed, SLA Name starts with 'Service Desk', grouped by month of
Resolved Date." This sentence becomes the `how` text shown in the dashboard.

## 5. Widget
Type (stat card, trend line/area with target line, table, bar by group), size token (`--size-sm` card,
`--size-md` breakdown, `--size-lg` trend/table), status colours by token name, **empty state**
("n/a" in neutral, never red), low-volume rule (< 10 records → marked).

## 6. Filter
Shared filters (month selector always; group/priority when the data has them). Say which widgets each filter changes.

## 7. Validation
One sentence per widget that a check can execute: "P3 & P4 value = (Met P3 + Met P4) ÷ (all P3 + P4)",
"sum of misses by group = Missed card", "matches the managed-service report ±0.1 pp". These feed `itsm-verify`.

## Defaults for quick mode
- Flag column Met/Missed or Yes/No → rate KPI, target from ORG_PROFILE or 90 % (SLA) / 70 % (FCR) as *assumption*.
- Score column → mean KPI; scale 1–10 reported out of 5 → divide 2; target 4.2 as *assumption*.
- One KPI per priority when the SLA file mixes P3 and P4, plus a combined KPI.
- Breakdown = assigned group when present.
- Layout = one panel per KPI family (3 cards + trend), then insights on top, details table below.

## Hand-over
Translate `KPI_SPEC.md` 1:1 into `spec.json` (`itsm-html-builder/references/spec-schema.md`): K → `kpis[]`,
query → `how`, filter → `sources.*.filters` / `where`, widget → `panels[]`, validation → `itsm-verify`.
In guided mode show the KPI table (question · KPI · target · assumption?) and wait for "OK" — **GATE**.


<!-- itsm-kpi-analyzer/references/kpi-spec-template.md -->
# KPI_SPEC — <dashboard name>

## 1. Persona and decision
- Who: …  · When / how long: …  · Decision it supports: …

## 2. Business questions (max 5)
1. …

## 3. KPIs
| ID | Question | Definition | Formula on columns | Unit | Target (direction) | Month by | Scope filter | Status |
|---|---|---|---|---|---|---|---|---|
| K1 | … | … | … | % | 70 (higher) | Resolved Date | … | confirmed / assumption |

## 4. Widgets
### W1 — <name>
| Field | Value |
|---|---|
| KPI | K1 |
| Business question | (verbatim from §2) |
| Widget type | stat card / trend (area/line) with target line / bar by group / table |
| Size | --size-sm / --size-md / --size-lg |
| Query (descriptive) | … |
| Source | file + columns |
| Filters honoured | month (always); group; priority |
| Visual treatment | value in --status-critical when below target, --status-high within 2 pp, else neutral text + ✓ |
| Empty state | "n/a" in --status-neutral + notice; never red, never 0 |
| Validation rule | one executable sentence |

## 5. Shared filters and defaults
Month: latest complete month (current month flagged as partial) · Group: all · Priority: all.

## 6. Out of scope (next dashboard)
- …

## 7. Assumptions to confirm
- …


<!-- itsm-kpi-analyzer/references/modules-and-views.md -->
# Modules and views (from the agent v0.2 library, Lab 2 format)

Every module = business question → KPI → query → widget → filter → validation, with a size token
(S 3×2 card, M 6×3 breakdown, L 12×4 trend/table), status tokens and an empty state.

| Module | Business question | Widget | In view |
|---|---|---|---|
| attention | Are we on target and what needs attention first? | findings strip ("What the data says") | all |
| fcr | How much is solved at first contact? | 3 cards (%, missed, total) + area trend with target | monthly, warnings |
| sla | Are P3/P4 resolved within SLA? | 3 cards (P3, P4, combined) + multi-line trend with target | monthly, warnings |
| csat | Are users satisfied? | 3 cards (average, responses, responses YTD) + area trend with target | monthly, warnings |
| records | Which records are behind a number? | details table, filtered by the clicked card, sortable, CSV export | all |
| filters | Only my group / priority? | global filter chips (group, priority) | all |
| atRisk | Which open incidents breach or are about to? | table (Breached > SLA, At risk ≥ 75 %) | needs raw export (wave 2) |
| weekly | How did the last 8 weeks go? | weekly trend | needs weekly aggregation (wave 2) |
| backlog | Where is open work piling up? | bar by group | needs open tickets (wave 2) |
| volume | How much do we resolve, through which channels? | bar + table | needs channel column |

## Views (manager shorthand → view)
- "IT support monthly" → **monthly**: management view, reference layout + findings strip. Default.
- "current IT weekly" → **weekly** (wave 2); until then: latest month + findings, say so.
- "identify warnings" → **warnings**: only KPIs below or near target, findings first.

## Status thresholds (same in the page, the engine and the findings)
critical = below target · warning = within 2 pp of target (0.1 for averages) or falling ≥ 3 pp vs previous month
(0.2 for averages) or three declines in a row · info = low volume (< 10 records) or a data notice.


<!-- itsm-kpi-analyzer/references/question-bank.md -->
# Question bank — what Service Desk managers ask (→ KPI, widget)

| # | Question (as managers phrase it) | KPI | Widget | Needs |
|---|---|---|---|---|
| 1 | Are we meeting our P3/P4 SLAs this month? | SLA % per priority + combined | 3 cards + multi-line trend with target | SLA flag, priority or SLA name |
| 2 | How much does the Service Desk solve at first contact? | FCR % | card + area trend with target; missed & total cards | FCR flag |
| 3 | Are users satisfied? | CSAT average (/5) | card + area trend with target; responses card | score |
| 4 | Is anything getting worse? | m/m and 3-month direction per KPI | insights strip | ≥ 3 months |
| 5 | Where do misses concentrate? | misses by group / category | bar by group or "Show records" | breakdown column |
| 6 | How does this month compare with last year? | YoY per KPI | insight line | ≥ 13 months |
| 7 | How many tickets are behind the %? | population / misses count | cards | — |
| 8 | Which month was best / worst? | max/min over 12 months | trend labels + insight | 12 months |
| 9 | How many surveys did we get this year? | responses YTD | card | survey date |
| 10 | What is breaching right now? | open at-risk / breached | table | raw open tickets + calendar (wave 2) |
| 11 | Where is the backlog? | open by group, age buckets | bar | raw status (wave 2) |
| 12 | Which channel brings most incidents? | volume by channel | bar | channel column |
| 13 | How fast do we resolve? | median resolution time | card + trend | timestamps + calendar (wave 2) |
| 14 | Do fixes stick? | reopen rate | card | reopen flag (wave 2) |
| 15 | Are these the same numbers as the official report? | verification table | Verification section | reference values |

Manager shorthand → view: "IT support monthly" → management monthly (Q1–Q3, Q4, Q6); "current IT weekly" →
operations (Q10–Q11, wave 2); "identify warnings" → insights first, only KPIs below/near target.


---

<!-- skill: itsm-design-reference -->
# Design reference analyzer (ITSM)

## What the screenshot is and is not
It tells **how the dashboard should look** and **how the manager is used to reading it** (panel order, card trio,
trend with target line). It is **not** a feature list and not a source of numbers: never copy values from the
image into the dashboard; KPIs come from `KPI_SPEC.md`, numbers from the data.

## Procedure
1. Look at every screenshot provided. Several images → one shared system.
2. **Layout pattern:** grid, number of panels, panel header style, cards per panel (label · period · big number ·
   unit), chart type per panel (area / line / bar), target lines, legends, data labels, density, whitespace.
3. **Palette:** background, surface, border, two text levels, accent (series colour), status colours if visible.
   Convert to plausible hex. If the accent is a brand colour, keep it for series identity only — status stays
   red/amber/green tokens.
4. **Typography:** family suggestion (system-ui if unsure), weights, three sizes (KPI number, label, meta).
5. **Components:** card, panel header, chart, table conventions; rounded corners; shadows.
6. Write the **Overview / overall vibe** paragraph first — it anchors everything: mood, canvas, how hierarchy is
   expressed ("big dark numbers, small grey period labels, one purple accent for series, grey panel headers").
7. Write `itsm-workspace/DESIGN.md` from `references/design-md-template.md` (YAML tokens + prose). No placeholders left.
8. Map to the builder: accent → `--s1`, panel header colour → `--panel-head`, background → `--bg`; panel/card order →
   `spec.json.panels`. Put these in DESIGN.md §"Mapping to the dashboard template".

## Self-check before returning
- Status colours distinguishable (also for colour-blind users)? Accent contrast ≥ 3:1 on the background?
- Could a developer who never saw the image rebuild the feel from the vibe paragraph?
- Did any number or KPI leak from the image into the spec? (must be no)

Return two sentences and the path to DESIGN.md.


<!-- itsm-design-reference/references/design-md-template.md -->
---
colors:
  background: "#F4F5F7"
  surface: "#FFFFFF"
  border: "#D9DCE1"
  panelHeader: "#E9EBEF"
  text: "#1D2433"
  textSecondary: "#4A5264"
  accent: "#5B3FB0"
  series: ["#5B3FB0", "#1F6FB5", "#D9822B", "#0F8B8D"]
  status: { critical: "#C62828", warning: "#EF6C00", met: "#2E7D32", info: "#1565C0", neutral: "#5F6368" }
typography:
  family: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
  kpi: "600 34px"
  label: "600 14px"
  meta: "400 12px"
rounded: { card: "8px", panel: "10px" }
spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px" }
shadows: { card: "none", hover: "0 1px 4px rgba(0,0,0,.06)" }
components:
  panel: "grey header bar with title, white body"
  card: "label, period subtitle, big number, small unit; three per panel"
  chart: "area or line, 12 months, dashed target line, data labels on single series"
---

# DESIGN — <name>

## Overview (overall vibe)
One paragraph: mood, canvas, hierarchy, what colour is reserved for.

## Layout pattern
Panels (order, count), cards per panel, chart per panel, what sits above/below (insights strip, details table).

## Colors
## Typography
## Layout & Spacing
## Elevation & Depth
## Shapes
## Components
## Do's and Don'ts

## Mapping to the dashboard template
| Token | Template variable | Value |
|---|---|---|
| accent / series 1 | --s1 | |
| panel header | --panel-head | |
| background | --bg | |


---

<!-- skill: itsm-dashboard-design -->
# Dashboard design rules

A KPI dashboard is read, not admired. Aim: the manager knows in 10 seconds whether action is needed and in
60 seconds where. Apply these rules; the template already implements most — do not fight it.

## Page order (top → bottom)
1. **Title + period + data source + trust badge** (numbers consistent / verified).
2. **What the data says** — 3–6 findings, worst first, each with a number and a "Show records" link.
3. **KPI panels** — one per family, 3 cards + 12-month trend with a dashed target line.
4. **Details** — sortable, searchable table filtered by the clicked card/point; CSV export.
5. **How calculated** — per KPI definition, filters, assumptions, notes.

## Cards
Label · period · big number · unit · target · change vs previous month (▲▼ with pp). Status by token:
below target → `--status-critical` number + "below target"; within 2 pp (0.1 for averages) → `--status-high`;
met → neutral number + ✓. **Red only for what needs action.** Low volume (< 10) → small amber note.
Empty → "n/a" neutral + notice, never 0.

## Charts (see `references/chart-choice.md`)
- Trend of one KPI → area/line, 12 months, data labels, target line dashed.
- Several related KPIs (P3, P4, combined) → lines, legend, one y-axis, same unit. **Never two y-axes.**
- Breakdown → horizontal bar sorted descending. **No pie charts.** No 3D, no gauges for rates.
- Series colours are identity in fixed order (`--s1…--s4`), never status. Status colours never used for series.
- Hover tooltip with value, target, record count; click a point = select that month.

## Interaction (minimum)
Month selector · click card → records · sortable table (keyboard) · search · CSV export · print stylesheet ·
tooltips that stay inside the window · focus visible · aria labels on cards and charts.

## Copy
Sentence case, plain verbs, numbers with units and period ("86.6 % · Aug 2026"). Insight titles state the finding,
not the metric name ("FCR fell 3.1 pp to 78.2 %", not "FCR trend").

## When a screenshot defines the look
Follow `DESIGN.md` for palette, header style and card rhythm; keep these rules for status, axes, empty states.
Anti-patterns to check before shipping: `references/anti-patterns.md`.


<!-- itsm-dashboard-design/references/anti-patterns.md -->
# Anti-patterns (if the dashboard matches one, fix it)
- Everything red or everything green — status loses meaning; red only below target.
- A % without its population (show counts; flag < 10).
- Two y-axes on one chart.
- Pie chart for groups; rainbow palettes; series coloured by rank (colours jump when filtered).
- Numbers typed by the model into HTML text instead of computed from data.
- Values copied from the reference screenshot.
- Missing data shown as 0.
- Six or more widgets for one persona.
- Tooltips cut at the screen edge; tables that cannot be sorted; nothing happens on click.
- "Insights" that restate the number without a comparison (target, previous month, last year, group).


<!-- itsm-dashboard-design/references/chart-choice.md -->
# Chart choice for ITSM KPIs

| Data job | Use | Avoid |
|---|---|---|
| One KPI vs target, over time | area or line, 12 months, dashed target, data labels | bars for % over time (hard to read vs target) |
| 2–4 related KPIs, same unit | multi-line, legend + direct label on last point | stacked area (implies sum) |
| Headline value | stat card with period, target, delta | gauge / speedometer |
| Breakdown by group/category | horizontal bar sorted descending, top 8 + "Other" | pie / donut |
| Distribution of scores | column chart 1–5 (or 2–10) | average only |
| Records | table with sort, search, export | screenshots of tables |
Scales: % axis may start above 0 when all values are 95–100 (say so in the axis labels); never truncate bars.


---

<!-- skill: itsm-html-builder -->
# HTML builder

**Do not write dashboard HTML by hand.** Write `spec.json`, run the builder, open the result. The template is
tested; hand-written pages lose sorting, tooltips, verification and accessibility.

## Steps
1. Write `itsm-workspace/spec.json` from `KPI_SPEC.md` following `references/spec-schema.md`
   (worked example: `${CLAUDE_PLUGIN_ROOT}/examples/mock-3csv/spec.json`). Use exact column names from `profile.md`.
2. If `DESIGN.md` exists, copy its mapping into `spec.theme` (`--s1`, `--panel-head`, `--bg`, `--accent`).
3. Build:
   `python ${CLAUDE_PLUGIN_ROOT}/skills/itsm-html-builder/scripts/build_dashboard.py --spec itsm-workspace/spec.json --data itsm-workspace/data --out itsm-workspace/dashboard.html --results itsm-workspace/kpi_results.json`
   > With tools available (web app, MCP `itsm-engine`) call the `itsm_*` tool instead; with Node use `node ${CLAUDE_PLUGIN_ROOT}/scripts/itsm.mjs …` (see the table in `itsm-dashboard`). Same engine, same results.

4. Read the console summary: rows kept per source, date order detected, latest-month values, NOTES.
   - "Column X not found … Did you mean …" → fix the spec, rebuild. Never rename columns in the data.
   - Date order "ambiguous" → ask or state the assumption in `spec.assumptions`.
   - Many rows excluded → check `positive` / `negative` lists against the profile's flag values.
5. Hand over to `itsm-verify`. After insights are added (`itsm-insights`), rebuild.

## Without code execution
Give the user `spec.json` and the template path; the page shows a drop zone and computes everything from the
dropped CSV files (build with `--no-embed` to produce such a page yourself).

## What the page does (so you can describe it truthfully)
See `references/interactivity-checklist.md`. Things it does **not** do in v1: global group/priority filters,
drag & drop of panels, weekly view, business-hours durations from raw timestamps, dark theme.

## Size
Only the columns named in the spec are embedded. ~15k rows ≈ 3 MB HTML; above ~100k rows add a source filter or
fewer `detailColumns`.


<!-- itsm-html-builder/references/interactivity-checklist.md -->
# What the generated page does (v0.1)

- Header: title, subtitle, data sources with row counts, month selector, **consistency badge** (Python vs JS), Load CSV, Print.
- Mock banner (auto-hides after 6 s, closable) when `mock: true`.
- **What the data says**: pinned summary (all on target / N below or near), then findings worst first: below target,
  near target, change ≥ 3 pp (0.2 for averages) vs previous month, three consecutive declines, year-on-year,
  best month of 12, where misses concentrate (breakdown column), low volume, analyst notes. "Show records →" opens details.
- **Panels**: cards with value, unit, status (⛔ below target / ⚠ near / ✓), period, target, delta vs previous month,
  low-volume note, ⓘ "how calculated" (hover, focus or click). Cards are buttons (Enter/Space) → details.
- **Trend charts** (SVG, no library): 12 months up to the selected month, dashed target line, legend for several
  series, data labels on single series, tooltip (value, target, records, misses), click point → select month + details.
- **Details**: tabs per source (arrow keys), context chip (KPI · month, removable), search, sortable columns
  (click or Enter, aria-sort), failed rows first and shaded, 200 rows + "show more", CSV export of the current view.
- **How calculated**: sources, filters, KPI definitions, targets, assumptions, build notes.
- Drop zone: without embedded data (or via "Load CSV") the page reads CSV files locally and recomputes.
- Accessibility: focus outlines, aria labels on cards and charts, live region for table counts, reduced motion,
  print stylesheet. Tooltips stay inside the window.


<!-- itsm-html-builder/references/spec-schema.md -->
# spec.json — schema

```jsonc
{
  "title": "Service Desk KPI dashboard",          // page title
  "subtitle": "FCR · P3 & P4 SLAs · CSAT",
  "audience": "…",                                // informational
  "dataLabel": "Anonymised export, 24.09.2026",   // shown under the title
  "mock": false,                                  // true → yellow "mock data" banner
  "defaultMonth": "latest",                       // or "YYYY-MM"
  "trendMonths": 12,
  "lowVolume": 10,                                // < N records → "low volume"
  "theme": { "--s1": "#5B3FB0", "--panel-head": "#E9EBEF" },   // optional CSS variables (from DESIGN.md)
  "sources": {
    "<sourceId>": {
      "file": "exact file name.csv",
      "label": "Tab label in Details",
      "id": "Incident ID",                        // optional
      "date": "Resolved Date",                    // column that assigns the month
      "dateFormat": "auto",                       // auto | ISO | DMY | MDY
      "filters": [ { "column": "SLA Name", "op": "startsWith", "value": "Service Desk" } ],
      "breakdown": "Assigned Group",              // optional: where misses concentrate
      "detailColumns": ["Incident ID", "…"]       // columns in the Details table
    }
  },
  "kpis": [
    { "id": "sla_p3", "label": "P3 SLA", "source": "<sourceId>",
      "type": "rate",                             // rate | mean | count
      "column": "SLA Status",
      "positive": ["Met"],                        // rate: success values (case-insensitive)
      "negative": ["Missed"],                     // rate, optional: only these count as failures; others excluded
      "where": [ { "column": "SLA Name", "op": "contains", "value": "P3" } ],   // KPI-level filter
      "divide": 2,                                // mean: divide each value (1–10 → 1–5)
      "target": 90, "direction": "higher",        // higher | lower
      "unit": "%", "decimals": 1,
      "how": "Plain-language definition shown in the tooltip and footer." }
  ],
  "panels": [
    { "id": "p_sla", "title": "P3 & P4 SLAs",
      "cards": [ { "kpi": "sla_p3", "show": "value" },          // value | missed | count | count_ytd
                 { "kpi": "sla_p3", "show": "missed", "label": "P3 breaches", "unit": "incidents" } ],
      "chart": { "kpis": ["sla_p3", "sla_p4"], "style": "line" } }   // line | area (area only for one KPI)
  ],
  "globalFilters": [                             // filter chips on the page; the agent passes the same ids to itsm_kpis/itsm_records
    { "id": "group", "label": "Assigned group", "columns": { "<sourceId>": "Assigned Group" } },
    { "id": "priority", "label": "Priority", "columns": { "<sourceId>": "Priority" } }
  ],
  "insights": [ { "text": "…", "kpi": "fcr", "level": "info", "month": "2026-08" } ],  // analyst notes (itsm-insights)
  "assumptions": [ "…" ]
}
```
Filter ops: `equals`, `notEquals`, `in`, `notIn`, `startsWith`, `contains`, `notEmpty` (all case-insensitive, trimmed).
Status: below target → critical; within 2 pp (0.1 for `mean`) → warning; else met.


---

<!-- skill: itsm-insights -->
# Insights from ITSM KPIs

The page already generates rule-based findings (below/near target, big changes, 3-month declines, YoY, best month,
where misses concentrate). Your job is the **analyst layer**: connect findings, name likely causes as hypotheses,
and suggest one action — without inventing numbers.

## Inputs
`itsm-workspace/kpi_results.json` (all values), `verify.md` (must be all ✓), `profile.md` (what columns exist),
`ORG_PROFILE.md` (audience, what they care about). For breakdowns, count from the anonymised CSV with a short
script — never estimate.

## Write 3–5 insights
Pattern (see `references/insight-patterns.md`): **finding + number + comparison + so-what**.
- "FCR fell 3.1 pp to 78.2 % in Aug 2026 (target 70 %) — still above target, but the third decline in a row;
  61 % of misses sit in Service Desk L1."
- "P3 SLA 99.3 %: 5 breaches, 4 of them in one group — check that group's queue before the review."
Order: act now → watch → good news. One insight may be positive; the whole list may not be.

## Rules
- Every number must be present in `kpi_results.json` or computed by a script you ran now; copy, do not round
  differently than the dashboard (use the KPI's `decimals`).
- Causes are **hypotheses** ("likely", "check whether") unless the data shows them.
- No insight without comparison. No restating a card.
- Language of the insights = dashboard language (default English); chat summary in the user's language.

## Put them in the page
Add to `spec.json`:
`"insights": [{"text": "...", "kpi": "fcr", "level": "warning", "month": "2026-08"}]`
(level: critical | warning | info | met). Rebuild with `itsm-html-builder`, re-run `itsm-verify`.

## Executive summary (chat or e-mail draft)
Three lines: overall status · the one thing to act on · the one good news. Then the link to the file.


<!-- itsm-insights/references/insight-patterns.md -->
# Insight patterns (fill only with computed numbers)

| Pattern | Template | Trigger |
|---|---|---|
| Below target | "<KPI> is <v><unit> in <month>, <gap> below the <target> target (<n> records)." | value < target |
| Near target | "<KPI> <v> is within <margin> of the target — one bad week could tip it." | gap < 2 pp / 0.1 |
| Sharp change | "<KPI> <rose/fell> <d> pp from <prev> to <month>." | |d| ≥ 3 pp / 0.2 |
| Streak | "<KPI> declined three months in a row (<a> → <b>)." | 3 consecutive worse |
| Year on year | "<KPI> <v> vs <v_ly> in <month_ly> (<±d> pp YoY)." | ≥ 13 months |
| Concentration | "<share> of <KPI> misses in <month> come from <group> (<k> of <n>)." | breakdown column |
| Small base | "<KPI> rests on <n> records — treat with care." | n < 10 |
| Contrast | "SLA is 99 % but FCR is falling: tickets are solved on time, yet more are passed to second line." | two KPIs diverge |
| Good news | "<KPI> <month> is the best of the last 12 months (<v>)." | max |
| Action | "Check <group>'s <category> tickets from <month> (Show records → filter <group>)." | after a concentration |


---

<!-- skill: itsm-verify -->
# Verification

Green tests alone are not proof; agreement between independent calculations and with an external reference is.

## Levels
1. **In-page** (automatic): the page recomputes in JavaScript and compares with the build script → header badge
   "✓ numbers consistent (N checks)".
2. **Independent re-count** (this skill):
   `python ${CLAUDE_PLUGIN_ROOT}/skills/itsm-verify/scripts/verify_kpis.py --spec itsm-workspace/spec.json --results itsm-workspace/kpi_results.json --data itsm-workspace/data --out itsm-workspace/verify.md`
   > With tools available (web app, MCP `itsm-engine`) call the `itsm_*` tool instead; with Node use `node ${CLAUDE_PLUGIN_ROOT}/scripts/itsm.mjs …` (see the table in `itsm-dashboard`). Same engine, same results.

3. **External reference** (when the user has an official report): create `reference.csv` with `kpi,month,value`
   (values from the report, typed by the **user** or read from their file — never from memory) and add
   `--reference reference.csv --tolerance 0.1`.
4. **Spot check**: open 3 records per KPI in the Details table and confirm with the user that the flag/score is read
   as intended (e.g. "Missed" really means breached).

## Rules
- Exit code 1 or any ✗ → do not present the dashboard as final. Explain each mismatch: filter, month column,
  excluded values, duplicates, snapshot date, rounding.
- Report in one line when all match: "Verified: 65 of 65 values match an independent re-count."
- Keep `verify.md` next to the dashboard; mention it when sharing.


---

<!-- skill: itsm-grill-me -->
# Grill me — transfer the manager's knowledge into the kit

The model knows ITSM in general; only the owner knows **their** rules. This interview turns tacit knowledge into
written decisions. The result is not a chat transcript: it is `itsm-workspace/ORG_PROFILE.md`, which every other
skill reads.

## How to interview
- **One question at a time.** Always give your **recommended answer** and why, so the owner can reply "yes".
- **Walk the decision tree** (`references/question-bank.md`): resolve what other answers depend on first
  (audience → decision → KPIs → definitions → targets → presentation → trust → privacy → delivery).
- **Look before asking.** If the data profile or an earlier answer already settles it, do not ask — state it as a
  confirmed fact or an assumption.
- **Challenge vague answers** with a concrete example from their data: "Should an SLA row with *In Process* count
  as missed or be excluded? In August there are 0 such rows in your file, so it changes nothing today."
- Stop when every branch is resolved or explicitly parked as an assumption. Typical length: 8–15 questions,
  ~15 minutes. Quick mode: only the 3 questions with the biggest impact on numbers.
- Match the owner's language. Keep a running summary every ~5 answers ("So far: …").

## After the interview
1. Write/update `itsm-workspace/ORG_PROFILE.md` from `references/org-profile-template.md`: every decision with
   source ("owner, 30.09") and status (confirmed / assumption / parked).
2. Update `KPI_SPEC.md` and `spec.json` if definitions changed; rebuild and verify.
3. Show the owner a 5-line summary of what will change in the dashboard.

## Never
- Ask several questions in one message.
- Ask for personal data or raw ticket content.
- Turn assumptions into facts without the owner's answer.


<!-- itsm-grill-me/references/example-org-profile-service-desk.md -->
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


<!-- itsm-grill-me/references/org-profile-template.md -->
# ORG_PROFILE — <organisation / team>

Last updated: <date> · Owner: <role> · Interviewed by: <tool/person>

## Purpose and audience
| Topic | Decision | Source | Status |
|---|---|---|---|
| Audience / frequency | | | confirmed / assumption / parked |
| Decision supported | | | |
| Replaces / reference report | | | |

## Data sources and rules
| Source file | Record | Month column | Scope filter | Success / failure / excluded values | Score conversion |
|---|---|---|---|---|---|

## KPIs and targets
| KPI | Definition | Target | Near-target margin | Status |
|---|---|---|---|---|

## Presentation
Layout · period defaults · breakdown · language · colours

## Trust
Reference report · tolerance · known quirks

## Data privacy decisions
| File | Column | Decision (keep/hash/drop) | Date |
|---|---|---|---|

## Learned rules (from itsm-learn)
- <date>: <rule> — <why>


<!-- itsm-grill-me/references/question-bank.md -->
# Question bank — decision tree for an ITSM dashboard (ask in this order, skip what is known)

## 1. Purpose and audience
1. Who opens this dashboard, how often, for how long? *(rec.: you, monthly, before the management review)*
2. What decision should it support? *(rec.: where to act this month — which KPI, which group)*
3. Does it replace an existing report (Excel / provider report) or complement it? Can that report be the reference?
4. Does anyone else need a different view (management vs team leads)?

## 2. KPIs and definitions
5. Which 3–5 questions must the page answer in 10 seconds? *(rec. from the data: FCR, P3/P4 SLA, CSAT)*
6. Month assignment: resolved date or submitted date? CSAT by survey date? *(rec.: resolved / survey date)*
7. Scope: which rows count (SLA name prefix, priorities, groups, statuses)? *(rec.: SLA name starts with "Service Desk")*
8. Success values: which values mean success, which are excluded ("In Process", "N/A")? *(rec.: Met = success, Missed = failure, others excluded)*
9. Score scale and reporting scale (1–10 → out of 5?) *(rec.: ÷ 2)*
10. Targets and direction per KPI; what is "near target"? *(rec.: FCR 70 %, SLA 90 %, CSAT 4.2; near = 2 pp / 0.1)*

## 3. Presentation
11. Keep the familiar layout (screenshot) or propose a new one? *(rec.: keep the panel order, add insights on top)*
12. Period: last complete month by default, 12-month trend, year-to-date counts? *(rec.: yes)*
13. Which breakdown matters most when a KPI drops: group, category, channel? *(rec.: assigned group)*
14. Labels language; brand colours or neutral? *(rec.: English labels, neutral + one accent)*

## 4. Trust
15. Which numbers must match an official report and with what tolerance? *(rec.: FCR and CSAT ±0.1)*
16. Known exclusions or data quirks (tickets not ours, on-hold rules, duplicates)?

## 5. Privacy and delivery
17. Which data may leave your laptop / may be used with an AI tool? *(rec.: anonymised exports only)*
18. Delivery: HTML file by e-mail / SharePoint / printed PDF?
19. Next month: same export, same names? Who runs it?


---

<!-- skill: itsm-learn -->
# Learn — close the loop

"Training" = several real sessions on the owner's data, each ending with the lessons written down where the next
session reads them. No model is changed; the knowledge is.

## At the end of a session
1. List what changed between the first dashboard and the accepted one: spec diffs (targets, filters, panels,
   labels), answers from the interview, verify mismatches and their causes, questions the owner asked that the
   dashboard could not answer.
2. Classify each lesson:
   - **Organisation-specific** (their targets, their SLA prefix, their layout) → `itsm-workspace/ORG_PROFILE.md`
     ("Learned rules", with date and reason).
   - **General ITSM / dashboard lesson** (e.g. "SLA files often contain other teams' SLAs") → propose an edit to the
     relevant skill file of this kit (show the exact text); the kit owner applies it in the plugin repository.
   - **Missing capability** (weekly view, raw timestamps) → `itsm-workspace/LEARNINGS.md` → backlog of the kit.
3. Append to `itsm-workspace/LEARNINGS.md`: date · lesson · where it was saved · evidence.
4. Tell the user in 3 lines what will be different next time.

## Next session
`itsm-dashboard` reads `ORG_PROFILE.md` first, so the owner is not asked the same questions again and the first
dashboard already follows their rules. Check "Learned rules" before choosing defaults.

## Never
Save personal data, raw ticket text, or opinions about people. Save rules, not records.


---

<!-- skill: itsm-intent-router -->
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


---

<!-- skill: itsm-brief -->
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


---

<!-- skill: itsm-ui-design -->
# ITSM UI design — guardian for building and auditing

Every new screen, panel or component must look as if the same designer built it. History of the source project:
4–5 rejected iterations came from building without this knowledge. Do not guess — read the references.

## Setup (always)
1. Read `references/design-rules.md` (rules that filter every UI proposal) and `itsm-dashboard-design` (KPI page rules).
2. Decide the mode: **BUILD** (build or change UI) or **AUDIT** (`/ux-audit`, review). Unclear → ask one sentence.
3. Decide where the code lives: the dashboard template (`itsm-html-builder/templates/dashboard.html`), the app UI
   (`app/web/`), or a MagicPath canvas component. Rule: **local = workshop, MagicPath = showcase** — iterate locally,
   submit to MagicPath only at milestones (`references/magicpath-workflow.md`).

## BUILD — order is not negotiable
1. **Reference.** Establish the visual reference: an existing element (sibling look) or the user's reference
   (screenshot, MagicPath design). Analyse facts vs interpretation, what to adapt, what NOT to copy (`itsm-design-reference`).
2. **Mockup before code.** Show a mockup on the user's REAL (or realistic synthetic) data, desktop 1280 + mobile 430.
   Fastest path: a MagicPath canvas component (`code start → code submit --wait`) or an HTML mockup. Wait for approval.
3. **Close decisions before code.** Proportions, what goes in a card, what opens on click, responsiveness — ask first.
4. **Build.** Tokens only (`references/tokens.md`), shared components, no improvised colours; numbers still come
   from the engine — the design never changes how values are computed.
5. **Verify live** with `references/measurement.md`: contrast by canvas, real Tab focus, 44×44 targets, click-through,
   screenshots at 430 and 1280. Run `npm test` (app) and the self-test (plugin) — the numbers must stay identical.
6. **Report** what was built and measured, with numbers.

## AUDIT (`/ux-audit`)
Say which reference you measure against — they carry different weight:
1. **wcag** — objective WCAG 2.1 AA thresholds (4.5:1 text, 3:1 UI/large text, 44 px targets), methods from measurement.md only.
2. **design-system** — internal consistency: hard-coded colours bypassing tokens, re-typed classes, off-scale spacing.
3. **heuristic** — expert judgement (hierarchy, cognitive load, copy) — always labelled as opinion.
Findings with weight (Critical / Major / Minor) and evidence. Fix low-risk ones immediately and re-measure; ask before risky ones (palette, restructuring).

## Invariants (short)
Colours only from tokens · status colours only for status, series colours only for identity · text on accent ≥ 4.5:1 ·
focus ring ≠ accent · interactive ≥ 44×44 · one primary action per view · change of a UI pattern = grep all
occurrences before submit · every clickable element shows a pointer · mockup before code · verify what is live.

| Reference | When |
|---|---|
| `references/design-rules.md` | always at start |
| `references/tokens.md` | before using any colour, font, radius, spacing |
| `references/measurement.md` | before any measurement or verification |
| `references/magicpath-workflow.md` | before working with MagicPath (login, canvas, code start/submit, parity) |


<!-- itsm-ui-design/references/design-rules.md -->
# Design rules (ITSM dashboard + agent app)

Adapted from 29 rules learned the hard way in the author's previous product (Trip Now / Fly4Adventure) and filtered
for a KPI dashboard used by a Service Desk manager. Numbers are stable — refer to them by number.

## Structure and navigation
1. **Fewer screens, deeper not wider.** Drill-down in a modal / details section / inline expand before a new page.
2. **Never push the user out of the app without reason.** Records open in the details table, not in another tool.
3. **Back returns where the user came from** (remember the entry point; no hard-coded return).
4. **Expanding an item = teaser leading to the full view**, not a copy of the content.

## Copy
5. **Positive, actionable copy.** "What to do now" beats warnings; errors say what happened and how to fix it.
6. **Insight titles state the finding**, not the metric name ("FCR fell 3.1 pp to 78.2 %").

## Hierarchy and layout
7. **What must be easy to reach comes first** (findings strip above panels; month selector in the header).
8. **Compact, not crowded** — the user corrects in both directions; measure spacing, do not eyeball it.
9. **Visual weight of an action = its business weight.** Solid primary button only for the one main action
   (build, export); everything else is an outlined pill, a text link or a chip.
10. **One highlighted element per view** (accent outline = "this concerns you now"); a wall of highlights means none.

## Consistency and components
11. **Colours strictly from tokens.** Purple, black or green appearing from nowhere = a bug, not a variant.
12. **Shared components by reuse**, never re-typed classes (card, chip, button, badge have one definition).
13. **One standard size per control type**; no one-off height overrides.
14. **Changing a UI pattern = grep all occurrences first**, classify (same meaning → change, different → keep and note),
    verify every changed place live.
15. **Every clickable element shows a pointer** (global CSS rule, not per element).
16. **Filters that change content variants are segmented controls**, not CTA-sized chips.

## Accessibility (WCAG 2.1 AA — hard thresholds)
17. **Text contrast ≥ 4.5:1**, large text and UI boundaries ≥ 3:1; recompute after every palette change (canvas method).
18. **Interactive targets ≥ 44×44 px** (cards, chips, table headers, filter pills).
19. **Focus ring token ≠ accent token** (a ring in the accent colour on an accent element is invisible).
20. **Every icon-only control has a visible label or aria-label**; decorative SVG is aria-hidden.

## Dashboard-specific (from itsm-dashboard-design)
21. **Red only for what needs action now**; status (critical/warning/met) never used as series colours.
22. **One y-axis per chart**; no pies; target line dashed; low volume flagged; missing data = "n/a", never 0.
23. **Numbers are never designed**: a redesign changes presentation only — `npm test` and the plugin self-test
    must return the same values before and after.

## Process
24. **Mockup before code, decisions on the mockup** — the cheapest elimination of rejected iterations.
25. **Always verify what is live** (after a MagicPath submit the working directory is stale; hosts add their own chrome).


<!-- itsm-ui-design/references/magicpath-workflow.md -->
# MagicPath workflow (CLI `magicpath-ai`) for the ITSM dashboard

**Local = workshop, MagicPath = showcase.** MagicPath is where the user sees and approves the look (clickable
prototype, canvas for exploring variants, share link). Code iterations happen locally; submit to MagicPath at milestones.
Pure MagicPath without these skills = a sketchbook for inspiration only, never the final screen (it does not know the rules or tokens).

## First steps
```bash
npx -y magicpath-ai info -o json            # auth + context
npx -y magicpath-ai login                   # browser login — the USER signs in
npx -y magicpath-ai whoami -o json
npx -y magicpath-ai list-projects -o json   # find or create the project
npx -y magicpath-ai create-project --name "ITSM Dashboard" -o json
```
Before generating anything: read/build the prototype catalogue `docs/prototypes/KATALOG-MAGICPATH.md`
(`list-components <projectId> -o json --sort-by createdAt --order desc`) and add an entry after every new prototype
(descriptive name, generatedName, date, group, which variant became canon).

## Theme = our tokens
`list-themes` usually returns only public defaults. Do NOT use MagicPath's grey scaffold: copy our tokens
(`tokens.md`) into the canvas component's `src/index.css` `:root` before writing the component.

## Author a canvas component (mockup of the dashboard on realistic data)
```bash
npx -y magicpath-ai code start --project <projectId> --dir ./mp-work --name "ITSM dashboard — monthly" --width 1440 --height 900 -o json
# edit only: src/App.tsx (theme), src/index.css (tokens), src/components/generated/**, assets/**
npx -y magicpath-ai code submit --dir ./mp-work --wait -o json      # status must be "completed"
npx -y magicpath-ai share <projectId> -o json                        # link for the user
```
Design defaults on the canvas: no device mockups, responsive, centered, fully interactive (state, hover, focus).
Mobile variant: `--width 430 --height 932`. Every edit = a fresh `code start` (working dirs are stale after submit).
Batch edits into one submit (30–60 s round trip). Read-only export: `code context <componentId> --dir ./mp-read -o json`.

## From MagicPath back into the kit (parity)
1. Lock the approved revision (`selection -o json` → `selectedRevisionId`).
2. `inspect <generatedName> -o json` — read the source; translate layout, spacing, type and tokens into
   `dashboard.html` (vanilla JS/CSS — do not add React to the single-file dashboard) or `app/web/`.
3. Parity check: screenshots at 430/1280 side by side with the approved revision; DOM/runtime evidence before changes;
   record intentional deviations. Visual parity ≠ workflow regression — `npm test` covers the flows.
4. Numbers: run the tests — the design never touches computation.


<!-- itsm-ui-design/references/measurement.md -->
# Measurement methods (each replaced a naive method that lied)

1. **Contrast by canvas, not getComputedStyle** — `oklch()`/semi-transparent backgrounds are not parsed reliably.
   Resolve colours by painting on a 1×1 canvas (`fillStyle` → `getImageData`), composite the background chain on
   white, compute WCAG luminance; thresholds 4.5 (text) / 3.0 (large text ≥ 24 px or ≥ 18.66 px bold, UI, focus ring).
2. **Focus with a real Tab key**, not `.focus()` (`:focus-visible` only reacts to keyboard) — Playwright
   `page.keyboard.press('Tab')`, then read `document.activeElement` and measure the ring against the element background.
3. **Touch targets with getBoundingClientRect** on the clickable element itself (≥ 44×44).
4. **Automatic audits scoped to the component** — on a MagicPath host the page adds its own chrome
   ("Made with MagicPath", remix, cookies); findings outside the component subtree are host noise. Full Lighthouse only
   on our own deploy (localhost / Pages / Codespaces).
5. **Accessible names**: `aria-label || title || innerText` non-empty on every interactive element.
6. **Click-through**: walk real paths (card → details → back; filter → values → clear) after every navigation change.
7. **Screenshots at ~430 px and ~1280 px**; compare with the approved mockup; proportions from bounding boxes.
8. **Numbers unchanged**: `cd app && npm test` and `bash plugin/scripts/selftest.sh` green before and after a redesign.


<!-- itsm-ui-design/references/tokens.md -->
# Tokens (current template) — change values here and in the template together

| Token | Value | Use |
|---|---|---|
| `--bg` | #F4F5F7 | page background |
| `--surface` | #FFFFFF | cards, panels |
| `--panel-head` | #E9EBEF | panel header bar |
| `--border` / `--grid` | #D9DCE1 / #ECEEF1 | borders / chart grid |
| `--text` / `--text-2` / `--text-3` | #1D2433 / #4A5264 / #6B7280 | text levels |
| `--accent` | #5B3FB0 | brand accent (links, focus is NOT accent) |
| `--s1…--s4` | #5B3FB0 #1F6FB5 #D9822B #0F8B8D | series identity, fixed order |
| `--status-critical` | #C62828 | below target |
| `--status-high` | #EF6C00 | near target (warning) |
| `--status-met` | #2E7D32 | target met |
| `--status-pending` | #1565C0 | info, active filter, focus ring |
| `--status-neutral` | #5F6368 | empty state, secondary |
| `--font-kpi` / `--font-label` / `--font-meta` | 600 34px / 600 14px / 400 12px system-ui | number / label / meta |
| `--radius` / `--gap` | 10px / 16px | panel radius / grid gap |

Spec override: `spec.theme` may set any `--*` token (from DESIGN.md or a MagicPath theme via `get-theme`).
A MagicPath redesign must map its theme to these names — rename nothing, swap values.
