/**
 * design.cjs — author ImaginePDF designs via the public `/api/v1` surface.
 *
 *   tools                                  — list the authoring tool catalog
 *   create  '{"name":"Invoice","description":"…","tools":[{"tool":"…","input":{…}}]}'
 *   get     '{"designId":"…"}'
 *   list    '{}'
 *   patch   '{"designId":"…","name":"…","description":"…","tools":[{"tool":"…","input":{…}}]}'
 *
 * The `patch` subcommand is how a design is built/edited: it sends an ordered
 * batch of TOOL CALLS (`add_element` / `update_element` / `remove_element` /
 * `add_page` / `bind_variable` / …). The server (pdftreejs, the tool authority)
 * applies them to the design tree and persists it. Run `tools` first to get the
 * authoritative catalog + input shapes.
 */

import { getApiKey, getApiUrl } from './lib/auth.js';
import { createApiClient } from './lib/api-client.js';

async function main() {
  const [subcommand, jsonArg] = process.argv.slice(2);
  if (!subcommand) {
    console.error("Usage: design.cjs <tools|create|get|list|patch> '<json>'");
    process.exit(1);
  }

  const args = jsonArg ? JSON.parse(jsonArg) : {};
  const api = createApiClient(getApiKey(), getApiUrl());

  switch (subcommand) {
    case 'tools': {
      const result = await api.get<unknown>('/api/v1/tools');
      console.log(JSON.stringify(result));
      break;
    }
    case 'create': {
      if (!args.name) throw new Error('name is required');
      const result = await api.post<unknown>('/api/v1/designs', {
        name: args.name,
        ...(args.description !== undefined ? { description: args.description } : {}),
        ...(args.tools !== undefined ? { tools: args.tools } : {}),
      });
      console.log(JSON.stringify(result));
      break;
    }
    case 'get': {
      if (!args.designId) throw new Error('designId is required');
      const result = await api.get<unknown>(`/api/v1/designs/${encodeURIComponent(args.designId)}`);
      console.log(JSON.stringify(result));
      break;
    }
    case 'list': {
      const result = await api.get<unknown>('/api/v1/designs');
      console.log(JSON.stringify(result));
      break;
    }
    case 'patch': {
      if (!args.designId) throw new Error('designId is required');
      const body: Record<string, unknown> = {};
      if (args.name !== undefined) body.name = args.name;
      if (args.description !== undefined) body.description = args.description;
      if (args.tools !== undefined) body.tools = args.tools;
      const result = await api.patch<unknown>(
        `/api/v1/designs/${encodeURIComponent(args.designId)}`,
        body,
      );
      console.log(JSON.stringify(result));
      break;
    }
    default:
      console.error(`Unknown subcommand: ${subcommand}. Use: tools, create, get, list, patch`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
