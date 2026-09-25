---
name: itsm-dashboard-design
description: >
  Design rules for KPI dashboards that managers read in two minutes: hierarchy, insight-first layout, status vs
  series colours, target lines, one axis, low-volume and empty states, clickable detail, accessibility and print.
  Use when designing or reviewing an ITSM / Service Desk dashboard layout, choosing charts or colours,
  "make it look professional", "dobry design dashboardu", or before building spec.json panels.
metadata:
  version: "0.1.0"
---

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
