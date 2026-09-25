// Anonimizacja — twardy warunek: nic nie trafia do LLM przed tym krokiem.
// v0.2: klasyfikacja każdej kolumny po NAZWIE i po ZAWARTOŚCI (próbka do 1000 wierszy):
//   drop   — pewne dane osobowe (imię i nazwisko, e-mail, telefon, IP, IBAN, wolny tekst) → usunięte od razu,
//   hash   — identyfikatory osób (login, assignee) → zastąpione skrótem anon_xxxxxxxx,
//   review — NIEPEWNE (np. wartości wyglądające na nazwiska, nazwy komputerów, nieznane pola tekstowe)
//            → WSTRZYMANE: nie ma ich w danych, profilu ani w odpowiedziach narzędzi, dopóki użytkownik
//              nie zdecyduje (keep / hash / drop). Użytkownik widzi tylko zamaskowane przykłady.
//   keep   — pola operacyjne (ID incydentu, daty, priorytet, grupa, status…).
import crypto from 'node:crypto';

const NAME_DROP = [/(^|\b)(first|last|full|display|customer|contact|caller|requester|user) ?name/i, /e-?mail/i, /phone|telefon|mobile|gsm/i,
  /summary|description|notes?|comment|work ?info|resolution( text| notes?)?$|details/i, /address|street|postcode|zip/i, /iban|account number|card/i,
  /customer(?! satisfaction)|contact|requester|requestor|submitter|reported by|caller/i];
const NAME_HASH = [/assignee|login|user ?id|agent|owner|technician|analyst id/i];
const NAME_KEEP = [/incident|ticket|request id|survey id|^id$/i, /group|team|queue/i, /priority|urgency|impact/i, /status|state/i, /date|time|opened|closed|resolved|submitted|sent|response/i,
  /rating|score/i, /service|product|ci\b/i, /categor|tier|type/i, /source|channel/i, /transfer|reassign/i, /pending|duration|minutes/i, /sla|slm/i];

const RE = {
  email: /[\w.+-]+@[\w-]+\.[\w.-]+/,
  phone: /(^|\s)\+?\d[\d\s().-]{7,}\d(\s|$)/,
  ip: /\b\d{1,3}(\.\d{1,3}){3}\b/,
  iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/,
  person: /^[A-ZÀ-Ý][a-zà-ÿ'’-]+(?:[ ,]+[A-ZÀ-Ý][a-zà-ÿ'’-]+){1,2}$/,
  host: /^[A-Z]{2,}[-_]?[A-Z0-9]{1,}[-_]?\d{3,}$/i,
};
const LABELS = { email: 'e-mail addresses', phone: 'phone numbers', ip: 'IP addresses', iban: 'bank account numbers', person: 'person names', host: 'computer / host names', text: 'free text' };

const hash = (v, salt) => (v ? 'anon_' + crypto.createHash('sha256').update(salt + String(v)).digest('hex').slice(0, 8) : '');
/** Maska do pokazania użytkownikowi: pierwsza litera każdego słowa, reszta •, cyfry → # (bez ujawniania wartości). */
export const mask = v => String(v).split(/(\s+)/).map(t => (/^\s+$/.test(t) ? t : t.charAt(0).replace(/\d/, '#') + t.slice(1).replace(/[A-Za-zÀ-ÿ]/g, '•').replace(/\d/g, '#'))).join('').slice(0, 40);

