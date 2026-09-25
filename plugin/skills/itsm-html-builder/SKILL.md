---
name: itsm-html-builder
description: >
  Builds the dashboard file: writes spec.json (sources, KPIs, panels, theme, insights, assumptions) and runs the
  build script that embeds the data into a single offline, interactive HTML page (insights strip, KPI cards with
  targets and deltas, 12-month trends, month selector, click-to-records, sortable/searchable table, CSV export,
  "how calculated", print, keyboard + ARIA). Numbers are computed twice (Python + in-page JavaScript) and a badge
  shows they agree. Use when generating or changing the ITSM dashboard HTML, "zbuduj HTML", "rebuild the dashboard",
  "change the layout / target / title".
metadata:
  version: "0.1.0"
---

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
