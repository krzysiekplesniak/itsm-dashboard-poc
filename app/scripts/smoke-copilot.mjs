// Connection test with GitHub Copilot: npm run smoke:copilot  (after `copilot login` or with COPILOT_GITHUB_TOKEN)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { Workspace } from '../../plugin/lib/workspace.mjs';
import { CopilotAgent } from '../server/agent.js';
const ws = new Workspace(fs.mkdtempSync(path.join(os.tmpdir(), 'itsm-smoke-')));
const agent = new CopilotAgent(ws), events = [];
const ctx = { emit: e => { events.push(e); if (e.type === 'delta') process.stdout.write(e.text); else if (e.type !== 'mode') console.log('\n[event]', JSON.stringify(e)); }, setStep: () => {} };
const t0 = Date.now();
try {
  await agent.start(); console.log('✓ Copilot session created in', Date.now() - t0, 'ms');
  await agent.ask('Hello. What can you do? Call itsm_status first.', ctx);
  const tools = events.filter(e => e.type === 'tool').map(e => e.name);
  console.log('\n✓ answer received; tool calls:', tools.join(', ') || 'none'); if (!tools.includes('itsm_status')) console.log('⚠ the model did not call itsm_status');
} catch (e) { console.log('✗', e.message); process.exitCode = 1; } finally { await agent.stop(); }
