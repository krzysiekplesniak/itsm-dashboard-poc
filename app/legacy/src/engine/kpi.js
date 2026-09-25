// Silnik KPI — liczy WSZYSTKIE liczby dashboardu. LLM nigdy nie liczy sam.
// Definicje wg BRIEF.md projektu §5 + Excel Vendor (SLA-06 FCR "30 min", SLA-08 CSAT "Average out of 5").
import { businessMinutes, DEFAULT_CALENDAR } from './calendar.js';
import { parseDate, monthKey } from './dates.js';
import { DEFAULT_VALUE_RULES, normalizeValue } from './mapping.js';

export const DEFAULT_KPI_CONFIG = {
  fcr: { targetPct: 70, maxBusinessMinutes: 30 },
  sla: { P3: { hours: 8 }, P4: { hours: 16 }, targetPct: 90, atRiskShare: 0.75 },
  csat: { targetAvg: 4.2 },
  lowVolume: 10,
  pendingUnit: 'business-minutes', // założenie do potwierdzenia (właściciele KPI)
  calendar: DEFAULT_CALENDAR,
  valueRules: DEFAULT_VALUE_RULES,
};

const get = (row, mapping, field) => (mapping[field] ? row[mapping[field]] : undefined);

/** Normalizuje incydenty do modelu kanonicznego + podsumowanie wczytania. */
export function normalizeIncidents(rows, mapping, cfg = DEFAULT_KPI_CONFIG) {
  const skipped = {}; const out = [];
  const skip = (why) => { skipped[why] = (skipped[why] || 0) + 1; };
  const seen = new Set();
  for (const r of rows) {
    const id = get(r, mapping, 'incident_id');
    if (!id) { skip('brak identyfikatora'); continue; }
    if (seen.has(id)) { skip('zduplikowany identyfikator'); continue; }
    seen.add(id);
    const submit = parseDate(get(r, mapping, 'submit_date'));
    if (submit == null) { skip('unreadable submit date'); continue; }
    const prio = normalizeValue('priority', get(r, mapping, 'priority'), cfg.valueRules);
    if (!prio) { skip('brak/nieznany priorytet'); continue; }
    const statusClass = normalizeValue('status', get(r, mapping, 'status'), cfg.valueRules);
    const resolvedRaw = get(r, mapping, 'resolved_date');
    const resolved = parseDate(resolvedRaw);
    if (statusClass === 'resolved' && resolved == null) { skip('resolved status but no resolved date'); continue; }
    const pendingRaw = mapping.pending_minutes ? Number(get(r, mapping, 'pending_minutes') || 0) : null;
    const transfersRaw = mapping.transfer_count ? Number(get(r, mapping, 'transfer_count') || 0) : null;
    out.push({
      id, submit, resolved, prio, statusClass,
      initGroup: get(r, mapping, 'initial_group') ?? null,
      group: get(r, mapping, 'assigned_group') ?? null,
      transfers: Number.isFinite(transfersRaw) ? transfersRaw : null,
      pendingMin: Number.isFinite(pendingRaw) ? pendingRaw : null,
      service: get(r, mapping, 'service') ?? null, category: get(r, mapping, 'category') ?? null, source: get(r, mapping, 'source') ?? null,
    });
  }
  const dates = out.map(i => i.submit);
  return { incidents: out, load: { rowsIn: rows.length, rowsLoaded: out.length, skipped, from: dates.length ? new Date(Math.min(...dates)).toISOString().slice(0, 10) : null, to: dates.length ? new Date(Math.max(...dates)).toISOString().slice(0, 10) : null } };
}

export function normalizeSurveys(rows, mapping, cfg = DEFAULT_KPI_CONFIG) {
  const out = []; const skipped = {};
  const ratings = rows.map(r => Number(get(r, mapping, 'rating'))).filter(Number.isFinite);
  const scale = cfg.valueRules.ratingScale === 'auto' ? (ratings.length && Math.max(...ratings) > 5 ? '2-10' : '1-5') : cfg.valueRules.ratingScale;
  for (const r of rows) {
    const sent = parseDate(get(r, mapping, 'sent_date'));
    if (sent == null) { skipped['no sent date'] = (skipped['no sent date'] || 0) + 1; continue; }
    const resp = parseDate(get(r, mapping, 'response_date'));
    const raw = Number(get(r, mapping, 'rating'));
    const score = resp != null && Number.isFinite(raw) && get(r, mapping, 'rating') !== '' ? (scale === '2-10' ? raw / 2 : raw) : null;
    out.push({ incidentId: get(r, mapping, 'incident_id'), sent, resp, score, raw: score != null ? raw : null });
  }
  return { surveys: out, scale, load: { rowsIn: rows.length, rowsLoaded: out.length, skipped } };
}

/** Czas rozwiązania netto w minutach biznesowych (minus pending). */
export function netBusinessMinutes(inc, cfg = DEFAULT_KPI_CONFIG, endMs = inc.resolved) {
  const gross = businessMinutes(inc.submit, endMs, cfg.calendar);
  const pending = inc.pendingMin ?? 0;
  return Math.max(0, gross - pending);
}

export function isFcrPopulation(inc, cfg) { return inc.statusClass === 'resolved' && inc.initGroup != null && cfg.valueRules.serviceDeskGroups.includes(inc.initGroup); }
export function isFcrSuccess(inc, cfg) {
  const sd = cfg.valueRules.serviceDeskGroups;
  const stayed = (inc.transfers == null ? true : inc.transfers === 0) && (inc.group == null || sd.includes(inc.group));
  return stayed && netBusinessMinutes(inc, cfg) < cfg.fcr.maxBusinessMinutes;
}
export function slaThresholdMin(prio, cfg) { return (cfg.sla[prio]?.hours ?? null) * 60; }

