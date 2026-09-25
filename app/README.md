# App — ITSM Dashboard agent on GitHub Copilot (v0.3)

Chat on the left, live dashboard on the right (also opens in its own window with the chat as a left drawer, Ctrl+B).
The agent runs on the **GitHub Copilot SDK**; its knowledge and tools come from `../plugin`.

```bash
npm install -g @github/copilot && copilot login   # once
npm install && npm start                           # http://localhost:3000
npm run start:offline                              # no LLM: scripted 8 steps, same engine
npm test                                           # offline end-to-end (HTTP + browser if Playwright is installed)
npm run eval:copilot                               # 6 conversation scenarios on real Copilot → workspace/eval-report.md
npm run smoke:copilot                              # connection check
npm run start:legacy                               # v0.2 agent (raw BMC exports, business hours) on the same port
```

Steps: 1 Goal · 2 Data & privacy · 3 Understand · 4 KPIs · 5 Look · 6 Build & verify · 7 Insights · 8 Export.
Buttons: Upload CSV files (several at once) · Use sample data (synthetic) · Compare with report (CSV `kpi,month,value`).
Downloads: dashboard HTML · BRIEF.md · verify.md · spec.json. Versions as tabs.
Environment: `PORT`, `ITSM_WORKSPACE`, `ITSM_PLUGIN_DIR`, `COPILOT_MODEL`, `COPILOT_TIMEOUT_MS`, `OFFLINE=1`, `COPILOT_GITHUB_TOKEN`.
In Codespaces the repository `GITHUB_TOKEN` is ignored (no Copilot rights): use `copilot login`.
