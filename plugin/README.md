# ITSM Dashboard Kit — plugin (v0.3.0)

A set of skills that gives any LLM on the user's computer the knowledge a Service Desk analyst has:
what ITSM data means, which KPIs answer a manager's questions, how to present them, and how to prove the numbers.
One prompt ("build a dashboard from these CSV files, styled like this screenshot") produces a **verified,
clickable, single-file HTML dashboard** — the numbers are computed by code, never typed by the model.

Same skills, four places to run them: Claude (Cowork / Claude Code), GitHub Copilot (VS Code, Copilot CLI),
a prompt pack for chats without skills, and the chat agent on Copilot infrastructure (wave 3).

## What is new in 0.3
- **Engine in Node (no dependencies)** shared with the web app: `lib/`, CLI `scripts/itsm.mjs`, **MCP server** `mcp/server.mjs`
  (declared in `.mcp.json`, so Claude gets the `itsm_*` tools automatically). Python scripts stay as twins/independent checks.
- `itsm_propose_spec`: a complete default dashboard from the data profile (quick mode in one command).
- Global filters (group, priority) on the page; drill-down tools; reference comparison; ORG_PROFILE memory; BRIEF.md.
- Knowledge of the v0.2 agent merged in: `itsm-intent-router`, `itsm-brief`, modules & views, raw-export rules, example ORG_PROFILE.

## Skills

| Skill | What it knows / does | Origin |
|---|---|---|
| `itsm-dashboard` | Orchestrator: flow, gates, quick (one-prompt) vs guided mode | new |
| `itsm-domain` | ITSM, Service Desk, BMC Helix, P1–P4, SLA/SLT, FCR, CSAT, backlog, MTTR; glossary EN/PL | chat v0.2 glossary + BMC dictionary |
| `itsm-data-reader` | What is inside the CSV files and what each column means for KPIs; profiler script | new (+ Lab 2 API contract idea) |
| `itsm-anonymize` | Personal-data gate: drop / hash / on hold; anonymised copies | chat v0.2 anonymizer, ported to Python |
| `itsm-kpi-analyzer` | Lab 2 method: Business Question → KPI → Query → Widget → Filter → Validation; question bank | AI Lab 2 |
| `itsm-design-reference` | Screenshot → DESIGN.md tokens + layout pattern | Lab 2 `design-reference-analyzer` |
| `itsm-dashboard-design` | Dashboard design rules: insight-first, status vs series colours, one axis, empty states, a11y | Lab 2 design tokens + dataviz/frontend-design principles |
| `itsm-html-builder` | spec.json → offline interactive HTML (template + build script) | chat v0.2 renderer, rewritten |
| `itsm-insights` | "What the data says": findings with numbers and comparisons | chat v0.2 attention strip |
| `itsm-verify` | Independent re-count + comparison with an official report | chat v0.2 verify |
| `itsm-grill-me` | One-question-at-a-time interview → ORG_PROFILE.md | grill-me pattern (Matt Pocock, MIT) |
| `itsm-learn` | Writes lessons to ORG_PROFILE.md / LEARNINGS.md / proposed skill edits ("training") | new |
| `itsm-intent-router` | 12 intents + 15 typical manager questions → answer path | agent v0.2 |
| `itsm-brief` | BRIEF.md (10 sections) from the workspace | agent v0.2 brief |
| `itsm-ui-design` | UI guardian + UX/a11y audit: mockup before code, 25 rules, tokens, measurement, MagicPath CLI workflow | author's fly4adventure-design + magicpath-parity |

## Install

**Claude (Cowork / Claude Code):** install the `.plugin` file, or `claude plugin marketplace add <repo>` →
`claude plugin install itsm-dashboard-kit`.

**GitHub Copilot CLI:** `copilot plugin install <owner>/<repo>` (the CLI reads `.claude-plugin/plugin.json` and the root
`plugin.json`). **VS Code (agent mode):** copy `skills/*` into `.github/skills/` of the workspace (works everywhere
Agent Skills are supported). *To confirm on the target laptop — Copilot plugin support is recent.*

**Chat without skills (e.g. M365 Copilot chat):** attach `prompt-pack/ITSM_KNOWLEDGE.md`, the CSV files and the
screenshot, paste `prompt-pack/PROMPT.md`; open `prompt-pack/dashboard-blank.html`, paste the spec, drop the CSVs.

Requirements for the scripts: Python 3.8+ (standard library only). No internet needed.

## Try it (synthetic data)
```bash
bash scripts/selftest.sh          # anonymise → profile → build → verify on examples/mock-3csv
```
Then ask: *"Build the ITSM dashboard from examples/mock-3csv"*.

## Workspace convention
Everything a run produces goes to `itsm-workspace/` in the user's folder: `ORG_PROFILE.md`, `pii_report.md`,
`profile.md`, `KPI_SPEC.md`, `DESIGN.md`, `spec.json`, `dashboard.html`, `kpi_results.json`, `verify.md`, `LEARNINGS.md`.
`ORG_PROFILE.md` is the organisation's memory — the next run starts from it.

## Data rules
Only anonymised exports; the anonymisation gate runs first anyway. Never commit real client data to a public
repository. `examples/` contains synthetic data only.

## Limits of v0.1
No business-hours computation from raw timestamps (use pre-computed SLA/FCR exports), no global group/priority
filters, no drag & drop, no weekly view. See `ROADMAP.md`.
