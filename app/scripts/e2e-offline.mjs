// End-to-end test without an LLM: starts the app in offline mode on a temporary workspace, runs the 8 steps
// over HTTP, checks numbers against the independent verifier, then (if Playwright is installed) opens the UI.
// Usage: npm test   (exit code 0 = pass)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 3000 + Math.floor(Math.random() * 900) + 100, WS = fs.mkdtempSync(path.join(os.tmpdir(), 'itsm-e2e-'));
const srv = spawn(process.execPath, ['server/index.js', '--offline'], { env: { ...process.env, PORT: String(PORT), ITSM_WORKSPACE: WS }, stdio: 'pipe' });
const base = `http://localhost:${PORT}`; let fails = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
async function chat(message) {
  const r = await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
  const t = await r.text(); return t.split('\n').filter(l => l.startsWith('data: ')).map(l => JSON.parse(l.slice(6))).filter(e => e.type === 'delta').map(e => e.text).join('');
}
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/healthz')).ok) break; } catch { /* wait */ } await wait(100); }
  ok((await chat('Hello')).includes('Step 1 of 8'), 'step 1 goal');
  ok((await chat('yes')).includes('Step 2 of 8'), 'step 2 data');
  const s = await (await fetch(base + '/api/use-sample', { method: 'POST' })).json();
  ok(s.files?.length === 3 && s.onHoldTotal === 0, 'sample: 3 files anonymised, nothing on hold');
  const t3 = await chat('loaded'); ok(t3.includes('Step 4 of 8') && t3.includes('Service Desk'), 'profile + proposed KPIs with Service Desk filter');
  const t6 = await chat('yes'); ok(/Verified: (\d+) of \1 values match/.test(t6), 'build + independent verification all match');
  ok(t6.includes('| First Call Resolution | **86.6** %'), 'FCR Aug 2026 = 86.6 % (synthetic oracle)');
  ok((await chat('target fcr 88')).includes('below the target of 88.0'), 'change target → finding below target');
  ok((await chat('filter group Service Desk VIP')).includes('89.6'), 'global filter via tool: VIP FCR 89.6 %');
  ok((await chat('why fcr')).includes('Service Desk L1 | 669 | 91'), 'drill-down by group');
  ok((await chat('save Management')).includes('Saved **Management**'), 'version saved');
  ok((await chat('brief')).includes('BRIEF.md'), 'brief generated');
  const html = await (await fetch(base + '/dashboard.html')).text();
  ok(html.includes('"globalFilters"') && html.includes('/web/drawer.js'), 'dashboard served with filters spec + chat drawer');
  try {
    const { chromium } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
    const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 950 } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(base + '/dashboard.html'); await p.waitForTimeout(800);
    ok((await p.textContent('#check')).includes('numbers consistent'), 'page: Python/JS consistency badge');
    await p.click('#gfilters button[data-v="Service Desk VIP"]'); await p.waitForTimeout(300);
    ok((await p.textContent('.card[data-kpi="fcr"] .val')).startsWith('89.6'), 'page: filter chip recomputes FCR (VIP 89.6 %)');
    ok((await p.textContent('#check')).includes('filtered view'), 'page: badge shows filtered view');
    ok(errs.length === 0, 'page: no JavaScript errors ' + errs.join('; '));
    await b.close();
  } catch (e) { console.log('… UI checks skipped (Playwright not available: ' + e.message.split('\n')[0] + ')'); }
} catch (e) { ok(false, 'exception: ' + e.message); }
finally { srv.kill(); fs.rmSync(WS, { recursive: true, force: true }); console.log(fails ? `\n${fails} check(s) FAILED` : '\nAll checks passed'); process.exit(fails ? 1 : 0); }
