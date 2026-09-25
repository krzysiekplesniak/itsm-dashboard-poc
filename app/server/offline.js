// Offline wizard (no LLM): the same 8 steps on the same engine tools. A safety net for demos without
// GitHub Copilot. Understands "yes" and short commands only (English or Polish keywords).
import { runTool } from './agent.js';

const yes = t => /^(y|yes|ok|okay|sure|go|tak|dobrze|approve|confirm|default|next|dalej)\b/i.test(t.trim());
const HELP = 'Commands: **target fcr 80** · **title My title** · **month 2026-07** · **move sla first** · **filter group Service Desk L1** · **why fcr** · **save Management** · **brief** · **start over**';

export class OfflineWizard {
  constructor(ws, reason = '') { this.ws = ws; this.reason = reason; this.stage = this.resume(); }
  resume() { const s = this.ws.status(); return s.dashboard ? 'refine' : s.spec ? 'confirm' : s.inputs.length ? 'data' : 'start'; }
  hint() { return `\n\n_ℹ️ Offline wizard (no LLM): it understands **yes** and the commands shown, not free text. GitHub Copilot is not active${this.reason ? ' (' + this.reason + ')' : ''}._`; }

  async ask(text, ctx) {
    const say = s => ctx.emit({ type: 'delta', text: s + '\n' }), tool = (n, a = {}) => runTool(this.ws, n, a, ctx);
    const t = String(text || '').trim();
    if (/^\/?(restart|start over|od nowa)$/i.test(t)) this.stage = 'start';
    const sel = t.match(/\[selected element: (\{[\s\S]*\})\]\s*$/);
    if (sel && this.ws.status().dashboard) return this.why(JSON.parse(sel[1]).kpis?.[0] || JSON.parse(sel[1]).kpi, JSON.parse(sel[1]).month, say, tool);

    switch (this.stage) {
      case 'start':
        await tool('ui_set_step', { step: 1 });
        say('**Step 1 of 8 — Goal.** I will take your ITSM exports (CSV) to a verified, clickable KPI dashboard.\nSuggested goal: *monthly Service Desk review for management — FCR, P3/P4 SLAs and customer satisfaction.* Type **yes** or describe your goal.' + this.hint());
        this.stage = 'goal'; return;
      case 'goal':
        await tool('itsm_record_decision', { section: 'purpose', text: yes(t) ? 'Monthly Service Desk review for management: FCR, P3/P4 SLAs, CSAT.' : t });
        await tool('ui_set_step', { step: 2 });
        say('**Step 2 of 8 — Data & privacy.** Upload the CSV exports (button **Upload CSV files**, several at once) or click **Use sample data**. Every file is checked for personal data first.');
        this.stage = 'data'; return;
      case 'data': case 'privacy': {
        const dm = t.match(/^(keep|hash|drop)\s+(.+?)\s+in\s+(.+)$/i);
        if (dm) { await tool('itsm_decide_privacy', { file: dm[3].trim(), decisions: { [dm[2].trim()]: dm[1].toLowerCase() } }); }
        const s = await tool('itsm_scan'); if (s.error) { say(s.error); return; }
        for (const f of s.files) say(`- **${f.file}**: ${f.rows.toLocaleString('en-GB')} rows · removed ${f.dropped.join(', ') || 'nothing'} · hashed ${f.hashed.join(', ') || 'nothing'}`);
        const held = s.files.flatMap(f => f.onHold.map(c => ({ ...c, file: f.file })));
        if (held.length && !(this.stage === 'privacy' && yes(t))) {
          say(`\n**${held.length} column(s) ON HOLD** (may contain personal data):\n| File | Column | Why | Masked examples |\n|---|---|---|---|\n` + held.map(c => `| ${c.file} | ${c.column} | ${c.why} | ${c.maskedExamples.map(e => '`' + e + '`').join(', ')} |`).join('\n'));
          say('Type **yes** to drop them all (safest), or e.g. **keep Site in FCR.csv** / **hash Agent in FCR.csv**.'); this.stage = 'privacy'; return;
        }
        if (held.length) for (const f of s.files) if (f.onHold.length) await tool('itsm_decide_privacy', { file: f.file, decisions: Object.fromEntries(f.onHold.map(c => [c.column, 'drop'])) });
        await tool('ui_set_step', { step: 3 });
        const prof = await tool('itsm_profile');
        say('\n**Step 3 of 8 — What is in the files**');
        for (const p of prof) {
          const d = p.columns.find(c => c.role === 'date' && c.months) || {};
          say(`- **${p.file}** (${p.rows.toLocaleString('en-GB')} rows${d.from ? `, ${d.from} → ${d.to}` : ''}): ${p.canFeed.join('; ') || 'no KPI column found'}`);
        }
        await tool('ui_set_step', { step: 4 });
        const sp = await tool('itsm_propose_spec', {});
        say(`\n**Step 4 of 8 — KPIs.** Proposed: ${sp.spec.kpis.map(k => `**${k.label}** (target ${k.target}${k.unit === '%' ? ' %' : ''})`).join(', ')}.\nAssumptions to confirm:\n` + sp.assumptions.map(a => '- ' + a).join('\n'));
        say('\nType **yes** to build, or change first, e.g. **target fcr 80**.'); this.stage = 'confirm'; return;
      }
      case 'confirm': {
        if (!yes(t) && await this.command(t, say, tool)) return;
        return this.build(say, tool);
      }
      case 'refine': default: {
        if (/^brief$/i.test(t)) { await tool('itsm_brief'); await tool('ui_set_step', { step: 8 }); say('BRIEF.md is ready — **Download BRIEF.md** above.'); return; }
        const sv = t.match(/^(save|zapisz)\s*(.*)$/i); if (sv) { const r = await tool('itsm_save_version', { name: sv[2] || undefined }); say(r.error || `Saved **${r.name}** as a tab above the preview.`); return; }
        const w = t.match(/^(why|dlaczego)\s+(\S+)/i); if (w) return this.why(w[2], null, say, tool);
        if (await this.command(t, say, tool)) return this.build(say, tool, true);
        say(HELP + this.hint());
      }
    }
  }