/** Liczy KPI dla wszystkich miesięcy obecnych w danych. */
export function computeAll({ incidents, surveys }, cfg = DEFAULT_KPI_CONFIG, { snapshot } = {}) {
  const notices = [];
  const snap = snapshot ?? Math.max(...incidents.map(i => Math.max(i.submit, i.resolved ?? 0)), ...(surveys || []).map(s => Math.max(s.sent, s.resp ?? 0)));
  const hasInit = incidents.some(i => i.initGroup != null);
  const hasTransfers = incidents.some(i => i.transfers != null);
  const hasPending = incidents.some(i => i.pendingMin != null);
  if (!hasInit) notices.push('No "initial group" column — FCR cannot be computed (n/a).');
  if (!hasTransfers) notices.push('No transfer count — FCR is approximated from the resolving group only.');
  if (!hasPending) notices.push('Pending time could not be subtracted (field missing in the extract).');
  if (!surveys) notices.push('No survey file — CSAT cards show n/a.');

  const months = {};
  const M = k => (months[k] ??= { fcr: { population: 0, success: 0 }, sla: { P3: { n: 0, met: 0 }, P4: { n: 0, met: 0 } }, csat: { sent: 0, responded: 0, scoreSum: 0 } });
  for (const inc of incidents) {
    if (inc.statusClass !== 'resolved' || inc.resolved == null) continue;
    const m = M(monthKey(inc.resolved));
    if (hasInit && isFcrPopulation(inc, cfg)) { m.fcr.population++; if (isFcrSuccess(inc, cfg)) m.fcr.success++; }
    if (inc.prio === 'P3' || inc.prio === 'P4') {
      m.sla[inc.prio].n++;
      if (netBusinessMinutes(inc, cfg) <= slaThresholdMin(inc.prio, cfg)) m.sla[inc.prio].met++;
    }
  }
  for (const s of surveys || []) {
    M(monthKey(s.sent)).csat.sent++;
    if (s.resp != null && s.score != null) { const m = M(monthKey(s.resp)); m.csat.responded++; m.csat.scoreSum += s.score; }
  }
  const pct = (a, b) => (b ? Math.round(a / b * 10000) / 100 : null);
  const result = {};
  for (const [k, m] of Object.entries(months).sort()) {
    const p3 = m.sla.P3, p4 = m.sla.P4;
    result[k] = {
      fcr: hasInit ? { pct: pct(m.fcr.success, m.fcr.population), missed: m.fcr.population - m.fcr.success, total: m.fcr.population, lowVolume: m.fcr.population < cfg.lowVolume } : null,
      sla: { P3: { pct: pct(p3.met, p3.n), n: p3.n, lowVolume: p3.n < cfg.lowVolume }, P4: { pct: pct(p4.met, p4.n), n: p4.n, lowVolume: p4.n < cfg.lowVolume }, combined: { pct: pct(p3.met + p4.met, p3.n + p4.n), n: p3.n + p4.n } },
      csat: surveys ? { sent: m.csat.sent, responded: m.csat.responded, avg: m.csat.responded ? Math.round(m.csat.scoreSum / m.csat.responded * 100) / 100 : null, rate: pct(m.csat.responded, m.csat.sent) } : null,
    };
  }
  // Ankiety narastająco od początku roku (referencja: "This year")
  const ytd = {};
  for (const k of Object.keys(result)) {
    const y = k.slice(0, 4); let sent = 0, resp = 0;
    for (const [k2, v] of Object.entries(result)) if (k2.startsWith(y) && k2 <= k && v.csat) { sent += v.csat.sent; resp += v.csat.responded; }
    ytd[k] = { sent, responded: resp, rate: pct(resp, sent) };
  }
  // Incydenty zagrożone (otwarte P3/P4) w chwili migawki
  const atRisk = incidents.filter(i => (i.statusClass === 'open' || i.statusClass === 'pending') && (i.prio === 'P3' || i.prio === 'P4')).map(i => {
    const elapsed = netBusinessMinutes(i, cfg, snap); const th = slaThresholdMin(i.prio, cfg);
    return { id: i.id, prio: i.prio, submit: i.submit, group: i.group, elapsedH: Math.round(elapsed / 6) / 10, thresholdH: th / 60, badge: elapsed > th ? 'Breached' : elapsed >= th * cfg.sla.atRiskShare ? 'At risk' : null };
  }).filter(r => r.badge).sort((a, b) => b.elapsedH - a.elapsedH);

  // v0.2: otwarty backlog wg grupy w chwili migawki (open/pending), z priorytetami, przekroczeniami i najstarszym
  const bl = new Map();
  for (const i of incidents) {
    if (i.statusClass !== 'open' && i.statusClass !== 'pending') continue;
    const g = i.group || '(no group)'; const o = bl.get(g) || { group: g, open: 0, P1: 0, P2: 0, P3: 0, P4: 0, breached: 0, oldestH: 0 };
    const el = netBusinessMinutes(i, cfg, snap); const th = slaThresholdMin(i.prio, cfg);
    o.open++; o[i.prio] = (o[i.prio] || 0) + 1; if (th && el > th) o.breached++; o.oldestH = Math.max(o.oldestH, Math.round(el / 6) / 10); bl.set(g, o);
  }
  const backlog = [...bl.values()].sort((a, b) => b.open - a.open);

  const snapDate = new Date(snap);
  const lastComplete = new Date(Date.UTC(snapDate.getUTCFullYear(), snapDate.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  return { months: result, ytd, atRisk, backlog, notices, snapshot: new Date(snap).toISOString().slice(0, 16).replace('T', ' '), defaultMonth: result[lastComplete] ? lastComplete : Object.keys(result).at(-1) };
}
