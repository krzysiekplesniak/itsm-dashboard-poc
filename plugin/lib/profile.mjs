// Profile ITSM CSV files: what each column is and what it MEANS for KPI reporting
// (same logic as skills/itsm-data-reader/scripts/profile_csv.py).
import { classify, mask } from './pii.mjs';

export const CONCEPTS = [
  [/(incident|ticket)\s*(id|number|no)/i, 'incident_id', 'unique ticket key; used to count and to join files'],
  [/survey\s*(id|number)/i, 'survey_id', 'survey key'],
  [/submit|reported|created|open(ed)?\s*date/i, 'submit_date', 'when the ticket was raised; start of every duration'],
  [/resolved/i, 'resolved_date', 'when the fix was delivered; usual date for assigning a ticket to a month'],
  [/closed/i, 'closed_date', 'confirmation/auto-close; normally NOT used for KPIs'],
  [/survey\s*date|response\s*date|responded|answered/i, 'survey_date', 'when the survey was answered; month for CSAT'],
  [/sent\s*date/i, 'survey_sent', 'when the survey was sent; needed for response rate'],
  [/priority/i, 'priority', 'P1-P4 (Critical/High/Medium/Low); SLA targets depend on it'],
  [/^status$|incident\s*status/i, 'status', 'lifecycle state; Cancelled/Rejected are normally excluded'],
  [/sla\s*name|slm\s*name|sla\s*title|service\s*target/i, 'sla_name', "which SLA the row measures; filter by prefix (e.g. 'Service Desk')"],
  [/sla\s*status|slm\s*status|sla\s*met|met\??$|breach/i, 'sla_flag', 'pre-computed result Met/Missed (or Yes/No): a KPI is the share of Met'],
  [/fcr|first\s*(call|contact)/i, 'fcr_flag', 'pre-computed first-call-resolution result'],
  [/score|rating|satisf/i, 'csat_score', 'survey score; check the scale (1-5 or 1-10 / 2-10)'],
  [/initial|first\s*assigned/i, 'initial_group', 'team that received the ticket first; FCR population'],
  [/assigned\s*group|support\s*group|queue/i, 'assigned_group', "owning team; the natural breakdown for 'where do misses concentrate'"],
  [/transfer|reassign/i, 'transfer_count', 'number of hand-overs; any transfer breaks FCR'],
  [/pending|on\s*hold/i, 'pending_time', 'waiting time normally subtracted from SLA clocks'],
  [/service$|business\s*service/i, 'service', 'affected service; breakdown'],
  [/categor/i, 'category', 'classification; breakdown'],
  [/source|channel/i, 'channel', 'phone / e-mail / portal / chat; breakdown and volume'],
  [/site|location/i, 'site', 'location; breakdown'],
];
const FLAG_POS = new Set(['met', 'yes', 'y', 'true', '1', 'achieved', 'ok']);
const FLAG_NEG = new Set(['missed', 'no', 'n', 'false', '0', 'breached', 'not met', 'nok']);
const OTHER_OK = new Set(['in process', 'pending', 'n/a', '']);
export const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})/;
export const SLASH = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/;

export function detectOrder(values) {
  let a = 0, b = 0, iso = 0, sl = 0;
  for (const raw of values.slice(0, 5000)) {
    const v = String(raw ?? '').trim();
    if (ISO.test(v)) { iso++; continue; }
    const m = v.match(SLASH);
    if (m) { sl++; if (+m[1] > 12) a++; if (+m[2] > 12) b++; }
  }
  if (iso >= sl) return ['ISO', null];
  if (a && !b) return ['DMY', null];
  if (b && !a) return ['MDY', null];
  return ['DMY', 'ambiguous (no day > 12): assumed DD/MM'];
}
export function monthOf(raw, order) {
  const v = String(raw ?? '').trim();
  let y, mo, m = v.match(ISO);
  if (m) { y = +m[1]; mo = +m[2]; }
  else { m = v.match(SLASH); if (!m) return null; y = +m[3]; if (y < 100) y += 2000; mo = order === 'MDY' ? +m[1] : +m[2]; }
  if (mo < 1 || mo > 12) return null;
  return `${y}-${String(mo).padStart(2, '0')}`;
}
const concept = name => { for (const [rx, c, why] of CONCEPTS) if (rx.test(name)) return [c, why]; return [null, null]; };
const num = v => { let s = String(v ?? '').trim().replace(/\s/g, ''); if (!s) return null; if ((s.match(/,/g) || []).length === 1 && !s.includes('.')) s = s.replace(',', '.'); const x = Number(s); return Number.isFinite(x) ? x : null; };

