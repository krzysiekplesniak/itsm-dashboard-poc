// Stan jednej sesji budowy dashboardu. Każda metoda = jedno "narzędzie" dostępne dla agenta (Copilot)
// i dla trybu offline. Tu nie ma LLM — tylko deterministyczny kod.
import { parseCsv } from './engine/csv.js';
import { buildDrill, drillSummary } from './engine/drill.js';
import { anonymize } from './engine/anonymize.js';
import { profile } from './engine/profile.js';
import { proposeMapping, CANONICAL } from './engine/mapping.js';
import { DEFAULT_KPI_CONFIG, normalizeIncidents, normalizeSurveys, computeAll } from './engine/kpi.js';
import { verifyMonth } from './engine/verify.js';
import { defaultSpec, applyOps } from './engine/spec.js';
import { renderDashboard } from './engine/render.js';
import { buildBrief } from './engine/brief.js';
import { parseCalendar } from './engine/calendar.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** Kalendarz biznesowy z pliku (CALENDAR_FILE albo config/calendar.json); brak pliku = domyślny LU. */
export function loadCalendarFile(file = process.env.CALENDAR_FILE || path.join(ROOT, 'config', 'calendar.json')) {
  if (!fs.existsSync(file)) return null;
  return { ...parseCalendar(fs.readFileSync(file, 'utf8')), file: path.basename(file) };
}

export class Project {
  constructor() {
    this.files = {};          // kind -> { name, columns, rows, anonymization, profile }
    this.proposals = {};      // kind -> propozycja mapowania
    this.mappings = {};       // kind -> zatwierdzone mapowanie
    this.config = structuredClone(DEFAULT_KPI_CONFIG);
    try { const cal = loadCalendarFile(); if (cal) this.config.calendar = cal; } catch (e) { this.calendarError = e.message; }
    this.spec = defaultSpec();
    this.decisions = [];      // zapis rozmowy → BRIEF.md: { section, text }
    this.computed = null; this.normalized = null; this.verification = null; this._drill = null;
    this.isMock = false;
    this.step = 1;
  }

  /** Podmiana kalendarza biznesowego (np. plik od ACME) — liczby przeliczane od nowa. */
  setCalendar(json, name = 'calendar.json') {
    this.config.calendar = { ...parseCalendar(json), file: name };
    this.computed = null; this.verification = null; this._drill = null;
    const c = this.config.calendar;
    return { ok: true, name: c.name, hours: `${c.startHour}:00–${c.endHour}:00`, workdays: c.workdays, holidayRules: c.holidays.rules, extraDates: c.holidays.dates.length };
  }

  /** Wczytanie pliku: parsowanie → ANONIMIZACJA (zawsze) → profil. */
  loadFile(kind, name, text) {
    if (!['incidents', 'surveys'].includes(kind)) throw new Error('kind: incidents | surveys');
    const parsed = parseCsv(text);
    if (!parsed.rows.length) throw new Error('The file is empty or not a valid CSV.');
    const anon = anonymize(parsed);
    const prof = profile(anon);
    this.files[kind] = { name, columns: anon.columns, rows: anon.rows, anonymization: anon.report, profile: prof, parseErrors: parsed.errors, held: anon.held, hashValue: anon.hashValue };
    if (/mock/i.test(name)) this.isMock = true;
    this.computed = null; this.verification = null;
    const rv = anon.report.review.map(x => x.column);
    return { kind, name, rows: prof.rowCount, anonymization: { dropped: anon.report.dropped, hashed: anon.report.hashed, review: anon.report.review }, summary: `${kind}: ${prof.rowCount} rows, ${anon.columns.length} columns after anonymisation (removed: ${anon.report.dropped.join(', ') || '—'}; hashed: ${anon.report.hashed.join(', ') || '—'}${rv.length ? '; ON HOLD for your decision: ' + rv.join(', ') : ''})` };
  }

  /** Kolumny wstrzymane do decyzji użytkownika (tylko nazwy, powody i zamaskowane przykłady). */
  anonymisationReview() {
    const pending = [];
    for (const [kind, f] of Object.entries(this.files)) for (const r of f.anonymization.review || []) if (f.held && r.column in f.held) pending.push({ kind, ...r });
    return { pending, note: pending.length ? 'These columns are ON HOLD (not visible to the assistant). Ask the user for each: keep (needed and not personal), hash (replace by a code), or drop (default, safest).' : 'No columns waiting for a decision.' };
  }

