---
name: itsm-dashboard
description: >
  Builds a verified, clickable ITSM / Service Desk KPI dashboard (one offline HTML file) from CSV exports
  such as BMC Helix incident, SLA, first-call-resolution or customer-satisfaction files, optionally styled after
  a reference screenshot. Use when the user says "make an ITSM dashboard", "build a KPI dashboard from these CSV",
  "Service Desk dashboard", "zrób dashboard ITSM", "dashboard z tych plików", "FCR / SLA / CSAT dashboard",
  "monthly Service Desk report", or drops ITSM CSV files with a screenshot. Entry point of the ITSM Dashboard Kit:
  orchestrates the other itsm-* skills.
metadata:
  version: "0.1.0"
---

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
