/**
 * design.cjs — author ImaginePDF designs via the public `/api/v1` surface.
 *
 *   actions                                — list the authoring action catalog
 *   create  '{"name":"Invoice","description":"…","actions":[{"type":"…","args":{…}}]}'
 *   get     '{"designId":"…"}'
 *   list    '{}'
 *   patch   '{"designId":"…","name":"…","description":"…","actions":[{"type":"…","args":{…}}]}'
 *   preview '{"designId":"…","page":0}'              — render a page to a PNG you can read
 *   placeholder '{"name":"Company logo","label":"LOGO","width":200,"height":80}'
 *   upload  '{"file":"/path/logo.png","name":"Logo"}'             — add a new image asset
 *   upload  '{"file":"/path/logo.png","assetId":"<placeholder-id>"}' — replace in place
 *
 * The `patch` subcommand is how a design is built/edited: it sends an ordered
 * batch of ACTIONS (`add_element` / `update_element` / `remove_element` /
 * `reorder_element` / `bind_variable` / `add_page` / …). Each action operates
 * on ONE element; the server (pdftreejs, the action authority) folds them over
 * the design tree one by one (`tree + action → tree`) and persists the result
 * atomically. Run `actions` first to get the authoritative catalog + args shapes.
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
      "Usage: design.cjs <actions|fonts|create|get|list|patch|preview|placeholder|upload> '<json>'",
    );
    process.exit(1);
  }

  const args = jsonArg ? JSON.parse(jsonArg) : {};
  const api = createApiClient(getApiKey(), getApiUrl());

  switch (subcommand) {
    case 'actions': {
      const result = await api.get<unknown>('/api/v1/actions');
      console.log(JSON.stringify(result));
      break;
    }
    case 'fonts': {
      const result = await api.get<unknown>('/api/v1/fonts');
      console.log(JSON.stringify(result));
      break;
    }
    case 'create': {
      if (!args.name) throw new Error('name is required');
      const result = await api.post<unknown>('/api/v1/designs', {
        name: args.name,
        ...(args.description !== undefined ? { description: args.description } : {}),
        ...(args.actions !== undefined ? { actions: args.actions } : {}),
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
      if (args.actions !== undefined) body.actions = args.actions;
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
        `Unknown subcommand: ${subcommand}. Use: actions, create, get, list, patch, preview, placeholder, upload`,
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
