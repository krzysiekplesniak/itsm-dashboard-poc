// ITSM KPI engine (JavaScript twin of skills/itsm-html-builder/scripts/build_dashboard.py).
// Used by: the plugin CLI (scripts/itsm.mjs), the MCP server (mcp/server.mjs) and the web app on GitHub Copilot.
// Numbers are computed here, never by the language model.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from './csv.mjs';
import { detectOrder, monthOf } from './profile.mjs';

export const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TEMPLATE = path.join(PLUGIN_ROOT, 'skills', 'itsm-html-builder', 'templates', 'dashboard.html');

const norm = s => String(s ?? '').trim().toLowerCase();
export function match(val, f) {
  const v = norm(val), t = (Array.isArray(f.value) ? f.value : [f.value]).map(norm);
  switch (f.op || 'equals') {
    case 'equals': return v === t[0];
    case 'notEquals': return v !== t[0];
    case 'in': return t.includes(v);
    case 'notIn': return !t.includes(v);
    case 'startsWith': return t.some(x => v.startsWith(x));
    case 'contains': return t.some(x => v.includes(x));
    case 'notEmpty': return v !== '';
    default: throw new Error(`Unknown filter op "${f.op}"`);
  }
}
export function num(raw) {
  let v = String(raw ?? '').trim().replace(/\s/g, '');
  if (!v) return null;
  if ((v.match(/,/g) || []).length === 1 && !v.includes('.')) v = v.replace(',', '.');
  const x = Number(v); return Number.isFinite(x) ? x : null;
}

function colIndex(header, name, where) {
  let i = header.indexOf(name);
  if (i < 0) i = header.map(h => h.toLowerCase()).indexOf(String(name).toLowerCase());
  if (i < 0) {
    const near = header.filter(h => h.toLowerCase().includes(String(name).toLowerCase().slice(0, 4)));
    throw new Error(`Column "${name}" not found in ${where}. Available: ${header.join(', ')}.${near.length ? ` Did you mean ${near.join(' / ')}?` : ''}`);
  }
  return i;
}

export function neededColumns(spec, sid) {
  const s = spec.sources[sid];
  const cols = [s.id, s.date, s.breakdown, ...(s.filters || []).map(f => f.column), ...(s.detailColumns || [])];
  for (const k of spec.kpis) if (k.source === sid) cols.push(k.column, ...(k.where || []).map(f => f.column));
  for (const g of spec.globalFilters || []) cols.push(g.columns?.[sid]);
  return [...new Set(cols.filter(Boolean))];
}

/** Validate a spec against the rules the template relies on. Returns a list of problems (empty = OK). */
export function validateSpec(spec) {
  const e = [];
  if (!spec || typeof spec !== 'object') return ['spec must be an object'];
  if (!spec.sources || !Object.keys(spec.sources).length) e.push('sources: at least one source');
  for (const [sid, s] of Object.entries(spec.sources || {})) { if (!s.file) e.push(`sources.${sid}.file missing`); if (!s.date) e.push(`sources.${sid}.date missing`); }
  const ids = new Set();
  for (const k of spec.kpis || []) {
    if (!k.id) e.push('kpi without id'); if (ids.has(k.id)) e.push(`duplicate kpi id ${k.id}`); ids.add(k.id);
    if (!spec.sources?.[k.source]) e.push(`kpi ${k.id}: unknown source ${k.source}`);
    if (!['rate', 'mean', 'count'].includes(k.type)) e.push(`kpi ${k.id}: type must be rate | mean | count`);
    if (k.type !== 'count' && !k.column) e.push(`kpi ${k.id}: column missing`);
    if (k.type === 'rate' && !(k.positive || []).length) e.push(`kpi ${k.id}: positive values missing`);
  }
  if (!(spec.kpis || []).length) e.push('kpis: at least one KPI');
  for (const p of spec.panels || []) {
    for (const c of p.cards || []) if (!ids.has(c.kpi)) e.push(`panel ${p.id}: card uses unknown kpi ${c.kpi}`);
    for (const k of p.chart?.kpis || []) if (!ids.has(k)) e.push(`panel ${p.id}: chart uses unknown kpi ${k}`);
  }
  if (!(spec.panels || []).length) e.push('panels: at least one panel');
  return e;
}

