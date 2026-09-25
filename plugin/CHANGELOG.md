# Changelog

## 0.3.0 — 24.09.2026
- Node engine (`lib/`), CLI (`scripts/itsm.mjs`), MCP server (`mcp/server.mjs`, `.mcp.json`), 17 shared tools.
- `propose` (default spec from profile), workspace with ORG_PROFILE.md / decisions / versions / BRIEF.md.
- Template: global filters (group, priority), `data-ask` hooks for the agent's "Ask about this".
- Skills: `itsm-intent-router`, `itsm-brief`; references: modules-and-views, raw-export-rules, example ORG_PROFILE; tool/CLI/Python mapping in every step.
- Parity: JS engine = Python builder = JS re-count = Python re-count on the synthetic sample (65/65).

## 0.1.0 — 24.09.2026
- 12 skills: orchestrator, domain, data reader, anonymisation, KPI analyzer (Lab 2), design reference analyzer (Lab 2),
  dashboard design, HTML builder, insights, verification, grill-me interview, learning loop.
- Scripts (Python stdlib): `pii_scan.py`, `profile_csv.py`, `build_dashboard.py`, `verify_kpis.py`, `build_prompt_pack.py`, `selftest.sh`.
- Dashboard template: insights strip, KPI cards with status/target/delta, SVG trends with target line, month selector,
  click-to-records, sortable/searchable details, CSV export, "how calculated", Python↔JS consistency badge,
  drop-zone and paste-spec modes, keyboard + ARIA, print.
- Synthetic example in the shape of the three pre-computed Service Desk exports (SLA P3/P4, CSAT, FCR).
- Manifests for Claude (`.claude-plugin/`) and Copilot Agent Plugins (root `plugin.json`); prompt pack.
- Tested: self-test 65/65 values match; browser test without errors (Chromium).
