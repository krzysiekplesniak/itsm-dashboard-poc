// Renderer: specyfikacja + policzone KPI → JEDEN plik HTML działający offline (Chart.js wbudowany inline).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

let chartJsCache = null;
function chartJs() {
  if (!chartJsCache) chartJsCache = fs.readFileSync(path.join(path.dirname(require.resolve('chart.js')), 'chart.umd.min.js'), 'utf8');
  return chartJsCache;
}
const safeJson = obj => JSON.stringify(obj).replace(/</g, '\\u003c');

/**
 * @param {object} p
 * @param {object} p.spec  specyfikacja dashboardu
 * @param {object} p.computed wynik computeAll
 * @param {object} [p.verification] wynik verifyMonth
 * @param {object} [p.meta] { isMock, load, anonymization, sources }
 */
export function renderDashboard({ spec, computed, verification, meta = {}, drill = null }) {
  const data = { drill, spec, months: computed.months, ytd: computed.ytd, atRisk: computed.atRisk, backlog: computed.backlog || [], notices: computed.notices, snapshot: computed.snapshot, defaultMonth: spec.month || computed.defaultMonth, verification, meta, generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') };
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(spec.title)}</title>
<style>
:root{--bg:${spec.theme.background};--panel:#F6F7F9;--head:${spec.theme.panelHeader};--card:#FFFFFF;--border:#DADDE3;--ink:#1F2430;--ink2:#5B6272;--muted:#8A90A0;--accent:${spec.theme.accent};--bad:#B42318;--warn:#B54708;--good:#067647}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.4 "Segoe UI",Roboto,Helvetica,Arial,sans-serif}
header{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:16px 24px;background:#fff;border-bottom:1px solid var(--border)}
header h1{font-size:20px;margin:0}header .sub{color:var(--ink2);font-size:12px}
.controls{display:flex;gap:10px;align-items:center;font-size:13px}select{font:inherit;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:#fff}
.tabs{display:flex;gap:4px;padding:0 24px;background:#fff;border-bottom:1px solid var(--border)}.tabs button{border:0;background:none;padding:10px 14px;font:inherit;color:var(--ink2);cursor:pointer;border-bottom:2px solid transparent}.tabs button.on{color:var(--ink);border-bottom-color:var(--accent);font-weight:600}
.banner{position:relative;margin:12px 24px 0;padding:8px 40px 8px 12px;border-radius:8px;font-size:13px;transition:opacity .4s}.banner.hide{opacity:0}.banner .x{position:absolute;top:3px;right:8px;border:0;background:none;font-size:18px;line-height:1;cursor:pointer;color:inherit;opacity:.65;padding:4px}.banner .x:hover{opacity:1}.banner.mock{background:#FFF4E5;border:1px solid #F5C27A;color:#7A4B00}.banner.note{background:#EEF4FF;border:1px solid #B8CCF5;color:#1D3A7A}
main{padding:16px 24px 32px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:10px;overflow:hidden}.panel h2{margin:0;padding:10px;text-align:center;font-size:16px;background:var(--head);font-weight:600}
.panel.hl{outline:3px solid var(--accent)}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px}.card{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px 12px;min-height:118px;position:relative}
.card.hl{box-shadow:0 0 0 2px var(--accent)}.card .lbl{font-weight:600;font-size:12px;padding-right:22px}.card .per{color:var(--muted);font-size:11px}.card .val{font-size:30px;font-weight:700;margin-top:8px;letter-spacing:-.5px}.card .val small{font-size:14px;font-weight:600}.card .unit{color:var(--ink2);font-size:11px}
.card .below{color:var(--bad)}.card .flag{font-size:10px;font-weight:600;margin-top:2px}.card .flag.bad{color:var(--bad)}.card .flag.low{color:var(--warn)}
.card .info{position:absolute;top:8px;right:8px;width:18px;height:18px;border-radius:50%;border:1px solid var(--border);font-size:11px;color:var(--ink2);text-align:center;line-height:16px;cursor:help;background:#fff}
.tip{display:none}#ftip{position:fixed;z-index:1000;display:none;max-width:290px;background:#1F2430;color:#fff;font-size:12px;line-height:1.45;padding:8px 10px;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.25);pointer-events:none}
.card .desc{color:var(--ink2);font-size:11px;margin-top:4px}
.chartbox{background:var(--card);border:1px solid var(--border);border-radius:8px;margin:0 12px 12px;padding:10px;height:280px}
.wide{margin-top:16px}.tbl{width:100%;border-collapse:collapse;background:#fff;font-size:13px}.tbl th,.tbl td{padding:6px 10px;border-bottom:1px solid var(--border);text-align:left}.tbl th{background:var(--head);font-weight:600}.tbl th.sort{cursor:pointer;user-select:none;white-space:nowrap}.tbl th.sort:hover{background:#E4E7EC}.tbl th .ar{color:var(--muted);font-size:10px;margin-left:5px}.tbl th[data-dir] .ar{color:var(--ink)}
.badge{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600}.badge.Breached{background:#FEE4E2;color:var(--bad)}.badge.At{background:#FEF0C7;color:var(--warn)}
.ok{color:var(--good);font-weight:600}.nok{color:var(--bad);font-weight:600}.muted{color:var(--muted)}
section.page{display:none}section.page.on{display:block}
footer{padding:0 24px 24px;color:var(--muted);font-size:11px}
.card.click{cursor:pointer;transition:box-shadow .15s,transform .15s}.card.click:hover{box-shadow:0 4px 14px rgba(31,36,48,.12);transform:translateY(-1px)}
.card .more{position:absolute;right:10px;bottom:8px;font-size:11px;color:var(--accent);opacity:0;transition:opacity .15s}.card.click:hover .more{opacity:1}
.card.click:focus-visible,.tbl th.sort:focus-visible,.chartbox:focus-visible,[data-ask]:focus-visible,.tabs button:focus-visible,.dlg button:focus-visible,.info:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.seg{display:inline-flex;border:1px solid var(--border);border-radius:8px;overflow:hidden;background:#fff}.seg button{border:0;background:none;padding:5px 12px;font:inherit;font-size:13px;cursor:pointer;color:var(--ink2)}.seg button+button{border-left:1px solid var(--border)}.seg button.on{background:var(--accent);color:#fff;font-weight:600}.seg button:focus-visible{outline:3px solid var(--accent);outline-offset:-3px}
#p-dash.on{display:flex;flex-direction:column;gap:16px}#p-dash .wide{margin-top:0}
.att{background:#fff;border:1px solid var(--border);border-radius:10px;padding:10px 14px}.att .ah{display:flex;align-items:center;gap:10px;font-weight:600;font-size:14px;margin-bottom:8px}.att .ah .muted{font-weight:400}
.chipsrow{display:flex;flex-wrap:wrap;gap:8px}.achip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:16px;padding:4px 10px;background:#fff;font:inherit;font-size:12.5px;cursor:pointer;color:var(--ink)}.achip:hover{background:#F6F7F9}.achip:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.dot{width:9px;height:9px;border-radius:50%;display:inline-block;flex:none}.dot.crit{background:#C62828}.dot.warn{background:#EF6C00}.dot.ok{background:#2E7D32}.dot.info{background:#1565C0}
.wlist{display:grid;gap:8px}.witem{display:grid;grid-template-columns:6px 1fr auto;gap:12px;align-items:center;border:1px solid var(--border);border-radius:8px;padding:10px 12px;background:#fff}.witem .sev{align-self:stretch;border-radius:3px}.witem .sev.crit{background:#C62828}.witem .sev.warn{background:#EF6C00}.witem .sev.ok{background:#2E7D32}.witem .sev.info{background:#1565C0}
.witem b{font-size:14px}.witem .why{color:var(--ink2);font-size:12.5px;margin-top:2px}.witem .acts{display:flex;gap:6px}.witem .acts button{border:1px solid var(--border);background:#fff;border-radius:6px;padding:4px 10px;font:inherit;font-size:12px;cursor:pointer}
.mods{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px}.mod{background:var(--panel);border:1px solid var(--border);border-radius:10px;overflow:hidden}.mod h2{margin:0;padding:10px;text-align:center;font-size:16px;background:var(--head);font-weight:600}.mod .mb{padding:12px}.mod .chartbox{margin:0 0 12px}
.askbtn{display:none}body.has-chat .askbtn{display:inline-block}
.modal{position:fixed;inset:0;z-index:900;display:none;background:rgba(20,22,30,.45);align-items:flex-start;justify-content:center;padding:4vh 16px;overflow:auto}
.modal.on{display:flex}.dlg{background:#fff;border-radius:12px;width:min(1100px,100%);box-shadow:0 20px 50px rgba(0,0,0,.3);display:flex;flex-direction:column;max-height:92vh}
.dlg .dh{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--border)}.dlg .dh h3{margin:0;font-size:17px;flex:1}
.dlg .dh button,.dlg .btn2{border:1px solid var(--border);background:#fff;border-radius:6px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer;color:var(--ink)}
.dlg .dh .close{font-size:18px;line-height:1;padding:3px 9px}.dlg .db{padding:14px 18px;overflow:auto}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px}.kpis div{border:1px solid var(--border);border-radius:8px;padding:8px 12px}.kpis b{display:block;font-size:22px}.kpis span{font-size:11px;color:var(--ink2)}
.dsec{margin:14px 0 6px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px}.dsec select,.dsec input{font:inherit;font-size:12px;padding:3px 6px;border:1px solid var(--border);border-radius:6px}
.bar{height:8px;border-radius:4px;background:var(--accent);opacity:.75;display:inline-block;vertical-align:middle}.chips button{border:1px solid var(--border);background:#fff;border-radius:12px;padding:2px 10px;font-size:12px;cursor:pointer}.chips button.on{background:var(--accent);color:#fff;border-color:var(--accent)}
.res1{color:var(--good);font-weight:600}#dlist,#dbk{overflow-x:auto}#dlist .tbl td{white-space:nowrap}.res0{color:var(--bad);font-weight:600}
@media print{.tabs,.controls{display:none}section.page{display:block}}
</style></head>
<body>
<header><div><h1 id="title"></h1><div class="sub" id="subtitle"></div></div>
<div class="controls"><div class="seg" id="modes" role="radiogroup" aria-label="View mode"><button type="button" role="radio" data-mode="monthly" title="Monthly management view">Monthly</button><button type="button" role="radio" data-mode="weekly" title="Weekly operational view">Weekly</button><button type="button" role="radio" data-mode="warnings" title="Only what needs attention, with the reason">Warnings</button></div><label>Month <select id="month"></select></label><span class="muted" id="snap"></span></div></header>
<nav class="tabs" role="tablist" aria-label="Dashboard sections"><button role="tab" id="tab-dash" aria-controls="p-dash" aria-selected="true" data-p="dash" class="on">Dashboard</button><button role="tab" id="tab-verify" aria-controls="p-verify" aria-selected="false" tabindex="-1" data-p="verify">Verification</button><button role="tab" id="tab-data" aria-controls="p-data" aria-selected="false" tabindex="-1" data-p="data">Data &amp; assumptions</button></nav>
<div id="banners"></div>
<main>
<section class="page on" id="p-dash" role="tabpanel" aria-labelledby="tab-dash"><div id="attention"></div><div id="weekly"></div><div class="grid" id="panels"></div><div class="wide" id="atrisk"></div><div class="mods" id="extra"></div></section>
<section class="page" id="p-verify" role="tabpanel" aria-labelledby="tab-verify"></section>
<section class="page" id="p-data" role="tabpanel" aria-labelledby="tab-data"></section>
</main>
<div id="ftip" role="tooltip" aria-hidden="true"></div><div class="sr" id="live" aria-live="polite"></div>
<div class="modal" id="modal"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="dh"><h3 id="mt"></h3><button type="button" class="askbtn" id="mask">💬 Ask the chat about this</button><button type="button" id="mcsv">Export CSV</button><button type="button" class="close" id="mclose" title="Close (Esc)" aria-label="Close drill-down">×</button></div><div class="db" id="mb"></div></div></div>
<footer id="foot"></footer>
<script>${chartJs()}</script>
<script type="application/json" id="data">${safeJson(data)}</script>
<script>
const D = JSON.parse(document.getElementById('data').textContent);
const S = D.spec, T = S.theme;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const months = Object.keys(D.months).sort();
const monthName = k => new Date(k + '-01T00:00:00Z').toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
const colorOf = c => c === 'accent' ? T.accent : (T.series[c] || c);
const fmt = (v, unit) => v == null ? 'n/a' : unit === '%' ? (Math.round(v * 100) / 100).toFixed(2) : Number(v).toLocaleString('en-GB');
$('#title').textContent = S.title; $('#subtitle').textContent = S.subtitle; $('#snap').textContent = 'Data as of ' + D.snapshot;
const sel = $('#month'); months.forEach(m => sel.add(new Option(monthName(m), m))); sel.value = D.defaultMonth;
const tabBtns = [...document.querySelectorAll('.tabs button')];
const selTab = b => { tabBtns.forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; }); document.querySelectorAll('section.page').forEach(p => p.classList.toggle('on', p.id === 'p-' + b.dataset.p)); };
tabBtns.forEach((b, i) => { b.onclick = () => selTab(b); b.onkeydown = e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); const n = tabBtns[(i + d + tabBtns.length) % tabBtns.length]; selTab(n); n.focus(); } }; });
{ let h = ''; const X = '<button class="x" type="button" title="Close" aria-label="Close">×</button>'; if (D.meta.isMock) h += '<div class="banner mock" data-auto="1">' + X + '<b>MOCK DATA</b> — synthetic data shaped like a BMC Helix export, calibrated to the Vendor client view. Not real ACME figures.</div>';
  (D.notices || []).forEach(n => h += '<div class="banner note">' + X + esc(n) + '</div>'); $('#banners').innerHTML = h;
  const close = b => { b.classList.add('hide'); setTimeout(() => b.remove(), 400); };
  document.querySelectorAll('.banner').forEach(b => { b.querySelector('.x').onclick = () => close(b); if (b.dataset.auto) setTimeout(() => b.isConnected && close(b), 6000); }); }
// Tooltip "jak liczone": jeden pływający element, zawsze w całości w oknie (karta skrajna lewa nie ucina tekstu)
{ const ft = $('#ftip');
  const show = el => { const t = el.nextElementSibling; if (!t || !t.classList.contains('tip')) return; ft.innerHTML = t.innerHTML; ft.style.display = 'block';
    const r = el.getBoundingClientRect(), w = ft.offsetWidth, h = ft.offsetHeight; let x = r.right - w; x = Math.max(8, Math.min(x, innerWidth - w - 8));
    let y = r.bottom + 6; if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 6); ft.style.left = x + 'px'; ft.style.top = y + 'px'; };
  const hide = () => { ft.style.display = 'none'; };
  document.addEventListener('mouseover', e => { const i = e.target.closest && e.target.closest('.info'); if (i) show(i); });
  document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('.info')) hide(); });
  document.addEventListener('focusin', e => { const i = e.target.closest && e.target.closest('.info'); if (i) show(i); });
  document.addEventListener('focusout', hide); addEventListener('scroll', hide, true); }
// Sortowanie tabel: klik w nagłówek (▲ rosnąco / ▼ malejąco), liczby jako liczby, daty i ID naturalnie
function sortable(root) {
  root.querySelectorAll('table.tbl').forEach(t => { const hr = t.rows[0]; if (!hr || hr.dataset.s || t.rows.length < 3) return; hr.dataset.s = '1';
    [...hr.cells].forEach((th, ci) => { if (!th.textContent.trim()) return; th.classList.add('sort'); th.title = 'Sort'; th.tabIndex = 0; th.setAttribute('aria-sort', 'none'); th.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); th.click(); } }; th.insertAdjacentHTML('beforeend', '<span class="ar">↕</span>');
      th.onclick = () => { const dir = th.dataset.dir === 'asc' ? 'desc' : 'asc';
        [...hr.cells].forEach(c => { delete c.dataset.dir; if (c.hasAttribute('aria-sort')) c.setAttribute('aria-sort', 'none'); const a = c.querySelector('.ar'); if (a) a.textContent = '↕'; });
        th.dataset.dir = dir; th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending'); th.querySelector('.ar').textContent = dir === 'asc' ? '▲' : '▼';
        const key = r => { const s = (r.cells[ci]?.textContent || '').trim(); return /^-?[\\d.,]+\\s*(%|h)?$/.test(s) ? parseFloat(s.replace(/,/g, '')) : s.toLowerCase(); };
        const rows = [...t.rows].slice(1); rows.sort((a, b) => { const x = key(a), y = key(b); const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'en', { numeric: true }); return dir === 'asc' ? c : -c; });
        rows.forEach(r => r.parentNode.appendChild(r)); }; }); });
}
const valueLabels = { id: 'valueLabels', afterDatasetsDraw(chart) { const { ctx } = chart; ctx.save(); ctx.font = '10px Segoe UI, Arial'; ctx.fillStyle = '#5B6272'; ctx.textAlign = 'center';
  chart.data.datasets.forEach((ds, i) => { if (ds.isTarget || !chart.isDatasetVisible(i)) return; const meta = chart.getDatasetMeta(i); if (chart.data.datasets.filter(d => !d.isTarget).length > 1) return;
    meta.data.forEach((pt, j) => { const v = ds.data[j]; if (v == null) return; ctx.fillText(Math.round(v * 100) / 100, pt.x, pt.y - 7); }); }); ctx.restore(); } };
