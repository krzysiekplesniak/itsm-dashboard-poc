// Tryb offline (bez LLM): ten sam 8-krokowy wizard, prowadzony skryptem, na tych samych narzędziach silnika.
// Służy jako zabezpieczenie demo, gdy nie ma tokenu GitHub Copilot. Język: angielski (demo dla ACME).
import { runTool } from '../src/tools.js';

const TARGETS = { fcr: 'panel:fcr', sla: 'panel:sla', slas: 'panel:sla', csat: 'panel:csat', satisfaction: 'panel:csat', 'at-risk': 'atRisk', 'atrisk': 'atRisk', 'at risk': 'atRisk', 'missed fcr': 'card:fcr_missed', 'total': 'card:fcr_total', 'p3': 'card:sla_p3', 'p4': 'card:sla_p4', 'sent surveys': 'card:csat_sent', 'responded': 'card:csat_resp', 'response rate': 'card:csat_rate' };
const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
const yes = t => /^(y|yes|ok|okay|sure|go|tak|approve|approved|confirm|confirmed|fine|looks good|default|next)\b/i.test(t.trim());

export class OfflineWizard {
  constructor(project, reason = '') { this.p = project; this.reason = reason; this.stage = this.resumeStage(); }

  // D1: przy przejściu z Copilota w tryb offline wznawiamy od bieżącego kroku (a nie od kroku 1)
  resumeStage() {
    const p = this.p;
    if (!Object.keys(p.files || {}).length) return p.decisions?.some(d => d.section === 'cel') ? 'data' : 'start';
    if (p.anonymisationReview().pending.length) return 'anon';
    if (!p.mappings?.incidents) return 'data';
    return { 4: 'kpi', 5: 'layout', 6: 'numbers', 7: 'refine', 8: 'done' }[p.step] || (p.step >= 7 ? 'refine' : 'kpi');
  }

  hint() { return `\n\n_ℹ️ This is the **offline wizard (no LLM)** — it only understands **yes** and the commands shown. It cannot answer free-text questions or reply in Polish. GitHub Copilot is not active${this.reason ? ' (' + this.reason + ')' : ''}. Fix the login, then click **Start over**._`; }

