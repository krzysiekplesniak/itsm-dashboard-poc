// Default dashboard spec from a data profile ("quick mode" of the kit). Every choice that is not
// certain from the data is written to spec.assumptions, so the page and the agent can show it.
const ORDER = ['fcr', 'sla', 'csat'];

function pick(p, concepts) { return p.columns.find(c => concepts.includes(c.concept)); }
function dateCol(p, prefer) {
  const d = p.columns.filter(c => c.role === 'date');
  return d.find(c => prefer.includes(c.concept)) || d[0];
}
const safe = c => c && c.pii === 'keep';

export function proposeSpec(profiles, opts = {}) {
  const spec = { title: opts.title || 'Service Desk KPI dashboard', subtitle: '', audience: opts.audience || 'Service Desk manager — monthly management review',
    dataLabel: opts.dataLabel || 'Anonymised exports', mock: !!opts.mock, defaultMonth: 'latest', trendMonths: 12, lowVolume: 10,
    sources: {}, kpis: [], panels: [], globalFilters: [], insights: [], assumptions: [] };
  const A = spec.assumptions, used = new Set();
  const kinds = [];
  for (const p of profiles) {
    const flag = p.columns.find(c => c.role === 'flag' && c.info.positive?.length);
    const score = p.columns.find(c => c.role === 'score');
    const sla = pick(p, ['sla_name']);
    const isFcr = /fcr|first\s*call/i.test(p.file) || /fcr|first/i.test(flag?.column || '');
    kinds.push({ p, kind: flag && sla ? 'sla' : flag && isFcr ? 'fcr' : score ? 'csat' : flag ? 'rate' : null, flag, score, sla });
  }
  kinds.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  for (const { p, kind, flag, score, sla } of kinds) {
    if (!kind) { A.push(`${p.file}: no result flag or score column found — not used.`); continue; }
    let sid = kind === 'rate' ? 'src' + (Object.keys(spec.sources).length + 1) : kind; while (used.has(sid)) sid += '2'; used.add(sid);
    const date = dateCol(p, kind === 'csat' ? ['survey_date'] : ['resolved_date']);
    if (!date) { A.push(`${p.file}: no date column — not used.`); continue; }
    const id = pick(p, ['incident_id', 'survey_id']), grp = pick(p, ['assigned_group']), prio = pick(p, ['priority']);
    const src = { file: p.file, label: { sla: 'Incidents with SLA', fcr: 'First Call Resolution tickets', csat: 'Survey responses' }[kind] || p.file,
      ...(id ? { id: id.column } : {}), date: date.column, dateFormat: 'auto', filters: [], ...(safe(grp) ? { breakdown: grp.column } : {}) };
    A.push(`${p.file}: month assigned by “${date.column}”${date.info.warning ? ` (${date.info.warning})` : ''}.`);
    if (kind === 'sla') {
      const prefixes = Object.keys(sla.info.prefixes || {});
      const pref = prefixes.find(x => /service\s*desk/i.test(x)) || prefixes[0];
      if (pref) { src.filters.push({ column: sla.column, op: 'startsWith', value: pref }); A.push(`${p.file}: only SLAs whose name starts with “${pref}”${prefixes.length > 1 ? ` (others ignored: ${prefixes.filter(x => x !== pref).join(', ')})` : ''}.`); }
      const pos = flag.info.positive, neg = flag.info.negative?.length ? flag.info.negative : null;
      if (flag.info.other?.length) A.push(`${p.file}: values ${JSON.stringify(flag.info.other)} in “${flag.column}” are excluded from SLA %.`);
      const names = (sla.info.values || []).filter(n => !pref || n.toLowerCase().startsWith(pref.toLowerCase()));
      const hasP = pr => names.some(n => new RegExp(`\\b${pr}\\b`, 'i').test(n));
      const byPrio = ['P1', 'P2', 'P3', 'P4'].filter(hasP);
      const base = { source: sid, type: 'rate', column: flag.column, positive: pos.map(cap), ...(neg ? { negative: neg.map(cap) } : {}), target: 90, direction: 'higher', unit: '%', decimals: 1 };
      const ids = [];
      for (const pr of byPrio) { const kid = 'sla_' + pr.toLowerCase(); ids.push(kid); spec.kpis.push({ id: kid, label: `${pr} SLA`, ...base, where: [{ column: sla.column, op: 'contains', value: pr }], how: `Share of ${pos.map(cap).join('/')} in “${flag.column}” for ${pref || 'all'} SLAs containing “${pr}”, by month of “${date.column}”.` }); }
      const combId = byPrio.length ? 'sla_' + byPrio.map(x => x.toLowerCase()).join('') : 'sla';
      ids.push(combId);
      spec.kpis.push({ id: combId, label: byPrio.length > 1 ? `${byPrio.join(' & ')} SLA` : 'SLA', ...base, how: `Share of ${pos.map(cap).join('/')} in “${flag.column}” for all ${pref || ''} SLAs, by month of “${date.column}”.` });
      A.push('SLA target 90 % (assumption — confirm).');
      spec.panels.push({ id: 'p_sla', title: byPrio.length ? `${byPrio.join(' & ')} SLAs` : 'SLA', cards: ids.slice(0, 3).map(k => ({ kpi: k, show: 'value' })), chart: { kpis: ids.slice(0, 4), style: ids.length > 1 ? 'line' : 'area' } });
      src.detailColumns = [id, prio, sla, flag, grp, date].filter(safe).map(c => c.column);
    } else if (kind === 'fcr' || kind === 'rate') {
      const kid = kind === 'fcr' ? 'fcr' : sid, label = kind === 'fcr' ? 'First Call Resolution' : flag.column;
      spec.kpis.push({ id: kid, label, source: sid, type: 'rate', column: flag.column, positive: flag.info.positive.map(cap), ...(flag.info.negative?.length && flag.info.other?.length ? { negative: flag.info.negative.map(cap) } : {}), target: kind === 'fcr' ? 70 : 90, direction: 'higher', unit: '%', decimals: 1, how: `Share of ${flag.info.positive.map(cap).join('/')} in “${flag.column}” among all records, by month of “${date.column}”.` });
      A.push(`${label} target ${kind === 'fcr' ? 70 : 90} % (assumption — confirm).`);
      spec.panels.push({ id: 'p_' + kid, title: label, cards: [{ kpi: kid, show: 'value' }, { kpi: kid, show: 'missed', label: kind === 'fcr' ? 'Missed FCR' : 'Missed', unit: 'incidents' }, { kpi: kid, show: 'count', label: 'Total', unit: 'incidents' }], chart: { kpis: [kid], style: 'area' } });
      src.detailColumns = [id, prio, grp, flag, date].filter(safe).map(c => c.column);
    } else if (kind === 'csat') {
      const div = score.info.max > 5 ? 2 : 1;
      spec.kpis.push({ id: 'csat', label: 'Customer satisfaction', source: sid, type: 'mean', column: score.column, ...(div > 1 ? { divide: div } : {}), target: 4.2, direction: 'higher', unit: '/ 5', decimals: 2, how: `Average “${score.column}”${div > 1 ? ' ÷ 2 (scale 1–10 → 1–5)' : ''}, by month of “${date.column}”.` });
      A.push(`CSAT: ${div > 1 ? `scores up to ${score.info.max} divided by 2 to report out of 5` : 'scores already on 1–5'}; target 4.2 (assumption — confirm).`);
      spec.panels.push({ id: 'p_csat', title: 'Customer satisfaction', cards: [{ kpi: 'csat', show: 'value', label: 'Average rating' }, { kpi: 'csat', show: 'count', label: 'Responded surveys', unit: 'surveys' }, { kpi: 'csat', show: 'count_ytd', label: 'Responded surveys (this year)', unit: 'surveys' }], chart: { kpis: ['csat'], style: 'area' } });
      src.detailColumns = [id, score, grp, date].filter(safe).map(c => c.column);
    }
    spec.sources[sid] = src;
    for (const [fid, c, label] of [['group', grp, 'Assigned group'], ['priority', prio, 'Priority']]) {
      if (!safe(c)) continue;
      let g = spec.globalFilters.find(x => x.id === fid); if (!g) spec.globalFilters.push(g = { id: fid, label, columns: {} });
      g.columns[sid] = c.column;
    }
  }
  spec.subtitle = spec.panels.map(p => p.title).join(' · ');
  return spec;
}
const cap = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);