const charts = [];
function render() {
  const m = sel.value; const cur = D.months[m] || {}; const ytd = D.ytd[m] || {};
  const ctxData = { ...cur, ytd };
  charts.splice(0).forEach(c => c.destroy());
  const hl = new Set(S.highlight || []);
  $('#panels').innerHTML = S.panels.filter(p => p.visible).map(p => '<div class="panel' + (hl.has('panel:' + p.id) ? ' hl' : '') + '"><h2>' + esc(p.title) + '</h2><div class="cards">' +
    p.cards.filter(c => c.visible).map(c => { const v = get(ctxData, c.metric); const below = c.target != null && v != null && (c.higherIsBetter ? v < c.target : v > c.target);
      const low = c.metric.startsWith('fcr') ? cur.fcr?.lowVolume : c.metric.startsWith('sla.P3') ? cur.sla?.P3.lowVolume : c.metric.startsWith('sla.P4') ? cur.sla?.P4.lowVolume : false;
      const ask = { type: 'card', id: c.id, label: c.label, month: m, period: c.period, value: v, unit: c.unit, target: c.target ?? null };
      return '<div class="card click' + (hl.has('card:' + c.id) ? ' hl' : '') + '" data-card="' + c.id + '" data-ask="' + esc(JSON.stringify(ask)) + '" tabindex="0" role="button" aria-label="' + esc(c.label + ', ' + (c.period === 'ytd' ? 'this year' : monthName(m)) + ': ' + fmt(v, c.unit) + (c.unit === '%' ? ' percent' : ' ' + c.unit) + (below ? ', below target ' + c.target : '') + '. Press Enter for drill-down, Alt+A to ask the chat.') + '" title="Click for drill-down"><div class="lbl">' + esc(c.label) + '</div><div class="per">' + (c.period === 'ytd' ? 'This year (to ' + monthName(m) + ')' : monthName(m)) + '</div>' +
        '<span class="info" tabindex="0" role="button" aria-label="How is ' + esc(c.label) + ' calculated" aria-describedby="tip-' + c.id + '">i</span><div class="tip" id="tip-' + c.id + '">' + esc(c.how || '') + (c.target != null ? '<br><br>Target: ' + c.target + (c.unit === '%' ? '%' : '') : '') + '</div>' +
        '<div class="val' + (below ? ' below' : '') + '">' + fmt(v, c.unit) + (c.unit === '%' && v != null ? '<small>%</small>' : '') + '</div><div class="unit">' + (c.unit === '%' ? '' : esc(c.unit)) + '</div>' +
        (below ? '<div class="flag bad">▼ below target ' + c.target + (c.unit === '%' ? '%' : '') + '</div>' : '') + (low ? '<div class="flag low">● low volume (&lt; 10)</div>' : '') +
        (c.description ? '<div class="desc">' + esc(c.description) + '</div>' : '') + '<span class="more">Details ›</span></div>'; }).join('') +
    '</div><div class="chartbox" tabindex="0" data-ask="' + esc(JSON.stringify({ type: 'chart', panel: p.id, title: p.title, months: [months[Math.max(0, months.indexOf(m) - 11)], m], series: p.chart.series.map(x => x.label), target: p.chart.target ?? null })) + '"><canvas id="ch-' + p.id + '" role="img" aria-label="' + esc(p.title + ' trend, 12 months to ' + monthName(m) + ': ' + p.chart.series.map(x => x.label + ' ' + months.slice(Math.max(0, months.indexOf(m) - 11), months.indexOf(m) + 1).map(k => k + ' ' + fmt(get(D.months[k] || {}, x.metric), p.chart.unit)).join(', ')).join('; ')) + '"></canvas></div></div>').join('');
  const idx = months.indexOf(m); const win = months.slice(Math.max(0, idx - 11), idx + 1);
  S.panels.filter(p => p.visible).forEach(p => {
    const ds = p.chart.series.map(s => { const col = colorOf(s.color); return { label: s.label, data: win.map(k => get(D.months[k] || {}, s.metric) ?? null), borderColor: col, backgroundColor: p.chart.type === 'area' ? col + '99' : col, fill: p.chart.type === 'area' ? 'origin' : false, borderWidth: 2, pointRadius: 3, pointHoverRadius: 6, tension: 0.15, spanGaps: true }; });
    if (p.chart.target != null) ds.push({ label: p.chart.targetLabel || 'Target', data: win.map(() => p.chart.target), borderColor: '#8A90A0', borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, fill: false, isTarget: true });
    const vals = ds.flatMap(d => d.data).filter(v => v != null);
    const yMin = p.chart.min ?? (p.chart.unit === '%' ? Math.max(0, Math.floor(Math.min(...vals) / 5) * 5 - 5) : 0);
    const yMax = p.chart.max ?? (p.chart.unit === '%' ? 100 : undefined);
    charts.push(new Chart(document.getElementById('ch-' + p.id), { type: 'line', data: { labels: win, datasets: ds }, plugins: [valueLabels],
      options: { resizeDelay: 120, transitions: { resize: { animation: { duration: 0 } } }, onClick: (e, els) => { if (els.length) { const mm = win[els[0].index]; if (mm !== sel.value) { sel.value = mm; render(); } openDrill(p.cards.find(c => c.visible)?.id || p.cards[0].id); } }, maintainAspectRatio: false, layout: { padding: { top: 14, right: 18 } }, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + (c.raw == null ? 'n/a' : c.raw + (p.chart.unit || '')) } } },
        scales: { y: { min: yMin, max: yMax, grid: { color: '#EDEFF2' }, ticks: { font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } } } } }));
  });
  if (S.atRisk.visible) { const r = D.atRisk || []; const nb = r.filter(x => x.badge === 'Breached').length, na = r.length - nb;
    $('#atrisk').innerHTML = '<div class="panel' + (hl.has('atRisk') ? ' hl' : '') + '" tabindex="0" aria-label="' + esc(S.atRisk.title + ': ' + nb + ' breached, ' + na + ' at risk') + '" data-ask="' + esc(JSON.stringify({ type: 'table', id: 'atRisk', title: S.atRisk.title, breached: nb, atRisk: na, snapshot: D.snapshot })) + '"><h2>' + esc(S.atRisk.title) + ' — <span class="badge Breached">Breached ' + nb + '</span> <span class="badge At">At risk ' + na + '</span> <span class="muted" style="font-weight:400;font-size:12px">as of ' + D.snapshot + '</span></h2>' +
      (r.length ? '<table class="tbl"><tr><th>Incident ID</th><th>Priority</th><th>Submit date</th><th>Assigned group</th><th>Business hours elapsed</th><th>SLA threshold</th><th>Status</th></tr>' + r.map(x => '<tr><td>' + esc(x.id) + '</td><td>' + x.prio + '</td><td>' + new Date(x.submit).toISOString().slice(0, 16).replace('T', ' ') + '</td><td>' + esc(x.group || '') + '</td><td>' + x.elapsedH + ' h</td><td>' + x.thresholdH + ' h</td><td><span class="badge ' + (x.badge === 'Breached' ? 'Breached' : 'At') + '">' + x.badge + '</span></td></tr>').join('') + '</table>' : '<p style="padding:12px" class="muted">No open P3/P4 incidents at risk.</p>') + '</div>';
  } else $('#atrisk').innerHTML = '';
  renderModules(m, cur);
  sortable(document);
  document.querySelectorAll('.card.click').forEach(el => { el.onclick = e => { if (!e.target.closest('.info')) openDrill(el.dataset.card); }; el.onkeydown = e => { if (e.target !== el) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrill(el.dataset.card); } }; });
}

