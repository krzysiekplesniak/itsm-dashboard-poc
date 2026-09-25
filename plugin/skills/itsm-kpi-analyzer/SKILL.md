---
name: itsm-kpi-analyzer
description: >
  Turns a manager's business questions and the profiled ITSM data into a KPI specification using the Lab 2 method
  Business Question → KPI → Query → Widget → Filter → Validation, with design tokens, empty states and a validation
  rule per widget; max five KPIs. Use when choosing what the dashboard should show, when the user asks "which KPIs",
  "jakie KPI pokazać", "what should my dashboard answer", "analyse KPIs", or before writing spec.json.
metadata:
  version: "0.1.0"
  origin: "AI Lab 2 (Incident Control Tower) method, adapted to CSV exports"
---

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