/** Load the CSV files named in the spec. `files` = { fileName: absolutePath } or a folder path. */
export function loadSources(spec, files) {
  const data = {}, notes = [];
  for (const [sid, s] of Object.entries(spec.sources)) {
    const p = typeof files === 'string' ? path.join(files, s.file) : files[s.file];
    if (!p || !fs.existsSync(p)) throw new Error(`Missing file for source "${sid}": ${s.file}`);
    const { header, rows } = readCsv(p);
    const cols = neededColumns(spec, sid), idx = cols.map(c => colIndex(header, c, s.file));
    const slim = rows.map(r => idx.map(i => r[i] ?? ''));
    let order = s.dateFormat && s.dateFormat !== 'auto' ? s.dateFormat : null;
    if (!order) { const [o, w] = detectOrder(slim.map(r => r[cols.indexOf(s.date)])); order = o; if (w) notes.push(`${s.file}: date order ${w}.`); }
    data[sid] = { columns: cols, rows: slim, dateOrder: order, file: s.file, total: rows.length };
  }
  return { data, notes };
}

/**
 * Compute every KPI per month. `selection` = { filterId: [values] } for global filters (group, priority…).
 * Returns { months, kpis, notes, kept, flags } — kept/flags are row-level and used for drill-down.
 */
export function compute(spec, data, selection = {}) {
  const res = { months: [], kpis: {}, notes: [], kept: {}, flags: {} };
  const all = new Set();
  for (const [sid, s] of Object.entries(spec.sources)) {
    const d = data[sid]; if (!d) continue;
    const cols = d.columns, di = cols.indexOf(s.date);
    const fi = (s.filters || []).map(f => [cols.indexOf(f.column), f]);
    const gi = (spec.globalFilters || []).filter(g => selection[g.id]?.length && g.columns?.[sid]).map(g => [cols.indexOf(g.columns[sid]), selection[g.id].map(norm)]);
    const kept = []; let bad = 0;
    for (const r of d.rows) {
      if (!fi.every(([i, f]) => match(r[i], f))) continue;
      if (!gi.every(([i, vals]) => vals.includes(norm(r[i])))) continue;
      const m = monthOf(r[di], d.dateOrder);
      if (!m) { bad++; continue; }
      kept.push({ m, r });
    }
    if (bad) res.notes.push(`${d.file}: ${bad} rows skipped (date “${s.date}” empty or unreadable).`);
    res.kept[sid] = kept; d.kept = kept.length;
  }
  for (const k of spec.kpis) {
    const d = data[k.source]; if (!d) { res.kpis[k.id] = {}; continue; }
    const cols = d.columns, ci = k.column ? cols.indexOf(k.column) : -1;
    const wi = (k.where || []).map(f => [cols.indexOf(f.column), f]);
    const pos = (k.positive || []).map(norm), neg = k.negative ? k.negative.map(norm) : null;
    const per = {}, flags = new Map(); let excl = 0;
    for (const it of res.kept[k.source] || []) {
      const r = it.r;
      if (!wi.every(([i, f]) => match(r[i], f))) continue;
      const b = (per[it.m] ||= { num: 0, den: 0, sum: 0, n: 0 });
      if (k.type === 'rate') {
        const v = norm(r[ci]);
        if (pos.includes(v)) { b.num++; b.den++; flags.set(r, 1); }
        else if (neg === null || neg.includes(v)) { b.den++; flags.set(r, 0); }
        else excl++;
      } else if (k.type === 'mean') {
        const x = num(r[ci]); if (x === null) { excl++; continue; }
        b.sum += x / (k.divide || 1); b.n++; flags.set(r, k.target == null || x / (k.divide || 1) >= k.target ? 1 : 0);
      } else { b.n++; flags.set(r, 1); }
    }
    const out = {};
    for (const m of Object.keys(per).sort()) {
      const b = per[m];
      if (k.type === 'rate') { if (!b.den) continue; out[m] = { value: b.num / b.den * 100, num: b.num, den: b.den, missed: b.den - b.num, count: b.den }; }
      else if (k.type === 'mean') { if (!b.n) continue; out[m] = { value: b.sum / b.n, count: b.n }; }
      else out[m] = { value: b.n, count: b.n };
      all.add(m);
    }
    if (excl) res.notes.push(`KPI ${k.id}: ${excl} rows excluded (value not in positive/negative lists or not numeric).`);
    res.kpis[k.id] = out; res.flags[k.id] = flags;
  }
  res.months = [...all].sort();
  return res;
}

export function status(k, v) {
  if (k.target == null || v == null) return 'neutral';
  const margin = k.type === 'mean' ? 0.1 : 2, higher = (k.direction || 'higher') === 'higher';
  const gap = higher ? v - k.target : k.target - v;
  return gap < 0 ? 'critical' : gap < margin ? 'warning' : 'met';
}
export const fmt = (k, v) => v == null || Number.isNaN(v) ? 'n/a' : v.toFixed(k.decimals ?? 1);