  async ask(text, ctx) {
    const say = s => ctx.emit({ type: 'delta', text: s + '\n' });
    const tool = (n, a = {}) => runTool(n, this.p, a, ctx);
    const t = String(text || '').trim();

    if (/^\/?(restart|start over)$/i.test(t)) this.stage = 'start';
    const sv = t.match(/^(save|zapisz)(?: version| wersj[eę])?\s*(.*)$/i);
    if (sv && this.p.computed) { const r = await tool('save_version', { name: sv[2] || undefined }); say(r.error ? r.error : `Saved **${r.version.name}** — it is now a tab above the preview. You keep working on the *Working* version.`); return; }
    const sel = t.match(/\[selected element: (\{[\s\S]*\})\]\s*$/);
    if (sel) return this.explainSelected(JSON.parse(sel[1]), say, tool);

    switch (this.stage) {
      case 'start': {
        await tool('set_step', { step: 1, title: 'Goal' });
        say('**Step 1 of 8 — Goal.** I will guide you from a BMC export to a verified KPI dashboard (single HTML file) and a brief generated from our conversation.\n');
        say('I suggest this goal: *monthly Service Desk performance for management — First Call Resolution, P3/P4 SLAs and customer satisfaction, in the layout of the Vendor reference dashboard.*');
        say('Type **yes** to accept, or describe your goal in your own words (who looks at it, how often).');
        this.stage = 'goal'; return;
      }
      case 'goal': {
        await tool('record_decision', { section: 'cel', text: yes(t) ? 'Monthly Service Desk performance for management: FCR, P3/P4 SLAs, CSAT, layout as the Vendor reference dashboard.' : t });
        await tool('set_step', { step: 2, title: 'Data' });
        say('Noted. **Step 2 of 8 — Data.** Upload the **incident export (CSV)** and, for customer satisfaction, the **survey export (CSV)** with the buttons above — or click **Use mock data**. Files are anonymised on upload: names, e-mails and free text are removed before anything else happens.');
        this.stage = 'data'; return;
      }
      case 'data': {
        const o = await tool('data_overview');
        if (o.error) { say(o.error); return; }
        const inc = o.incidents; if (!inc) { say('I have the survey file; I still need the **incident** export.'); return; }
        const dates = inc.columns.filter(c => c.type === 'date');
        const prio = inc.columns.find(c => /priority/i.test(c.name));
        say(`**What I see in your data**\n- Incidents: **${inc.rows.toLocaleString('en-GB')}** rows, ${inc.columns.length} columns after anonymisation.`);
        if (dates.length) say(`- Dates from **${dates[0].min}** to **${dates[0].max}** (column "${dates[0].name}").`);
        if (prio?.values) say(`- Priorities: ${prio.values.map(v => `${v.value} (${v.count})`).join(', ')}.`);
        say(`- Anonymisation removed: ${inc.anonymization.dropped.join(', ') || 'nothing'}; hashed: ${inc.anonymization.hashed.join(', ') || 'nothing'}.`);
        if (o.surveys) say(`- Surveys: **${o.surveys.rows.toLocaleString('en-GB')}** rows (removed: ${o.surveys.anonymization.dropped.join(', ') || 'nothing'}).`);
        else say('- No survey file yet — customer satisfaction will show *n/a* unless you upload it.');
        const rv = await tool('anonymisation_review');
        if (rv.pending?.length) {
          say('\n**Anonymisation check — your decision.** These columns *might* contain personal data, so they are **on hold** (not used, not visible to the assistant):');
          say('\n| File | Column | Why | Examples (masked) |\n|---|---|---|---|\n' + rv.pending.map(x => `| ${x.kind} | ${x.column} | ${x.reasons.join('; ')} | ${x.examples.map(e => '`' + e + '`').join(', ')} |`).join('\n'));
          say('\nFor each: `keep <column>` (not personal and needed), `hash <column>` (replace by a code), `drop <column>`. Type **yes** to drop all of them (safest).');
          this.stage = 'anon'; return;
        }
        return this.showMapping(o, say, tool);
      }
      case 'anon': {
        const rv = await tool('anonymisation_review');
        const byKind = {};
        if (yes(t)) rv.pending.forEach(x => ((byKind[x.kind] ??= {})[x.column] = 'drop'));
        else for (const part of t.split(/,|;|\n/)) { const m = part.trim().match(/^(keep|hash|drop|zostaw|usuń|usun|zahaszuj)\s+(.+)$/i); if (!m) continue;
          const act = { zostaw: 'keep', usuń: 'drop', usun: 'drop', zahaszuj: 'hash' }[m[1].toLowerCase()] || m[1].toLowerCase(); const col = rv.pending.find(x => x.column.toLowerCase() === m[2].trim().toLowerCase());
          if (col) (byKind[col.kind] ??= {})[col.column] = act; }
        if (!Object.keys(byKind).length) { say('Please answer `keep <column>`, `hash <column>`, `drop <column>` or **yes** (drop all).' + this.hint()); return; }
        for (const [k, d] of Object.entries(byKind)) { const r = await tool('decide_anonymisation', { kind: k, decisions: d }); say(`✔ ${k}: ` + Object.entries(r.decisions).map(([c, a]) => `${c} → **${a}**`).join(', ')); }
        const left = (await tool('anonymisation_review')).pending; if (left.length) { say('Still on hold: ' + left.map(x => x.column).join(', ') + '.'); return; }
        return this.showMapping(await tool('data_overview'), say, tool);
      }
      case 'mapping': {
        const fix = t.match(/^map\s+(\w+)\s*=\s*(.+)$/i);
        if (fix) { for (const m of Object.values(this.proposals)) if (fix[1] in m.mapping) m.mapping[fix[1]] = fix[2].trim(); say(`Changed ${fix[1]} → "${fix[2].trim()}". Anything else? Type **yes** to approve.`); return; }
        if (!yes(t)) { say('Type **yes** to approve the mapping, or `map <concept> = <column>`.'); return; }
        for (const [k, m] of Object.entries(this.proposals)) { const r = await tool('approve_mapping', { kind: k, mapping: m.mapping }); if (r.error) { say('⚠️ ' + r.error); return; } }
        await tool('record_decision', { section: 'techniczne', text: 'Column mapping approved in the conversation (see §9).' });
        await tool('set_step', { step: 4, title: 'KPIs' });
        say('Mapping approved ✔ (gate 1 of 3).\n\n**Step 4 of 8 — KPI definitions.** Proposed, from the brief and the Vendor client view:');
        say('- **First Call Resolution** — incidents that started in IT-Service Desk, were never passed to another group and were solved in **< 30 business minutes**. Target **70 %**.\n- **P3 SLA / P4 SLA** — resolved within **8 / 16 business hours** (Mon–Fri 08–18, no Luxembourg holidays, pending time excluded). Target **90 %**. Open incidents are not counted.\n- **Customer satisfaction** — average survey rating on a 1–5 scale, target **≥ 4.2**; plus sent, responded and response rate.');
        say('Type **yes** to confirm, or change a value, e.g. `fcr target 75`, `p3 10h`, `csat target 4.5`.');
        this.stage = 'kpi'; return;
      }
      case 'kpi': {
        const patch = {};
        let m;
        if ((m = t.match(/fcr target\s*(\d+(\.\d+)?)/i))) patch.fcrTargetPct = +m[1];
        if ((m = t.match(/sla target\s*(\d+(\.\d+)?)/i))) patch.slaTargetPct = +m[1];
        if ((m = t.match(/csat target\s*(\d+(\.\d+)?)/i))) patch.csatTarget = +m[1];
        if ((m = t.match(/p3\s*(\d+(\.\d+)?)\s*h/i))) patch.slaP3Hours = +m[1];
        if ((m = t.match(/p4\s*(\d+(\.\d+)?)\s*h/i))) patch.slaP4Hours = +m[1];
        if ((m = t.match(/fcr\s*(\d+)\s*min/i))) patch.fcrMaxBusinessMinutes = +m[1];
        if (Object.keys(patch).length) { await tool('set_rules', patch); await tool('record_decision', { section: 'kpi', text: `Changed in conversation: ${JSON.stringify(patch)}` }); say(`Updated ${Object.keys(patch).join(', ')}. Type **yes** when the definitions are right.`); return; }
        if (!yes(t)) { say('Type **yes** to confirm the KPI definitions, or e.g. `fcr target 75`.'); return; }
        await tool('record_decision', { section: 'kpi', text: 'KPI definitions and targets confirmed as proposed.' });
        await tool('set_step', { step: 5, title: 'What to show' });
        say('Definitions confirmed ✔ (gate 2 of 3).\n\n**Step 5 of 8 — What to show.** Default = the reference layout: three panels (FCR, P3 & P4 SLAs, Customer satisfaction), three cards each, 12-month trends with target lines, plus a list of open P3/P4 incidents at risk. Cards show the **last complete month**.');
        say('**Template** (you can switch any time in the dashboard header): `monthly` — management view (default) · `weekly` — last 8 weeks, open backlog and breaches first · `warnings` — only what needs attention, with the reason.');
        say('Type **yes** for the default, or say e.g. `hide csat`, `highlight fcr`, `move sla first`, `month 2026-07`.');
        this.stage = 'layout'; return;
      }
      case 'layout': case 'refine': {
        if (this.stage === 'refine' && /^(export|done|finish|download)/i.test(t)) return this.export(say, tool);
        const ops = this.parseEdits(t);
        if (ops.length) {
          const r = await tool('update_dashboard', { operations: ops });
          await tool('record_decision', { section: 'wyglad', text: `Requested: "${t}"` });
          if (r.errors?.length) say('⚠️ ' + r.errors.join('; '));
          say(`Applied: ${r.applied.map(o => o.op + ' ' + (o.target || o.panel || o.month || o.card || '')).join(', ')}.`);
          if (this.stage === 'refine') { await tool('render_dashboard'); say('Preview updated →. More changes, or type **export**.'); return; }
          say('Anything else? Type **yes** to build the dashboard.'); return;
        }
        if (this.stage === 'refine') { say('I understand: `hide/show <panel|card>`, `highlight <x>`, `move <panel> first|last`, `month YYYY-MM`, `title <text>`, `color #RRGGBB`, or **export**.'); return; }
        if (!yes(t)) { say('Type **yes** for the default layout, or an edit like `hide csat`.'); return; }
        await tool('set_step', { step: 6, title: 'First dashboard' });
        const s = await tool('kpi_summary');
        await tool('render_dashboard');
        const k = s.kpis || {};
        say(`**Step 6 of 8 — First dashboard** (${s.month}, computed by the engine):`);
        say(`- First Call Resolution: **${k.fcr?.pct ?? 'n/a'} %** of ${k.fcr?.total ?? 'n/a'} incidents (${k.fcr?.missed ?? 'n/a'} missed)\n- P3 SLA **${k.sla?.P3.pct ?? 'n/a'} %**, P4 SLA **${k.sla?.P4.pct ?? 'n/a'} %**, combined **${k.sla?.combined.pct ?? 'n/a'} %**\n- Customer satisfaction: **${k.csat?.avg ?? 'n/a'}** / 5 from ${k.csat?.responded ?? 'n/a'} responses (${k.csat?.rate ?? 'n/a'} % response rate this month)\n- At-risk open P3/P4: ${s.atRisk.breached} breached, ${s.atRisk.atRisk} at risk`);
        if (s.notices?.length) say('⚠️ ' + s.notices.join(' '));
        const v = await tool('verify_numbers');
        say(v.allMatch ? '\n**Verification:** an independent recalculation (minute-by-minute business time, separate code) gives **exactly the same numbers** ✔. Sample tickets are in the *Verification* tab of the dashboard.' : '\n**Verification found differences** — see the *Verification* tab before trusting these numbers.');
        say('Do these numbers match what you expect (e.g. the Vendor report for the same month)? Type **yes**, or ask for changes.');
        this.stage = 'numbers'; return;
      }
      case 'numbers': {
        if (!yes(t)) { await tool('record_decision', { section: 'pytania', text: `Numbers questioned by the user: "${t}"` }); say('Noted as an open question for the KPI owners. Type **yes** to accept the numbers and continue.' + this.hint()); return; }
        await tool('record_decision', { section: 'kpi', text: 'Numbers accepted by the user after verification.' });
        await tool('set_step', { step: 7, title: 'Refine' });
        say('Numbers accepted ✔ (gate 3 of 3).\n\n**Step 7 of 8 — Refine.** Tell me what to change: `move sla first`, `hide missed fcr`, `highlight csat`, `month 2026-07`, `title ACME Service Desk — monthly KPIs`, `color #0B6E4F`. Type **export** when done.');
        this.stage = 'refine'; return;
      }
      case 'done': { say('The dashboard and brief are ready (buttons above). Type **restart** to build another one.'); return; }
    }
  }

