// Gate for the PUBLIC repository: fails if a file contains a protected name (client, people).
// The names are stored as SHA-256 hashes so this file does not reveal them.
// Usage: node scripts/check-public.mjs   (runs in CI on every push)
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const HASHES = new Set((process.env.PROTECTED_HASHES || fs.readFileSync(new URL('./protected-hashes.txt', import.meta.url), 'utf8')).split(/\s+/).filter(Boolean));
const h = w => crypto.createHash('sha256').update(w.toLowerCase()).digest('hex');
const SKIP = new Set(['node_modules', '.git', '_site', 'workspace', 'itsm-workspace']);
let hits = 0;
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    if (SKIP.has(f)) continue; const p = path.join(d, f), st = fs.statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (!/\.(md|js|mjs|json|html|py|txt|csv|yml|yaml|sh|ps1)$/i.test(f) || st.size > 5e6) continue;
    const words = new Set(fs.readFileSync(p, 'utf8').toLowerCase().match(/[\p{L}]{3,}/gu) || []);
    for (const w of words) if (HASHES.has(h(w))) { console.log(`✗ protected name in ${p}`); hits++; break; }
  }
})(process.argv[2] || '.');
console.log(hits ? `${hits} file(s) contain protected names` : '✓ no protected names'); process.exit(hits ? 1 : 0);
