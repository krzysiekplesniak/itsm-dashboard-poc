// Serwer czatu: http + SSE, bez frameworka. Uruchom: npm start → http://localhost:3000
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project } from '../src/project.js';
import { CopilotAgent } from './copilot-agent.js';
import { OfflineWizard } from './offline-wizard.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WS = path.join(ROOT, 'workspace');
fs.mkdirSync(WS, { recursive: true });
const PORT = Number(process.env.PORT || 3000);
const FORCE_OFFLINE = process.env.OFFLINE === '1' || process.argv.includes('--offline');

let project, agent, mode, modeReason, busy = false;
let history = []; // transkrypt rozmowy: UI odtwarza go po odświeżeniu (także czat w panelu bocznym dashboardu)
function reset() {
  project = new Project(); history = [];
  // Domyślnie próbujemy Copilota: token z env ALBO konto zalogowane przez `copilot login` / `gh auth login`.
  // Jeśli logowania brak, pierwsza wiadomość zwróci błąd i serwer sam przejdzie w tryb offline.
  if (!FORCE_OFFLINE) { agent = new CopilotAgent(project); mode = 'copilot'; modeReason = CopilotAgent.tokenPresent() ? 'GitHub Copilot (token)' : 'GitHub Copilot (logged-in user)'; }
  else { agent = new OfflineWizard(project, 'forced offline: OFFLINE=1'); mode = 'offline'; modeReason = 'forced offline'; }
  // Łączymy się z Copilotem od razu przy starcie, żeby błąd logowania był widoczny w terminalu i w UI, a nie dopiero po pierwszej wiadomości.
  if (mode === 'copilot') {
    const a = agent;
    a.start().then(() => console.log('✓ GitHub Copilot connected (session ready)'))
      .catch(e => { if (agent !== a) return; console.error('✗ GitHub Copilot unavailable:', e.message, '→ offline wizard'); agent = new OfflineWizard(project, 'Copilot error: ' + e.message); mode = 'offline'; modeReason = 'Copilot error: ' + e.message; });
  }
}
reset();

const VDIR = path.join(WS, 'versions'); fs.mkdirSync(VDIR, { recursive: true });
// Wersje: pracujemy na jednej wersji roboczej; „Save version” zapisuje migawkę (HTML + spec) jako zakładkę.
function listVersions() {
  return fs.readdirSync(VDIR).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(VDIR, f), 'utf8')))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(({ spec, ...v }) => v);
}
function saveVersion(name) {
  const f = path.join(WS, 'dashboard.html');
  if (!fs.existsSync(f)) throw new Error('No dashboard yet — build it first (step 6).');
  const n = listVersions().length + 1; const id = 'v' + String(n).padStart(2, '0') + '-' + Date.now().toString(36);
  const v = { id, n, name: String(name || `Version ${n}`).slice(0, 60), createdAt: new Date().toISOString(), month: project.spec.month || project.computed?.defaultMonth || null, spec: project.spec };
  fs.copyFileSync(f, path.join(VDIR, id + '.html')); fs.writeFileSync(path.join(VDIR, id + '.json'), JSON.stringify(v));
  const { spec, ...pub } = v; return pub;
}
function restoreVersion(id) {
  const v = JSON.parse(fs.readFileSync(path.join(VDIR, path.basename(id) + '.json'), 'utf8'));
  if (!project.files.incidents || !project.mappings.incidents) throw new Error('Load the data first (same files), then restore the version.');
  project.spec = JSON.parse(JSON.stringify(v.spec)); fs.writeFileSync(path.join(WS, 'dashboard.html'), project.render());
  return { restored: v.name };
}

const ctxFor = res => ({
  emit: ev => res.write(`data: ${JSON.stringify(ev)}\n\n`),
  saveDashboard: html => fs.writeFileSync(path.join(WS, 'dashboard.html'), html),
  saveVersion,
  saveBrief: md => fs.writeFileSync(path.join(WS, 'BRIEF.md'), md),
});

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png' };
const send = (res, code, body, type = 'application/json; charset=utf-8', extra = {}) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
const readBody = req => new Promise((ok, fail) => { const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => ok(Buffer.concat(chunks).toString('utf8'))); req.on('error', fail); });

