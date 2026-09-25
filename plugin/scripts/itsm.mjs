#!/usr/bin/env node
// ITSM Dashboard Kit CLI (Node ≥ 18, no dependencies) — the same engine as the MCP server and the web app.
// Usage: node itsm.mjs <command> [--ws itsm-workspace] [files…]
//   add <csv…>         copy exports into the workspace (input/)
//   scan               anonymisation gate → data/, pii_report.md
//   profile            profile.md / profile.json
//   propose [--title]  default spec.json from the profile
//   build              dashboard.html + kpi_results.json
//   verify [--reference ref.csv] [--tolerance 0.1]
//   kpis [--month YYYY-MM] · findings [--month] · records --kpi ID [--month] [--by COLUMN]
//   brief · status · all <csv…>  (add + scan + profile + propose + build + verify)
import fs from 'node:fs';
import path from 'node:path';
import { Workspace } from '../lib/workspace.mjs';
import { readReferenceCsv } from '../lib/verify.mjs';

const argv = process.argv.slice(2), cmd = argv.shift();
const opt = (k, d) => { const i = argv.indexOf('--' + k); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const ws = new Workspace(opt('ws', 'itsm-workspace'));
const month = opt('month'), kpi = opt('kpi'), by = opt('by'), ref = opt('reference'), tol = opt('tolerance'), title = opt('title');
const out = o => console.log(typeof o === 'string' ? o : JSON.stringify(o, null, 2));
const add = files => files.forEach(f => out(`added ${ws.addInput(path.basename(f), fs.readFileSync(f))}`));
try {
  switch (cmd) {
    case 'add': add(argv); break;
    case 'scan': out(ws.scan()); break;
    case 'profile': ws.profile(); out(fs.readFileSync(ws.p('profile.md'), 'utf8')); break;
    case 'propose': out(ws.proposeSpec({ title })); break;
    case 'build': out(ws.build()); break;
    case 'verify': { const r = ws.verify({ reference: ref ? readReferenceCsv(ref) : null, tolerance: tol ? Number(tol) : 0.1 }); out(r); process.exitCode = r.allMatch ? 0 : 1; break; }
    case 'kpis': out(ws.kpis(month)); break;
    case 'findings': out(ws.findings(month)); break;
    case 'records': out(ws.records({ kpi, month, by })); break;
    case 'brief': ws.brief(); out(`written ${ws.p('BRIEF.md')}`); break;
    case 'status': out(ws.status()); break;
    case 'all': { add(argv); const s = ws.scan(); if (s.onHoldTotal) { out(s); out('Columns ON HOLD — decide keep/hash/drop before continuing.'); break; }
      ws.profile(); out(ws.proposeSpec({ title }).assumptions); const b = ws.build(); out(b.kpis); const v = ws.verify(); out(`verify: ${v.matching}/${v.checks} match → ${ws.p('dashboard.html')}`); process.exitCode = v.allMatch ? 0 : 1; break; }
    default: out(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 14).join('\n'));
  }
} catch (e) { console.error('ERROR:', e.message); process.exitCode = 2; }
