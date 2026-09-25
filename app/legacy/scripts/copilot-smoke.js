// Test połączenia z GitHub Copilot: node scripts/copilot-smoke.js  (wymaga COPILOT_GITHUB_TOKEN z licencją Copilot)
import { Project } from '../src/project.js';
import { CopilotAgent } from '../server/copilot-agent.js';
const agent = new CopilotAgent(new Project());
const events = [];
const ctx = { emit: e => { events.push(e); if (e.type === 'delta') process.stdout.write(e.text); else console.log('\n[event]', JSON.stringify(e)); }, saveDashboard: () => {}, saveBrief: () => {} };
const t0 = Date.now();
try {
  await agent.start(); console.log('✓ Copilot client started, session created in', Date.now() - t0, 'ms');
  await agent.ask('Hello', ctx);
  console.log('\n✓ first answer received; tool calls:', events.filter(e => e.type === 'tool').map(e => e.name).join(', ') || 'none');
} catch (e) { console.log('✗', e.message); process.exitCode = 1; }
finally { await agent.stop(); }
