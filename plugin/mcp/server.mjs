#!/usr/bin/env node
// MCP server (stdio, JSON-RPC 2.0, no dependencies) exposing the ITSM engine tools to any MCP client:
// Claude (via the plugin's .mcp.json), GitHub Copilot in VS Code (.vscode/mcp.json), Copilot CLI.
// Workspace folder: ITSM_WORKSPACE env or ./itsm-workspace in the client's working directory.
import readline from 'node:readline';
import { Workspace } from '../lib/workspace.mjs';
import { ITSM_TOOLS, runItsmTool } from '../lib/tools.mjs';

const ws = new Workspace(process.env.ITSM_WORKSPACE || 'itsm-workspace');
const send = m => process.stdout.write(JSON.stringify(m) + '\n');
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', async line => {
  if (!line.trim()) return;
  let msg; try { msg = JSON.parse(line); } catch { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
  const { id, method, params } = msg;
  if (id === undefined) return; // notification (e.g. notifications/initialized)
  try {
    if (method === 'initialize') return send({ jsonrpc: '2.0', id, result: { protocolVersion: params?.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'itsm-engine', version: '0.3.0' },
      instructions: 'ITSM Dashboard Kit engine. Workflow: itsm_status → itsm_scan → itsm_profile → itsm_propose_spec → (confirm/patch) → itsm_build → itsm_verify → itsm_findings. Numbers only from these tools.' } });
    if (method === 'ping') return send({ jsonrpc: '2.0', id, result: {} });
    if (method === 'tools/list') return send({ jsonrpc: '2.0', id, result: { tools: ITSM_TOOLS.map(t => ({ name: t.name, description: t.description, inputSchema: t.parameters })) } });
    if (method === 'tools/call') {
      const r = await runItsmTool(ws, params.name, params.arguments);
      return send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(r, null, 1) }], isError: !!r?.error } });
    }
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (e) { send({ jsonrpc: '2.0', id, error: { code: -32603, message: e.message } }); }
});
