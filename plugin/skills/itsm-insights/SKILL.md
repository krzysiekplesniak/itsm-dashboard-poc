---
name: itsm-insights
description: >
  Writes the "What the data says" section of an ITSM dashboard: 3–5 findings that a Service Desk manager can act
  on, each backed by a computed number and a comparison (target, previous month, last year, group), worst first.
  Use after the dashboard is built and verified, when the user asks "what does the data show", "wnioski",
  "summary for management", "why is FCR low", or wants an executive summary of the KPIs.
metadata:
  version: "0.1.0"
---

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
