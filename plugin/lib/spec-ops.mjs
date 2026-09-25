// Small, safe edit operations on spec.json (used by the agent tools, the MCP server and the offline wizard).
import { validateSpec } from './engine.mjs';

export const OPS_HELP = `Operations (array of objects):
{op:"setTitle", text, subtitle?} · {op:"setTarget", kpi, value} · {op:"setKpi", kpi, fields:{label?, how?, decimals?, positive?, negative?, where?, divide?, direction?, unit?}}
{op:"addKpi", kpi:{id,label,source,type,column,positive?,negative?,where?,divide?,target?,direction?,unit?,decimals?,how}} · {op:"removeKpi", kpi}
{op:"addSourceFilter", source, filter:{column, op, value}} · {op:"setSourceFilters", source, filters:[…]} · {op:"setBreakdown", source, column}
{op:"setDetailColumns", source, columns:[…]} · {op:"addPanel", panel:{id,title,cards:[{kpi,show,label?,unit?}],chart?:{kpis:[…],style:"line"|"area"}}}
{op:"removePanel", panel} · {op:"movePanel", panel, to} · {op:"setPanelTitle", panel, title} · {op:"addCard", panel, card} · {op:"removeCard", panel, index}
{op:"setCard", panel, index, fields} · {op:"setChart", panel, kpis, style} · {op:"setTheme", vars:{"--s1":"#hex", …}} · {op:"setMonth", month:"YYYY-MM"|"latest"}
{op:"addInsight", text, kpi?, level?:"critical"|"warning"|"info"|"met", month?} · {op:"clearInsights"} · {op:"addAssumption", text} · {op:"setGlobalFilters", filters:[{id,label,columns:{source:column}}]}
Filter ops: equals, notEquals, in, notIn, startsWith, contains, notEmpty. show: value | missed | count | count_ytd.`;

const panelOf = (s, id) => { const p = s.panels.find(x => x.id === id || x.title?.toLowerCase() === String(id).toLowerCase()); if (!p) throw new Error(`panel ${id} not found (${s.panels.map(x => x.id).join(', ')})`); return p; };
const kpiOf = (s, id) => { const k = s.kpis.find(x => x.id === id); if (!k) throw new Error(`kpi ${id} not found (${s.kpis.map(x => x.id).join(', ')})`); return k; };
const srcOf = (s, id) => { const x = s.sources[id]; if (!x) throw new Error(`source ${id} not found (${Object.keys(s.sources).join(', ')})`); return x; };

export function applyOps(spec, ops) {
  const s = structuredClone(spec); const applied = [], errors = [];
  for (const o of ops || []) {
    try {
      switch (o.op) {
        case 'setTitle': s.title = String(o.text); if (o.subtitle != null) s.subtitle = String(o.subtitle); break;
        case 'setTarget': kpiOf(s, o.kpi).target = o.value == null ? undefined : Number(o.value); break;
        case 'setKpi': { const k = kpiOf(s, o.kpi); const { id, source, ...f } = o.fields || {}; Object.assign(k, f); break; }
        case 'addKpi': if (s.kpis.some(k => k.id === o.kpi?.id)) throw new Error(`kpi ${o.kpi.id} exists`); s.kpis.push(o.kpi); break;
        case 'removeKpi': s.kpis = s.kpis.filter(k => k.id !== o.kpi); s.panels.forEach(p => { p.cards = (p.cards || []).filter(c => c.kpi !== o.kpi); if (p.chart) p.chart.kpis = p.chart.kpis.filter(k => k !== o.kpi); if (p.chart && !p.chart.kpis.length) delete p.chart; }); s.panels = s.panels.filter(p => p.cards.length || p.chart); break;
        case 'addSourceFilter': (srcOf(s, o.source).filters ||= []).push(o.filter); break;
        case 'setSourceFilters': srcOf(s, o.source).filters = o.filters || []; break;
        case 'setBreakdown': srcOf(s, o.source).breakdown = o.column; break;
        case 'setDetailColumns': srcOf(s, o.source).detailColumns = o.columns; break;
        case 'addPanel': s.panels.push(o.panel); break;
        case 'removePanel': { const p = panelOf(s, o.panel); s.panels = s.panels.filter(x => x !== p); break; }
        case 'movePanel': { const p = panelOf(s, o.panel); s.panels = s.panels.filter(x => x !== p); s.panels.splice(Math.max(0, Math.min(Number(o.to), s.panels.length)), 0, p); break; }
        case 'setPanelTitle': panelOf(s, o.panel).title = String(o.title); break;
        case 'addCard': panelOf(s, o.panel).cards.push(o.card); break;
        case 'removeCard': panelOf(s, o.panel).cards.splice(Number(o.index), 1); break;
        case 'setCard': Object.assign(panelOf(s, o.panel).cards[Number(o.index)], o.fields); break;
        case 'setChart': panelOf(s, o.panel).chart = { kpis: o.kpis, style: o.style || 'line' }; break;
        case 'setTheme': s.theme = { ...(s.theme || {}), ...o.vars }; break;
        case 'setMonth': s.defaultMonth = o.month || 'latest'; break;
        case 'addInsight': (s.insights ||= []).push({ text: String(o.text), ...(o.kpi ? { kpi: o.kpi } : {}), level: o.level || 'info', ...(o.month ? { month: o.month } : {}) }); break;
        case 'clearInsights': s.insights = []; break;
        case 'addAssumption': (s.assumptions ||= []).push(String(o.text)); break;
        case 'setGlobalFilters': s.globalFilters = o.filters || []; break;
        default: throw new Error(`unknown op ${o.op}`);
      }
      applied.push(o.op);
    } catch (e) { errors.push(`${o.op}: ${e.message}`); }
  }
  const problems = validateSpec(s);
  if (problems.length) return { spec, applied: [], errors: [...errors, ...problems.map(p => 'invalid result: ' + p)] };
  return { spec: s, applied, errors };
}
