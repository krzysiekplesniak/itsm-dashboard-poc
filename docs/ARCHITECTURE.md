# Architecture (v0.3)

```
                ┌──────────────────────────── plugin/ (single source) ────────────────────────────┐
                │ skills/*  knowledge (15 skills)          lib/*.mjs  engine: csv · pii · profile   │
                │ templates/dashboard.html (shared page)  · propose · engine · verify · spec-ops    │
                │ scripts/itsm.mjs (CLI) · Python twins    · brief · workspace · tools (17 tools)   │
                │ mcp/server.mjs (MCP stdio, no deps)                                               │
                └───────┬───────────────────────┬───────────────────────┬──────────────────────────┘
                        │ skills + tools        │ tools (MCP)           │ tools (MCP) / CLI
        app/ web app on GitHub Copilot SDK   Claude (Cowork/Code)   GitHub Copilot (VS Code, CLI)
        chat + preview + drawer + versions   plugin installed       .vscode/mcp.json / plugin
```

- **Workspace on disk** (`itsm-workspace/` or `app/workspace/session`): input/ → data/ (anonymised) → profile →
  spec.json → dashboard.html + kpi_results.json → verify.md; ORG_PROFILE.md + decisions.json remember the owner's rules.
  Any front-end can continue the work of another.
- **Spec-driven page**: the agent/LLM writes `spec.json` (sources, KPIs, panels, filters, insights); the engine
  computes; the template renders and recomputes in the browser (badge = both agree). Global filters (group,
  priority), drill-down to records, CSV export, "how calculated", keyboard + ARIA.
- **Verification**: four implementations agree on every value — JS engine, Python builder, JS independent
  re-count, Python independent re-count — plus the in-page computation; optional comparison with the provider report.
- **Knowledge**: the app's system message = app skill + orchestrator + domain + KPI analyzer + intent router + insights;
  all other skills via `skillDirectories` (loaded on demand). Editing a skill in `plugin/skills` changes both the
  plugin and the agent.
