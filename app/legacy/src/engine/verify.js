// Weryfikacja (Faza 4 briefu: "Verify the Numbers"): niezależne przeliczenie KPI inną ścieżką kodu
// (kalendarz liczony minuta po minucie) + 3 przykładowe tickety na KPI z uzasadnieniem.
import { businessMinutesBruteForce } from './calendar.js';
import { monthKey, fmtDate } from './dates.js';

export function verifyMonth({ incidents, surveys }, cfg, computed, month) {
  const sd = new Set(cfg.valueRules.serviceDeskGroups);
  const inMonth = incidents.filter(i => i.statusClass === 'resolved' && i.resolved != null && monthKey(i.resolved) === month);
  const net = i => Math.max(0, businessMinutesBruteForce(i.submit, i.resolved, cfg.calendar) - (i.pendingMin ?? 0));

  // FCR — niezależnie
  const pop = inMonth.filter(i => i.initGroup != null && sd.has(i.initGroup));
  const ok = pop.filter(i => (i.transfers ?? 0) === 0 && (i.group == null || sd.has(i.group)) && net(i) < cfg.fcr.maxBusinessMinutes);
  // SLA — niezależnie
  const slaOf = p => { const xs = inMonth.filter(i => i.prio === p); const met = xs.filter(i => net(i) <= cfg.sla[p].hours * 60); return { n: xs.length, met: met.length }; };
  const p3 = slaOf('P3'), p4 = slaOf('P4');
  // CSAT — niezależnie
  const sent = (surveys || []).filter(s => monthKey(s.sent) === month).length;
  const resp = (surveys || []).filter(s => s.resp != null && s.score != null && monthKey(s.resp) === month);
  const pct = (a, b) => (b ? Math.round(a / b * 10000) / 100 : null);
  const independent = {
    'FCR %': pct(ok.length, pop.length), 'FCR population': pop.length,
    'SLA P3 %': pct(p3.met, p3.n), 'SLA P4 %': pct(p4.met, p4.n), 'SLA P3+P4 %': pct(p3.met + p4.met, p3.n + p4.n),
    'CSAT average': resp.length ? Math.round(resp.reduce((a, s) => a + s.score, 0) / resp.length * 100) / 100 : null,
    'Surveys sent': surveys ? sent : null, 'Surveys responded': surveys ? resp.length : null,
  };
  const c = computed.months[month] || {};
  const engine = {
    'FCR %': c.fcr?.pct ?? null, 'FCR population': c.fcr?.total ?? null,
    'SLA P3 %': c.sla?.P3.pct ?? null, 'SLA P4 %': c.sla?.P4.pct ?? null, 'SLA P3+P4 %': c.sla?.combined.pct ?? null,
    'CSAT average': c.csat?.avg ?? null, 'Surveys sent': c.csat?.sent ?? null, 'Surveys responded': c.csat?.responded ?? null,
  };
  const table = Object.keys(independent).map(k => ({ kpi: k, engine: engine[k], independent: independent[k], match: engine[k] === independent[k] }));

  const explain = (i, verdict) => ({ id: i.id, prio: i.prio, submit: fmtDate(i.submit), resolved: fmtDate(i.resolved), initGroup: i.initGroup, group: i.group, transfers: i.transfers, pendingMin: i.pendingMin, netBusinessMin: net(i), verdict });
  const samples = {
    FCR: [
      ...ok.slice(0, 2).map(i => explain(i, `COUNTS as FCR: started in the Service Desk, no transfer, solved in < ${cfg.fcr.maxBusinessMinutes} business min`)),
      ...pop.filter(i => !ok.includes(i)).slice(0, 1).map(i => explain(i, (i.transfers ?? 0) > 0 ? 'NOT FCR: transferred to another group' : `NOT FCR: solved in ≥ ${cfg.fcr.maxBusinessMinutes} business min`)),
    ],
    'SLA P3': inMonth.filter(i => i.prio === 'P3').slice(0, 3).map(i => explain(i, net(i) <= cfg.sla.P3.hours * 60 ? `within SLA (≤ ${cfg.sla.P3.hours} business h)` : `SLA BREACHED (> ${cfg.sla.P3.hours} business h)`)),
    'SLA P4': inMonth.filter(i => i.prio === 'P4').slice(0, 3).map(i => explain(i, net(i) <= cfg.sla.P4.hours * 60 ? `within SLA (≤ ${cfg.sla.P4.hours} business h)` : `SLA BREACHED (> ${cfg.sla.P4.hours} business h)`)),
  };
  // Najlepiej pokazać też przypadek poza SLA, jeśli istnieje
  for (const p of ['P3', 'P4']) {
    const breach = inMonth.find(i => i.prio === p && net(i) > cfg.sla[p].hours * 60);
    if (breach) samples[`SLA ${p}`][2] = explain(breach, `SLA BREACHED (> ${cfg.sla[p].hours} business h)`);
  }
  return { month, allMatch: table.every(r => r.match), table, samples };
}