// ===== Drill-down: kliknięcie w kafelek (albo punkt wykresu) otwiera modal z rozbiciem i listą zgłoszeń =====
const DR = D.drill; const CI = DR ? Object.fromEntries(DR.cols.map((c, i) => [c, i])) : {};
const dn = (k, i) => (i == null || i < 0 ? '—' : DR.dict[k][i]);
const prevM = mm => { const a = mm.split('-').map(Number); return new Date(Date.UTC(a[0], a[1] - 2, 1)).toISOString().slice(0, 7); };
let csvRows = null, csvName = 'drill-down.csv';
function kindOf(card) { const mt = card.metric; if (mt.indexOf('fcr') === 0) return { k: 'fcr' }; if (mt.indexOf('sla.P3') === 0) return { k: 'sla', prios: ['P3'], metric: 'sla_p3' }; if (mt.indexOf('sla.P4') === 0) return { k: 'sla', prios: ['P4'], metric: 'sla_p4' }; if (mt.indexOf('sla.') === 0) return { k: 'sla', prios: ['P3', 'P4'], metric: 'sla_combined' }; return { k: 'csat', metric: 'csat' }; }
function findCard(id) { for (const p of S.panels) for (const c of p.cards) if (c.id === id) return c; return null; }
function openDrill(cardId) {
  const card = findCard(cardId); if (!card) return; const m = sel.value; const kd = kindOf(card);
  $('#mt').textContent = card.label + ' — ' + monthName(m) + ' · drill-down';
  const ask = { type: 'drill-down', id: card.id, label: card.label, month: m };
  $('#mask').onclick = () => window.dispatchEvent(new CustomEvent('itsm-ask', { detail: ask }));
  if (!DR) { $('#mb').innerHTML = '<p class="muted">Ticket-level data is not included in this file.</p>'; showModal(); return; }
  if (kd.k === 'csat') drillCsat(m); else drillTickets(card, kd, m);
  showModal();
}
let opener = null;
function showModal() { opener = document.activeElement; $('#modal').classList.add('on'); $('#mclose').focus(); }
function hideModal() { if (!$('#modal').classList.contains('on')) return; $('#modal').classList.remove('on'); if (opener && opener.focus) opener.focus(); }
$('#modal').addEventListener('keydown', e => { if (e.key !== 'Tab') return; const f = [...$('#modal').querySelectorAll('button, input, select, [tabindex="0"]')].filter(x => x.offsetParent !== null); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } });
$('#mclose').onclick = hideModal; $('#modal').onclick = e => { if (e.target.id === 'modal') hideModal(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideModal(); });
$('#mcsv').onclick = () => { if (!csvRows) return; const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'; const txt = csvRows.map(r => r.map(q).join(',')).join('\\r\\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' })); a.download = csvName; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
function drillTickets(card, kd, m) {
  const isF = kd.k === 'fcr';
  const pick = mm => DR.rows.filter(r => r[CI.month] === mm && (isF ? r[CI.fcr] >= 0 : kd.prios.indexOf(r[CI.prio]) >= 0 && r[CI.sla] >= 0));
  const okOf = r => (isF ? r[CI.fcr] === 1 : r[CI.sla] === 1);
  const rows = pick(m), met = rows.filter(okOf).length, miss = rows.length - met, pct = rows.length ? met / rows.length * 100 : null;
  const pr = pick(prevM(m)), ppct = pr.length ? pr.filter(okOf).length / pr.length * 100 : null;
  const tgt = isF ? S.panels.find(p => p.id === 'fcr')?.chart.target : S.panels.find(p => p.id === 'sla')?.chart.target;
  const f2 = v => v == null ? 'n/a' : (Math.round(v * 100) / 100).toFixed(2);
  let h = '<div class="kpis"><div><b>' + f2(pct) + '%</b><span>' + (isF ? 'First Call Resolution' : kd.prios.join(' & ') + ' within SLA') + '</span></div><div><b>' + rows.length.toLocaleString('en-GB') + '</b><span>' + (isF ? 'Incidents started in the Service Desk' : 'Resolved ' + kd.prios.join(' & ')) + '</span></div><div><b style="color:var(--bad)">' + miss + '</b><span>' + (isF ? 'Missed FCR' : 'Breached SLA') + '</span></div>' +
    '<div><b>' + (ppct == null ? 'n/a' : ((pct - ppct >= 0 ? '+' : '') + f2(pct - ppct) + ' pp')) + '</b><span>vs ' + monthName(prevM(m)) + (ppct == null ? '' : ' (' + f2(ppct) + '%)') + '</span></div>' + (tgt != null ? '<div><b>' + tgt + '%</b><span>Target</span></div>' : '') + '</div>';
  const missed = rows.filter(r => !okOf(r));
  let reasons;
  if (isF) { const tr = missed.filter(r => r[CI.transfers] > 0 || r[CI.group] !== r[CI.initGroup]).length; reasons = [['Transferred to another group', tr], ['Solved in ≥ ' + DR.fcrMax + ' business min (no transfer)', missed.length - tr]]; }
  else { const ov = r => r[CI.netMin] / (DR.slaHours[r[CI.prio]] * 60); reasons = [['Breached by < 25 %', missed.filter(r => ov(r) < 1.25).length], ['Breached by 25–100 %', missed.filter(r => ov(r) >= 1.25 && ov(r) < 2).length], ['More than 2× the threshold', missed.filter(r => ov(r) >= 2).length]]; }
  h += '<div class="dsec">Why ' + (isF ? 'FCR was missed' : 'SLA was breached') + '</div><table class="tbl"><tr><th>Reason</th><th>Incidents</th><th>Share</th></tr>' + reasons.map(x => '<tr><td>' + x[0] + '</td><td>' + x[1] + '</td><td>' + (missed.length ? Math.round(x[1] / missed.length * 100) : 0) + ' %</td></tr>').join('') + '</table>';
  h += '<div class="dsec">Breakdown by <select id="dby"><option value="category">Category</option><option value="group">Resolving group</option><option value="service">Service</option><option value="source">Channel</option></select></div><div id="dbk"></div>';
  h += '<div class="dsec">Incidents <span class="chips" id="dflt"><button data-f="all" class="on">All ' + rows.length + '</button> <button data-f="miss">' + (isF ? 'Missed' : 'Breached') + ' ' + miss + '</button> <button data-f="ok">' + (isF ? 'FCR met' : 'Within SLA') + ' ' + met + '</button></span><input id="dq" placeholder="Search ID, group, category…" style="margin-left:auto;width:220px"></div><div id="dlist"></div>';
  $('#mb').innerHTML = h; sortable($('#mb'));
  const byDef = isF ? 'category' : 'group'; $('#dby').value = byDef;
  const bk = () => { const dim = $('#dby').value; const g = new Map(); rows.forEach(r => { const k = dn(dim, r[CI[dim]]); const o = g.get(k) || { k: k, t: 0, ok: 0 }; o.t++; if (okOf(r)) o.ok++; g.set(k, o); });
    const arr = [...g.values()].sort((a, b) => (b.t - b.ok) - (a.t - a.ok) || a.ok / a.t - b.ok / b.t); const mx = Math.max(1, ...arr.map(a => a.t - a.ok));
    $('#dbk').innerHTML = '<table class="tbl"><tr><th>' + $('#dby').selectedOptions[0].text + '</th><th>Incidents</th><th>' + (isF ? 'FCR met' : 'Within SLA') + '</th><th>' + (isF ? 'Missed' : 'Breached') + '</th><th>%</th><th>Share of misses</th></tr>' + arr.map(a => '<tr><td>' + esc(a.k) + '</td><td>' + a.t + '</td><td>' + a.ok + '</td><td>' + (a.t - a.ok) + '</td><td>' + f2(a.ok / a.t * 100) + '</td><td><span class="bar" style="width:' + Math.round((a.t - a.ok) / mx * 120) + 'px"></span> ' + (miss ? Math.round((a.t - a.ok) / miss * 100) : 0) + ' %</td></tr>').join('') + '</table>'; sortable($('#dbk')); };
  $('#dby').onchange = bk; bk();
  let flt = 'all';
  const list = () => { const q = ($('#dq').value || '').toLowerCase();
    const cols = ['Incident', 'Prio', 'Submitted', 'Resolved', isF ? 'Initial → resolving group' : 'Resolving group', 'Category', 'Service', 'Channel', 'Transfers', 'Business min (net)', isF ? 'FCR' : 'SLA'];
    const data = rows.filter(r => flt === 'all' || (flt === 'ok') === okOf(r)).map(r => [r[CI.id], r[CI.prio], r[CI.submit], r[CI.resolved], isF ? dn('group', r[CI.initGroup]) + ' → ' + dn('group', r[CI.group]) : dn('group', r[CI.group]), dn('category', r[CI.category]), dn('service', r[CI.service]), dn('source', r[CI.source]), r[CI.transfers] < 0 ? '—' : r[CI.transfers], r[CI.netMin], okOf(r) ? (isF ? 'Met' : 'Within') : (isF ? 'Missed' : 'Breached')])
      .filter(x => !q || x.join(' ').toLowerCase().indexOf(q) >= 0);
    csvRows = [cols].concat(data); csvName = card.id + '_' + m + '.csv';
    const shown = data.slice(0, 300);
    $('#dlist').innerHTML = '<table class="tbl"><tr>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr>' + shown.map(x => '<tr>' + x.map((v, i) => '<td' + (i === 10 ? ' class="res' + (v === 'Met' || v === 'Within' ? 1 : 0) + '"' : '') + '>' + esc(v) + '</td>').join('') + '</tr>').join('') + '</table>' + (data.length > shown.length ? '<p class="muted">Showing 300 of ' + data.length + ' — use search, a filter or Export CSV for all.</p>' : '');
    sortable($('#dlist')); $('#live').textContent = data.length + ' incidents shown'; };
  document.querySelectorAll('#dflt button').forEach(b => b.onclick = () => { flt = b.dataset.f; document.querySelectorAll('#dflt button').forEach(x => x.classList.toggle('on', x === b)); list(); });
  $('#dq').setAttribute('aria-label', 'Search incidents'); $('#dby').setAttribute('aria-label', 'Breakdown dimension'); $('#dq').oninput = list; list();
}
function drillCsat(m) {
  const lab = DR.ratingScale === '2-10' ? { 2: 'Terrible', 4: 'Dislike', 6: 'OK', 8: 'Good', 10: 'Excellent' } : { 1: 'Terrible', 2: 'Dislike', 3: 'OK', 4: 'Good', 5: 'Excellent' };
  const yr = m.slice(0, 4); const ms = months.filter(k => k.slice(0, 4) === yr && k <= m);
  const dist = (keys) => { const o = {}; keys.forEach(k => Object.entries(DR.ratings[k] || {}).forEach(([r, n]) => o[r] = (o[r] || 0) + n)); return o; };
  const dm = dist([m]), dy = dist(ms); const tot = o => Object.values(o).reduce((a, b) => a + b, 0);
  const c = D.months[m]?.csat || {}; const y = D.ytd[m] || {};
  let h = '<div class="kpis"><div><b>' + (c.avg ?? 'n/a') + '</b><span>Average rating (out of 5), ' + monthName(m) + '</span></div><div><b>' + (c.responded ?? 'n/a') + '</b><span>Responses this month</span></div><div><b>' + (c.rate ?? 'n/a') + '%</b><span>Response rate this month</span></div><div><b>' + (y.sent ?? 'n/a') + ' / ' + (y.responded ?? 'n/a') + '</b><span>Sent / responded this year</span></div></div>';
  const keys = Object.keys(lab).map(Number).sort((a, b) => b - a); const mx = Math.max(1, ...keys.map(k => dy[k] || 0));
  h += '<div class="dsec">Rating distribution</div><table class="tbl"><tr><th>Rating</th><th>' + monthName(m) + '</th><th>This year</th><th>Share (year)</th></tr>' + keys.map(k => '<tr><td>' + lab[k] + ' (' + k + ')</td><td>' + (dm[k] || 0) + '</td><td>' + (dy[k] || 0) + '</td><td><span class="bar" style="width:' + Math.round((dy[k] || 0) / mx * 160) + 'px"></span> ' + (tot(dy) ? Math.round((dy[k] || 0) / tot(dy) * 100) : 0) + ' %</td></tr>').join('') + '</table>';
  h += '<div class="dsec">By month</div><table class="tbl"><tr><th>Month</th><th>Sent</th><th>Responded</th><th>Response rate %</th><th>Average</th></tr>' + ms.map(k => { const x = D.months[k]?.csat || {}; return '<tr><td>' + k + '</td><td>' + (x.sent ?? '') + '</td><td>' + (x.responded ?? '') + '</td><td>' + (x.rate ?? '') + '</td><td>' + (x.avg ?? '') + '</td></tr>'; }).join('') + '</table>';
  csvRows = [['Rating', 'Label', monthName(m), 'This year']].concat(keys.map(k => [k, lab[k], dm[k] || 0, dy[k] || 0])); csvName = 'csat_' + m + '.csv';
  $('#mb').innerHTML = h; sortable($('#mb'));
}


// ===== v0.2: tryby widoku (Monthly / Weekly / Warnings), pasek uwagi, moduły tygodniowy / backlog / wolumen =====
let MODE = S.template || 'monthly';
const modeBtns = [...document.querySelectorAll('#modes button')];
function paintModes() { modeBtns.forEach(b => { const on = b.dataset.mode === MODE; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }); }
modeBtns.forEach(b => { b.onclick = () => { MODE = b.dataset.mode; paintModes(); render(); }; });
paintModes();
const MV = id => !(S.modules && S.modules[id] && S.modules[id].visible === false);
const f2x = v => v == null ? 'n/a' : (Math.round(v * 100) / 100).toFixed(2);
function panelTarget(id) { const p = S.panels.find(x => x.id === id); return p ? p.chart.target : null; }
// „Dlaczego”: największy udział w chybieniach (te same dane co drill-down)
function topMiss(kind, prios, m) {
  if (!DR) return '';
  const isF = kind === 'fcr'; const rows = DR.rows.filter(r => r[CI.month] === m && (isF ? r[CI.fcr] >= 0 : prios.indexOf(r[CI.prio]) >= 0 && r[CI.sla] >= 0));
  const miss = rows.filter(r => isF ? r[CI.fcr] === 0 : r[CI.sla] === 0); if (!miss.length) return 'no misses';
  const dim = isF ? 'category' : 'group'; const c = {}; miss.forEach(r => { const k = dn(dim, r[CI[dim]]); c[k] = (c[k] || 0) + 1; });
  const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  let extra = ''; if (isF) { const tr = miss.filter(r => r[CI.transfers] > 0 || r[CI.group] !== r[CI.initGroup]).length; extra = ' · ' + Math.round(tr / miss.length * 100) + '% of misses were transfers'; }
  return miss.length + ' missed · most in ' + (isF ? 'category ' : 'group ') + top[0] + ' (' + top[1] + ')' + extra;
}
function attentionItems(m) {
  const cur = D.months[m] || {}, prev = D.months[prevM(m)] || {}; const items = [];
  const K = [
    { card: 'fcr_pct', label: 'First Call Resolution', metric: 'fcr.pct', unit: '%', target: panelTarget('fcr'), kind: 'fcr' },
    { card: 'sla_p3', label: 'P3 SLA', metric: 'sla.P3.pct', unit: '%', target: panelTarget('sla'), kind: 'sla', prios: ['P3'] },
    { card: 'sla_p4', label: 'P4 SLA', metric: 'sla.P4.pct', unit: '%', target: panelTarget('sla'), kind: 'sla', prios: ['P4'] },
    { card: 'csat_resp', label: 'Customer satisfaction', metric: 'csat.avg', unit: '/5', target: panelTarget('csat'), kind: 'csat' },
  ];
  K.forEach(k => {
    const v = get(cur, k.metric), pv = get(prev, k.metric); const pct = k.unit === '%';
    const vs = v == null ? 'n/a' : (pct ? f2x(v) + '%' : v + k.unit); const d = v != null && pv != null ? v - pv : null;
    const dtxt = d == null ? '' : (d >= 0 ? '+' : '') + (pct ? f2x(d) + ' pp' : (Math.round(d * 100) / 100)) + ' vs ' + monthName(prevM(m)).split(' ')[0];
    let sev = 'ok', detail = 'on target (' + (k.target ?? '—') + (pct ? '%' : '') + ')';
    if (v == null) { sev = 'info'; detail = 'no data this month'; }
    else if (k.target != null && v < k.target) { sev = 'crit'; detail = 'below target ' + k.target + (pct ? '%' : '') + ' (' + (pct ? f2x(v - k.target) + ' pp' : Math.round((v - k.target) * 100) / 100) + ')'; }
    else if (k.target != null && v - k.target < (pct ? 2 : 0.1)) { sev = 'warn'; detail = 'close to target ' + k.target + (pct ? '%' : ''); }
    else if (d != null && d <= (pct ? -3 : -0.2)) { sev = 'warn'; detail = 'falling ' + dtxt; }
    const why = k.kind === 'csat' ? ((cur.csat && cur.csat.responded != null) ? cur.csat.responded + ' responses, ' + cur.csat.rate + '% response rate' : '') : topMiss(k.kind, k.prios, m);
    items.push({ sev: sev, title: k.label + ' ' + vs, detail: detail + (dtxt && sev !== 'warn' ? ' · ' + dtxt : ''), why: why, card: k.card, ctx: { type: 'card', id: k.card, label: k.label, month: m, value: v, unit: k.unit, target: k.target } });
    const low = k.kind === 'fcr' ? cur.fcr && cur.fcr.lowVolume : k.kind === 'sla' ? cur.sla && cur.sla[k.prios[0]] && cur.sla[k.prios[0]].lowVolume : false;
    if (low) items.push({ sev: 'info', title: k.label + ': low volume', detail: 'fewer than 10 incidents — read the % with care', why: '', card: k.card });
  });
  const r = D.atRisk || []; const nb = r.filter(x => x.badge === 'Breached').length, na = r.length - nb;
  if (nb) items.push({ sev: 'crit', title: nb + ' open P3/P4 breached', detail: 'SLA already exceeded at ' + D.snapshot, why: 'oldest ' + Math.max.apply(null, r.map(x => x.elapsedH)) + ' business h', to: 'atrisk', ctx: { type: 'table', id: 'atRisk', title: 'At-risk incidents', breached: nb, atRisk: na } });
  if (na) items.push({ sev: 'warn', title: na + ' open P3/P4 at risk', detail: '≥ 75% of the SLA time used', why: '', to: 'atrisk' });
  (D.notices || []).forEach(n => items.push({ sev: 'info', title: 'Data notice', detail: n, why: '' }));
  const ord = { crit: 0, warn: 1, info: 2, ok: 3 }; return items.sort((a, b) => ord[a.sev] - ord[b.sev]);
}
function actAttention(it) { if (it.card) openDrill(it.card); else if (it.to) { const el = document.getElementById(it.to); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); const f = el.querySelector('[tabindex]'); if (f) f.focus({ preventScroll: true }); } } }
function renderAttention(m) {
  const box = $('#attention'); if (!MV('attention')) { box.innerHTML = ''; return; }
  const items = attentionItems(m); const need = items.filter(i => i.sev === 'crit' || i.sev === 'warn');
  const head = '<div class="ah">' + (need.length ? '⚠ ' + need.length + ' need' + (need.length === 1 ? 's' : '') + ' attention' : '✓ All KPIs on target') + ' <span class="muted">· ' + monthName(m) + '</span></div>';
  let h;
  if (MODE === 'warnings') {
    const list = need.length ? need : items.filter(i => i.sev === 'ok');
    h = '<div class="att" data-ask="' + esc(JSON.stringify({ type: 'attention', month: m, items: need.map(i => i.title + ' — ' + i.detail) })) + '">' + head + '<div class="wlist">' + list.map((it, i) => '<div class="witem"><span class="sev ' + it.sev + '"></span><div><b>' + esc(it.title) + '</b> — ' + esc(it.detail) + (it.why ? '<div class="why">Why: ' + esc(it.why) + '</div>' : '') + '</div><div class="acts">' + (it.card || it.to ? '<button type="button" data-i="' + i + '">' + (it.card ? 'Drill-down' : 'Show incidents') + '</button>' : '') + (it.ctx ? '<button type="button" class="askbtn" data-a="' + i + '">💬 Ask</button>' : '') + '</div></div>').join('') + '</div></div>';
    box.innerHTML = h;
    box.querySelectorAll('[data-i]').forEach(b => b.onclick = () => actAttention(list[+b.dataset.i]));
    box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => window.dispatchEvent(new CustomEvent('itsm-ask', { detail: list[+b.dataset.a].ctx })));
  } else {
    h = '<div class="att" data-ask="' + esc(JSON.stringify({ type: 'attention', month: m, items: need.map(i => i.title + ' — ' + i.detail) })) + '">' + head + '<div class="chipsrow">' + items.map((it, i) => '<button type="button" class="achip" data-i="' + i + '" title="' + esc(it.detail + (it.why ? ' — ' + it.why : '')) + '"><span class="dot ' + it.sev + '"></span>' + esc(it.title) + '</button>').join('') + '</div></div>';
    box.innerHTML = h; box.querySelectorAll('[data-i]').forEach(b => b.onclick = () => actAttention(items[+b.dataset.i]));
  }
  return items;
}
function isoWeekStart(day) { return day - ((day + 3) % 7); }
function dayLabel(day) { const d = new Date(day * 86400000); return d.toISOString().slice(8, 10) + ' ' + d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }); }
function renderWeekly() {
  const box = $('#weekly'); if (MODE !== 'weekly' || !MV('weekly') || !DR) { box.innerHTML = ''; return; }
  const last = Math.floor(Date.parse(D.snapshot.replace(' ', 'T') + ':00Z') / 86400000); const cw = isoWeekStart(last);
  const weeks = []; for (let w = 7; w >= 0; w--) weeks.push({ start: cw - w * 7, n: 0, fp: 0, fo: 0, sn: 0, so: 0 });
  DR.rows.forEach(r => { const d = r[CI.rday]; if (d < weeks[0].start || d > last) return; const w = weeks[Math.floor((isoWeekStart(d) - weeks[0].start) / 7)]; if (!w) return; w.n++; if (r[CI.fcr] >= 0) { w.fp++; if (r[CI.fcr] === 1) w.fo++; } if (r[CI.sla] >= 0) { w.sn++; if (r[CI.sla] === 1) w.so++; } });
  const pc = (a, b) => b ? Math.round(a / b * 10000) / 100 : null;
  const labels = weeks.map((w, i) => 'wk ' + dayLabel(w.start) + (i === weeks.length - 1 ? ' (to date)' : ''));
  box.innerHTML = '<div class="mod" data-ask="' + esc(JSON.stringify({ type: 'weekly', title: 'Last 8 weeks', weeks: weeks.map((w, i) => ({ week: labels[i], resolved: w.n, fcrPct: pc(w.fo, w.fp), slaPct: pc(w.so, w.sn) })) })) + '" tabindex="0" aria-label="Last 8 weeks operational view"><h2>Last 8 weeks — resolved, FCR and P3/P4 SLA</h2><div class="mb"><div class="chartbox" style="height:240px"><canvas id="ch-weekly" role="img" aria-label="' + esc('Weekly FCR and SLA: ' + weeks.map((w, i) => labels[i] + ' FCR ' + pc(w.fo, w.fp) + '% SLA ' + pc(w.so, w.sn) + '%').join('; ')) + '"></canvas></div>' +
    '<table class="tbl"><tr><th>Week</th><th>Resolved</th><th>FCR %</th><th>Missed FCR</th><th>P3/P4 SLA %</th><th>Breached SLA</th></tr>' + weeks.map((w, i) => '<tr><td>' + labels[i] + '</td><td>' + w.n + '</td><td>' + (pc(w.fo, w.fp) ?? 'n/a') + '</td><td>' + (w.fp - w.fo) + '</td><td>' + (pc(w.so, w.sn) ?? 'n/a') + '</td><td>' + (w.sn - w.so) + '</td></tr>').join('') + '</table></div></div>';
  charts.push(new Chart(document.getElementById('ch-weekly'), { type: 'line', data: { labels: labels, datasets: [
    { label: 'FCR %', data: weeks.map(w => pc(w.fo, w.fp)), borderColor: colorOf('accent'), backgroundColor: colorOf('accent'), borderWidth: 2, pointRadius: 3, tension: 0.15 },
    { label: 'P3/P4 SLA %', data: weeks.map(w => pc(w.so, w.sn)), borderColor: S.theme.series.P4, backgroundColor: S.theme.series.P4, borderWidth: 2, pointRadius: 3, tension: 0.15 },
    { label: 'FCR target', data: weeks.map(() => panelTarget('fcr')), borderColor: '#8A90A0', borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, fill: false, isTarget: true }] },
    options: { maintainAspectRatio: false, resizeDelay: 120, transitions: { resize: { animation: { duration: 0 } } }, plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } }, scales: { y: { suggestedMin: 60, max: 100, ticks: { font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } } } }));
}
function renderExtra(m) {
  const box = $('#extra'); let h = ''; const want = MODE === 'weekly' ? ['backlog', 'volume'] : MODE === 'monthly' ? ['volume'] : [];
  if (want.indexOf('backlog') >= 0 && MV('backlog')) {
    const b = D.backlog || []; const mx = Math.max(1, ...b.map(x => x.open)); const tot = b.reduce((a, x) => a + x.open, 0);
    h += '<div class="mod" tabindex="0" aria-label="Open backlog by group" data-ask="' + esc(JSON.stringify({ type: 'table', id: 'backlog', title: 'Open backlog by group', total: tot, rows: b.slice(0, 10) })) + '"><h2>Open backlog by group — ' + tot + ' open</h2><div class="mb">' + (b.length ? '<table class="tbl"><tr><th>Group</th><th>Open</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th><th>Breached</th><th>Oldest (business h)</th><th></th></tr>' + b.map(x => '<tr><td>' + esc(x.group) + '</td><td>' + x.open + '</td><td>' + x.P1 + '</td><td>' + x.P2 + '</td><td>' + x.P3 + '</td><td>' + x.P4 + '</td><td' + (x.breached ? ' class="nok"' : '') + '>' + x.breached + '</td><td>' + x.oldestH + '</td><td><span class="bar" style="width:' + Math.round(x.open / mx * 90) + 'px"></span></td></tr>').join('') + '</table>' : '<p class="muted">No open incidents.</p>') + '</div></div>';
  }
  if (want.indexOf('volume') >= 0 && MV('volume') && DR) {
    const idx = months.indexOf(m); const win = months.slice(Math.max(0, idx - 11), idx + 1); const cnt = {}; const src = {};
    DR.rows.forEach(r => { const mm = r[CI.month]; if (win.indexOf(mm) >= 0) cnt[mm] = (cnt[mm] || 0) + 1; if (mm === m) { const k = dn('source', r[CI.source]); src[k] = (src[k] || 0) + 1; } });
    const tm = cnt[m] || 0; const srcA = Object.entries(src).sort((a, b) => b[1] - a[1]); const mx = Math.max(1, ...srcA.map(x => x[1]));
    h += '<div class="mod" tabindex="0" aria-label="Resolved volume" data-ask="' + esc(JSON.stringify({ type: 'volume', title: 'Resolved volume', month: m, resolved: tm, byChannel: src })) + '"><h2>Resolved volume — ' + tm.toLocaleString('en-GB') + ' in ' + monthName(m) + '</h2><div class="mb"><div class="chartbox" style="height:200px"><canvas id="ch-volume" role="img" aria-label="' + esc('Resolved incidents per month: ' + win.map(k => k + ' ' + (cnt[k] || 0)).join(', ')) + '"></canvas></div>' +
      '<table class="tbl"><tr><th>Channel</th><th>Resolved</th><th>Share</th></tr>' + srcA.map(x => '<tr><td>' + esc(x[0]) + '</td><td>' + x[1] + '</td><td><span class="bar" style="width:' + Math.round(x[1] / mx * 90) + 'px"></span> ' + Math.round(x[1] / (tm || 1) * 100) + ' %</td></tr>').join('') + '</table></div></div>';
    box.innerHTML = h;
    charts.push(new Chart(document.getElementById('ch-volume'), { type: 'bar', data: { labels: win, datasets: [{ label: 'Resolved incidents', data: win.map(k => cnt[k] || 0), backgroundColor: colorOf('accent'), borderRadius: 4, maxBarThickness: 28 }] },
      options: { maintainAspectRatio: false, resizeDelay: 120, transitions: { resize: { animation: { duration: 0 } } }, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } } } } }));
  } else box.innerHTML = h;
}
function renderModules(m, cur) {
  const items = renderAttention(m) || [];
  renderWeekly(); renderExtra(m);
  const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
  show('panels', MODE !== 'weekly'); show('weekly', MODE === 'weekly');
  // kolejność sekcji wg trybu
  const order = MODE === 'weekly' ? ['attention', 'weekly', 'atrisk', 'extra', 'panels'] : MODE === 'warnings' ? ['attention', 'atrisk', 'panels', 'weekly', 'extra'] : ['attention', 'panels', 'atrisk', 'extra', 'weekly'];
  order.forEach((id, i) => { const el = document.getElementById(id); if (el) el.style.order = i; });
  // Warnings: panele od najgorszego (czerwone, potem pomarańczowe)
  if (MODE === 'warnings') { const sev = { crit: 0, warn: 1, info: 2, ok: 3 }; const score = pid => Math.min.apply(null, items.filter(it => it.card && ((pid === 'fcr' && it.card.indexOf('fcr') === 0) || (pid === 'sla' && it.card.indexOf('sla') === 0) || (pid === 'csat' && it.card.indexOf('csat') === 0))).map(it => sev[it.sev]).concat([3]));
    const box = $('#panels'); [...box.children].map((el, i) => ({ el: el, s: score(S.panels.filter(p => p.visible)[i]?.id) })).sort((a, b) => a.s - b.s).forEach(x => box.appendChild(x.el)); }
}

