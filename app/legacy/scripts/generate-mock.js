// Generator danych syntetycznych (MOCK) w kształcie eksportu BMC Helix ITSM.
// Kalibracja: Excel "vendor client view" (FCR SLA-06, CSAT SLA-08, sierpień 2026)
// oraz referencyjny dashboard (trend FCR, SLA P3/P4 ~99%, CSAT ~4.9 w skali 1–5).
// Dane są w 100% fikcyjne. Pola osobowe (nazwiska, e-maile, opisy) są celowo dodane,
// żeby pokazać krok anonimizacji.
import fs from 'node:fs';
import path from 'node:path';
import { addBusinessMinutes, businessMinutes, isBusinessDay } from '../src/engine/calendar.js';
import { fmtDate } from '../src/engine/dates.js';

let seed = 20260922;
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (a, b) => a + rnd() * (b - a);
const weighted = (pairs) => { const r = rnd(); let acc = 0; for (const [v, w] of pairs) { acc += w; if (r <= acc) return v; } return pairs[pairs.length - 1][0]; };

const START = Date.UTC(2025, 8, 1);            // 01.09.2025
const SNAPSHOT = Date.UTC(2026, 8, 22, 12, 0); // 22.09.2026 12:00 — "dzień eksportu"

// Docelowy FCR miesięcznie (odczyt z wykresu referencyjnego; 2025-09 dopisany)
const FCR_TARGET = { '2025-09': 0.80, '2025-10': 0.7917, '2025-11': 0.753, '2025-12': 0.748, '2026-01': 0.8152, '2026-02': 0.8489, '2026-03': 0.8402, '2026-04': 0.8378, '2026-05': 0.8127, '2026-06': 0.8259, '2026-07': 0.8263, '2026-08': 0.865, '2026-09': 0.8897 };
const P3_BREACH = 0.02, P4_BREACH = 0.004; // ~99.2% i ~99.9% w SLA

const SD = 'IT-Service Desk';
const OTHER_GROUPS = ['Workplace Support', 'Application Support', 'Network Operations', 'Identity & Access Mgmt', 'Database Team', 'Messaging & Collaboration'];
const SERVICES = ['Email & Calendar', 'Laptop & Peripherals', 'VPN & Remote Access', 'Printing', 'SAP', 'Identity & Passwords', 'Teams & Collaboration', 'Mobile Devices', 'Business Applications'];
const CAT1 = ['Hardware', 'Software', 'Access', 'Network', 'Account'];
const SOURCES = [['Phone', 0.45], ['Self Service', 0.25], ['Email', 0.18], ['Chat', 0.12]];
const FIRST = ['Anna', 'Marc', 'Sofia', 'Luca', 'Eva', 'Jonas', 'Claire', 'Pedro', 'Ines', 'Tomas', 'Julia', 'Mateo', 'Nora', 'Lars', 'Elena', 'Hugo'];
const LAST = ['Muller', 'Weber', 'Rossi', 'Dubois', 'Garcia', 'Novak', 'Schmit', 'Martin', 'Kowalski', 'Jansen', 'Silva', 'Klein', 'Moreau', 'Fischer'];
const AGENTS = ['agent.sd01', 'agent.sd02', 'agent.sd03', 'agent.sd04', 'agent.sd05', 'agent.sd06', 'agent.sd07', 'agent.sd08'];
const SUMMARIES = ['Cannot log in to VPN', 'Outlook keeps asking for password', 'Printer on floor 4 not working', 'Laptop battery drains fast', 'Access request to shared folder', 'Teams audio issue in meeting room', 'SAP transaction error', 'Mobile phone email sync failed', 'Password reset for {name}', 'New monitor not detected'];
const PRIO = [['Critical', 0.01], ['High', 0.04], ['Medium', 0.22], ['Low', 0.73]];
const THRESH = { Critical: 240, High: 360, Medium: 480, Low: 960 };

const incidents = [];
const surveys = [];
let incSeq = 100000, surSeq = 500000;

