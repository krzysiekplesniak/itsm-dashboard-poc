// Narzędzia agenta = funkcje silnika. Te same definicje obsługują GitHub Copilot SDK (defineTool + zod)
// i tryb offline. Wyniki są zwięzłe (JSON), bez surowych wierszy danych.
import { z } from 'zod';
import { OPS_HELP } from './engine/spec.js';
import { listModules } from './engine/modules.js';

const Kind = z.enum(['incidents', 'surveys']);

export const TOOL_DEFS = [
  {
    name: 'set_step', description: 'Tell the UI which wizard step (1-8) the conversation is in. Call when entering a new step.',
    schema: z.object({ step: z.number().int().min(1).max(8), title: z.string().optional() }),
    run: (p, a, ctx) => { p.step = a.step; ctx.emit({ type: 'step', step: a.step, title: a.title }); return { ok: true }; },
  },
  {
    name: 'data_overview', description: 'Facts about the uploaded (already anonymised) files: row counts, columns with type, missing %, value lists, date ranges, what anonymisation removed. Never returns raw rows.',
    schema: z.object({}),
    run: p => { const o = p.dataOverview(); return Object.keys(o).length ? o : { error: 'No files uploaded yet. Ask the user to upload the incident CSV (and survey CSV for CSAT).' }; },
  },
  {
    name: 'anonymisation_review', description: 'Columns ON HOLD because they MIGHT contain personal data (e.g. values that look like person names or host names). Returns only column names, reasons and masked examples — never raw values. Ask the user to decide for each column before mapping.',
    schema: z.object({}),
    run: p => p.anonymisationReview(),
  },
  {
    name: 'decide_anonymisation', description: 'Apply the USER decision for columns on hold: keep (not personal, needed), hash (replace values by a code) or drop (default, safest). Only call after the user decided.',
    schema: z.object({ kind: Kind, decisions: z.record(z.string(), z.enum(['keep', 'hash', 'drop'])) }),
    run: (p, a) => p.decideAnonymisation(a.kind, a.decisions),
  },
  {
    name: 'propose_mapping', description: 'Engine proposal mapping source columns to canonical concepts for a file (incidents or surveys), with confidence and missing required fields.',
    schema: z.object({ kind: Kind }),
    run: (p, a) => p.proposeMapping(a.kind),
  },
  {
    name: 'approve_mapping', description: 'Save the column mapping AFTER the user approved it (gate a). mapping = { concept: "Source column" | null }.',
    schema: z.object({ kind: Kind, mapping: z.record(z.string(), z.string().nullable()) }),
    run: (p, a) => p.approveMapping(a.kind, a.mapping),
  },
  {
    name: 'set_rules', description: 'Set KPI rules/targets confirmed by the user: fcrTargetPct, fcrMaxBusinessMinutes, slaP3Hours, slaP4Hours, slaTargetPct, csatTarget, serviceDeskGroups (exact group names), ratingScale ("auto"|"1-5"|"2-10"), priorityValues ({P3:["Medium"],P4:["Low"]}).',
    schema: z.object({
      fcrTargetPct: z.number().optional(), fcrMaxBusinessMinutes: z.number().optional(), slaP3Hours: z.number().optional(), slaP4Hours: z.number().optional(),
      slaTargetPct: z.number().optional(), csatTarget: z.number().optional(), serviceDeskGroups: z.array(z.string()).optional(),
      ratingScale: z.enum(['auto', '1-5', '2-10']).optional(), priorityValues: z.record(z.string(), z.array(z.string())).optional(),
    }),
    run: (p, a) => p.setConfig(a),
  },
  {
    name: 'kpi_summary', description: 'Compute KPIs with the engine for a month (YYYY-MM; default = last complete month). The ONLY source of numbers you may quote.',
    schema: z.object({ month: z.string().optional() }),
    run: (p, a) => p.kpiSummary(a.month),
  },
  {
    name: 'verify_numbers', description: 'Independent recalculation (separate code path, minute-by-minute business time) for a month, plus 3 sample tickets per KPI explaining how they were counted (gate c).',
    schema: z.object({ month: z.string().optional() }),
    run: (p, a) => { const v = p.verify(a.month); return { month: v.month, allMatch: v.allMatch, table: v.table, samples: Object.fromEntries(Object.entries(v.samples).map(([k, s]) => [k, s.slice(0, 3)])) }; },
  },
  {
    name: 'drill_down', description: 'WHY a KPI has its value in a month: population, met/missed, change vs previous month, reasons for misses, breakdown by group/category/service/source (sorted by misses) and sample missed tickets; for csat the rating distribution. Use it to explain a number or a dashboard element the user selected. metric: fcr | sla_p3 | sla_p4 | sla_combined | csat.',
    schema: z.object({ metric: z.enum(['fcr', 'sla_p3', 'sla_p4', 'sla_combined', 'csat']), month: z.string().optional(), by: z.enum(['group', 'category', 'service', 'source']).optional() }),
    run: (p, a) => p.drillDown(a),
  },
  {
    name: 'list_modules', description: 'Catalogue of PREDEFINED KPI modules (business question → KPI → query → widget → filters → validation, size, status tokens, empty state) and the 3 templates (monthly, weekly, warnings). Use it to propose modules and templates — never invent new KPI types.',
    schema: z.object({}),
    run: () => listModules(),
  },
  {
    name: 'choose_template', description: 'Set the default view mode of the dashboard: monthly (management), weekly (operations: last 8 weeks, backlog, breaches) or warnings (only what needs attention, with the reason). The user can still switch modes in the dashboard header.',
    schema: z.object({ template: z.enum(['monthly', 'weekly', 'warnings']) }),
    run: (p, a) => p.updateSpec([{ op: 'setTemplate', template: a.template }]),
  },
  {
    name: 'update_dashboard', description: 'Change the dashboard specification with operations. ' + OPS_HELP,
    schema: z.object({ operations: z.array(z.object({ op: z.string() }).passthrough()) }),
    run: (p, a) => p.updateSpec(a.operations),
  },
  {
    name: 'render_dashboard', description: 'Render the current dashboard to a single offline HTML file shown in the preview panel.',
    schema: z.object({}),
    run: (p, a, ctx) => { const html = p.render(); ctx.saveDashboard(html); const s = p.kpiSummary(); ctx.emit({ type: 'dashboard', url: '/dashboard.html?t=' + Date.now() }); return { ok: true, previewUrl: '/dashboard.html', month: s.month, verificationAllMatch: p.verification?.allMatch }; },
  },
  {
    name: 'save_version', description: 'Save the current (working) dashboard as a named version. Saved versions appear as tabs above the preview; the user keeps working on the working version.',
    schema: z.object({ name: z.string().optional() }),
    run: (p, a, ctx) => { if (!ctx.saveVersion) return { error: 'versions not available' }; const v = ctx.saveVersion(a.name); ctx.emit({ type: 'versions' }); return { ok: true, version: v }; },
  },
  {
    name: 'record_decision', description: 'Record a user decision or open question for the generated BRIEF.md. section: cel | techniczne | wyglad | kpi | okresy | pytania.',
    schema: z.object({ section: z.enum(['cel', 'techniczne', 'wyglad', 'kpi', 'okresy', 'pytania']), text: z.string() }),
    run: (p, a) => p.recordDecision(a.section, a.text),
  },
  {
    name: 'get_brief', description: 'Generate BRIEF.md from the conversation (decisions, mapping, rules, spec). Returns a download link.',
    schema: z.object({}),
    run: (p, a, ctx) => { const md = p.brief(); ctx.saveBrief(md); ctx.emit({ type: 'brief', url: '/api/download/brief' }); return { ok: true, downloadUrl: '/api/download/brief', characters: md.length }; },
  },
];

export async function runTool(name, project, args, ctx) {
  const def = TOOL_DEFS.find(t => t.name === name);
  if (!def) return { error: `unknown tool ${name}` };
  ctx.emit({ type: 'tool', name });
  try { return await def.run(project, def.schema.parse(args ?? {}), ctx); }
  catch (e) { return { error: e.message }; }
}
