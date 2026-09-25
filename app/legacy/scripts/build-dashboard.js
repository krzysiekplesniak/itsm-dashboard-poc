// Budowa dashboardu bez czatu: node scripts/build-dashboard.js [incidents.csv] [surveys.csv] [out.html]
import fs from 'node:fs';
import { Project } from '../src/project.js';
const [inc = 'data/mock/bmc_incidents_mock.csv', sur = 'data/mock/bmc_surveys_mock.csv', out = 'workspace/dashboard.html'] = process.argv.slice(2);
const p = new Project();
console.log(p.loadFile('incidents', inc, fs.readFileSync(inc, 'utf8')).summary);
if (sur) console.log(p.loadFile('surveys', sur, fs.readFileSync(sur, 'utf8')).summary);
for (const k of ['incidents', 'surveys']) if (p.files[k]) { const m = p.proposeMapping(k); if (m.missingRequired.length) console.log(k, 'brak wymaganych:', m.missingRequired); p.approveMapping(k, m.mapping); }
const r = p.compute();
console.log('miesiąc domyślny:', r.defaultMonth, JSON.stringify(r.months[r.defaultMonth]));
const v = p.verify();
console.log('weryfikacja:', v.allMatch ? 'OK' : 'RÓŻNICE', v.table.map(t => `${t.kpi}=${t.engine}/${t.independent}`).join(' | '));
fs.writeFileSync(out, p.render());
console.log('zapisano', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
