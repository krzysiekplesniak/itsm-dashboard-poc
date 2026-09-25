// Builds the GitHub Pages site (_site/): landing page, the dashboard app that runs fully in the browser
// (paste spec + drop CSV — no server, no upload), the synthetic demo, the plugin package and the prompt pack.
import fs from 'node:fs'; import path from 'node:path'; import { execSync } from 'node:child_process';
const R = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), OUT = path.join(R, '_site'), P = path.join(R, 'plugin');
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const repo = process.env.GITHUB_REPOSITORY || 'OWNER/REPO';
const tpl = fs.readFileSync(path.join(P, 'skills/itsm-html-builder/templates/dashboard.html'), 'utf8');
fs.writeFileSync(path.join(OUT, 'dashboard.html'), tpl.replace('/*__SPEC__*/null', 'null').replace('/*__DATA__*/null', 'null').replace('/*__RESULTS__*/null', 'null').replace('__TITLE__', 'ITSM KPI dashboard'));
fs.copyFileSync(path.join(P, 'examples/mock-3csv/dashboard.html'), path.join(OUT, 'demo.html'));
fs.copyFileSync(path.join(P, 'examples/mock-3csv/spec.json'), path.join(OUT, 'spec-example.json'));
fs.copyFileSync(path.join(P, 'prompt-pack/ITSM_KNOWLEDGE.md'), path.join(OUT, 'ITSM_KNOWLEDGE.md'));
fs.copyFileSync(path.join(P, 'prompt-pack/PROMPT.md'), path.join(OUT, 'PROMPT.md'));
try { execSync(`cd "${P}" && zip -qr "${path.join(OUT, 'itsm-dashboard-kit.plugin')}" . -x "*.DS_Store" -x "itsm-workspace/*"`); } catch (e) { console.log('zip not available:', e.message); }
const html = fs.readFileSync(path.join(R, 'scripts/site-index.html'), 'utf8').replaceAll('{{REPO}}', repo);
fs.writeFileSync(path.join(OUT, 'index.html'), html); fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log('site →', OUT, fs.readdirSync(OUT));