  async showMapping(o, say, tool) {
    await tool('set_step', { step: 3, title: 'Understanding the data' });
    say('\n**Step 3 of 8 — Understanding the data.** My proposed column mapping:');
    this.proposals = {};
    for (const k of ['incidents', 'surveys']) {
      if (!o[k]) continue;
      const m = await tool('propose_mapping', { kind: k }); this.proposals[k] = m;
      say(`\n*${k}*\n\n| Concept | Column | Confidence |\n|---|---|---|\n` + Object.entries(m.mapping).map(([f, c]) => `| ${m.fields[f]} | ${c ?? '— missing'} | ${c ? Math.round(m.confidence[f] * 100) + '%' : ''} |`).join('\n'));
      if (m.missingRequired.length) say(`\n⚠️ Missing required: ${m.missingRequired.join(', ')}.`);
    }
    say('\nValue meanings I will use: Priority **Medium = P3**, **Low = P4**; Service Desk group = **"IT-Service Desk"**; survey ratings 2–10 are divided by 2 (Vendor "average out of 5").');
    say('Type **yes** to approve, or correct a line, e.g. `map resolved_date = Resolved Date`.');
    this.stage = 'mapping';
  }

  // Pytanie o zaznaczony element dashboardu — działa także bez LLM (odpowiedź z szablonu, liczby z silnika)
  async explainSelected(el, say, tool) {
    const id = String(el.id || el.panel || '');
    const metric = /^fcr/.test(id) ? 'fcr' : id === 'sla_p3' ? 'sla_p3' : id === 'sla_p4' ? 'sla_p4' : /^sla/.test(id) ? 'sla_combined' : /^csat/.test(id) ? 'csat' : null;
    if (el.type === 'table') { say(`**${el.title || 'At-risk incidents'}**: ${el.breached ?? '?'} breached and ${el.atRisk ?? '?'} at risk (open P3/P4 at the snapshot). Sort the table by *Business hours elapsed* to see the oldest first.` + this.hint()); return; }
    if (!metric) { say('I can explain cards and charts of the FCR, SLA and CSAT panels.' + this.hint()); return; }
    const month = el.month || (el.months && el.months[1]);
    const d = await tool('drill_down', { metric, month });
    if (d.error) { say(d.error); return; }
    if (metric === 'csat') {
      say(`**Customer satisfaction — ${d.month}:** average **${d.average ?? 'n/a'} / 5** from ${d.responded} responses (${d.responseRatePct} % of ${d.sent} surveys sent); previous month ${d.previousMonthAverage ?? 'n/a'}.`);
      say('Ratings: ' + d.distribution.map(x => `${x.label} ${x.count}`).join(' · ') + '.' + this.hint()); return;
    }
    const top = d.breakdown.filter(b => b.missed > 0).slice(0, 3).map(b => `${b[d.breakdownBy]} (${b.missed} missed, ${b.pct} %)`).join('; ');
    say(`**${el.label || metric} — ${d.month}:** **${d.pct} %** (${d.met} of ${d.population} met, ${d.missed} missed)` + (d.changePp != null ? `, ${d.changePp >= 0 ? '+' : ''}${d.changePp} pp vs previous month.` : '.'));
    say('- Why missed: ' + d.reasons.filter(r => r.count).map(r => `${r.reason} — ${r.count}`).join('; ') + (d.missed ? '' : 'nothing missed'));
    if (top) say(`- Most misses by ${d.breakdownBy}: ${top}`);
    if (d.sampleMissed[0]) { const x = d.sampleMissed[0]; say(`- Example: ${x.id} (${x.prio}), ${x.initialGroup} → ${x.group}, ${x.netBusinessMinutes} business min.`); }
    say('Click the card to open the full drill-down with the ticket list.' + this.hint());
  }

