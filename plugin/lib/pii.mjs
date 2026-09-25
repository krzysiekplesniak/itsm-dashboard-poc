// Personal-data gate (same rules as skills/itsm-anonymize/scripts/pii_scan.py).
import crypto from 'node:crypto';

const NAME_DROP = /(^|[\s_])(first|last|full)?\s*name$|e-?mail|phone|mobile|address|requester|customer(?!.*(id|satisfaction))|contact|caller|summary|description|notes?$|work\s*log|resolution\s*(text|notes?)|comment|details|ip\s*address|hostname|iban|birth/i;
const NAME_HASH = /login|user\s*id|assignee|owner|agent|technician|submitter|resolved\s*by|last\s*modified\s*by|created\s*by|analyst/i;
const NAME_KEEP = /(incident|ticket|request|survey|change)\s*(id|number|no)|^id$|date|time|priority|group|status|sla|slm|score|rating|category|service|source|channel|site|impact|urgency|met\??$|fcr|count|duration|month|year|type|queue/i;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/, PHONE = /^\+?[\d\s()./-]{8,}$/, IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/, IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/;
const PERSON = /^[A-ZÀ-Ž][a-zà-ž'’-]+(\s+[A-ZÀ-Ž][a-zà-ž'’-]+){1,2}$|^[A-ZÀ-Ž][A-ZÀ-Ž'’-]+,?\s+[A-ZÀ-Ž][a-zà-ž'’-]+$/;
const HOST = /^[A-Za-z]{2,}[-_]?[A-Za-z]*\d{2,}[A-Za-z0-9-]*$/, DATE = /^\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4}/;

export function mask(v) {
  return String(v).split(/(\s+|@|\.)/).map(w => !w.trim() || w === '@' || w === '.' ? w : /^\d+$/.test(w) ? '#'.repeat(w.length) : w[0] + '•'.repeat(w.length - 1)).join('').slice(0, 40);
}

export function classify(name, values) {
  const vals = values.map(v => String(v ?? '').trim()).filter(Boolean).slice(0, 1000);
  const n = vals.length || 1, share = rx => vals.filter(v => rx.test(v)).length / n;
  const avg = vals.reduce((s, v) => s + v.length, 0) / n, distinct = new Set(vals).size;
  if (NAME_DROP.test(name) && !NAME_KEEP.test(name.replace('Name', '')) && !/sla|slm|service|group/i.test(name)) return ['drop', 'column name suggests personal data or free text'];
  if (share(EMAIL) >= 0.2) return ['drop', 'contains e-mail addresses'];
  if (vals.filter(v => PHONE.test(v) && !DATE.test(v)).length / n >= 0.2) return ['drop', 'contains phone numbers'];
  if (share(IPV4) >= 0.2 || share(IBAN) >= 0.2) return ['drop', 'contains IP addresses or bank accounts'];
  if (avg > 60 && distinct > 0.5 * n) return ['drop', 'long free text (may contain names)'];
  if (NAME_HASH.test(name)) return ['hash', 'identifies a person (needed only for counting)'];
  if (NAME_KEEP.test(name)) return share(PERSON) >= 0.4 ? ['review', 'operational name, but values look like person names'] : ['keep', 'operational field'];
  if (share(PERSON) >= 0.4) return ['review', 'values look like person names'];
  if (share(HOST) >= 0.4) return ['review', 'values look like host names'];
  if (share(EMAIL) > 0 || share(PHONE) > 0.05) return ['review', 'some values look like contact data'];
  if (vals.length && avg > 25 && distinct > 0.3 * n) return ['review', 'unknown text column'];
  return ['keep', 'no personal pattern found'];
}

export const hashValue = (v, salt = 'itsm-kit') => 'anon_' + crypto.createHash('sha256').update(salt + String(v).trim().toLowerCase()).digest('hex').slice(0, 8);

/** Scan one parsed file; decisions {column: keep|hash|drop} override. Returns report + anonymised table. */
export function scanTable(file, { header, rows }, decisions = {}) {
  const columns = header.map((h, i) => {
    const col = rows.map(r => r[i] ?? '');
    let [cls, why] = classify(h, col);
    if (decisions[h]) { cls = decisions[h]; why = 'user decision'; }
    const examples = cls === 'keep' ? [] : [...new Set(col.filter(v => String(v).trim()))].slice(0, 3).map(mask);
    return { column: h, class: cls, why, examples };
  });
  const keepIdx = columns.map((c, i) => ['keep', 'hash'].includes(c.class) ? i : -1).filter(i => i >= 0);
  const hashIdx = new Set(columns.map((c, i) => c.class === 'hash' ? i : -1).filter(i => i >= 0));
  const outHeader = keepIdx.map(i => header[i]);
  const outRows = rows.map(r => keepIdx.map(i => { const v = r[i] ?? ''; return hashIdx.has(i) && String(v).trim() ? hashValue(v) : v; }));
  return { file, rows: rows.length, columns, onHold: columns.filter(c => c.class === 'review').map(c => c.column), header: outHeader, data: outRows };
}

export function piiMarkdown(reports) {
  const L = ['# Personal data scan', '', 'Classes: **drop** (removed) · **hash** (replaced by `anon_xxxxxxxx`) · **review** (ON HOLD until the user decides; dropped by default) · **keep**.', ''];
  for (const r of reports) {
    L.push(`## ${r.file} (${r.rows} rows)`, '', '| Column | Class | Why | Masked examples |', '|---|---|---|---|');
    for (const c of r.columns) L.push(`| ${c.column} | **${c.class}** | ${c.why} | ${c.examples.map(e => '`' + e + '`').join(', ')} |`);
    L.push('');
  }
  const held = reports.flatMap(r => r.onHold.map(c => `${r.file} → ${c}`));
  if (held.length) L.push(`**${held.length} column(s) ON HOLD:** ${held.join('; ')}. Ask the user per column: keep / hash / drop (default drop). Never show raw values.`);
  return L.join('\n') + '\n';
}