export function profileTable(file, { header, rows }) {
  const columns = header.map((h, i) => {
    const vals = rows.map(r => String(r[i] ?? '').trim()), filled = vals.filter(Boolean);
    const cnt = new Map(); for (const v of filled) cnt.set(v, (cnt.get(v) || 0) + 1);
    const [pii, piiWhy] = classify(h, vals), [c, meaning] = concept(h);
    const low = new Set([...cnt.keys()].map(v => v.toLowerCase()));
    const sample = filled.slice(0, 5000);
    const dates = sample.filter(v => ISO.test(v) || SLASH.test(v)).length;
    const nums = sample.map(num).filter(x => x !== null);
    let role = 'text', info = {};
    if (sample.length && dates / sample.length > 0.9) {
      role = 'date'; const [order, warning] = detectOrder(filled);
      const months = {}; for (const v of filled) { const m = monthOf(v, order); if (m) months[m] = (months[m] || 0) + 1; }
      const keys = Object.keys(months).sort();
      info = { order, warning, first: keys[0] ?? null, last: keys.at(-1) ?? null, months: Object.fromEntries(keys.map(k => [k, months[k]])) };
    } else if (low.size && low.size <= 5 && [...low].every(v => FLAG_POS.has(v) || FLAG_NEG.has(v) || OTHER_OK.has(v))) {
      role = 'flag'; info = { positive: [...low].filter(v => FLAG_POS.has(v)).sort(), negative: [...low].filter(v => FLAG_NEG.has(v)).sort(), other: [...low].filter(v => !FLAG_POS.has(v) && !FLAG_NEG.has(v)).sort() };
    } else if (sample.length && nums.length / sample.length > 0.95) {
      const lo = Math.min(...nums), hi = Math.max(...nums);
      role = (c === 'csat_score' || (hi <= 10 && lo >= 0 && new Set(nums).size <= 11)) ? 'score' : 'number';
      info = { min: lo, max: hi, mean: nums.reduce((s, x) => s + x, 0) / nums.length };
      if (role === 'score') info.scaleHint = hi <= 5 ? '1-5' : '1-10 (divide by 2 for a 1-5 average?)';
    } else if ((c && c.endsWith('_id')) || (filled.length && cnt.size > 0.9 * filled.length)) {
      role = (c === null || c === 'incident_id' || c === 'survey_id') ? 'id' : 'text';
    } else if (cnt.size <= 60) role = 'category';
    if (c === 'sla_name') { info.values = [...cnt.keys()].slice(0, 100); const p = new Map(); for (const v of filled) { const k = v.split(' - ')[0].trim(); p.set(k, (p.get(k) || 0) + 1); } info.prefixes = Object.fromEntries([...p].sort((a, b) => b[1] - a[1]).slice(0, 10)); }
    const top = ['category', 'flag', 'text', 'score'].includes(role) ? [...cnt].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([v, n]) => [pii !== 'keep' ? mask(v) : v, n]) : [];
    return { column: h, role, concept: c, meaning, fill: filled.length / (vals.length || 1), distinct: cnt.size, top, info, pii, piiWhy, duplicates: c === 'incident_id' ? filled.length - cnt.size : null };
  });
  return { file, rows: rows.length, columns };
}