/** Klasyfikacja kolumn: { column: { action, certainty, reasons[], examples[] } }. */
export function classifyColumns({ columns, rows }) {
  const sample = rows.slice(0, 1000);
  const out = {};
  for (const col of columns) {
    const vals = sample.map(r => r[col]).filter(v => v != null && String(v).trim() !== '').map(String);
    const n = vals.length || 1;
    const share = re => vals.filter(v => re.test(v)).length / n;
    const s = { email: share(RE.email), phone: share(RE.phone), ip: share(RE.ip), iban: share(RE.iban), person: share(RE.person), host: share(RE.host) };
    const avgLen = vals.reduce((a, v) => a + v.length, 0) / n;
    const textShare = vals.filter(v => v.length > 30 && v.split(' ').length > 4).length / n;
    const distinct = new Set(vals).size;
    const reasons = [];
    const byName = NAME_HASH.some(p => p.test(col)) ? 'hash' : (NAME_KEEP.some(p => p.test(col)) && !/name|e-?mail|customer|contact|caller/i.test(col)) ? 'keep' : NAME_DROP.some(p => p.test(col)) ? 'drop' : null;
    let action = 'keep', certainty = 'certain';
    // 1) pewne dane osobowe w treści (≥ 20 % próbki)
    for (const k of ['email', 'phone', 'ip', 'iban']) if (s[k] >= 0.2) reasons.push(`${Math.round(s[k] * 100)} % of values look like ${LABELS[k]}`);
    if (reasons.length) action = 'drop';
    else if (byName === 'drop') { action = 'drop'; reasons.push('column name suggests personal data or free text'); }
    else if (byName === 'hash') { action = 'hash'; reasons.push('identifies a person (login / assignee) — replaced by a code'); }
    else if (textShare >= 0.3 && byName !== 'keep') { action = 'drop'; reasons.push(`free text (avg ${Math.round(avgLen)} characters) may contain names`); }
    // 2) niepewne → do decyzji użytkownika
    else if (s.person >= 0.4) { action = 'review'; certainty = 'review'; reasons.push(`${Math.round(s.person * 100)} % of values look like ${LABELS.person}`); }
    else if (s.host >= 0.4 && byName !== 'keep') { action = 'review'; certainty = 'review'; reasons.push(`${Math.round(s.host * 100)} % of values look like ${LABELS.host}`); }
    else if (['email', 'phone', 'ip', 'iban'].some(k => s[k] > 0)) { action = 'review'; certainty = 'review'; reasons.push('some values look like ' + ['email', 'phone', 'ip', 'iban'].filter(k => s[k] > 0).map(k => LABELS[k]).join(', ')); }
    else if (byName !== 'keep' && distinct > 50 && avgLen > 12 && textShare > 0.05) { action = 'review'; certainty = 'review'; reasons.push('unknown text column with many different values'); }
    else if (byName === 'keep') reasons.push('operational field');
    else reasons.push('no personal data detected');
    out[col] = { action, certainty, reasons, examples: action === 'review' ? [...new Set(vals)].slice(0, 3).map(mask) : [] };
  }
  return out;
}

export function anonymize({ columns, rows }, { salt = 'itsm-poc' } = {}) {
  const plan = classifyColumns({ columns, rows });
  const report = { dropped: [], hashed: [], review: [], scrubbedEmailsIn: [], plan: Object.fromEntries(Object.entries(plan).map(([c, p]) => [c, { action: p.action, reasons: p.reasons }])) };
  for (const [c, p] of Object.entries(plan)) {
    if (p.action === 'drop') { report.dropped.push(c); if (p.reasons[0]?.includes('e-mail')) report.scrubbedEmailsIn.push(c); }
    if (p.action === 'hash') report.hashed.push(c);
    if (p.action === 'review') report.review.push({ column: c, reasons: p.reasons, examples: p.examples });
  }
  const outCols = columns.filter(c => plan[c].action === 'keep' || plan[c].action === 'hash');
  const outRows = rows.map(r => { const o = {}; for (const c of outCols) o[c] = plan[c].action === 'hash' ? hash(r[c], salt) : r[c]; return o; });
  // Wstrzymane kolumny (review) trzymamy osobno — nigdy nie trafiają do profilu ani do narzędzi, dopóki user nie zdecyduje
  const held = Object.fromEntries(report.review.map(x => [x.column, rows.map(r => r[x.column])]));
  return { columns: outCols, rows: outRows, report, held, hashValue: v => hash(v, salt) };
}
