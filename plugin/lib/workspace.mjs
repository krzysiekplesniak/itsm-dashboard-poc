// A dashboard workspace on disk (itsm-workspace/): the single state shared by the plugin CLI, the MCP server
// and the web app. Every operation reads and writes files here, so any front-end can continue the work.
import fs from 'node:fs';
import path from 'node:path';
import { readCsv, toCsv } from './csv.mjs';
import { scanTable, piiMarkdown } from './pii.mjs';
import { profileTable, profileMarkdown, compactProfile } from './profile.mjs';
import { proposeSpec } from './propose.mjs';
import { applyOps } from './spec-ops.mjs';
import { build, validateSpec, loadSources, compute, kpiTable, findings, records, renderHtml } from './engine.mjs';
import { verify, verifyMarkdown } from './verify.mjs';
import { buildBrief } from './brief.mjs';

const SECTIONS = ['purpose', 'data', 'kpi', 'presentation', 'trust', 'privacy', 'open-questions', 'learned'];

export class Workspace {
  constructor(dir) {
    this.dir = path.resolve(dir);
    for (const d of ['input', 'data', 'versions']) fs.mkdirSync(path.join(this.dir, d), { recursive: true });
    this._cache = null;
  }
  p(...x) { return path.join(this.dir, ...x); }
  readJson(f, dflt) { try { return JSON.parse(fs.readFileSync(this.p(f), 'utf8')); } catch { return dflt; } }
  writeJson(f, o) { fs.writeFileSync(this.p(f), JSON.stringify(o, null, 2)); }
  inputs() { return fs.readdirSync(this.p('input')).filter(f => /\.(csv|txt)$/i.test(f)).sort(); }
  dataFiles() { return fs.readdirSync(this.p('data')).filter(f => /\.csv$/i.test(f)).sort(); }

  reset() { for (const f of fs.readdirSync(this.dir)) if (!['versions', 'ORG_PROFILE.md'].includes(f)) fs.rmSync(this.p(f), { recursive: true, force: true }); for (const d of ['input', 'data']) fs.mkdirSync(this.p(d), { recursive: true }); this._cache = null; }

  addInput(name, content) {
    const safe = path.basename(String(name)).replace(/[^\w .()&+-]/g, '_');
    fs.writeFileSync(this.p('input', safe), content); this._cache = null; return safe;
  }

  /** Anonymise every input file (privacy decisions from privacy.json applied). */
  scan() {
    const decisions = this.readJson('privacy.json', {});
    const reports = this.inputs().map(f => {
      const r = scanTable(f, readCsv(this.p('input', f)), decisions[f] || {});
      fs.writeFileSync(this.p('data', f), toCsv(r.header, r.data));
      const { header, data, ...rest } = r; return rest;
    });
    if (!reports.length) throw new Error('No files yet. Upload the CSV exports first.');
    fs.writeFileSync(this.p('pii_report.md'), piiMarkdown(reports)); this._cache = null;
    return { files: reports.map(r => ({ file: r.file, rows: r.rows, dropped: r.columns.filter(c => c.class === 'drop').map(c => c.column), hashed: r.columns.filter(c => c.class === 'hash').map(c => c.column), onHold: r.columns.filter(c => c.class === 'review').map(c => ({ column: c.column, why: c.why, maskedExamples: c.examples })) })),
      onHoldTotal: reports.reduce((s, r) => s + r.onHold.length, 0), note: 'Columns ON HOLD are excluded until the user decides keep / hash / drop (itsm_decide_privacy).' };
  }
  decidePrivacy(file, decisions) {
    const all = this.readJson('privacy.json', {}); all[file] = { ...(all[file] || {}), ...decisions }; this.writeJson('privacy.json', all);
    this.recordDecision('privacy', `${file}: ` + Object.entries(decisions).map(([c, d]) => `${c} → ${d}`).join(', '));
    return this.scan();
  }

  profile() {
    const files = this.dataFiles(); if (!files.length) this.scan();
    const profiles = this.dataFiles().map(f => profileTable(f, readCsv(this.p('data', f))));
    fs.writeFileSync(this.p('profile.md'), profileMarkdown(profiles)); this.writeJson('profile.json', profiles);
    return compactProfile(profiles);
  }
  proposeSpec(opts = {}) {
    const profiles = this.readJson('profile.json', null) || (this.profile(), this.readJson('profile.json', []));
    const spec = proposeSpec(profiles, opts); this.setSpec(spec);
    return { spec, assumptions: spec.assumptions, note: 'Default spec written to spec.json. Confirm the assumptions with the user or change them with itsm_patch_spec.' };
  }
  getSpec() { const s = this.readJson('spec.json', null); if (!s) throw new Error('No spec yet: call itsm_propose_spec (defaults from the data) or itsm_set_spec.'); return s; }
  setSpec(spec) { const e = validateSpec(spec); if (e.length) throw new Error('Spec problems: ' + e.join('; ')); this.writeJson('spec.json', spec); this._cache = null; return { ok: true, kpis: spec.kpis.map(k => k.id), panels: spec.panels.map(p => p.id) }; }
  patchSpec(ops) { const r = applyOps(this.getSpec(), ops); if (r.applied.length) { this.writeJson('spec.json', r.spec); this._cache = null; } return { applied: r.applied, errors: r.errors }; }

