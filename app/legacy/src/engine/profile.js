import { parseDate } from './dates.js';
/** Profil danych: typy, braki, najczęstsze wartości, zakres dat. Wynik jest bezpieczny do wysłania do LLM (po anonimizacji). */
export function profile({ columns, rows }, { maxDistinct = 12 } = {}) {
  const n = rows.length;
  const cols = columns.map(c => {
    const vals = rows.map(r => r[c]).filter(v => v !== '' && v != null);
    const sample = vals.slice(0, 300);
    const dateHits = sample.filter(v => parseDate(v) != null).length;
    const numHits = sample.filter(v => /^-?\d+(\.\d+)?$/.test(String(v))).length;
    const type = sample.length === 0 ? 'empty' : dateHits / sample.length > 0.9 ? 'date' : numHits / sample.length > 0.9 ? 'number' : 'text';
    const info = { name: c, type, filled: vals.length, missingPct: n ? Math.round((1 - vals.length / n) * 1000) / 10 : 0 };
    if (type === 'date') {
      const ds = vals.map(parseDate).filter(Boolean);
      info.min = new Date(Math.min(...ds)).toISOString().slice(0, 10); info.max = new Date(Math.max(...ds)).toISOString().slice(0, 10);
      info.formatExample = vals[0];
    } else if (type === 'number') {
      const ns = vals.map(Number); info.min = Math.min(...ns); info.max = Math.max(...ns);
      info.mean = Math.round(ns.reduce((a, b) => a + b, 0) / ns.length * 100) / 100;
    }
    const counts = new Map(); for (const v of vals) counts.set(v, (counts.get(v) || 0) + 1);
    info.distinct = counts.size;
    if (counts.size <= maxDistinct || type === 'text') info.top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxDistinct).map(([value, count]) => ({ value, count }));
    return info;
  });
  return { rowCount: n, columns: cols };
}
