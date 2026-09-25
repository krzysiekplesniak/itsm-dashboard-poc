---
name: itsm-data-reader
description: >
  Explains WHAT is inside ITSM CSV exports (BMC Helix incidents, SLA results, FCR, customer-satisfaction surveys)
  and what each column means for KPI reporting: which date assigns a month, which column is a Met/Missed flag,
  which is a score and its scale, which rows are in scope, what can be broken down. Runs a profiler script.
  Use when ITSM / Service Desk CSV or Excel files are provided, when the user asks "what is in this file",
  "co jest w tym CSV", "which columns do we need", or before choosing KPIs.
metadata:
  version: "0.1.0"
---

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
