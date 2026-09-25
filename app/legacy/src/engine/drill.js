// Dane do drill-down (kliknięcie w kafelek → modal): zwarta lista rozwiązanych incydentów z wynikiem
// FCR i SLA policzonym przez silnik (te same funkcje co KPI) + rozkład ocen ankiet per miesiąc.
// Tylko pola zanonimizowane (ID, grupy, usługa, kategoria, kanał) — bez danych osobowych.
import { netBusinessMinutes, isFcrPopulation, isFcrSuccess, slaThresholdMin } from './kpi.js';
import { monthKey, fmtDate } from './dates.js';

export function buildDrill(normalized, cfg) {
  const dict = {}; const idx = (k, v) => { if (v == null || v === '') return -1; const d = (dict[k] ??= { list: [], map: new Map() }); if (!d.map.has(v)) { d.map.set(v, d.list.length); d.list.push(v); } return d.map.get(v); };
  const rows = [];
  for (const i of normalized.incidents) {
    if (i.statusClass !== 'resolved' || i.resolved == null) continue;
    const net = netBusinessMinutes(i, cfg);
    const pop = isFcrPopulation(i, cfg); const ok = pop ? isFcrSuccess(i, cfg) : false;
    const thr = (i.prio === 'P3' || i.prio === 'P4') ? slaThresholdMin(i.prio, cfg) : null;
    rows.push([i.id, monthKey(i.resolved), i.prio, idx('group', i.group), idx('service', i.service), idx('category', i.category), idx('source', i.source),
      i.transfers ?? -1, Math.round(net), pop ? (ok ? 1 : 0) : -1, thr == null ? -1 : (net <= thr ? 1 : 0), fmtDate(i.submit), fmtDate(i.resolved), idx('group', i.initGroup), Math.floor(i.resolved / 86400000)]);
  }
  const ratings = {};
  for (const s of normalized.surveys || []) {
    if (s.resp == null || s.score == null) continue;
    const m = monthKey(s.resp); (ratings[m] ??= {}); ratings[m][s.raw] = (ratings[m][s.raw] || 0) + 1;
  }
  return {
    cols: ['id', 'month', 'prio', 'group', 'service', 'category', 'source', 'transfers', 'netMin', 'fcr', 'sla', 'submit', 'resolved', 'initGroup', 'rday'],
    dict: Object.fromEntries(Object.entries(dict).map(([k, d]) => [k, d.list])),
    rows, ratings, ratingScale: normalized.ratingScale || '1-5',
    fcrMax: cfg.fcr.maxBusinessMinutes, slaHours: { P3: cfg.sla.P3.hours, P4: cfg.sla.P4.hours },
  };
}

const RATING_LABELS = { '2-10': { 2: 'Terrible', 4: 'Dislike', 6: 'OK', 8: 'Good', 10: 'Excellent' }, '1-5': { 1: 'Terrible', 2: 'Dislike', 3: 'OK', 4: 'Good', 5: 'Excellent' } };
export const DRILL_METRICS = ['fcr', 'sla_p3', 'sla_p4', 'sla_combined', 'csat'];

/** Podsumowanie drill-down dla LLM/czatu: skąd bierze się wynik KPI w danym miesiącu (liczby z silnika). */
export function drillSummary(drill, computed, { metric, month, by } = {}) {
  const m = month || computed.defaultMonth;
  const C = Object.fromEntries(drill.cols.map((c, i) => [c, i]));
  const name = (k, i) => (i < 0 ? '(empty)' : drill.dict[k][i]);
  if (metric === 'csat') {
    const scale = drill.ratingScale; const lab = RATING_LABELS[scale] || {};
    const dist = Object.entries(drill.ratings[m] || {}).map(([r, n]) => ({ rating: Number(r), label: lab[r] || r, count: n })).sort((a, b) => b.rating - a.rating);
    const c = computed.months[m]?.csat || {}; const prev = computed.months[prevMonth(m)]?.csat || {};
    return { metric, month: m, average: c.avg ?? null, previousMonthAverage: prev.avg ?? null, sent: c.sent ?? null, responded: c.responded ?? null, responseRatePct: c.rate ?? null, ratingScale: scale, distribution: dist, ytd: computed.ytd[m] ?? null };
  }
  const prios = metric === 'sla_p3' ? ['P3'] : metric === 'sla_p4' ? ['P4'] : ['P3', 'P4'];
  const isFcr = metric === 'fcr';
  const pick = mm => drill.rows.filter(r => r[C.month] === mm && (isFcr ? r[C.fcr] >= 0 : prios.includes(r[C.prio]) && r[C.sla] >= 0));
  const okOf = r => (isFcr ? r[C.fcr] === 1 : r[C.sla] === 1);
  const rows = pick(m); const met = rows.filter(okOf).length; const pct = rows.length ? Math.round(met / rows.length * 10000) / 100 : null;
  const pr = pick(prevMonth(m)); const prevPct = pr.length ? Math.round(pr.filter(okOf).length / pr.length * 10000) / 100 : null;
  const missed = rows.filter(r => !okOf(r));
  let reasons;
  if (isFcr) {
    const transferred = missed.filter(r => r[C.transfers] > 0 || r[C.group] !== r[C.initGroup]).length;
    reasons = [{ reason: 'transferred to another group', count: transferred }, { reason: `solved in ≥ ${drill.fcrMax} business minutes without transfer`, count: missed.length - transferred }];
  } else {
    const over = r => r[C.netMin] / (drill.slaHours[r[C.prio]] * 60);
    reasons = [{ reason: 'breached by < 25 %', count: missed.filter(r => over(r) < 1.25).length }, { reason: 'breached by 25–100 %', count: missed.filter(r => over(r) >= 1.25 && over(r) < 2).length }, { reason: 'more than 2× the threshold', count: missed.filter(r => over(r) >= 2).length }];
  }
  const dim = by || (isFcr ? 'category' : 'group'); const col = C[dim];
  const groups = new Map();
  for (const r of rows) { const k = name(dim, r[col]); const g = groups.get(k) || { [dim]: k, total: 0, met: 0 }; g.total++; if (okOf(r)) g.met++; groups.set(k, g); }
  const breakdown = [...groups.values()].map(g => ({ ...g, missed: g.total - g.met, pct: Math.round(g.met / g.total * 10000) / 100, shareOfMissesPct: missed.length ? Math.round((g.total - g.met) / missed.length * 1000) / 10 : 0 })).sort((a, b) => b.missed - a.missed);
  const sample = missed.slice(0, 5).map(r => ({ id: r[C.id], prio: r[C.prio], submitted: r[C.submit], resolved: r[C.resolved], initialGroup: name('group', r[C.initGroup]), group: name('group', r[C.group]), category: name('category', r[C.category]), transfers: r[C.transfers] < 0 ? null : r[C.transfers], netBusinessMinutes: r[C.netMin] }));
  return { metric, month: m, population: rows.length, met, missed: missed.length, pct, previousMonthPct: prevPct, changePp: pct != null && prevPct != null ? Math.round((pct - prevPct) * 100) / 100 : null, reasons, breakdownBy: dim, breakdown, sampleMissed: sample, note: 'All figures computed by the engine. Breakdown sorted by number of misses.' };
}
function prevMonth(m) { const [y, mo] = m.split('-').map(Number); const d = new Date(Date.UTC(y, mo - 2, 1)); return d.toISOString().slice(0, 7); }
