---
name: itsm-design-reference
description: >
  Reads a dashboard screenshot or inspiration image (e.g. the manager's current report, a Power BI / Splunk /
  Excel screenshot) and extracts the visual system — palette, typography, layout rhythm, card and chart
  conventions — into DESIGN.md with design tokens, plus the layout pattern (panels, cards, trend charts) to mirror.
  Use when the user attaches a screenshot and says "make it look like this", "extract style", "analyze this
  screenshot", "zrób podobnie jak na zrzucie", or "design tokens from this image".
metadata:
  version: "0.1.0"
  origin: "design-reference-analyzer from AI Lab 2, extended with ITSM layout extraction"
---

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