sel.onchange = render; render();
// Weryfikacja
{ const V = D.verification; let h = '';
  if (!V) h = '<p class="muted">Verification not run yet.</p>';
  else { h += '<h3>Independent recalculation — ' + monthName(V.month) + ' ' + (V.allMatch ? '<span class="ok">✔ all figures match</span>' : '<span class="nok">✘ differences found</span>') + '</h3>';
    h += '<p class="muted">Second implementation: business time counted minute by minute (separate code path from the dashboard engine).</p>';
    h += '<table class="tbl"><tr><th>KPI</th><th>Dashboard engine</th><th>Independent check</th><th></th></tr>' + V.table.map(r => '<tr><td>' + r.kpi + '</td><td>' + (r.engine ?? 'n/a') + '</td><td>' + (r.independent ?? 'n/a') + '</td><td>' + (r.match ? '<span class="ok">✔</span>' : '<span class="nok">✘</span>') + '</td></tr>').join('') + '</table>';
    for (const [k, rows] of Object.entries(V.samples)) { h += '<h3>' + k + ' — sample tickets and how they were counted</h3><table class="tbl"><tr><th>Incident</th><th>Prio</th><th>Submitted</th><th>Resolved</th><th>Initial → final group</th><th>Transfers</th><th>Pending (min)</th><th>Net business min</th><th>Verdict</th></tr>' +
      rows.map(r => '<tr><td>' + esc(r.id) + '</td><td>' + r.prio + '</td><td>' + r.submit + '</td><td>' + r.resolved + '</td><td>' + esc(r.initGroup || '') + ' → ' + esc(r.group || '') + '</td><td>' + (r.transfers ?? 'n/a') + '</td><td>' + (r.pendingMin ?? 'n/a') + '</td><td>' + r.netBusinessMin + '</td><td>' + esc(r.verdict) + '</td></tr>').join('') + '</table>'; } }
  $('#p-verify').innerHTML = h; }