  /** Decyzja użytkownika dla kolumn niepewnych: keep | hash | drop. */
  decideAnonymisation(kind, decisions) {
    const f = this.files[kind]; if (!f) throw new Error(`No ${kind} file loaded.`);
    const done = {};
    for (const [col, d] of Object.entries(decisions)) {
      if (!f.held || !(col in f.held)) { done[col] = 'not on hold'; continue; }
      const vals = f.held[col];
      if (d === 'keep' || d === 'hash') { f.rows.forEach((r, i) => { r[col] = d === 'hash' ? f.hashValue(vals[i]) : vals[i]; }); f.columns.push(col); (d === 'hash' ? f.anonymization.hashed : (f.anonymization.keptAfterReview ??= [])).push(col); }
      else { f.anonymization.dropped.push(col); }
      delete f.held[col]; done[col] = d;
      const r = f.anonymization.review.find(x => x.column === col); if (r) r.decision = d;
    }
    f.profile = profile({ columns: f.columns, rows: f.rows });
    this.computed = null; this.verification = null; this._drill = null;
    this.recordDecision('techniczne', `Anonymisation (${kind}): ` + Object.entries(done).map(([c, d]) => `${c} → ${d}`).join(', '));
    return { kind, decisions: done, stillOnHold: Object.keys(f.held || {}) };
  }

  /** Fakty o danych — to, co agent widzi (bez surowych wierszy). */
  dataOverview() {
    const out = {};
    for (const [k, f] of Object.entries(this.files)) {
      out[k] = { file: f.name, rows: f.profile.rowCount, anonymization: f.anonymization,
        columns: f.profile.columns.map(c => ({ name: c.name, type: c.type, missingPct: c.missingPct, distinct: c.distinct, ...(c.min != null ? { min: c.min, max: c.max } : {}), ...(c.top && c.distinct <= 12 ? { values: c.top } : {}), ...(c.formatExample ? { example: c.formatExample } : {}) })) };
    }
    return out;
  }

  proposeMapping(kind) {
    const f = this.files[kind]; if (!f) throw new Error(`Najpierw wgraj plik ${kind}.`);
    const p = proposeMapping(kind, f.profile);
    this.proposals[kind] = p;
    return { kind, ...p, fields: Object.fromEntries(Object.entries(CANONICAL[kind]).map(([k, d]) => [k, d.label + (d.required ? ' (required)' : '')])) };
  }

  approveMapping(kind, mapping) {
    const f = this.files[kind]; if (!f) throw new Error(`Brak pliku ${kind}.`);
    const bad = Object.entries(mapping).filter(([, c]) => c && !f.columns.includes(c)).map(([k, c]) => `${k}→${c}`);
    if (bad.length) throw new Error(`Columns not found in the file: ${bad.join(', ')}`);
    const missing = Object.entries(CANONICAL[kind]).filter(([k, d]) => d.required && !mapping[k]).map(([k]) => k);
    this.mappings[kind] = { ...mapping };
    this.computed = null;
    return { kind, approved: this.mappings[kind], missingRequired: missing, note: missing.length ? 'Required fields are missing — affected KPIs will show n/a.' : 'Mapping complete.' };
  }

  /** Zmiana reguł/parametrów (cele, progi, grupy Service Desku, skala ocen, mapowanie wartości priorytetu). */
  setConfig(patch = {}) {
    const c = this.config;
    if (patch.fcrTargetPct != null) c.fcr.targetPct = Number(patch.fcrTargetPct);
    if (patch.fcrMaxBusinessMinutes != null) c.fcr.maxBusinessMinutes = Number(patch.fcrMaxBusinessMinutes);
    if (patch.slaP3Hours != null) c.sla.P3.hours = Number(patch.slaP3Hours);
    if (patch.slaP4Hours != null) c.sla.P4.hours = Number(patch.slaP4Hours);
    if (patch.slaTargetPct != null) c.sla.targetPct = Number(patch.slaTargetPct);
    if (patch.csatTarget != null) c.csat.targetAvg = Number(patch.csatTarget);
    if (patch.serviceDeskGroups) c.valueRules.serviceDeskGroups = patch.serviceDeskGroups;
    if (patch.ratingScale) c.valueRules.ratingScale = patch.ratingScale;
    if (patch.priorityValues) for (const [p, vals] of Object.entries(patch.priorityValues)) c.valueRules.priority[p] = vals.map(v => String(v).toLowerCase());
    // cele widoczne na dashboardzie
    const ops = [];
    if (patch.fcrTargetPct != null) ops.push({ op: 'setTarget', panel: 'fcr', value: c.fcr.targetPct });
    if (patch.slaTargetPct != null) ops.push({ op: 'setTarget', panel: 'sla', value: c.sla.targetPct });
    if (patch.csatTarget != null) ops.push({ op: 'setTarget', panel: 'csat', value: c.csat.targetAvg });
    if (ops.length) this.spec = applyOps(this.spec, ops).spec;
    this.computed = null;
    return { config: { fcr: c.fcr, sla: c.sla, csat: c.csat, serviceDeskGroups: c.valueRules.serviceDeskGroups, ratingScale: c.valueRules.ratingScale, priority: c.valueRules.priority } };
  }

