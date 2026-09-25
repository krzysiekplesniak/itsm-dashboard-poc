const EMBED = new URLSearchParams(location.search).has('embed');
if (EMBED) document.body.classList.add('embed');
const notifyParent = type => { if (EMBED && window.parent !== window) window.parent.postMessage({ type }, location.origin); };
// Front czatu: wiadomości (SSE), upload plików, pasek kroków, podgląd dashboardu.
const $ = s => document.querySelector(s);
const msgs = $('#msgs');
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function md(src) {
  const lines = esc(src).split('\n'); let html = '', inList = false, table = [];
  const inline = t => t.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>');
  const flushTable = () => { if (!table.length) return; const rows = table.filter(r => !/^\|\s*-/.test(r)); html += '<table>' + rows.map((r, i) => '<tr>' + r.split('|').slice(1, -1).map(c => i === 0 ? `<th>${inline(c.trim())}</th>` : `<td>${inline(c.trim())}</td>`).join('') + '</tr>').join('') + '</table>'; table = []; };
  for (const l of lines) {
    if (/^\s*\|/.test(l)) { table.push(l.trim()); continue; } else flushTable();
    if (/^\s*[-•]\s+/.test(l)) { if (!inList) { html += '<ul>'; inList = true; } html += '<li>' + inline(l.replace(/^\s*[-•]\s+/, '')) + '</li>'; continue; }
    if (inList) { html += '</ul>'; inList = false; }
    if (l.trim()) html += '<p>' + inline(l) + '</p>';
  }
  flushTable(); if (inList) html += '</ul>';
  return html;
}
function add(cls, text) { const d = document.createElement('div'); d.className = 'msg ' + cls; d.innerHTML = cls === 'sys' ? esc(text) : md(text); msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; }
function setStep(n) { document.querySelectorAll('#steps li').forEach(li => { const s = +li.dataset.s; li.className = s < n ? 'done' : s === n ? 'on' : ''; if (s === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); }); }
function setMode(m, reason) { const el = $('#mode'); el.className = 'mode ' + m; el.textContent = m === 'copilot' ? 'GitHub Copilot ✓' : 'Offline wizard — no LLM' + (reason ? ' · ' + reason.slice(0, 60) : ''); el.title = reason || ''; }
const TOOL_LABELS = { data_overview: 'reading data profile', propose_mapping: 'proposing mapping', approve_mapping: 'saving mapping', set_rules: 'updating KPI rules', kpi_summary: 'computing KPIs', verify_numbers: 'verifying numbers', update_dashboard: 'changing layout', render_dashboard: 'rendering dashboard', record_decision: 'noting decision', get_brief: 'writing BRIEF.md' };

async function send(text, { silent = false, display = null } = {}) {
  if (!silent) add('user', display ?? text);
  const bubble = add('bot', ''); let buf = ''; const chips = document.createElement('div');
  const t0 = Date.now(); const wait = document.createElement('span'); wait.className = 'thinking'; wait.textContent = '… thinking'; bubble.appendChild(wait);
  const tick = setInterval(() => { const s = Math.round((Date.now() - t0) / 1000); wait.textContent = '… thinking ' + s + ' s' + (s > 60 ? ' (still working — check the terminal if this takes long)' : ''); }, 1000);
  $('#sendbtn').disabled = true;
  let dashboardChanged = false;
  const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, silent, display }) });
  const reader = res.body.getReader(); const dec = new TextDecoder(); let rest = '';
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    rest += dec.decode(value, { stream: true });
    const parts = rest.split('\n\n'); rest = parts.pop();
    for (const p of parts) {
      if (!p.startsWith('data: ')) continue; const ev = JSON.parse(p.slice(6));
      if (ev.type === 'delta') { buf += ev.text; bubble.innerHTML = md(buf); bubble.prepend(chips); }
      else if (ev.type === 'tool' && TOOL_LABELS[ev.name]) { const c = document.createElement('span'); c.className = 'toolchip'; c.textContent = '⚙ ' + TOOL_LABELS[ev.name]; chips.appendChild(c); if (!buf) bubble.prepend(chips); }
      else if (ev.type === 'step') setStep(ev.step);
      else if (ev.type === 'dashboard') { dashboardChanged = true; if (!EMBED) { showVersion(''); $('#frame').src = ev.url; } }
      else if (ev.type === 'versions') loadVersions();
      else if (ev.type === 'mode') setMode(ev.mode, ev.reason);
      else if (ev.type === 'error') add('sys', '⚠ ' + ev.text);
    }
    msgs.scrollTop = msgs.scrollHeight;
  }
  clearInterval(tick); wait.remove();
  if (!buf && !chips.childNodes.length) { bubble.remove(); if (!silent) add('sys', '⚠ No answer from the assistant. Check the mode badge (top right) and the terminal.'); }
  $('#sendbtn').disabled = false;
  if (dashboardChanged) notifyParent('itsm-dashboard-updated'); // panel boczny: odśwież dashboard po zakończeniu odpowiedzi
}

