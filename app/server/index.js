// ITSM Dashboard app v0.3 — HTTP + SSE, no framework. Agent on GitHub Copilot (SDK), offline fallback.
// Engine, tools and knowledge come from ../plugin (the ITSM Dashboard Kit): one source for app and plugin.
// Run: npm start → http://localhost:3000 (in Codespaces the port is forwarded to *.app.github.dev).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Workspace } from '../../plugin/lib/workspace.mjs';
import { readReferenceCsv } from '../../plugin/lib/verify.mjs';
import { CopilotAgent } from './agent.js';
import { OfflineWizard } from './offline.js';
import { APP_ROOT, PLUGIN_ROOT, listSkills } from './knowledge.js';

const PORT = Number(process.env.PORT || 3000);
const WS_DIR = path.resolve(process.env.ITSM_WORKSPACE || path.join(APP_ROOT, 'workspace', 'session'));
const SAMPLE = path.join(PLUGIN_ROOT, 'examples', 'mock-3csv');
const FORCE_OFFLINE = process.env.OFFLINE === '1' || process.argv.includes('--offline');
const ws = new Workspace(WS_DIR);

let agent, mode, modeReason, busy = false, step = 1, history = [];
function startAgent() {
  if (FORCE_OFFLINE) { agent = new OfflineWizard(ws, 'forced offline: OFFLINE=1'); mode = 'offline'; modeReason = 'forced offline'; return; }
  agent = new CopilotAgent(ws); mode = 'copilot'; modeReason = CopilotAgent.tokenPresent() ? 'GitHub Copilot (token)' : 'GitHub Copilot (logged-in user)';
  const a = agent;
  a.start().then(() => console.log('✓ GitHub Copilot connected — skills:', listSkills().map(s => s.name).join(', ')))
    .catch(e => { if (agent !== a) return; console.error('✗ GitHub Copilot unavailable:', e.message, '→ offline wizard'); agent = new OfflineWizard(ws, 'Copilot error: ' + e.message); mode = 'offline'; modeReason = 'Copilot error: ' + e.message; });
}
function reset() { ws.reset(); history = []; step = 1; agent?.stop?.(); startAgent(); }
startAgent();
history = []; // a fresh server shows an empty conversation; the workspace (files, spec, dashboard) is kept

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.csv': 'text/csv; charset=utf-8' };
const send = (res, code, body, type = 'application/json; charset=utf-8', extra = {}) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
const readBody = req => new Promise((ok, fail) => { const c = []; req.on('data', x => c.push(x)); req.on('end', () => ok(Buffer.concat(c))); req.on('error', fail); });
const sys = text => history.push({ role: 'sys', text });

async function chat(res, message, silent, display) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  const turn = { role: 'bot', text: '', tools: [] };
  const ctx = {
    emit: ev => { if (ev.type === 'delta') turn.text += ev.text; else if (ev.type === 'tool') turn.tools.push(ev.name); else if (ev.type === 'error') sys('⚠ ' + ev.text); try { res.write(`data: ${JSON.stringify(ev)}\n\n`); } catch { /* client gone */ } },
    setStep: s => { step = s; },
  };
  if (busy) { ctx.emit({ type: 'error', text: 'Still working on the previous message…' }); ctx.emit({ type: 'done' }); return res.end(); }
  busy = true; const t0 = Date.now();
  console.log(`[chat] ${mode} ← ${silent ? '(auto) ' : ''}"${String(message).slice(0, 80)}"`);
  if (!silent) history.push({ role: 'user', text: display || message });
  ctx.emit({ type: 'mode', mode, reason: modeReason });
  try { await agent.ask(message, ctx); }
  catch (e) {
    if (mode === 'copilot') {
      console.error('✗ GitHub Copilot error:', e.message, '→ offline wizard');
      ctx.emit({ type: 'error', text: `GitHub Copilot unavailable (${e.message}). Switching to the offline wizard.` });
      agent = new OfflineWizard(ws, 'Copilot error: ' + e.message); mode = 'offline'; modeReason = 'Copilot error: ' + e.message;
      ctx.emit({ type: 'mode', mode, reason: modeReason });
      try { await agent.ask(agent.stage === 'start' ? message : 'continue', ctx); } catch (e2) { ctx.emit({ type: 'error', text: e2.message }); }
    } else ctx.emit({ type: 'error', text: e.message });
  } finally {
    busy = false; if (turn.text || turn.tools.length) history.push(turn);
    console.log(`[chat] ${mode} → ${((Date.now() - t0) / 1000).toFixed(1)} s, ${turn.text.length} chars, tools: ${turn.tools.join(', ') || '—'}`);
    ctx.emit({ type: 'done' }); res.end();
  }
}