  /** Build dashboard.html + kpi_results.json. */
  build() {
    const spec = this.getSpec();
    const { html, results, R, data } = build(spec, this.p('data'));
    fs.writeFileSync(this.p('dashboard.html'), html); this.writeJson('kpi_results.json', results);
    this._cache = { key: JSON.stringify(spec), R, data, selKey: '{}' };
    return { ok: true, file: 'dashboard.html', latestMonth: results.latest, months: results.months.length, rows: results.rows, notes: results.notes, ...kpiTable(spec, R, results.latest) };
  }
  results(selection = {}) {
    const spec = this.getSpec(), key = JSON.stringify(spec), selKey = JSON.stringify(selection);
    if (!this._cache || this._cache.key !== key) { const { data } = loadSources(spec, this.p('data')); this._cache = { key, data, R: null, selKey: null }; }
    if (!this._cache.R || this._cache.selKey !== selKey) { const R = compute(spec, this._cache.data, selection); R._data = this._cache.data; this._cache.R = R; this._cache.selKey = selKey; }
    return { spec, R: this._cache.R };
  }
  kpis(month, selection) { const { spec, R } = this.results(selection); return { ...(selection && Object.keys(selection).length ? { filters: selection } : {}), ...kpiTable(spec, R, month) }; }
  findings(month) { const { spec, R } = this.results(); return findings(spec, R, month); }
  records(args) { const { spec, R } = this.results(args.filters || {}); return records(spec, R, args); }

  verify({ reference = null, tolerance = 0.1 } = {}) {
    const spec = this.getSpec(); let res = this.readJson('kpi_results.json', null);
    if (!res) { this.build(); res = this.readJson('kpi_results.json', null); }
    const v = verify(spec, res, this.p('data'), { reference, tolerance });
    fs.writeFileSync(this.p('verify.md'), verifyMarkdown(v, `Generated ${res.generated}`));
    return { allMatch: v.allMatch, checks: v.checks, matching: v.matching, mismatches: v.rows.filter(r => !r.match).slice(0, 10), reference: v.reference, file: 'verify.md' };
  }

  recordDecision(section, text) {
    const d = this.readJson('decisions.json', []); d.push({ section: SECTIONS.includes(section) ? section : 'open-questions', text: String(text), at: new Date().toISOString() }); this.writeJson('decisions.json', d);
    const f = this.p('ORG_PROFILE.md'); if (!fs.existsSync(f)) fs.writeFileSync(f, '# ORG_PROFILE\n\nDecisions and learned rules for this dashboard owner. Read first on every run.\n');
    fs.appendFileSync(f, `\n- [${new Date().toISOString().slice(0, 10)}] (${section}) ${text}`);
    return { recorded: d.length };
  }
  orgProfile() { const f = this.p('ORG_PROFILE.md'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '(no ORG_PROFILE yet — run the interview or record decisions)'; }
  brief() { const md = buildBrief(this); fs.writeFileSync(this.p('BRIEF.md'), md); return md; }

  saveVersion(name) {
    if (!fs.existsSync(this.p('dashboard.html'))) throw new Error('No dashboard yet — build it first.');
    const list = this.versions(), n = list.length + 1, id = `v${String(n).padStart(2, '0')}-${Date.now().toString(36)}`;
    const v = { id, n, name: String(name || `Version ${n}`).slice(0, 60), createdAt: new Date().toISOString() };
    fs.copyFileSync(this.p('dashboard.html'), this.p('versions', id + '.html')); fs.copyFileSync(this.p('spec.json'), this.p('versions', id + '.spec.json'));
    fs.writeFileSync(this.p('versions', id + '.json'), JSON.stringify(v)); return v;
  }
  versions() { return fs.readdirSync(this.p('versions')).filter(f => /^v\d+-[a-z0-9]+\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(this.p('versions', f), 'utf8'))).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
  restoreVersion(id) { const base = path.basename(id); this.setSpec(JSON.parse(fs.readFileSync(this.p('versions', base + '.spec.json'), 'utf8'))); this.build(); return { restored: this.versions().find(v => v.id === base)?.name || base }; }

  status() {
    const has = f => fs.existsSync(this.p(f));
    return { inputs: this.inputs(), anonymised: this.dataFiles(), profile: has('profile.json'), spec: has('spec.json'), dashboard: has('dashboard.html'), verified: has('verify.md'), orgProfile: has('ORG_PROFILE.md'), versions: this.versions().length };
  }
}