/** Values for one month: value, previous month, target, status, count, misses. The only numbers an agent may quote. */
export function kpiTable(spec, R, month) {
  const m = month && R.months.includes(month) ? month : R.months.at(-1);
  const i = R.months.indexOf(m), pm = i > 0 ? R.months[i - 1] : null;
  return { month: m, previousMonth: pm, availableMonths: R.months, kpis: spec.kpis.map(k => {
    const c = R.kpis[k.id]?.[m], p = pm ? R.kpis[k.id]?.[pm] : null;
    return { id: k.id, label: k.label, unit: k.unit, value: c ? +fmt(k, c.value) : null, previous: p ? +fmt(k, p.value) : null,
      changeVsPrevious: c && p ? +fmt(k, c.value - p.value) : null, target: k.target ?? null, status: status(k, c?.value), records: c?.count ?? 0, missed: c?.missed ?? null,
      lowVolume: c ? c.count < (spec.lowVolume ?? 10) : null };
  }) };
}

/** Rule-based findings — the same rules as the "What the data says" block of the page. */
export function findings(spec, R, month) {
  const m = month && R.months.includes(month) ? month : R.months.at(-1);
  const i = R.months.indexOf(m), pm = i > 0 ? R.months[i - 1] : null, out = [];
  const win = R.months.filter(x => x <= m).slice(-(spec.trendMonths || 12));
  for (const k of spec.kpis) {
    const cur = R.kpis[k.id]?.[m]; if (!cur) { out.push({ level: 'info', kpi: k.id, text: `${k.label}: no data for ${m}.` }); continue; }
    const st = status(k, cur.value), prev = pm ? R.kpis[k.id]?.[pm] : null, d = prev ? cur.value - prev.value : null, u = k.type === 'mean' ? '' : ' pp';
    const higher = (k.direction || 'higher') === 'higher';
    if (st === 'critical') out.push({ level: 'critical', kpi: k.id, text: `${k.label} is ${fmt(k, cur.value)}${k.unit === '%' ? ' %' : ''}, below the target of ${fmt(k, k.target)}${d != null ? ` (${d >= 0 ? '+' : '−'}${fmt(k, Math.abs(d))}${u} vs ${pm})` : ''}.` });
    else if (st === 'warning') out.push({ level: 'warning', kpi: k.id, text: `${k.label} is ${fmt(k, cur.value)}, within ${k.type === 'mean' ? '0.1' : '2 pp'} of the target ${fmt(k, k.target)}.` });
    if (d != null && Math.abs(d) >= (k.type === 'mean' ? 0.2 : 3)) out.push({ level: (higher ? d < 0 : d > 0) ? 'warning' : 'met', kpi: k.id, text: `${k.label} ${d < 0 ? 'fell' : 'rose'} by ${fmt(k, Math.abs(d))}${u} from ${pm} to ${m}.` });
    const last = win.map(x => R.kpis[k.id]?.[x]?.value).slice(-4);
    if (last.length === 4 && last.every(v => v != null) && [1, 2, 3].every(j => higher ? last[j] < last[j - 1] : last[j] > last[j - 1])) out.push({ level: 'warning', kpi: k.id, text: `${k.label} has ${higher ? 'declined' : 'risen'} three months in a row (${fmt(k, last[0])} → ${fmt(k, last[3])}).` });
    const ly = `${+m.slice(0, 4) - 1}${m.slice(4)}`, old = R.kpis[k.id]?.[ly];
    if (old && fmt(k, Math.abs(cur.value - old.value)) !== fmt(k, 0)) out.push({ level: 'info', kpi: k.id, text: `${k.label}: ${fmt(k, cur.value)} vs ${fmt(k, old.value)} in ${ly} (${cur.value >= old.value ? '+' : '−'}${fmt(k, Math.abs(cur.value - old.value))}${u} year on year).` });
    if (cur.count < (spec.lowVolume ?? 10)) out.push({ level: 'info', kpi: k.id, text: `${k.label} is based on only ${cur.count} records in ${m}.` });
    const conc = concentration(spec, R, k, m); if (conc) out.push({ level: 'info', kpi: k.id, text: conc });
    const vals = win.map(x => [x, R.kpis[k.id]?.[x]?.value]).filter(x => x[1] != null);
    if (vals.length >= 3 && higher && vals.reduce((a, b) => (b[1] > a[1] ? b : a))[0] === m) out.push({ level: 'met', kpi: k.id, text: `${k.label} in ${m} is the best month of the last ${vals.length}.` });
  }
  const rank = { critical: 0, warning: 1, info: 2, met: 3 };
  return { month: m, findings: out.sort((a, b) => rank[a.level] - rank[b.level]) };
}