  compute() {
    if (!this.files.incidents || !this.mappings.incidents) throw new Error('Needed first: the incident file and an approved column mapping.');
    const ni = normalizeIncidents(this.files.incidents.rows, this.mappings.incidents, this.config);
    const ns = this.files.surveys && this.mappings.surveys ? normalizeSurveys(this.files.surveys.rows, this.mappings.surveys, this.config) : null;
    this.normalized = { incidents: ni.incidents, surveys: ns?.surveys ?? null, load: { incidents: ni.load, ...(ns ? { surveys: ns.load } : {}) }, ratingScale: ns?.scale };
    this.computed = computeAll({ incidents: ni.incidents, surveys: ns?.surveys ?? null }, this.config);
    this._drill = null; // dane drill-down liczone od nowa po każdej zmianie danych lub reguł
    if (!this.spec.month) this.spec.month = null;
    return this.computed;
  }

  kpiSummary(month) {
    if (!this.computed) this.compute();
    const m = month || this.spec.month || this.computed.defaultMonth;
    return { month: m, kpis: this.computed.months[m], ytd: this.computed.ytd[m], atRisk: { breached: this.computed.atRisk.filter(a => a.badge === 'Breached').length, atRisk: this.computed.atRisk.filter(a => a.badge === 'At risk').length }, notices: this.computed.notices, load: this.normalized.load, ratingScale: this.normalized.ratingScale, availableMonths: Object.keys(this.computed.months) };
  }

  verify(month) {
    if (!this.computed) this.compute();
    const m = month || this.spec.month || this.computed.defaultMonth;
    this.verification = verifyMonth(this.normalized, this.config, this.computed, m);
    return this.verification;
  }

  updateSpec(ops) { const r = applyOps(this.spec, ops); this.spec = r.spec; return { applied: r.applied, errors: r.errors }; }

  recordDecision(section, text) { this.decisions.push({ section, text, at: new Date().toISOString() }); return { recorded: this.decisions.length }; }

  assumptions() {
    const c = this.config; const a = [
      `Business hours: ${c.calendar.startHour}:00–${c.calendar.endHour}:00 on ${(c.calendar.workdays || []).map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}; holidays: ${c.calendar.holidays === 'LU' || c.calendar.holidays?.rules === 'LU' ? 'Luxembourg public holidays (incl. Easter Monday, Ascension, Whit Monday)' : 'custom list'}${c.calendar.holidays?.dates?.length ? ' + ' + c.calendar.holidays.dates.length + ' listed dates' : ''} — source: ${c.calendar.file || 'built-in default'}.`,
      `FCR: population = resolved incidents whose initial group ∈ {${c.valueRules.serviceDeskGroups.join(', ')}}; success = no transfer and solved in < ${c.fcr.maxBusinessMinutes} business minutes. Target ${c.fcr.targetPct}%.`,
      `SLA: P3 ≤ ${c.sla.P3.hours} h, P4 ≤ ${c.sla.P4.hours} business hours, target ${c.sla.targetPct}%. Open incidents are excluded from SLA %.`,
      `Pending time is subtracted as business minutes (assumption — to confirm with the KPI owners).`,
      `CSAT: average on a 1–5 scale; ${this.normalized?.ratingScale === '2-10' ? 'ratings 2–10 (Vendor: Terrible 2 … Excellent 10) divided by 2' : 'ratings already on 1–5'}. Target ≥ ${c.csat.targetAvg}.`,
      `Month attribution: incidents by resolved date; surveys by response date (rating, responded) and sent date (sent).`,
      `Dates are treated as Europe/Luxembourg local time (export time zone to confirm).`,
    ];
    return a;
  }

  /** Drill-down dla czatu: dlaczego KPI ma taką wartość (rozbicie, przyczyny, przykładowe zgłoszenia). */
  drillDown({ metric, month, by } = {}) {
    if (!this.computed) this.compute();
    if (!this._drill) this._drill = buildDrill(this.normalized, this.config);
    return drillSummary(this._drill, this.computed, { metric, month, by });
  }

  render() {
    if (!this.computed) this.compute();
    if (!this.verification) this.verify();
    return renderDashboard({ spec: this.spec, computed: this.computed, verification: this.verification,
      drill: (this._drill ??= buildDrill(this.normalized, this.config)),
      meta: { isMock: this.isMock, load: this.normalized.load, anonymization: Object.fromEntries(Object.entries(this.files).map(([k, f]) => [k, f.anonymization])), mapping: this.mappings, assumptions: this.assumptions() } });
  }

  brief() { return buildBrief(this); }
}
