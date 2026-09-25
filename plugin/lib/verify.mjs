// Independent re-count of every KPI (written separately from engine.mjs: record objects, explicit date
// patterns, no shared helpers) + comparison with build results and an optional external reference.
import path from 'node:path';
import fs from 'node:fs';
import { readCsv } from './csv.mjs';

const PATTERNS = {
  ISO: [/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/, m => [+m[1], +m[2]]],
  DMY: [/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})\b/, m => [+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2]]],
  MDY: [/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})\b/, m => [+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[1]]],
};
function toMonth(value, order) {
  const v = String(value || '').trim(); if (!v) return null;
  for (const key of [order, 'ISO']) {
    const [rx, f] = PATTERNS[key] || []; if (!rx) continue;
    const m = v.match(rx); if (!m) continue;
    const [y, mo] = f(m); if (mo >= 1 && mo <= 12) return `${y}-${mo < 10 ? '0' + mo : mo}`;
  }
  return null;
}
function passes(value, flt) {
  const v = String(value ?? '').trim().toLocaleLowerCase('en');
  const items = [].concat(flt.value).map(x => String(x).trim().toLocaleLowerCase('en'));
  return ({ equals: () => v === items[0], notEquals: () => v !== items[0], in: () => items.includes(v), notIn: () => !items.includes(v),
    startsWith: () => items.some(i => v.startsWith(i)), contains: () => items.some(i => v.includes(i)), notEmpty: () => v !== '' })[flt.op || 'equals']();
}

export function recount(spec, files, orders = {}) {
  const out = {}, cache = {};
  for (const k of spec.kpis) {
    const s = spec.sources[k.source];
    if (!cache[k.source]) {
      const p = typeof files === 'string' ? path.join(files, s.file) : files[s.file];
      const { header, rows } = readCsv(p);
      cache[k.source] = rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
    }
    const order = orders[k.source] || (s.dateFormat && s.dateFormat !== 'auto' ? s.dateFormat : 'DMY');
    const pos = new Set((k.positive || []).map(x => String(x).trim().toLocaleLowerCase('en')));
    const neg = k.negative ? new Set(k.negative.map(x => String(x).trim().toLocaleLowerCase('en'))) : null;
    const agg = new Map();
    for (const r of cache[k.source]) {
      if (!(s.filters || []).every(f => passes(r[f.column], f))) continue;
      const m = toMonth(r[s.date], order); if (!m) continue;
      if (!(k.where || []).every(f => passes(r[f.column], f))) continue;
      const a = agg.get(m) || { p: 0, t: 0, s: 0 }; agg.set(m, a);
      const val = String(r[k.column] ?? '').trim();
      if (k.type === 'rate') { const cf = val.toLocaleLowerCase('en'); if (pos.has(cf)) { a.p++; a.t++; } else if (!neg || neg.has(cf)) a.t++; }
      else if (k.type === 'mean') { const x = val === '' ? NaN : Number(val.replace(',', '.')); if (!Number.isNaN(x)) { a.t++; a.s += x / (k.divide || 1); } }
      else a.t++;
    }
    const res = {};
    for (const [m, a] of agg) if (a.t) res[m] = [k.type === 'rate' ? a.p / a.t * 100 : k.type === 'mean' ? a.s / a.t : a.t, a.t];
    out[k.id] = res;
  }
  return out;
}

/** Compare build results with the re-count (and optional reference rows {kpi, month, value}). */
export function verify(spec, results, files, { reference = null, tolerance = 0.1 } = {}) {
  const orders = Object.fromEntries(Object.entries(results.rows || {}).map(([sid, r]) => [sid, r.dateOrder]));
  const mine = recount(spec, files, orders);
  const rows = []; let bad = 0;
  for (const k of spec.kpis) {
    const d = results.kpis[k.id] || {}, mm = mine[k.id] || {};
    for (const m of [...new Set([...Object.keys(d), ...Object.keys(mm)])].sort()) {
      const dv = d[m]?.value ?? null, dc = d[m]?.count ?? null, [mv, mc] = mm[m] || [null, null];
      const ok = dv != null && mv != null && Math.abs(dv - mv) < 1e-9 && dc === mc; if (!ok) bad++;
      rows.push({ kpi: k.id, label: k.label, month: m, dashboard: dv, recount: mv, records: [dc, mc], match: ok, decimals: k.decimals ?? 1 });
    }
  }
  const ref = [];
  for (const r of reference || []) {
    const v = results.kpis[r.kpi]?.[r.month]?.value ?? null, diff = v == null ? null : v - Number(r.value);
    const ok = diff != null && Math.abs(diff) <= tolerance; if (!ok) bad++;
    ref.push({ kpi: r.kpi, month: r.month, dashboard: v, reference: Number(r.value), difference: diff, withinTolerance: ok });
  }
  return { checks: rows.length, matching: rows.filter(r => r.match).length, allMatch: bad === 0, rows, reference: ref, tolerance };
}

export function verifyMarkdown(v, meta = '') {
  const f = (x, d) => x == null ? '—' : x.toFixed(d);
  const L = ['# Verification of dashboard numbers', '', meta, '', 'Two independent implementations computed every KPI for every month. ✓ = same value and same record count.', '',
    '| KPI | Month | Dashboard | Re-count | Records (dash / re-count) | Match |', '|---|---|---|---|---|---|',
    ...v.rows.map(r => `| ${r.label} | ${r.month} | ${f(r.dashboard, r.decimals)} | ${f(r.recount, r.decimals)} | ${r.records[0]} / ${r.records[1]} | ${r.match ? '✓' : '✗'} |`),
    '', `**Result: ${v.matching} of ${v.checks} checks match.**${v.matching < v.checks ? ' ✗ Do not present the dashboard until every mismatch is explained.' : ''}`];
  if (v.reference.length) L.push('', '## Comparison with the external reference', '', `Tolerance: ±${v.tolerance}`, '', '| KPI | Month | Dashboard | Reference | Difference | Within tolerance |', '|---|---|---|---|---|---|',
    ...v.reference.map(r => `| ${r.kpi} | ${r.month} | ${f(r.dashboard, 2)} | ${f(r.reference, 2)} | ${r.difference == null ? '—' : (r.difference >= 0 ? '+' : '') + r.difference.toFixed(2)} | ${r.withinTolerance ? '✓' : '✗'} |`),
    '', 'Typical reasons for differences: another snapshot date, month assigned by another date column, rows excluded by a filter, rounding in the reference.');
  return L.join('\n') + '\n';
}

export function readReferenceCsv(file) {
  const { header, rows } = readCsv(fs.readFileSync(file));
  const i = n => header.findIndex(h => h.toLowerCase() === n);
  return rows.map(r => ({ kpi: r[i('kpi')].trim(), month: r[i('month')].trim(), value: Number(String(r[i('value')]).replace(',', '.')) }));
}