function concentration(spec, R, k, m) {
  const src = spec.sources[k.source], by = src.breakdown, cur = R.kpis[k.id]?.[m];
  if (!by || k.type !== 'rate' || !cur?.missed) return null;
  const r = records(spec, R, { kpi: k.id, month: m, by }); const top = r.breakdown[0];
  return top?.missed ? `Most missed ${k.label} in ${m}: ${top.value} — ${top.missed} of ${cur.missed} misses (${(top.missed / top.total * 100).toFixed(1)} % of that ${by.toLowerCase()}'s records).` : null;
}

/** Drill-down: population, misses, breakdown by a column, sample IDs of missed records (IDs only). */
export function records(spec, R, { kpi, month, by, limit = 10 }) {
  const k = spec.kpis.find(x => x.id === kpi); if (!k) throw new Error(`Unknown KPI ${kpi}. Known: ${spec.kpis.map(x => x.id).join(', ')}`);
  const m = month && R.months.includes(month) ? month : R.months.at(-1);
  const src = spec.sources[k.source], d = R._data?.[k.source];
  const cols = d?.columns || [], flags = R.flags[k.id], items = (R.kept[k.source] || []).filter(it => it.m === m && flags.has(it.r));
  const byCol = by || src.breakdown, bi = byCol ? cols.indexOf(byCol) : -1, idi = src.id ? cols.indexOf(src.id) : -1;
  const groups = new Map();
  for (const it of items) { const g = bi >= 0 ? (it.r[bi] || '(blank)') : 'all'; const e = groups.get(g) || { value: g, total: 0, missed: 0 }; e.total++; if (flags.get(it.r) === 0) e.missed++; groups.set(g, e); }
  const breakdown = [...groups.values()].map(e => ({ ...e, pct: +((e.total - e.missed) / e.total * 100).toFixed(1) })).sort((a, b) => b.missed - a.missed || b.total - a.total);
  const sample = idi >= 0 ? items.filter(it => flags.get(it.r) === 0).slice(0, limit).map(it => it.r[idi]) : [];
  const c = R.kpis[k.id]?.[m];
  return { kpi: k.id, label: k.label, month: m, value: c ? +fmt(k, c.value) : null, records: items.length, missed: items.filter(it => flags.get(it.r) === 0).length, missedMeaning: k.type === 'mean' ? `score below target ${k.target}` : `value not in ${JSON.stringify(k.positive)}`, by: byCol || null, breakdown: breakdown.slice(0, 15), sampleMissedIds: sample };
}

/** Render the dashboard HTML from the shared template (same file the plugin uses). */
export function renderHtml(spec, data, R, { embedData = true } = {}) {
  const tpl = fs.readFileSync(TEMPLATE, 'utf8');
  const js = o => JSON.stringify(o).replace(/<\//g, '<\\/');
  const embed = embedData ? Object.fromEntries(Object.entries(data).map(([sid, d]) => [sid, { columns: d.columns, rows: d.rows, dateOrder: d.dateOrder, file: d.file, total: d.total }])) : null;
  const pre = embedData ? { months: R.months, kpis: R.kpis } : null;
  return tpl.replace('/*__SPEC__*/null', () => js(spec)).replace('/*__DATA__*/null', () => embed ? js(embed) : 'null')
    .replace('/*__RESULTS__*/null', () => pre ? js(pre) : 'null').replace('__TITLE__', () => (spec.title || 'KPI dashboard').replace(/[<>&]/g, ''));
}

/** Full build: load → compute → html + results JSON (same shape as build_dashboard.py). */
export function build(spec, files, { embedData = true } = {}) {
  const problems = validateSpec(spec); if (problems.length) throw new Error('Spec problems: ' + problems.join('; '));
  const { data, notes } = loadSources(spec, files);
  const R = compute(spec, data); R._data = data;
  const latest = R.months.at(-1) ?? null;
  const results = { months: R.months, kpis: R.kpis, notes: [...notes, ...R.notes], generated: new Date().toISOString().slice(0, 16).replace('T', ' '),
    rows: Object.fromEntries(Object.entries(data).map(([sid, d]) => [sid, { file: d.file, total: d.total, kept: d.kept, dateOrder: d.dateOrder }])), latest,
    status: Object.fromEntries(spec.kpis.map(k => [k.id, status(k, R.kpis[k.id]?.[latest]?.value)])) };
  return { html: renderHtml(spec, data, R, { embedData }), results, R, data };
}
