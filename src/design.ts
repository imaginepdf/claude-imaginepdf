/**
 * design.cjs — author ImaginePDF designs via the public `/api/v1` surface.
 *
 *   tools                                  — list the authoring tool catalog
 *   create  '{"name":"Invoice","description":"…","tools":[{"tool":"…","input":{…}}]}'
 *   get     '{"designId":"…"}'
 *   list    '{}'
 *   patch   '{"designId":"…","name":"…","description":"…","tools":[{"tool":"…","input":{…}}]}'
 *   preview '{"designId":"…","page":0}'              — render a page to a PNG you can read
 *   placeholder '{"name":"Company logo","label":"LOGO","width":200,"height":80}'
 *   upload  '{"file":"/path/logo.png","name":"Logo"}'             — add a new image asset
 *   upload  '{"file":"/path/logo.png","assetId":"<placeholder-id>"}' — replace in place
 *
 * The `patch` subcommand is how a design is built/edited: it sends an ordered
 * batch of TOOL CALLS (`add_element` / `update_element` / `remove_element` /
 * `add_page` / `bind_variable` / …). The server (pdftreejs, the tool authority)
 * applies them to the design tree and persists it. Run `tools` first to get the
 * authoritative catalog + input shapes.
 */

import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { getApiKey, getApiUrl } from './lib/auth.js';
import { createApiClient } from './lib/api-client.js';

async function main() {
  const [subcommand, jsonArg] = process.argv.slice(2);
  if (!subcommand) {
    console.error(
      "Usage: design.cjs <tools|create|get|list|patch|preview|placeholder|upload> '<json>'",
    );
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
    case 'preview': {
      // Render a page to a PNG, download it locally, and print the path so the
      // agent can Read it and critique the layout before generating.
      if (!args.designId) throw new Error('designId is required');
      const page = args.page ?? 0;
      const result = await api.get<{ previewUrl: string; expiresIn: number; page: number }>(
        `/api/v1/preview?design=${encodeURIComponent(args.designId)}&page=${encodeURIComponent(page)}`,
      );
      const dest = join(
        tmpdir(),
        `imaginepdf-preview-${args.designId}-p${page}-${Date.now()}.png`,
      );
      await api.download(result.previewUrl, dest);
      console.log(JSON.stringify({ ...result, localPath: dest }));
      break;
    }
    case 'placeholder': {
      // Mint a labeled placeholder image the user can replace later (via
      // `upload` with this asset's id). Returns `{ id, ref, isPlaceholder }`;
      // use `ref` (assets:<id>) as an image element's data.src.
      if (!args.name) throw new Error('name is required');
      const result = await api.post<unknown>('/api/v1/assets/placeholder', {
        name: args.name,
        ...(args.label !== undefined ? { label: args.label } : {}),
        ...(args.width !== undefined ? { width: args.width } : {}),
        ...(args.height !== undefined ? { height: args.height } : {}),
      });
      console.log(JSON.stringify(result));
      break;
    }
    case 'upload': {
      // Upload a local image. With `assetId`, replaces that asset's bytes in
      // place (the assets:<id> ref is unchanged — no rebind). Without it,
      // creates a new asset and returns its ref.
      if (!args.file) throw new Error('file (local path) is required');
      const buf = await readFile(args.file);
      const form = new FormData();
      form.append('file', new Blob([buf]), basename(args.file));
      if (args.name) form.append('name', String(args.name));
      const result = args.assetId
        ? await api.putForm<unknown>(
            `/api/v1/assets/${encodeURIComponent(args.assetId)}/content`,
            form,
          )
        : await api.postForm<unknown>('/api/v1/assets', form);
      console.log(JSON.stringify(result));
      break;
    }
    default:
      console.error(
        `Unknown subcommand: ${subcommand}. Use: tools, create, get, list, patch, preview, placeholder, upload`,
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