const file = f => path.join(WS_DIR, f);
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`), P = url.pathname;
  try {
    if (req.method === 'GET' && (P === '/' || P.startsWith('/web/'))) {
      const f = path.join(APP_ROOT, 'web', path.normalize(P === '/' ? 'index.html' : P.slice(5)).replace(/^(\.\.[/\\])+/, ''));
      return fs.existsSync(f) ? send(res, 200, fs.readFileSync(f), TYPES[path.extname(f)] || 'text/plain') : send(res, 404, 'not found', 'text/plain');
    }
    if (P === '/favicon.ico') { res.writeHead(204); return res.end(); }
    if (P === '/healthz') return send(res, 200, { ok: true, mode });
    if (req.method === 'GET' && P === '/api/status') return send(res, 200, { mode, reason: modeReason, step, workspace: ws.status(), history, skills: listSkills().map(s => s.name) });
    if (req.method === 'POST' && P === '/api/chat') { const { message, silent, display } = JSON.parse((await readBody(req)).toString('utf8') || '{}'); return chat(res, message || '', !!silent, display || null); }
    if (req.method === 'POST' && P === '/api/files') {
      const name = ws.addInput(url.searchParams.get('name') || 'upload.csv', await readBody(req));
      const s = ws.scan(), f = s.files.find(x => x.file === name);
      sys(`${name}: ${f?.rows ?? '?'} rows uploaded and anonymised (removed: ${f?.dropped.join(', ') || '—'}${f?.onHold.length ? '; ON HOLD: ' + f.onHold.map(c => c.column).join(', ') : ''})`);
      return send(res, 200, { file: name, ...f });
    }
    if (req.method === 'POST' && P === '/api/use-sample') {
      for (const f of fs.readdirSync(SAMPLE).filter(f => f.endsWith('.csv'))) ws.addInput(f, fs.readFileSync(path.join(SAMPLE, f)));
      const s = ws.scan(); s.files.forEach(f => sys(`${f.file}: ${f.rows} rows (synthetic sample) uploaded and anonymised`));
      return send(res, 200, s);
    }
    if (req.method === 'POST' && P === '/api/reference') {
      fs.writeFileSync(file('reference.csv'), await readBody(req));
      const v = ws.verify({ reference: readReferenceCsv(file('reference.csv')), tolerance: Number(url.searchParams.get('tolerance') || 0.1) });
      sys(`Reference report compared: ${v.reference.filter(r => r.withinTolerance).length} of ${v.reference.length} values within ±${url.searchParams.get('tolerance') || 0.1}.`);
      return send(res, 200, v);
    }
    if (req.method === 'POST' && P === '/api/reset') { reset(); return send(res, 200, { ok: true, mode }); }
    if (req.method === 'GET' && P === '/dashboard.html') {
      const drawer = '<script src="/web/drawer.js"></script>';
      const html = fs.existsSync(file('dashboard.html')) ? fs.readFileSync(file('dashboard.html'), 'utf8') : '<!doctype html><html><head><meta charset="utf-8"><title>ITSM KPI dashboard</title></head><body><p style="font:14px system-ui;color:#777;padding:24px">The dashboard appears here after it is built. Open the chat panel on the left (Ctrl+B).</p></body></html>';
      const i = html.lastIndexOf('</body>');
      return send(res, 200, i >= 0 ? html.slice(0, i) + drawer + html.slice(i) : html + drawer, TYPES['.html']);
    }
    const DL = { dashboard: ['dashboard.html', 'itsm-dashboard.html'], brief: ['BRIEF.md', 'BRIEF.md'], verify: ['verify.md', 'verify.md'], spec: ['spec.json', 'spec.json'], profile: ['profile.md', 'profile.md'], privacy: ['pii_report.md', 'pii_report.md'], org: ['ORG_PROFILE.md', 'ORG_PROFILE.md'] };
    if (req.method === 'GET' && P.startsWith('/api/download/')) {
      const k = P.split('/').pop(); if (k === 'brief' && !fs.existsSync(file('BRIEF.md')) && ws.status().spec) ws.brief();
      const d = DL[k]; if (!d || !fs.existsSync(file(d[0]))) return send(res, 404, { error: 'not available yet' });
      return send(res, 200, fs.readFileSync(file(d[0])), TYPES[path.extname(d[0])], { 'Content-Disposition': `attachment; filename="${d[1]}"` });
    }
    if (req.method === 'GET' && P === '/api/versions') return send(res, 200, ws.versions());
    if (req.method === 'POST' && P === '/api/versions') { const { name } = JSON.parse((await readBody(req)).toString('utf8') || '{}'); const v = ws.saveVersion(name); sys(`Saved dashboard version “${v.name}”.`); return send(res, 200, v); }
    if (req.method === 'POST' && P.startsWith('/api/versions/') && P.endsWith('/restore')) { const r = ws.restoreVersion(P.split('/')[3]); sys(`Restored “${r.restored}” as the working version.`); return send(res, 200, r); }
    if (req.method === 'GET' && P.startsWith('/versions/')) { const f = file(path.join('versions', path.basename(P))); return fs.existsSync(f) && f.endsWith('.html') ? send(res, 200, fs.readFileSync(f), TYPES['.html']) : send(res, 404, 'not found', 'text/plain'); }
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 400, { error: e.message }); }
});

server.listen(PORT, () => console.log(`ITSM Dashboard app v0.3 → http://localhost:${PORT}  (mode: ${mode} — ${modeReason}; workspace ${WS_DIR}; knowledge ${PLUGIN_ROOT})`));
