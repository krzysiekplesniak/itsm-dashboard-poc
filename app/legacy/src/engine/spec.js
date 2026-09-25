// Specyfikacja dashboardu (JSON) = maszynowa wersja briefu. LLM zmienia ją WYŁĄCZNIE przez operacje
// z listy poniżej (applyOps) — nigdy nie pisze HTML. Renderer rysuje ze specyfikacji.

export function defaultSpec() {
  return {
    title: 'ITSM KPI Dashboard — Service Desk',
    subtitle: 'ACME · First Call Resolution · P3 & P4 SLAs · Customer satisfaction',
    month: null, // null = ostatni pełny miesiąc
    theme: { accent: '#7C5CD6', background: '#EEF0F3', panelHeader: '#E3E6EB', series: { P3: '#7C5CD6', P4: '#1F8FB8', combined: '#C2621B' } },
    panels: [
      { id: 'fcr', title: 'First Call Resolution', visible: true,
        cards: [
          { id: 'fcr_pct', label: 'First Call Resolution', metric: 'fcr.pct', unit: '%', period: 'month', target: 70, higherIsBetter: true, visible: true, how: 'Incidents resolved in the month that started in IT-Service Desk: not transferred to another group and solved in < 30 business minutes ÷ all such incidents × 100 (brief §5.1; Vendor SLA-06 "FCR – 30 min").' },
          { id: 'fcr_missed', label: 'Missed FCR', metric: 'fcr.missed', unit: 'Incidents', period: 'month', visible: true, how: 'FCR population minus incidents that met FCR.' },
          { id: 'fcr_total', label: 'Total', metric: 'fcr.total', unit: 'Incidents', period: 'month', visible: true, how: 'Resolved/closed incidents whose initial group is IT-Service Desk (resolved date in the month).' },
        ],
        chart: { type: 'area', series: [{ metric: 'fcr.pct', label: 'First Call Resolution %', color: 'accent' }], target: 70, targetLabel: 'Target', unit: '%' } },
      { id: 'sla', title: 'P3 & P4 SLAs', visible: true,
        cards: [
          { id: 'sla_p3', label: 'P3 SLA', metric: 'sla.P3.pct', unit: '%', period: 'month', target: 90, higherIsBetter: true, visible: true, how: 'Resolved P3 within 8 business hours (Mon–Fri 08–18, no LU holidays, minus Pending) ÷ all resolved P3 × 100. Open incidents are not counted (brief §5.2).' },
          { id: 'sla_p4', label: 'P4 SLA', metric: 'sla.P4.pct', unit: '%', period: 'month', target: 90, higherIsBetter: true, visible: true, how: 'Resolved P4 within 16 business hours ÷ all resolved P4 × 100 (brief §5.3).' },
          { id: 'sla_combined', label: 'P3 & P4 SLA', metric: 'sla.combined.pct', unit: '%', period: 'month', target: 90, higherIsBetter: true, visible: true, how: '(P3 within SLA + P4 within SLA) ÷ (all resolved P3 + P4) × 100 (brief §5.4).' },
        ],
        chart: { type: 'line', series: [{ metric: 'sla.P3.pct', label: 'P3 SLA', color: 'P3' }, { metric: 'sla.P4.pct', label: 'P4 SLA', color: 'P4' }, { metric: 'sla.combined.pct', label: 'P3 & P4 SLA', color: 'combined' }], target: 90, targetLabel: 'Target', unit: '%' } },
      { id: 'csat', title: 'Customer satisfaction', visible: true,
        cards: [
          { id: 'csat_sent', label: 'Sent Surveys', metric: 'ytd.sent', unit: 'Surveys', period: 'ytd', visible: true, how: 'Surveys sent from 1 January to the selected month (by sent date). Reference dashboard: "This year".' },
          { id: 'csat_resp', label: 'Responded Surveys', metric: 'ytd.responded', unit: 'Surveys', period: 'ytd', visible: true, how: 'Surveys answered from 1 January to the selected month (by response date).' },
          { id: 'csat_rate', label: 'Response rate', metric: 'ytd.rate', unit: '%', period: 'ytd', visible: true, how: 'Responded ÷ sent × 100, year to date.' },
        ],
        chart: { type: 'area', series: [{ metric: 'csat.avg', label: 'Survey Rating', color: 'accent' }], target: 4.2, targetLabel: 'Target', unit: '', min: 0, max: 5 } },
    ],
    atRisk: { visible: true, title: 'At-risk incidents (open P3/P4)' },
    // v0.2: szablon = domyślny tryb widoku (monthly | weekly | warnings); moduły można ukrywać/pokazywać
    template: 'monthly',
    modules: { attention: { visible: true }, weekly: { visible: true }, backlog: { visible: true }, volume: { visible: true } },
    highlight: [],
  };
}