  async command(t, say, tool) {
    let m, ops = [];
    if ((m = t.match(/^target\s+(\S+)\s+([\d.,]+)/i))) ops.push({ op: 'setTarget', kpi: this.kpiId(m[1]), value: Number(m[2].replace(',', '.')) });
    else if ((m = t.match(/^title\s+(.+)/i))) ops.push({ op: 'setTitle', text: m[1] });
    else if ((m = t.match(/^month\s+(\d{4}-\d{2}|latest)/i))) ops.push({ op: 'setMonth', month: m[1] });
    else if ((m = t.match(/^move\s+(\S+)\s+first/i))) ops.push({ op: 'movePanel', panel: this.panelId(m[1]), to: 0 });
    else if ((m = t.match(/^filter\s+(\S+)\s+(.+)/i))) { const r = await tool('itsm_kpis', { filters: { [m[1].toLowerCase()]: [m[2].trim()] } }); say(r.error || `**${m[1]} = ${m[2]}** in ${r.month}:\n` + r.kpis.map(k => `- ${k.label}: **${k.value ?? 'n/a'}** ${k.unit || ''} (${k.records} records)`).join('\n') + '\n\n_Use the filter chips on the dashboard for the same view._'); return true; }
    else return false;
    const r = await tool('itsm_patch_spec', { operations: ops });
    if (r.errors?.length) { say('⚠ ' + r.errors.join('; ')); return true; }
    await tool('itsm_record_decision', { section: 'kpi', text: `Change: ${t}` }); say(`Applied: ${t}.`); return true;
  }
  kpiId(x) { const s = this.ws.getSpec(), l = x.toLowerCase(); return (s.kpis.find(k => k.id === l) || s.kpis.find(k => k.id.includes(l) || k.label.toLowerCase().includes(l)) || {}).id || l; }
  panelId(x) { const s = this.ws.getSpec(), l = x.toLowerCase(); return (s.panels.find(p => p.id.includes(l) || p.title.toLowerCase().includes(l)) || {}).id || l; }

  async build(say, tool, quiet = false) {
    await tool('ui_set_step', { step: 6 });
    const b = await tool('itsm_build'); if (b.error) { say('⚠ ' + b.error); return; }
    const v = await tool('itsm_verify', {});
    if (!quiet) say(`**Step 6 of 8 — Dashboard** (${b.month}). ${v.allMatch ? `✓ Verified: ${v.matching} of ${v.checks} values match an independent re-count.` : `⚠ ${v.checks - v.matching} values differ — see verify.md.`}`);
    say('| KPI | Value | vs previous | Target | Status |\n|---|---|---|---|---|\n' + b.kpis.map(k => `| ${k.label} | **${k.value ?? 'n/a'}** ${k.unit || ''} | ${k.changeVsPrevious == null ? '—' : (k.changeVsPrevious >= 0 ? '+' : '') + k.changeVsPrevious} | ${k.target ?? '—'} | ${k.status} |`).join('\n'));
    const f = await tool('itsm_findings', {}); await tool('ui_set_step', { step: 7 });
    say('\n**What the data says**\n' + f.findings.slice(0, 5).map(x => `- ${x.text}`).join('\n'));
    say('\n' + HELP); this.stage = 'refine';
  }
  async why(kpi, month, say, tool) {
    const r = await tool('itsm_records', { kpi: this.kpiId(kpi || ''), month: month || undefined });
    if (r.error) { say('⚠ ' + r.error); return; }
    say(`**${r.label} — ${r.month}: ${r.value}** (${r.records} records, ${r.missed} missed: ${r.missedMeaning}).\n` + (r.by ? `By ${r.by}:\n| ${r.by} | Records | Missed | % met |\n|---|---|---|---|\n` + r.breakdown.slice(0, 8).map(g => `| ${g.value} | ${g.total} | ${g.missed} | ${g.pct} |`).join('\n') : '') + (r.sampleMissedIds.length ? `\nExamples of missed records: ${r.sampleMissedIds.slice(0, 5).join(', ')}` : ''));
  }
}
