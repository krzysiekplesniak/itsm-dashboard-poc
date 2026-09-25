import Papa from 'papaparse';
/** Parsuje CSV (separator wykrywany automatycznie: , ; tab). Zwraca { columns, rows }. */
export function parseCsv(text) {
  const clean = text.replace(/^﻿/, '');
  const res = Papa.parse(clean, { header: true, skipEmptyLines: true, dynamicTyping: false, delimitersToGuess: [',', ';', '\t', '|'] });
  const columns = (res.meta.fields || []).map(c => c.trim());
  const rows = res.data.map(r => { const o = {}; for (const [k, v] of Object.entries(r)) o[k.trim()] = typeof v === 'string' ? v.trim() : v; return o; });
  return { columns, rows, errors: res.errors.slice(0, 20).map(e => `${e.type}: ${e.message} (wiersz ${e.row})`) };
}
export function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = v => { const s = v == null ? '' : String(v); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n') + '\n';
}