async function chat(res, message, silent = false, display = null) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  const base = ctxFor(res);
  const turn = { role: 'bot', text: '', tools: [] };
  // Zdarzenia idą do przeglądarki i jednocześnie do transkryptu (nawet jeśli przeglądarka się rozłączy)
  const ctx = { ...base, emit: ev => {
    if (ev.type === 'delta') turn.text += ev.text;
    else if (ev.type === 'tool') turn.tools.push(ev.name);
    else if (ev.type === 'error') history.push({ role: 'sys', text: '⚠ ' + ev.text });
    try { base.emit(ev); } catch { /* klient rozłączony */ }
  } };
  if (busy) { ctx.emit({ type: 'error', text: 'Still working on the previous message…' }); ctx.emit({ type: 'done' }); return res.end(); }
  busy = true; const t0 = Date.now();
  console.log(`[chat] ${mode} ← ${silent ? '(auto) ' : ''}"${String(message).slice(0, 80)}"`);
  if (!silent) history.push({ role: 'user', text: display || message });
  ctx.emit({ type: 'mode', mode, reason: modeReason });
  try { await agent.ask(message, ctx); }
  catch (e) {
    if (mode === 'copilot') {
      // Fallback: Copilot niedostępny (brak licencji, sieć) → tryb offline, żeby demo nie stanęło
      console.error('✗ GitHub Copilot error:', e.message, '→ offline wizard');
      ctx.emit({ type: 'error', text: `GitHub Copilot unavailable (${e.message}). Switching to offline wizard.` });
      const p = project; agent = new OfflineWizard(p, 'Copilot error: ' + e.message); mode = 'offline'; modeReason = 'Copilot error: ' + e.message;
      ctx.emit({ type: 'mode', mode, reason: modeReason });
      if (agent.stage !== 'start') { ctx.emit({ type: 'delta', text: `_Continuing offline at step ${project.step} (${agent.stage}) — your data, mapping and layout are kept._\n\n` }); return; }
      try { await agent.ask(message, ctx); } catch (e2) { ctx.emit({ type: 'error', text: e2.message }); }
    } else ctx.emit({ type: 'error', text: e.message });
  } finally { busy = false; if (turn.text || turn.tools.length) history.push(turn);
    console.log(`[chat] ${mode} → ${((Date.now() - t0) / 1000).toFixed(1)} s, ${turn.text.length} chars, tools: ${turn.tools.join(', ') || '—'}${turn.text ? '' : '  ⚠ NO TEXT ANSWER'}`); ctx.emit({ type: 'done' }); res.end(); }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname.startsWith('/web/'))) {
      const f = url.pathname === '/' ? 'index.html' : url.pathname.slice(5);
      const file = path.join(ROOT, 'web', path.normalize(f).replace(/^(\.\.[/\\])+/, ''));
      return fs.existsSync(file) ? send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'text/plain') : send(res, 404, 'not found', 'text/plain');
    }
    if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
    if (req.method === 'GET' && url.pathname === '/api/status') return send(res, 200, { mode, reason: modeReason, step: project.step, files: Object.fromEntries(Object.entries(project.files).map(([k, f]) => [k, { name: f.name, rows: f.rows.length }])), hasDashboard: fs.existsSync(path.join(WS, 'dashboard.html')), history });
    if (req.method === 'POST' && url.pathname === '/api/chat') { const { message, silent, display } = JSON.parse(await readBody(req) || '{}'); return chat(res, message || '', !!silent, display || null); }
    if (req.method === 'POST' && url.pathname === '/api/upload') {
      const kind = url.searchParams.get('kind'); const name = url.searchParams.get('name') || `${kind}.csv`;
      const r = project.loadFile(kind, name, await readBody(req));
      history.push({ role: 'sys', text: `${name}: ${r.rows} rows loaded and anonymised (removed: ${r.anonymization.dropped.join(', ') || '—'})` });
      return send(res, 200, r);
    }
    if (req.method === 'POST' && url.pathname === '/api/use-mock') {
      const out = [];
      for (const [kind, f] of [['incidents', 'bmc_incidents_mock.csv'], ['surveys', 'bmc_surveys_mock.csv']]) out.push(project.loadFile(kind, f, fs.readFileSync(path.join(ROOT, 'data', 'mock', f), 'utf8')));
      out.forEach(x => history.push({ role: 'sys', text: `${x.name}: ${x.rows} rows loaded and anonymised (removed: ${x.anonymization.dropped.join(', ') || '—'})` }));
      return send(res, 200, out);
    }
    if (req.method === 'POST' && url.pathname === '/api/reset') { await agent.stop?.(); reset(); for (const f of ['dashboard.html', 'BRIEF.md']) fs.rmSync(path.join(WS, f), { force: true }); return send(res, 200, { ok: true, mode }); }
    if (req.method === 'GET' && url.pathname === '/dashboard.html') {
      const f = path.join(WS, 'dashboard.html');
      const drawer = '<script src="/web/drawer.js"></script>';
      const html = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '<!doctype html><html><head><meta charset="utf-8"><title>ITSM KPI Dashboard</title></head><body><p style="font:14px sans-serif;color:#888;padding:24px">The dashboard appears here after step 6 — open the chat panel on the left (Ctrl+B).</p></body></html>';
      const i = html.lastIndexOf('</body>');
      return send(res, 200, i >= 0 ? html.slice(0, i) + drawer + html.slice(i) : html + drawer, TYPES['.html']);
    }
    if (req.method === 'GET' && url.pathname === '/api/download/dashboard') { const f = path.join(WS, 'dashboard.html'); return fs.existsSync(f) ? send(res, 200, fs.readFileSync(f), TYPES['.html'], { 'Content-Disposition': 'attachment; filename="itsm-dashboard.html"' }) : send(res, 404, { error: 'no dashboard yet' }); }
    if (req.method === 'POST' && url.pathname === '/api/calendar') { const r = project.setCalendar(await readBody(req), url.searchParams.get('name') || 'calendar.json'); history.push({ role: 'sys', text: `Business calendar loaded: ${r.name} (${r.hours}).` }); return send(res, 200, r); }
    if (req.method === 'GET' && url.pathname === '/api/versions') return send(res, 200, listVersions());
    if (req.method === 'POST' && url.pathname === '/api/versions') { const { name } = JSON.parse(await readBody(req) || '{}'); const v = saveVersion(name); history.push({ role: 'sys', text: `Saved dashboard version “${v.name}”.` }); return send(res, 200, v); }
    if (req.method === 'POST' && url.pathname.startsWith('/api/versions/') && url.pathname.endsWith('/restore')) { const r = restoreVersion(url.pathname.split('/')[3]); history.push({ role: 'sys', text: `Restored “${r.restored}” as the working version.` }); return send(res, 200, r); }
    if (req.method === 'GET' && url.pathname.startsWith('/versions/')) { const f = path.join(VDIR, path.basename(url.pathname)); return fs.existsSync(f) && f.endsWith('.html') ? send(res, 200, fs.readFileSync(f), TYPES['.html']) : send(res, 404, 'not found', 'text/plain'); }
    if (req.method === 'GET' && url.pathname === '/api/download/brief') { const f = path.join(WS, 'BRIEF.md'); if (!fs.existsSync(f)) fs.writeFileSync(f, project.brief()); return send(res, 200, fs.readFileSync(f), TYPES['.md'], { 'Content-Disposition': 'attachment; filename="BRIEF.md"' }); }
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 400, { error: e.message }); }
});

server.listen(PORT, () => console.log(`ITSM dashboard chat → http://localhost:${PORT}  (mode: ${mode} — ${modeReason})`));
