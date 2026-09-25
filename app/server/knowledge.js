// Knowledge of the agent = the plugin's skills (single source of truth) + the app skill.
// Whatever the plugin knows, the agent knows — and the other way round.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PLUGIN_ROOT = path.resolve(process.env.ITSM_PLUGIN_DIR || path.join(APP_ROOT, '..', 'plugin'));
export const PLUGIN_SKILLS = path.join(PLUGIN_ROOT, 'skills');
export const APP_SKILLS = path.join(APP_ROOT, 'skills');

const strip = t => t.replace(/^---[\s\S]*?---\s*/, '');
const meta = t => ({ name: (t.match(/^name:\s*(.+)$/m) || [])[1]?.trim(), description: (t.match(/description:\s*>?\s*\n?([\s\S]*?)\n[a-z]+:/m) || [])[1]?.replace(/\s+/g, ' ').trim() });

/** All skills: { name, description, dir, body }. */
export function listSkills() {
  const out = [];
  for (const root of [APP_SKILLS, PLUGIN_SKILLS]) {
    if (!fs.existsSync(root)) continue;
    for (const d of fs.readdirSync(root).sort()) {
      const f = path.join(root, d, 'SKILL.md'); if (!fs.existsSync(f)) continue;
      const t = fs.readFileSync(f, 'utf8'); out.push({ ...meta(t), dir: path.join(root, d), body: strip(t) });
    }
  }
  return out;
}
const refs = dir => { const r = path.join(dir, 'references'); return fs.existsSync(r) ? fs.readdirSync(r).sort().map(f => `\n\n<!-- ${path.basename(dir)}/references/${f} -->\n` + fs.readFileSync(path.join(r, f), 'utf8')) : []; };

/** System message: app skill + orchestrator + domain + KPI analyzer + intent router in full; the rest as an index (loaded on demand). */
export function systemMessage() {
  const skills = listSkills(), full = ['itsm-agent-app', 'itsm-dashboard', 'itsm-domain', 'itsm-kpi-analyzer', 'itsm-intent-router', 'itsm-insights'];
  const parts = ['You are the ITSM Dashboard agent of the web app (runs on GitHub Copilot). The same knowledge ships as the ITSM Dashboard Kit plugin. Follow these skills strictly.'];
  for (const n of full) { const s = skills.find(x => x.name === n); if (s) parts.push(`\n\n<!-- skill: ${n} -->\n` + s.body + (['itsm-domain', 'itsm-kpi-analyzer'].includes(n) ? refs(s.dir).join('') : '')); }
  parts.push('\n\n## Other skills available on demand\n' + skills.filter(s => !full.includes(s.name)).map(s => `- **${s.name}** — ${s.description}`).join('\n'));
  return parts.join('');
}
export const skillDirectories = () => [APP_SKILLS, PLUGIN_SKILLS].filter(d => fs.existsSync(d));
