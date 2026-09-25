---
name: itsm-domain
description: >
  Domain knowledge of IT Service Management and the Service Desk: BMC Helix ITSM, incidents vs requests,
  priorities P1–P4, SLA / SLT / OLA, business hours and pending time, assignment groups and transfers,
  First Call Resolution, CSAT surveys, backlog, MTTR, reopen rate, and how managers read these numbers.
  Use when the user asks "what is FCR", "what does SLA Met mean", "co to jest ITSM", "explain these ITSM terms",
  when interpreting ITSM data columns, or whenever another itsm-* skill needs the meaning of a term.
metadata:
  version: "0.1.0"
---

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
