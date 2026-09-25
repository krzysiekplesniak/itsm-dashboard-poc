// BRIEF.md generated from the workspace (spec, decisions, profile, verification) — structure of the
// PoC brief (objective, constraints, visual design, KPI definitions, periods, data, validation, mapping, open questions).
import fs from 'node:fs';

export function buildBrief(ws) {
  const spec = ws.readJson('spec.json', null), dec = ws.readJson('decisions.json', []), res = ws.readJson('kpi_results.json', null);
  const by = s => dec.filter(d => d.section === s).map(d => `- ${d.text}`);
  const verified = fs.existsSync(ws.p('verify.md')) ? fs.readFileSync(ws.p('verify.md'), 'utf8').match(/\*\*Result: (.*?)\*\*/)?.[1] : null;
  const L = [`# BRIEF — ${spec?.title || 'ITSM KPI dashboard'}`, '', `Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} from the conversation and the data. Decisions without a source are assumptions.`, '',
    '## 1. Objective & audience', spec?.audience ? `- ${spec.audience}` : '- (not recorded)', ...by('purpose'), '',
    '## 2. Technical constraints', '- Single offline HTML file; numbers computed by code from the exports (twice: build + in-page), never typed by a language model.', '- Inputs: CSV exports, anonymised before analysis.', ...by('privacy'), '',
    '## 3. Visual design', ...(spec?.panels || []).map(p => `- Panel **${p.title}**: ${(p.cards || []).map(c => c.label || spec.kpis.find(k => k.id === c.kpi)?.label + (c.show && c.show !== 'value' ? ` (${c.show})` : '')).join(' · ')}${p.chart ? ` + trend (${p.chart.kpis.join(', ')})` : ''}`), '- On top: “What the data says” (findings, worst first). Below: details table (sortable, CSV export).', ...by('presentation'), '',
    '## 4. KPI definitions', '| KPI | Definition | Target |', '|---|---|---|', ...(spec?.kpis || []).map(k => `| ${k.label} | ${k.how || ''} | ${k.target ?? '—'}${k.unit === '%' ? ' %' : ''} |`), ...by('kpi'), '',
    '## 5. Period logic', `- Default month: ${spec?.defaultMonth || 'latest'}; trends: ${spec?.trendMonths || 12} months; low volume below ${spec?.lowVolume ?? 10} records.`, res ? `- Data covers ${res.months[0]} → ${res.latest} (${res.months.length} months).` : '', '',
    '## 6. Data sources and rules', ...Object.entries(spec?.sources || {}).map(([sid, s]) => `- **${s.label || sid}** — \`${s.file}\`; month by “${s.date}”${(s.filters || []).length ? '; only ' + s.filters.map(f => `“${f.column}” ${f.op} “${[].concat(f.value).join(', ')}”`).join(' and ') : ''}${s.breakdown ? `; breakdown “${s.breakdown}”` : ''}.`), ...by('data'), '',
    '## 7. Validation & transparency', `- Independent re-count: ${verified || 'not run yet'}.`, '- “How the numbers are calculated” block and a consistency badge on the page.', ...by('trust'), '',
    '## 8. Assumptions to confirm', ...(spec?.assumptions || []).map(a => `- ${a}`), '',
    '## 9. Open questions', ...(by('open-questions').length ? by('open-questions') : ['- (none recorded)']), '',
    '## 10. Learned rules', ...(by('learned').length ? by('learned') : ['- (none yet)']), ''];
  return L.filter(x => x !== undefined).join('\n');
}