for (let day = START; day < SNAPSHOT; day += 86400000) {
  const biz = isBusinessDay(day);
  const count = biz ? Math.round(between(62, 82)) : Math.round(between(0, 3));
  for (let i = 0; i < count; i++) {
    const hourWeights = biz ? [[7.6, 0.03], [between(8, 12), 0.52], [between(12, 17.5), 0.40], [between(17.5, 20), 0.05]] : [[between(8, 20), 1]];
    const hour = weighted(hourWeights);
    const submit = day + Math.round(hour * 60) * 60000;
    if (submit >= SNAPSHOT) continue;
    const month = new Date(submit).toISOString().slice(0, 7);
    const priority = weighted(PRIO);
    const initialSD = rnd() < 0.71;
    const initialGroup = initialSD ? SD : pick(OTHER_GROUPS);
    let assignedGroup = initialGroup, transfers = 0, bizDur, pending = 0;

    if (initialSD) {
      if (rnd() < (FCR_TARGET[month] ?? 0.83)) {
        bizDur = between(2, 29);                          // FCR: SD, bez przekazania, < 30 min biznesowych
      } else if (rnd() < 0.6) {
        transfers = rnd() < 0.8 ? 1 : 2; assignedGroup = pick(OTHER_GROUPS); bizDur = null; // przekazany dalej
      } else {
        bizDur = between(31, 420);                        // SD, ale powyżej 30 min
      }
    }
    if (bizDur == null) {
      const th = THRESH[priority];
      const breach = (priority === 'Medium' && rnd() < P3_BREACH) || (priority === 'Low' && rnd() < P4_BREACH) || (['Critical', 'High'].includes(priority) && rnd() < 0.05);
      bizDur = breach ? th * between(1.05, 2.5) : Math.min(th * 0.97, 20 + Math.pow(rnd(), 1.6) * th);
      if (rnd() < 0.15) pending = Math.round(between(20, 900)); // czas w statusie Pending (min biznesowe)
    }
    const cancelled = rnd() < 0.008;
    let resolved = cancelled ? null : addBusinessMinutes(submit, bizDur + pending);
    let status;
    if (cancelled) status = 'Cancelled';
    else if (resolved > SNAPSHOT) { resolved = null; status = pending && rnd() < 0.5 ? 'Pending' : weighted([['In Progress', 0.7], ['Assigned', 0.3]]); }
    else status = (SNAPSHOT - resolved) > 5 * 86400000 ? 'Closed' : 'Resolved';
    const closed = status === 'Closed' ? resolved + Math.round(between(3, 6) * 86400000) : null;
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const id = `INC000000${++incSeq}`;
    incidents.push({
      'Incident ID': id,
      'Submit Date': fmtDate(submit),
      'Last Resolved Date': fmtDate(resolved),
      'Closed Date': fmtDate(closed && closed < SNAPSHOT ? closed : null),
      'Priority': priority,
      'Status': status,
      'Initial Assigned Group': initialGroup,
      'Assigned Group': assignedGroup,
      'Group Transfers': transfers,
      'Total Pending Duration (min)': pending,
      'Service': pick(SERVICES),
      'Categorization Tier 1': pick(CAT1),
      'Reported Source': weighted(SOURCES),
      'Customer Full Name': name,
      'Customer Email': `${name.toLowerCase().replace(' ', '.')}@example.test`,
      'Assignee': assignedGroup === SD ? pick(AGENTS) : `agent.${assignedGroup.split(' ')[0].toLowerCase()}${Math.ceil(rnd() * 5)}`,
      'Summary': pick(SUMMARIES).replace('{name}', name),
    });

    // Ankieta satysfakcji: wysyłana po rozwiązaniu; ~15% odpowiedzi; skala Vendor 2–10 (= 1–5 × 2)
    if (resolved && resolved + 3600000 < SNAPSHOT) {
      const sent = resolved + Math.round(between(5, 60)) * 60000;
      const responded = rnd() < 0.152 && sent + 3600000 < SNAPSHOT;
      const respDate = responded ? Math.min(SNAPSHOT - 60000, sent + Math.round(between(0.1, 72)) * 3600000) : null;
      const rating = responded ? weighted([[10, 0.905], [8, 0.087], [6, 0.002], [4, 0.005], [2, 0.001]]) : '';
      surveys.push({
        'Survey ID': `SUR000${++surSeq}`,
        'Incident ID': id,
        'Sent Date': fmtDate(sent),
        'Response Date': fmtDate(respDate),
        'Rating': rating,
        'Rating Label': { 10: 'Excellent', 8: 'Good', 6: 'OK', 4: 'Dislike', 2: 'Terrible' }[rating] || '',
        'Customer Email': incidents[incidents.length - 1]['Customer Email'],
        'Comment': responded && rnd() < 0.2 ? pick(['Thanks, quick help!', 'Solved on first call', 'Took too long', 'Very kind agent']) : '',
      });
    }
  }
}

