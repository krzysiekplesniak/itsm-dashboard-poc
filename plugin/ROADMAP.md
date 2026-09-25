# Roadmap

## Wave 3 · v0.3 — functional agent + shared knowledge ✅ (this version)
- Real-data format: pre-computed exports (SLA Met/Missed + SLA name prefix, FCR "SLA met?", CSAT score ÷ 2) — profile → proposed spec → build → verify.
- One knowledge base: agent loads the plugin skills; agent v0.2 knowledge merged into the plugin (intent router, brief, modules/views, raw-export rules, example ORG_PROFILE).
- Shared engine (Node, zero deps) + 17 tools used by the app, the MCP server, the CLI and the offline wizard.
- Global filters (group, priority) on the page and in the tools; drill-down; reference comparison with the provider report; versions; BRIEF.md; ORG_PROFILE.md memory.
- `npm run eval:copilot` — conversation eval on real Copilot (6 scenarios); `npm test` — offline E2E incl. browser.
- Hosting on GitHub: Codespaces (agent), Pages (site + browser app + plugin download), CI.
- Not in this wave (visual layer): MagicPath layout, drag & drop.

## Wave 4 · v0.4 — engine as a service + automation
Built: MCP server `itsm-engine` (plugin `.mcp.json`, `.vscode/mcp.json`) · monthly GitHub Actions run (private repo) · browser-only dashboard app on Pages.
Next: raw BMC export mode in the shared engine (business hours, holidays, pending, at-risk) · weekly view · alert when a KPI falls below target (Teams / e-mail from the monthly run) · M365 Copilot agent with the same skills · eval in CI with a Copilot token · organisation design tokens (MagicPath).

## Wave 5 · v1 — live and multi-domain
BMC Helix live (Smart Reporting schedule / REST) · Change, Problem, Request, Knowledge packs · link with the ITSM virtual agent for end users · governance (KPI owners, approvals, audit trail).
