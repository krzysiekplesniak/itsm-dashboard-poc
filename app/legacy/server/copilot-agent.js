// Agent na GitHub Copilot SDK: sesja z naszym skillem (itsm-dashboard) i narzędziami silnika.
// Logowanie: token GitHub z licencją Copilot (COPILOT_GITHUB_TOKEN / GH_TOKEN / GITHUB_TOKEN)
// albo zalogowany użytkownik Copilot CLI. Bez tego serwer przechodzi w tryb offline.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOL_DEFS, runTool } from '../src/tools.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Skille trzymamy w widocznym folderze skills/ (Copilot SDK dostaje go przez skillDirectories).
// Dla Copilota w VS Code / Claude Code można skopiować skills/ do .github/skills/ lub .claude/skills/.
const SKILL_DIR = path.join(ROOT, 'skills');

// Główny skill (itsm-dashboard + references) oraz skille pomocnicze v0.2 (kpi-library, data-anonymizer, intent-router)
function skillText() {
  const strip = t => t.replace(/^---[\s\S]*?---\s*/, '');
  const base = path.join(SKILL_DIR, 'itsm-dashboard');
  const parts = [strip(fs.readFileSync(path.join(base, 'SKILL.md'), 'utf8'))];
  for (const f of fs.readdirSync(path.join(base, 'references')).sort()) parts.push(`\n\n<!-- reference: ${f} -->\n` + fs.readFileSync(path.join(base, 'references', f), 'utf8'));
  for (const d of fs.readdirSync(SKILL_DIR).filter(d => d !== 'itsm-dashboard').sort()) {
    const f = path.join(SKILL_DIR, d, 'SKILL.md'); if (fs.existsSync(f)) parts.push(`\n\n<!-- skill: ${d} -->\n` + strip(fs.readFileSync(f, 'utf8')));
  }
  return parts.join('');
}

export class CopilotAgent {
  constructor(project, ctxFactory) { this.project = project; this.ctxFactory = ctxFactory; this.client = null; this.session = null; this.listeners = new Set(); }

  static tokenPresent() { return Boolean(process.env.COPILOT_GITHUB_TOKEN || (process.env.CODESPACES !== 'true' && (process.env.GH_TOKEN || process.env.GITHUB_TOKEN))); }

  start() { return (this._starting ??= this._start().catch(e => { this._starting = null; throw e; })); }

  async _start() {
    const sdk = await import('@github/copilot-sdk');
    // W GitHub Codespaces GITHUB_TOKEN/GH_TOKEN to token repozytorium bez uprawnień do Copilota:
    // ignorujemy go i używamy konta zalogowanego przez `copilot login` (albo COPILOT_GITHUB_TOKEN).
    if (process.env.CODESPACES === 'true') { delete process.env.GITHUB_TOKEN; delete process.env.GH_TOKEN; }
    const token = process.env.COPILOT_GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    this.client = new sdk.CopilotClient({ ...(token ? { gitHubToken: token } : { useLoggedInUser: true }), workingDirectory: ROOT });
    await this.client.start();
    const tools = TOOL_DEFS.map(def => sdk.defineTool(def.name, {
      description: def.description,
      parameters: def.schema,
      skipPermission: true,
      handler: async (args) => JSON.stringify(await runTool(def.name, this.project, args, this.currentCtx)),
    }));
    this.session = await this.client.createSession({
      clientName: 'itsm-dashboard-chat',
      ...(process.env.COPILOT_MODEL ? { model: process.env.COPILOT_MODEL } : {}),
      streaming: true,
      onPermissionRequest: sdk.approveAll,
      tools,
      availableTools: TOOL_DEFS.map(t => `custom:${t.name}`), // tylko nasze narzędzia: bez shella i edycji plików
      skillDirectories: [SKILL_DIR],
      systemMessage: { content: 'You are the ITSM dashboard wizard. Follow this skill strictly.\n\n' + skillText() },
    });
    this.session.on('assistant.message_delta', e => this.currentCtx?.emit({ type: 'delta', text: e.data?.deltaContent ?? '' }));
    this.session.on('session.error', e => this.currentCtx?.emit({ type: 'error', text: e.data?.message || 'Copilot error' }));
  }

  /** Jedna tura rozmowy. ctx.emit wysyła zdarzenia do przeglądarki (SSE). */
  async ask(text, ctx) {
    if (!this.session) await this.start();
    this.currentCtx = ctx;
    let streamed = false;
    const off = this.session.on('assistant.message_delta', () => { streamed = true; });
    try {
      const final = await this.session.sendAndWait({ prompt: text }, 180000);
      if (!streamed && final?.data?.content) ctx.emit({ type: 'delta', text: final.data.content });
      else if (!streamed) ctx.emit({ type: 'error', text: 'GitHub Copilot finished without a text answer (see the terminal). Try again or rephrase.' });
    } finally { off(); this.currentCtx = null; }
  }

  async stop() { try { await this.session?.disconnect(); await this.client?.stop(); } catch { /* ignore */ } }
}
