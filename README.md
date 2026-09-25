# ITSM Dashboard PoC — agent on GitHub Copilot + plugin (v0.3)

From ITSM exports (CSV, e.g. BMC Helix) to a **verified, clickable KPI dashboard** in one conversation.
All knowledge of *how to build a Service Desk KPI dashboard* lives in one place — the skills of the
**ITSM Dashboard Kit** — and reaches the user in one of two ways:

| Way | What the user does | Where it runs |
|---|---|---|
| **Agent (web app)** | chats with the agent, uploads exports, sees the dashboard live | GitHub Copilot SDK; hosted in GitHub Codespaces (or locally) |
| **Plugin** | uses their own assistant (Claude, GitHub Copilot) with the plugin installed | the user's computer |

Both use the **same skills, the same engine and the same dashboard template**, so the same data gives the same
dashboard either way. Numbers are computed by code (and re-computed independently), never typed by a model.

```
plugin/   ITSM Dashboard Kit — skills (knowledge), engine (lib/), CLI, MCP server, dashboard template, examples
app/      web app: chat + live preview; agent on GitHub Copilot SDK using plugin/skills + plugin/lib tools
app/legacy/  v0.2 agent (raw BMC export engine with business hours) — kept for wave 2
scripts/  site builder (GitHub Pages), publish scripts, public-repo name gate
.devcontainer/  Codespaces · .vscode/mcp.json  engine tools for Copilot in VS Code · .github/workflows  CI, Pages, monthly run
```

## Start
**Codespaces (GitHub infrastructure):** *Code → Codespaces → Create* (or the button on the Pages site), then
```bash
copilot login          # device code in the browser, your Copilot licence
cd app && npm start    # port 3000 opens as https://<codespace>-3000.app.github.dev
```
**Laptop:** Node ≥ 20.19 · `npm install -g @github/copilot` · `copilot login` · `cd app && npm install && npm start` → http://localhost:3000.
No Copilot login → the app runs the **offline wizard** (same steps and engine, no LLM).

**Plugin:** Claude — install `itsm-dashboard-kit.plugin` (from the Pages site) or `claude plugin marketplace add <owner>/<repo>`;
Copilot CLI — `copilot plugin install <owner>/<repo>:plugin`; VS Code — open this repo (skills in `plugin/skills`,
engine tools via `.vscode/mcp.json`). Quick check without any assistant: `node plugin/scripts/itsm.mjs all plugin/examples/mock-3csv/*.csv`.

## Tests
`cd app && npm test` (offline end-to-end, 16 checks incl. browser) · `bash plugin/scripts/selftest.sh` ·
`cd app && npm run eval:copilot` (real Copilot conversation, 6 scenarios → `app/workspace/eval-report.md`).

## Data
Only anonymised exports; every file passes the personal-data gate first. Never commit real data to a public
repository (`data/private/` is ignored; the monthly workflow runs only in private repositories).
`node scripts/check-public.mjs` blocks protected names before publishing.

See `docs/ARCHITECTURE.md` and `docs/ROADMAP.md`.
