// CSV reading shared by the engine, the verifier, the MCP server and the web app. Zero dependencies.
import fs from 'node:fs';

/** Decode bytes: UTF-8 (with BOM) first, then Windows-1252 (typical for BMC/Excel exports on Windows). */
export function decode(buf) {
  if (typeof buf === 'string') return buf.replace(/^﻿/, '');
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, ''); }
  catch { return new TextDecoder('windows-1252').decode(buf); }
}

export function detectDelimiter(text) {
  const first = text.split(/\r?\n/, 1)[0];
  return [',', ';', '\t', '|'].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
}

/** RFC-4180 parser (quotes, escaped quotes, CRLF, embedded newlines). Returns arrays of strings. */
export function parseRows(text, delim = detectDelimiter(text)) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim() !== ''));
}

/** Read a CSV file or text into { header, rows, delimiter }. */
export function readCsv(input) {
  const text = decode(Buffer.isBuffer(input) || input instanceof Uint8Array ? input : (fs.existsSync(input) ? fs.readFileSync(input) : input));
  const delimiter = detectDelimiter(text);
  const all = parseRows(text, delimiter);
  if (!all.length) throw new Error('Empty file or not a CSV.');
  return { header: all[0].map(h => h.trim()), rows: all.slice(1), delimiter };
}

export function toCsv(header, rows) {
  const q = v => { const s = String(v ?? ''); return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [header.map(q).join(','), ...rows.map(r => r.map(q).join(','))].join('\r\n') + '\r\n';
}