export function suggestions(p) {
  const out = [], dates = p.columns.filter(c => c.role === 'date');
  const mc = dates.find(c => ['resolved_date', 'survey_date'].includes(c.concept)) || dates[0];
  for (const c of p.columns) {
    if (c.role === 'flag' && c.info.positive?.length) out.push(`rate KPI: share of ${JSON.stringify(c.info.positive)} in “${c.column}” per month of “${mc?.column ?? '?'}”` + (c.info.other?.length ? ` (exclude ${JSON.stringify(c.info.other)}?)` : ''));
    if (c.role === 'score') out.push(`mean KPI: average “${c.column}” per month (scale ${c.info.scaleHint})`);
    if (c.concept === 'sla_name' && c.info.prefixes) out.push(`filter: “${c.column}” starts with one of ${JSON.stringify(Object.keys(c.info.prefixes).slice(0, 5))} — confirm which SLAs count`);
    if (c.concept === 'assigned_group') out.push(`breakdown: “${c.column}” (${c.distinct} values) — where misses concentrate`);
  }
  return out;
}

export function profileMarkdown(profiles) {
  const L = ['# Data profile', '', 'What is in each file and what it means for KPI reporting. Personal-looking columns show masked values only.', ''];
  for (const p of profiles) {
    L.push(`## ${p.file}`, '', `${p.rows.toLocaleString('en-GB')} rows`, '', '| Column | Role | ITSM meaning | Filled | Distinct | Top values / range | Privacy |', '|---|---|---|---|---|---|---|');
    for (const c of p.columns) {
      let rng;
      if (c.role === 'date') rng = `${c.info.first} → ${c.info.last} (${Object.keys(c.info.months).length} months, ${c.info.order}${c.info.warning ? '; ' + c.info.warning : ''})`;
      else if (c.role === 'score' || c.role === 'number') rng = `${c.info.min}–${c.info.max}, mean ${c.info.mean.toFixed(2)}${c.info.scaleHint ? '; scale ' + c.info.scaleHint : ''}`;
      else rng = c.top.slice(0, 5).map(([v, n]) => `${v} (${n})`).join(', ');
      if (c.duplicates) rng += ` · ⚠ ${c.duplicates} duplicate IDs (normal when one incident has several SLA rows)`;
      L.push(`| ${c.column} | ${c.role} | ${c.concept ? `**${c.concept}** — ${c.meaning}` : '—'} | ${Math.round(c.fill * 100)}% | ${c.distinct} | ${rng} | ${c.pii} |`);
    }
    const d = p.columns.filter(c => c.role === 'date'); const mc = d.find(c => ['resolved_date', 'survey_date'].includes(c.concept)) || d[0];
    if (mc) { L.push('', `Rows per month by “${mc.column}”: ` + Object.entries(mc.info.months).map(([m, n]) => `${m} ${n}`).join(', ')); const thin = Object.entries(mc.info.months).filter(([, n]) => n < 10).map(([m]) => m); if (thin.length) L.push(`⚠ Low volume months (< 10 rows): ${thin.join(', ')}`); }
    const s = suggestions(p); if (s.length) L.push('', '**What this file can feed:**', ...s.map(x => '- ' + x));
    L.push('');
  }
  L.push('## Confirm before building', '- Which date column assigns a record to a month?', '- Which values count as success and which are excluded (In Process, Pending, N/A)?', '- Which rows are in scope (SLA name prefix, priorities, groups)?', '- Score scale and conversion (e.g. 1–10 ÷ 2 → 1–5) and target.', '');
  return L.join('\n');
}

/** Compact profile for an LLM tool answer (no raw rows, masked values only). */
export function compactProfile(profiles) {
  return profiles.map(p => ({ file: p.file, rows: p.rows, columns: p.columns.map(c => ({ column: c.column, role: c.role, concept: c.concept, distinct: c.distinct, fillPct: Math.round(c.fill * 100), ...(c.role === 'date' ? { from: c.info.first, to: c.info.last, months: Object.keys(c.info.months).length, order: c.info.order, warning: c.info.warning || undefined } : {}), ...(c.role === 'flag' ? { positive: c.info.positive, negative: c.info.negative, other: c.info.other } : {}), ...(c.role === 'score' ? { min: c.info.min, max: c.info.max, scaleHint: c.info.scaleHint } : {}), ...(c.info.prefixes ? { prefixes: c.info.prefixes } : {}), ...(c.top.length && c.role !== 'text' ? { top: c.top.slice(0, 6) } : {}), ...(c.duplicates ? { duplicates: c.duplicates } : {}) })), canFeed: suggestions(p) }));
}
