// Tool definitions shared by the MCP server (plugin), the web app on GitHub Copilot and the offline wizard.
// JSON Schema parameters (accepted by the Copilot SDK and by MCP). Handlers take a Workspace.
import { OPS_HELP } from './spec-ops.mjs';

const obj = (props = {}, required = []) => ({ type: 'object', properties: props, required, additionalProperties: false });
const str = d => ({ type: 'string', description: d }), numb = d => ({ type: 'number', description: d });
const SEL = { type: 'object', description: 'Global filter selection, e.g. {"group":["Service Desk L1"],"priority":["Medium"]} (ids from spec.globalFilters).', additionalProperties: { type: 'array', items: { type: 'string' } } };

export const ITSM_TOOLS = [
  { name: 'itsm_status', description: 'What exists in the workspace: uploaded files, anonymised copies, profile, spec, dashboard, verification, ORG_PROFILE, versions. Call first when resuming.',
    parameters: obj(), run: ws => ws.status() },
  { name: 'itsm_scan', description: 'Anonymisation gate: scans every uploaded CSV for personal data (drop names/e-mails/free text, hash logins, put uncertain columns ON HOLD) and writes anonymised copies. Always run before reading data. Returns masked examples only.',
    parameters: obj(), run: ws => ws.scan() },
  { name: 'itsm_decide_privacy', description: 'Apply the USER decision for columns ON HOLD: keep | hash | drop. Only after the user answered.',
    parameters: obj({ file: str('file name'), decisions: { type: 'object', additionalProperties: { type: 'string', enum: ['keep', 'hash', 'drop'] } } }, ['file', 'decisions']), run: (ws, a) => ws.decidePrivacy(a.file, a.decisions) },
  { name: 'itsm_profile', description: 'What is inside each anonymised file and what it MEANS for KPIs: role of each column (date, flag Met/Missed, score, category, id), ITSM concept, months covered, SLA name prefixes, what the file can feed. No raw rows.',
    parameters: obj(), run: ws => ws.profile() },
  { name: 'itsm_propose_spec', description: 'Write a default dashboard spec (spec.json) from the profile: KPIs (SLA per priority + combined, FCR, CSAT…), targets, filters, panels, global filters, and the list of assumptions to confirm. Quick mode = use it as is; guided mode = confirm assumptions, then itsm_patch_spec.',
    parameters: obj({ title: str('dashboard title'), audience: str('who looks at it and why') }), run: (ws, a) => ws.proposeSpec(a) },
  { name: 'itsm_get_spec', description: 'Return the current spec.json (sources, kpis, panels, filters, insights, assumptions).',
    parameters: obj(), run: ws => ws.getSpec() },
  { name: 'itsm_set_spec', description: 'Replace spec.json with a full spec (validated). Prefer itsm_patch_spec for small changes.',
    parameters: obj({ spec: { type: 'object', description: 'full spec object (see itsm-html-builder/references/spec-schema.md)' } }, ['spec']), run: (ws, a) => ws.setSpec(a.spec) },
  { name: 'itsm_patch_spec', description: 'Edit spec.json with operations; rebuild afterwards. ' + OPS_HELP,
    parameters: obj({ operations: { type: 'array', items: { type: 'object' } } }, ['operations']), run: (ws, a) => ws.patchSpec(a.operations) },
  { name: 'itsm_build', description: 'Compute every KPI from the anonymised data and render the dashboard (single offline HTML). Returns the latest month table (value, previous, change, target, status, records). The ONLY source of numbers you may quote.',
    parameters: obj(), run: ws => ws.build() },
  { name: 'itsm_kpis', description: 'KPI table for a month (YYYY-MM, default latest) and optional global filters (group, priority). Use for questions like "what was FCR in March for group X".',
    parameters: obj({ month: str('YYYY-MM'), filters: SEL }), run: (ws, a) => ws.kpis(a.month, a.filters) },
  { name: 'itsm_findings', description: 'Rule-based findings for a month (below/near target, sharp changes, 3-month declines, year on year, where misses concentrate, low volume, best month). Base your insights on these.',
    parameters: obj({ month: str('YYYY-MM') }), run: (ws, a) => ws.findings(a.month) },
  { name: 'itsm_records', description: 'Drill-down WHY a KPI has its value: records, misses, breakdown by a column (default the source breakdown, e.g. Assigned Group) and sample IDs of missed records (IDs only). Use for a selected dashboard element too.',
    parameters: obj({ kpi: str('KPI id'), month: str('YYYY-MM'), by: str('column to break down by'), filters: SEL }, ['kpi']), run: (ws, a) => ws.records(a) },
  { name: 'itsm_verify', description: 'Independent re-count of every KPI and month (second implementation) + optional comparison with an official report (reference rows typed by the user). Present the dashboard only when allMatch is true.',
    parameters: obj({ reference: { type: 'array', items: obj({ kpi: str('KPI id'), month: str('YYYY-MM'), value: numb('value in KPI unit') }, ['kpi', 'month', 'value']) }, tolerance: numb('allowed difference vs reference, default 0.1') }), run: (ws, a) => ws.verify(a) },
  { name: 'itsm_record_decision', description: 'Save a decision or learned rule to ORG_PROFILE.md (read on every future run) and the brief. section: purpose | data | kpi | presentation | trust | privacy | open-questions | learned.',
    parameters: obj({ section: { type: 'string', enum: ['purpose', 'data', 'kpi', 'presentation', 'trust', 'privacy', 'open-questions', 'learned'] }, text: str('the decision in one sentence') }, ['section', 'text']), run: (ws, a) => ws.recordDecision(a.section, a.text) },
  { name: 'itsm_org_profile', description: 'Read ORG_PROFILE.md: this organisation\'s decisions and learned rules from earlier sessions. Read at the start.',
    parameters: obj(), run: ws => ({ text: ws.orgProfile() }) },
  { name: 'itsm_brief', description: 'Generate BRIEF.md (objective, constraints, design, KPI definitions, periods, data rules, validation, assumptions, open questions, learned rules).',
    parameters: obj(), run: ws => ({ file: 'BRIEF.md', characters: ws.brief().length }) },
  { name: 'itsm_save_version', description: 'Save the current dashboard as a named version (HTML + spec).',
    parameters: obj({ name: str('version name') }), run: (ws, a) => ws.saveVersion(a.name) },
];

export async function runItsmTool(ws, name, args) {
  const t = ITSM_TOOLS.find(x => x.name === name); if (!t) return { error: `unknown tool ${name}` };
  try { return await t.run(ws, args || {}); } catch (e) { return { error: e.message }; }
}
