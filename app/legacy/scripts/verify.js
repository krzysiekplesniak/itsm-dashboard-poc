// Test regresji: silnik vs niezależne przeliczenie dla KAŻDEGO miesiąca + test mapowania na pliku z innymi nazwami kolumn.
// Uruchom: npm run verify   (kod wyjścia 1, jeśli cokolwiek się nie zgadza)
import fs from 'node:fs';
import { Project } from '../src/project.js';

let fail = 0;
function run(label, inc, sur) {
  const p = new Project();
  p.loadFile('incidents', inc, fs.readFileSync(inc, 'utf8'));
  if (sur) p.loadFile('surveys', sur, fs.readFileSync(sur, 'utf8'));
  for (const k of ['incidents', 'surveys']) if (p.files[k]) {
    const m = p.proposeMapping(k);
    if (m.missingRequired.length) { console.log(`✗ ${label}: ${k} missing required`, m.missingRequired); fail++; }
    p.approveMapping(k, m.mapping);
  }
  const r = p.compute();
  const months = Object.keys(r.months).sort();
  let ok = 0;
  for (const m of months) { const v = p.verify(m); if (v.allMatch) ok++; else { fail++; console.log(`✗ ${label} ${m}`, v.table.filter(t => !t.match)); } }
  console.log(`${ok === months.length ? '✓' : '✗'} ${label}: ${ok}/${months.length} months match (default month ${r.defaultMonth}, FCR ${r.months[r.defaultMonth].fcr.pct}%)`);
  return r;
}
const a = run('mock (BMC column names)', 'data/mock/bmc_incidents_mock.csv', 'data/mock/bmc_surveys_mock.csv');
const b = run('mock v2 (renamed columns, ISO dates, no surveys)', 'data/mock/bmc_incidents_mock_v2_renamed.csv');
const same = a.months[a.defaultMonth].fcr.pct === b.months[b.defaultMonth].fcr.pct;
console.log(`${same ? '✓' : '✗'} same FCR from both column layouts`); if (!same) fail++;
process.exit(fail ? 1 : 0);