const findTarget = (spec, target) => {
  const [kind, id] = String(target).split(':');
  if (kind === 'panel') return spec.panels.find(p => p.id === id);
  if (kind === 'card') for (const p of spec.panels) { const c = p.cards.find(c => c.id === id); if (c) return c; }
  if (kind === 'atRisk' || target === 'atRisk') return spec.atRisk;
  if (kind === 'module') { spec.modules ??= {}; if (!['attention', 'weekly', 'backlog', 'volume'].includes(id)) return null; return (spec.modules[id] ??= { visible: true }); }
  return null;
};

/** Dozwolone operacje na specyfikacji. Zwraca { spec, applied, errors }. */
export function applyOps(spec, ops = []) {
  const s = structuredClone(spec); const applied = []; const errors = [];
  for (const op of ops) {
    try {
      switch (op.op) {
        case 'hide': case 'show': { const t = findTarget(s, op.target); if (!t) throw new Error(`not found: ${op.target}`); t.visible = op.op === 'show'; break; }
        case 'move': { const i = s.panels.findIndex(p => p.id === op.panel); if (i < 0) throw new Error(`no panel ${op.panel}`); const [p] = s.panels.splice(i, 1); s.panels.splice(Math.max(0, Math.min(op.to ?? 0, s.panels.length)), 0, p); break; }
        case 'moveCard': { const p = s.panels.find(p => p.cards.some(c => c.id === op.card)); if (!p) throw new Error(`no card ${op.card}`); const i = p.cards.findIndex(c => c.id === op.card); const [c] = p.cards.splice(i, 1); p.cards.splice(Math.max(0, Math.min(op.to ?? 0, p.cards.length)), 0, c); break; }
        case 'rename': { const t = findTarget(s, op.target); if (!t) throw new Error(`not found: ${op.target}`); if ('title' in t) t.title = op.text; else t.label = op.text; break; }
        case 'describe': { const t = findTarget(s, op.target); if (!t) throw new Error(`not found: ${op.target}`); t.description = op.text; break; }
        case 'highlight': { if (!findTarget(s, op.target)) throw new Error(`not found: ${op.target}`); if (!s.highlight.includes(op.target)) s.highlight.push(op.target); break; }
        case 'unhighlight': s.highlight = s.highlight.filter(h => h !== op.target); break;
        case 'setTarget': { const p = s.panels.find(p => p.id === op.panel); if (!p) throw new Error(`no panel ${op.panel}`); p.chart.target = Number(op.value); p.cards.forEach(c => { if ('target' in c) c.target = Number(op.value); }); break; }
        case 'setAccent': { if (!/^#[0-9a-f]{6}$/i.test(op.color)) throw new Error('colour must be #RRGGBB'); s.theme.accent = op.color; s.theme.series.P3 = op.color; break; }
        case 'setMonth': { if (!/^\d{4}-\d{2}$/.test(op.month)) throw new Error('month must be YYYY-MM'); s.month = op.month; break; }
        case 'setTitle': s.title = op.text; if (op.subtitle != null) s.subtitle = op.subtitle; break;
        case 'setCardPeriod': { const t = findTarget(s, `card:${op.card}`); if (!t) throw new Error(`no card ${op.card}`); if (!['month', 'ytd'].includes(op.period)) throw new Error('period must be month | ytd'); t.period = op.period; t.metric = op.period === 'ytd' ? t.metric.replace(/^csat\./, 'ytd.') : t.metric.replace(/^ytd\./, 'csat.'); break; }
        case 'setTemplate': { if (!['monthly', 'weekly', 'warnings'].includes(op.template)) throw new Error('template must be monthly | weekly | warnings'); s.template = op.template; break; }
        default: throw new Error(`unknown operation ${op.op}`);
      }
      applied.push(op);
    } catch (e) { errors.push(`${op.op}: ${e.message}`); }
  }
  return { spec: s, applied, errors };
}

export const OPS_HELP = `Operacje: setTemplate {template: monthly|weekly|warnings}, hide/show {target: "panel:fcr|sla|csat" | "card:<id>" | "atRisk" | "module:attention|weekly|backlog|volume"}, move {panel, to}, moveCard {card, to}, rename {target, text}, describe {target, text}, highlight/unhighlight {target}, setTarget {panel, value}, setAccent {color:"#RRGGBB"}, setMonth {month:"YYYY-MM"}, setTitle {text, subtitle?}, setCardPeriod {card, period:"month"|"ytd"}. Karty: fcr_pct, fcr_missed, fcr_total, sla_p3, sla_p4, sla_combined, csat_sent, csat_resp, csat_rate.`;