// Dane i założenia
{ const M = D.meta; let h = '<h3>Load summary</h3>';
  (M.load ? Object.entries(M.load) : []).forEach(([k, l]) => { h += '<p><b>' + esc(k) + '</b>: ' + l.rowsLoaded + ' of ' + l.rowsIn + ' rows loaded' + (l.from ? ' · ' + l.from + ' → ' + l.to : '') + '. ' + (Object.keys(l.skipped || {}).length ? 'Skipped: ' + Object.entries(l.skipped).map(([w, n]) => n + ' × ' + esc(w)).join(', ') : 'Nothing skipped.') + '</p>'; });
  if (M.anonymization) { h += '<h3>Anonymisation</h3>'; Object.entries(M.anonymization).forEach(([k, r]) => { h += '<p><b>' + esc(k) + '</b>: removed ' + (r.dropped.join(', ') || '—') + '; hashed ' + (r.hashed.join(', ') || '—') + '</p>'; }); }
  if (M.mapping) { h += '<h3>Column mapping (approved)</h3><table class="tbl"><tr><th>File</th><th>Concept</th><th>Source column</th></tr>'; Object.entries(M.mapping).forEach(([k, mp]) => Object.entries(mp).forEach(([f, c]) => { if (c) h += '<tr><td>' + k + '</td><td>' + f + '</td><td>' + esc(c) + '</td></tr>'; })); h += '</table>'; }
  h += '<h3>Assumptions</h3><ul>' + (M.assumptions || []).map(a => '<li>' + esc(a) + '</li>').join('') + '</ul>';
  $('#p-data').innerHTML = h; }
sortable(document);
$('#foot').textContent = 'Generated ' + D.generatedAt + ' · ITSM dashboard chat PoC (demo) · figures computed by the engine, not by the language model.';
</script></body></html>`;
}
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