// Kilka "zawieszonych" otwartych P3/P4 — żeby panel "At-risk incidents" miał co pokazać
for (let i = 0; i < 9; i++) {
  const priority = i < 4 ? 'Medium' : 'Low';
  const submit = addBusinessMinutes(SNAPSHOT - Math.round(between(1, 6)) * 86400000, between(0, 300));
  if (submit >= SNAPSHOT) continue;
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  incidents.push({ 'Incident ID': `INC000000${++incSeq}`, 'Submit Date': fmtDate(submit), 'Last Resolved Date': '', 'Closed Date': '', 'Priority': priority, 'Status': pick(['In Progress', 'Assigned']), 'Initial Assigned Group': SD, 'Assigned Group': pick(OTHER_GROUPS), 'Group Transfers': 1, 'Total Pending Duration (min)': 0, 'Service': pick(SERVICES), 'Categorization Tier 1': pick(CAT1), 'Reported Source': weighted(SOURCES), 'Customer Full Name': name, 'Customer Email': `${name.toLowerCase().replace(' ', '.')}@example.test`, 'Assignee': 'agent.workplace2', 'Summary': pick(SUMMARIES).replace('{name}', name) });
}

function toCsv(rows) {
  const cols = Object.keys(rows[0]);
  const esc = v => { const s = v == null ? '' : String(v); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n') + '\n';
}

// v0.2: dwie dodatkowe kolumny do pokazania bramki anonimizacji (osobne ziarno — liczby KPI się nie zmieniają):
// „Last Modified By” (wartości wyglądają jak imię i nazwisko → kolumna NIEPEWNA, czeka na decyzję użytkownika)
// „Site” (kody lokalizacji biur → pole operacyjne, zostaje).
{ let s2 = 777; const r2 = () => { s2 = (s2 * 1103515245 + 12345) % 2147483648; return s2 / 2147483648; };
  const SITES = ['HQ-Main', 'HQ-East', 'Remote', 'Branch-North', 'Branch-South'];
  for (const r of incidents) { r['Last Modified By'] = r2() < 0.85 ? `${FIRST[Math.floor(r2() * FIRST.length)]} ${LAST[Math.floor(r2() * LAST.length)]}` : 'System'; r['Site'] = SITES[Math.floor(r2() * SITES.length)]; } }

const out = path.resolve('data/mock');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'bmc_incidents_mock.csv'), toCsv(incidents));
fs.writeFileSync(path.join(out, 'bmc_surveys_mock.csv'), toCsv(surveys));

// Wariant v2: inne nazwy kolumn + daty ISO — do pokazania odporności na zmianę formatu
const rename = { 'Incident ID': 'Incident Number', 'Last Resolved Date': 'Resolved Date', 'Initial Assigned Group': 'First Assigned Group', 'Group Transfers': 'Reassignment Count' };
const toIso = s => { if (!s) return ''; const m = s.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/); return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00` : s; };
const v2 = incidents.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [rename[k] || k, /Date/.test(k) ? toIso(v) : v])));
fs.writeFileSync(path.join(out, 'bmc_incidents_mock_v2_renamed.csv'), toCsv(v2));

const resolvedAug = incidents.filter(r => r['Last Resolved Date'].includes('/08/2026'));
console.log(`incydenty: ${incidents.length}, ankiety: ${surveys.length}, odpowiedzi: ${surveys.filter(s => s.Rating !== '').length}`);
console.log(`rozwiązane w sierpniu 2026: ${resolvedAug.length}, z tego początkowo w SD: ${resolvedAug.filter(r => r['Initial Assigned Group'] === SD).length}`);