// Kontekst zaznaczonego elementu dashboardu (z panelu bocznym): chip nad polem tekstowym
let selCtx = null;
const ctxLabel = c => c.type === 'chart' ? 'chart ' + (c.title || c.panel) + ' (' + (c.months || []).join(' → ') + ')' : c.type === 'table' ? (c.title || 'table') : (c.label || c.id) + ' — ' + (c.month || '') + (c.value != null ? ' = ' + c.value + (c.unit === '%' ? '%' : '') : '');
function setCtx(c, { keepFrame = false } = {}) {
  selCtx = c; let chip = $('#ctxchip');
  if (!c) { if (chip) chip.remove(); if (!keepFrame) notifyParent('itsm-clear-selection'); return; }
  if (!chip) { chip = document.createElement('div'); chip.id = 'ctxchip'; chip.className = 'ctxchip'; $('#form').before(chip); }
  chip.innerHTML = '📌 About: <b></b> <button type="button" title="Remove">×</button>'; chip.querySelector('b').textContent = ctxLabel(c);
  chip.querySelector('button').onclick = () => setCtx(null);
  const t = $('#text'); if (!t.value) t.placeholder = 'Ask about the selected element, e.g. “why is this below target?”'; t.focus();
}
window.addEventListener('message', e => { if (e.origin === location.origin && e.data && e.data.type === 'itsm-ask') setCtx(e.data.ctx); });
$('#form').onsubmit = e => { e.preventDefault(); const t = $('#text').value.trim(); if (!t) return; $('#text').value = '';
  if (selCtx) { const c = selCtx; setCtx(null, { keepFrame: true }); send(t + '\n\n[selected element: ' + JSON.stringify(c) + ']', { display: '📌 ' + ctxLabel(c) + '\n\n' + t }); } else send(t); };
$('#text').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#form').requestSubmit(); } });
document.querySelectorAll('input[type=file]').forEach(inp => inp.onchange = async () => {
  const f = inp.files[0]; if (!f) return; const kind = inp.dataset.kind;
  add('sys', `Uploading ${f.name}…`);
  const r = await fetch(`/api/upload?kind=${kind}&name=${encodeURIComponent(f.name)}`, { method: 'POST', body: await f.text() }).then(r => r.json());
  if (r.error) return add('sys', '⚠ ' + r.error);
  add('sys', `${f.name}: ${r.rows} rows loaded and anonymised (removed: ${r.anonymization.dropped.join(', ') || '—'})`);
  inp.value = '';
  send(`I uploaded the ${kind} file "${f.name}".`, { silent: true });
});
$('#mock').onclick = async () => {
  const r = await fetch('/api/use-mock', { method: 'POST' }).then(r => r.json());
  if (r.error) return add('sys', '⚠ ' + r.error);
  r.forEach(x => add('sys', `${x.name}: ${x.rows} rows loaded and anonymised (removed: ${x.anonymization.dropped.join(', ') || '—'})`));
  send('I loaded the mock incident and survey files.', { silent: true });
};
$('#reset').onclick = async () => { await fetch('/api/reset', { method: 'POST' }); msgs.innerHTML = ''; setStep(1); if (EMBED) return notifyParent('itsm-dashboard-updated'); $('#frame').src = '/dashboard.html'; start(); };
// Po odświeżeniu strony odtwarzamy rozmowę z serwera; "Hello" tylko przy pustej rozmowie
function renderHistory(h) {
  msgs.innerHTML = '';
  for (const m of h) {
    const d = add(m.role === 'user' ? 'user' : m.role === 'sys' ? 'sys' : 'bot', m.text || '');
    if (m.role === 'bot' && m.tools?.length) { const chips = document.createElement('div'); m.tools.filter(t => TOOL_LABELS[t]).forEach(t => { const c = document.createElement('span'); c.className = 'toolchip'; c.textContent = '⚙ ' + TOOL_LABELS[t]; chips.appendChild(c); }); d.prepend(chips); }
  }
  msgs.scrollTop = msgs.scrollHeight;
}
// Wersje dashboardu jako zakładki: „Working” = wersja robocza, pozostałe = zapisane migawki (tylko do podglądu)
let curV = '';
function showVersion(id) { curV = id; document.querySelectorAll('#vtabs .vt').forEach(b => b.classList.toggle('on', b.dataset.v === id));
  const r = $('#vrestore'); if (r) r.hidden = !id; if (id) $('#frame').src = '/versions/' + id + '.html'; else $('#frame').src = '/dashboard.html?t=' + Date.now();
  const o = $('#open'); if (o) o.href = id ? '/versions/' + id + '.html' : '/dashboard.html'; }
async function loadVersions() { if (EMBED || !$('#vlist')) return; const vs = await fetch('/api/versions').then(r => r.json());
  $('#vlist').innerHTML = ''; vs.forEach(v => { const b = document.createElement('button'); b.className = 'vt' + (v.id === curV ? ' on' : ''); b.setAttribute('aria-pressed', String(v.id === curV)); b.dataset.v = v.id; b.title = 'Saved ' + v.createdAt.slice(0, 16).replace('T', ' ') + (v.month ? ' · month ' + v.month : ''); b.textContent = v.name; b.onclick = () => showVersion(v.id); $('#vlist').appendChild(b); }); }
if (!EMBED && $('#vsave')) {
  document.querySelector('#vtabs .vt[data-v=""]').onclick = () => showVersion('');
  $('#vsave').onclick = async () => { const r = await fetch('/api/versions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: $('#vname').value.trim() }) }).then(r => r.json());
    if (r.error) return add('sys', '⚠ ' + r.error); $('#vname').value = ''; add('sys', 'Saved version “' + r.name + '”.'); loadVersions(); };
  $('#vrestore').onclick = async () => { const r = await fetch('/api/versions/' + curV + '/restore', { method: 'POST' }).then(r => r.json()); if (r.error) return add('sys', '⚠ ' + r.error); add('sys', 'Restored “' + r.restored + '” as the working version.'); showVersion(''); };
  loadVersions();
}
async function start() {
  const s = await fetch('/api/status').then(r => r.json());
  setMode(s.mode, s.reason); setStep(s.step || 1);
  if (s.history?.length) renderHistory(s.history); else send('Hello', { silent: true });
}
document.addEventListener('keydown', e => { if (EMBED && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); notifyParent('itsm-toggle'); } });
start();