  async export(say, tool) {
    await tool('set_step', { step: 8, title: 'Export' });
    await tool('record_decision', { section: 'pytania', text: 'Confirm with KPI owners: export timezone, pending-time unit, exact Service Desk group names, exclusion rules, CSAT cards monthly vs year-to-date.' });
    await tool('render_dashboard'); await tool('get_brief');
    say('**Step 8 of 8 — Export.** Download the **dashboard (HTML)** — it works offline, just open it in a browser — and the **BRIEF.md** generated from our conversation. Open questions for the KPI owners are listed in section 10 of the brief.');
    this.stage = 'done';
  }

  parseEdits(t) {
    const ops = [];
    const target = x => TARGETS[x.trim()] || (x.includes('csat') ? 'panel:csat' : x.includes('sla') ? 'panel:sla' : x.includes('fcr') ? 'panel:fcr' : null);
    let m;
    for (const part of t.split(/,| and |;/i)) {
      const p = part.trim().toLowerCase(); if (!p) continue;
      if ((m = p.match(/^(hide|show)\s+(.+)$/))) { const tg = target(m[2]); if (tg) ops.push({ op: m[1], target: tg }); }
      else if ((m = p.match(/^(un)?highlight\s+(.+)$/))) { const tg = target(m[2]); if (tg) ops.push({ op: m[1] ? 'unhighlight' : 'highlight', target: tg }); }
      else if ((m = p.match(/^move\s+(fcr|sla|slas|csat)\s+(first|left|to the left|last|right|to the right|second|middle)/))) ops.push({ op: 'move', panel: m[1] === 'slas' ? 'sla' : m[1], to: /first|left/.test(m[2]) ? 0 : /second|middle/.test(m[2]) ? 1 : 2 });
      else if ((m = p.match(/^(?:template\s+|mode\s+|tryb\s+)?(monthly|weekly|warnings|miesięczny|tygodniowy|ostrzeżenia)$/))) ops.push({ op: 'setTemplate', template: { miesięczny: 'monthly', tygodniowy: 'weekly', ostrzeżenia: 'warnings' }[m[1]] || m[1] });
      else if ((m = p.match(/^(hide|show)\s+(attention|weekly|backlog|volume)$/))) ops.push({ op: m[1], target: 'module:' + m[2] });
      else if ((m = p.match(/^month\s+(\d{4}-\d{2})/))) ops.push({ op: 'setMonth', month: m[1] });
      else if ((m = p.match(/^month\s+([a-z]+)\s+(\d{4})/)) && MONTHS[m[1]]) ops.push({ op: 'setMonth', month: `${m[2]}-${String(MONTHS[m[1]]).padStart(2, '0')}` });
      else if ((m = part.trim().match(/^title\s+(.+)$/i))) ops.push({ op: 'setTitle', text: m[1] });
      else if ((m = p.match(/^colou?r\s+(#[0-9a-f]{6})/))) ops.push({ op: 'setAccent', color: m[1] });
    }
    return ops;
  }
}
