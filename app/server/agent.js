// Agent on the GitHub Copilot SDK: one session, the plugin's skills as knowledge, the shared engine tools
// (plugin/lib/tools.mjs — the same tools the plugin's MCP server exposes) + a few UI tools.
// Login: `copilot login` (device flow) or COPILOT_GITHUB_TOKEN. Without it the server falls back to offline.
import { ITSM_TOOLS, runItsmTool } from '../../plugin/lib/tools.mjs';
import { systemMessage, skillDirectories, APP_ROOT } from './knowledge.js';

export const UI_TOOLS = [
  { name: 'ui_set_step', description: 'Tell the UI which step (1-8) the conversation is in: 1 Goal · 2 Data & privacy · 3 Understand data · 4 KPIs · 5 Look · 6 Build & verify · 7 Insights & changes · 8 Export.',
    parameters: { type: 'object', properties: { step: { type: 'integer', minimum: 1, maximum: 8 }, title: { type: 'string' } }, required: ['step'] },
    run: (ws, a, ctx) => { ctx.setStep(a.step); ctx.emit({ type: 'step', step: a.step, title: a.title }); return { ok: true }; } },
  { name: 'ui_show_dashboard', description: 'Refresh the dashboard preview in the UI (after itsm_build).',
    parameters: { type: 'object', properties: {} }, run: (ws, a, ctx) => { ctx.emit({ type: 'dashboard', url: '/dashboard.html?t=' + Date.now() }); return { ok: true, previewUrl: '/dashboard.html' }; } },
];

export async function runTool(ws, name, args, ctx) {
  ctx.emit({ type: 'tool', name });
  const ui = UI_TOOLS.find(t => t.name === name);
  if (ui) { try { return await ui.run(ws, args || {}, ctx); } catch (e) { return { error: e.message }; } }
  const r = await runItsmTool(ws, name, args);
  if (name === 'itsm_build' && !r.error) ctx.emit({ type: 'dashboard', url: '/dashboard.html?t=' + Date.now() });
  if (name === 'itsm_save_version' && !r.error) ctx.emit({ type: 'versions' });
  if (name === 'itsm_brief' && !r.error) ctx.emit({ type: 'brief', url: '/api/download/brief' });
  return r;
}

export class CopilotAgent {
  constructor(ws) { this.ws = ws; this.client = null; this.session = null; }
  static tokenPresent() { return Boolean(process.env.COPILOT_GITHUB_TOKEN || (process.env.CODESPACES !== 'true' && (process.env.GH_TOKEN || process.env.GITHUB_TOKEN))); }
  start() { return (this._starting ??= this._start().catch(e => { this._starting = null; throw e; })); }
  async _start() {
    const sdk = await import('@github/copilot-sdk');
    // In Codespaces GITHUB_TOKEN is a repository token without Copilot rights: use the `copilot login` account.
    if (process.env.CODESPACES === 'true') { delete process.env.GITHUB_TOKEN; delete process.env.GH_TOKEN; }
    const token = process.env.COPILOT_GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    this.client = new sdk.CopilotClient({ ...(token ? { gitHubToken: token } : { useLoggedInUser: true }), workingDirectory: APP_ROOT });
    await this.client.start();
    const defs = [...ITSM_TOOLS, ...UI_TOOLS];
    const tools = defs.map(d => sdk.defineTool(d.name, { description: d.description, parameters: d.parameters, skipPermission: true,
      handler: async args => JSON.stringify(await runTool(this.ws, d.name, args, this.ctx)) }));
    this.session = await this.client.createSession({
      clientName: 'itsm-dashboard-app', ...(process.env.COPILOT_MODEL ? { model: process.env.COPILOT_MODEL } : {}), streaming: true,
      onPermissionRequest: sdk.approveAll, tools, availableTools: defs.map(d => `custom:${d.name}`), // only our tools: no shell, no file edits
      skillDirectories: skillDirectories(), systemMessage: { content: systemMessage() },
    });
    this.session.on('assistant.message_delta', e => this.ctx?.emit({ type: 'delta', text: e.data?.deltaContent ?? '' }));
    this.session.on('session.error', e => this.ctx?.emit({ type: 'error', text: e.data?.message || 'Copilot error' }));
    this.session.on('tool.execution_start', e => this.ctx?.trace?.(e.data?.toolName));
  }
  async ask(text, ctx) {
    if (!this.session) await this.start();
    this.ctx = ctx; let streamed = false;
    const off = this.session.on('assistant.message_delta', () => { streamed = true; });
    try {
      const final = await this.session.sendAndWait({ prompt: text }, Number(process.env.COPILOT_TIMEOUT_MS || 300000));
      if (!streamed && final?.data?.content) ctx.emit({ type: 'delta', text: final.data.content });
      else if (!streamed) ctx.emit({ type: 'error', text: 'GitHub Copilot finished without a text answer. Try again or rephrase.' });
    } finally { off(); this.ctx = null; }
  }
  async stop() { try { await this.session?.disconnect(); await this.client?.stop(); } catch { /* ignore */ } }
}
