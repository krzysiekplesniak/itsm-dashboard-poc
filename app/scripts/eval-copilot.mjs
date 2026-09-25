// Automatic evaluation of the conversation with GitHub Copilot (wave 3, F2).
// Runs scripted scenarios against a real Copilot session on the synthetic sample and checks behaviour:
// tools called, numbers quoted only from tool results, verification before presenting, refusal to invent,
// privacy, language. Usage: npm run eval:copilot [-- --only quick,why] [--model NAME]
// Needs `copilot login` (or COPILOT_GITHUB_TOKEN). Writes workspace/eval-report.md.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { Workspace } from '../../plugin/lib/workspace.mjs';
import { CopilotAgent } from '../server/agent.js';
import { APP_ROOT, PLUGIN_ROOT } from '../server/knowledge.js';

const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const model = (process.argv.find(a => a.startsWith('--model=')) || '').slice(8); if (model) process.env.COPILOT_MODEL = model;
const SAMPLE = path.join(PLUGIN_ROOT, 'examples', 'mock-3csv');
const numbersIn = t => (t.match(/\d+[.,]\d+/g) || []).map(x => Number(x.replace(',', '.')));

const SCENARIOS = [
  { id: 'quick', title: 'Quick mode: one prompt → verified dashboard', turns: ['I uploaded 3 files: FCR.csv, Customer Satisfaction.csv, Incident - SLA P3_P4.csv. Build the monthly Service Desk dashboard now, quick mode, no questions.'],
    check: (r, ws) => [['called itsm_scan', r.tools.includes('itsm_scan')], ['called itsm_build', r.tools.includes('itsm_build')], ['called itsm_verify after build', r.tools.lastIndexOf('itsm_verify') > r.tools.indexOf('itsm_build')], ['dashboard.html exists', ws.status().dashboard], ['quotes FCR 86.6', /86[.,]6/.test(r.text)], ['every decimal quoted is a tool value', r.unknownNumbers.length === 0]] },
  { id: 'why', title: 'Why is a KPI where it is (drill-down)', after: 'quick', turns: ['Why did First Call Resolution drop in August 2026? Which group?'],
    check: r => [['called itsm_records or itsm_findings', r.tools.some(t => ['itsm_records', 'itsm_findings'].includes(t))], ['names Service Desk L1', /Service Desk L1/.test(r.text)], ['no invented numbers', r.unknownNumbers.length === 0]] },
  { id: 'invent', title: 'Refuses to invent data that does not exist', after: 'quick', turns: ['What was the MTTR for P1 incidents in August? Just give me a number.'],
    check: r => [['does not produce a MTTR number', !/MTTR[^.\n]{0,40}\d/.test(r.text)], ['says it is not in the data', /(not|no|nie)\b.{0,60}(data|file|export|available|dost)/i.test(r.text)]] },
  { id: 'polish', title: 'Answers in Polish when asked in Polish', after: 'quick', turns: ['Jaki jest wynik CSAT w sierpniu 2026 i czy spełnia cel?'],
    check: r => [['answers in Polish', /(cel|wynik|sierp|jest|spełnia)/i.test(r.text)], ['quotes 4.82', /4[.,]82/.test(r.text)]] },
  { id: 'selected', title: 'Explains a selected dashboard element', after: 'quick', turns: ['Why is this lower than last month?\n\n[selected element: {"type":"card","kpi":"fcr","label":"First Call Resolution","month":"2026-08","value":"86.6","unit":"%"}]'],
    check: r => [['called itsm_records', r.tools.includes('itsm_records')], ['mentions 150 misses or groups', /150|Service Desk L1/.test(r.text)]] },
  { id: 'target', title: 'Changes a target and rebuilds', after: 'quick', turns: ['Set the FCR target to 88 % and update the dashboard.'],
    check: (r, ws) => [['patched spec', r.tools.includes('itsm_patch_spec') || r.tools.includes('itsm_set_spec')], ['rebuilt', r.tools.includes('itsm_build')], ['target is 88 in spec', ws.getSpec().kpis.find(k => k.id === 'fcr')?.target === 88], ['recorded decision', r.tools.includes('itsm_record_decision')]] },
];

async function run(sc, ws, agent) {
  const r = { text: '', tools: [], values: new Set() };
  const ctx = { emit: e => { if (e.type === 'delta') r.text += e.text; if (e.type === 'tool') r.tools.push(e.name); }, setStep: () => {} };
  for (const t of sc.turns) await agent.ask(t, ctx);
  // numbers the tools could have returned
  const res = ws.readJson('kpi_results.json', { kpis: {} });
  for (const per of Object.values(res.kpis)) for (const v of Object.values(per)) for (const d of [0, 1, 2]) r.values.add(+v.value.toFixed(d));
  const allowed = [...r.values], okNum = x => allowed.some(v => Math.abs(v - x) < 0.051) || Number.isInteger(x);
  r.unknownNumbers = numbersIn(r.text).filter(x => !okNum(x) && !(x >= 2000 && x < 2100));
  return r;
}

const report = ['# Copilot conversation eval', '', `Date ${new Date().toISOString()} · model ${process.env.COPILOT_MODEL || 'default'}`, ''];
let pass = 0, total = 0;
for (const sc of SCENARIOS.filter(s => !only.length || only.includes(s.id))) {
  const ws = new Workspace(fs.mkdtempSync(path.join(os.tmpdir(), 'itsm-eval-')));
  for (const f of fs.readdirSync(SAMPLE).filter(f => f.endsWith('.csv'))) ws.addInput(f, fs.readFileSync(path.join(SAMPLE, f)));
  const agent = new CopilotAgent(ws);
  try {
    if (sc.after) await run(SCENARIOS.find(s => s.id === sc.after), ws, agent);
    const t0 = Date.now(); const r = await run(sc, ws, agent); const checks = sc.check(r, ws);
    const p = checks.filter(c => c[1]).length; pass += p; total += checks.length;
    report.push(`## ${sc.title} — ${p}/${checks.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)`, '', ...checks.map(([n, v]) => `- ${v ? '✓' : '✗'} ${n}`), `- tools: ${r.tools.join(', ') || '—'}`, ...(r.unknownNumbers.length ? [`- numbers not found in tool results: ${r.unknownNumbers.join(', ')}`] : []), '', '<details><summary>answer</summary>', '', r.text.trim(), '', '</details>', '');
    console.log(`${sc.id}: ${p}/${checks.length}`);
  } catch (e) { report.push(`## ${sc.title} — ERROR`, '', e.message, ''); console.log(`${sc.id}: ERROR ${e.message}`); total++; }
  finally { await agent.stop(); }
}
report.splice(3, 0, `**Score: ${pass}/${total}**`, '');
fs.mkdirSync(path.join(APP_ROOT, 'workspace'), { recursive: true });
fs.writeFileSync(path.join(APP_ROOT, 'workspace', 'eval-report.md'), report.join('\n'));
console.log(`\nScore ${pass}/${total} → workspace/eval-report.md`); process.exitCode = pass === total ? 0 : 1;
