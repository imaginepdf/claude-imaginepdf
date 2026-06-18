/**
 * design.cjs — author ImaginePDF designs via the public `/api/v1` surface.
 *
 *   actions                                — list the authoring action catalog
 *   fonts                                  — list the font catalog
 *   create  '{"name":"Invoice","size":"A4","orientation":"portrait","description":"…"}' — allocate a design, returns designId
 *   get     '{"designId":"…"}'             — design METADATA (name/description/timestamps; NOT the tree)
 *   tree    '{"designId":"…"}'             — the full design tree (raw JSON) — inspect before editing
 *   list    '{}'
 *   patch   '{"designId":"…","actions":[{"type":"…","args":{…}}]}' — apply an authoring actions batch
 *   update  '{"designId":"…","name":"…","description":"…"}'        — rename / re-describe (metadata only)
 *   preview '{"designId":"…","page":0}'    — render a page to a PNG you can read
 *   upload  '{"file":"/path/logo.png","name":"Logo"}'  — upload an image (≤1 MB) → uploads:<id>
 *   upload  '{"svg":"<svg …>","name":"Logo"}'          — upload authored SVG markup → uploads:<id>
 *
 * Creation and authoring are SEPARATE: `create` allocates the design and its
 * first page — name + optional description + paper format (`size`:
 * A4|A3|A5|Letter|Legal, default A4; `orientation`: portrait|landscape, default
 * portrait) — and returns a `designId`. Set `size`/`orientation` here to make a
 * landscape or larger-format document; the first page is born correct (don't
 * flip it afterwards). `create` does NOT accept actions.
 *
 * `patch` is how a design is built/edited: it sends an ordered batch of ACTIONS
 * (`add_element` / `update_element` / `remove_element` / `reorder_element` /
 * `bind_variable` / `add_page` / …) to the TREE. Each action operates on ONE
 * element; the server (pdftreejs, the action authority) folds them over the tree
 * one by one (`tree + action → tree`) and persists the result atomically. Use
 * `update` for design name/description (it never touches the tree). Run `actions`
 * first to get the authoritative catalog + args shapes.
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
      "Usage: design.cjs <actions|fonts|create|get|tree|list|patch|update|preview|upload> '<json>'",
    );
    process.exit(1);
  }

  const args = jsonArg ? JSON.parse(jsonArg) : {};
  const api = createApiClient(getApiKey(), getApiUrl());
  const designId = () => {
    if (!args.designId) throw new Error('designId is required');
    return encodeURIComponent(args.designId);
  };

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
      // Create ALLOCATES the design + its first page (name + optional
      // description + paper format) and returns a designId. `size`
      // (A4|A3|A5|Letter|Legal, default A4) and `orientation`
      // (portrait|landscape, default portrait) set the first page's dimensions
      // at birth — this is how you make a landscape/A3/Letter document.
      // Element authoring is separate — send your layout via `patch`. The
      // server rejects `actions` on create.
      if (!args.name) throw new Error('name is required');
      const result = await api.post<unknown>('/api/v1/designs', {
        name: args.name,
        ...(args.description !== undefined ? { description: args.description } : {}),
        ...(args.size !== undefined ? { size: args.size } : {}),
        ...(args.orientation !== undefined ? { orientation: args.orientation } : {}),
      });
      console.log(JSON.stringify(result));
      break;
    }
    case 'get': {
      // Design METADATA only (name, description, timestamps) — cheap. Use `tree`
      // to fetch the actual layout.
      const result = await api.get<unknown>(`/api/v1/designs/${designId()}`);
      console.log(JSON.stringify(result));
      break;
    }
    case 'tree': {
      // The full design tree as RAW JSON (not the {status,data} envelope) —
      // inspect it before sending a `patch`.
      const result = await api.getRaw<unknown>(`/api/v1/designs/${designId()}/tree`);
      console.log(JSON.stringify(result));
      break;
    }
    case 'list': {
      const result = await api.get<unknown>('/api/v1/designs');
      console.log(JSON.stringify(result));
      break;
    }
    case 'patch': {
      // Apply an ordered authoring actions batch to the TREE. (Use `update` for
      // name/description — this endpoint is tree-only.)
      if (!Array.isArray(args.actions) || args.actions.length === 0) {
        throw new Error('actions must be a non-empty array of { type, args } objects');
      }
      const result = await api.patch<unknown>(
        `/api/v1/designs/${designId()}/tree`,
        { actions: args.actions },
      );
      console.log(JSON.stringify(result));
      break;
    }
    case 'update': {
      // Rename / re-describe the design (metadata only — never touches the tree).
      const body: Record<string, unknown> = {};
      if (args.name !== undefined) body.name = args.name;
      if (args.description !== undefined) body.description = args.description;
      if (Object.keys(body).length === 0) {
        throw new Error('provide at least one of: name, description');
      }
      const result = await api.patch<unknown>(`/api/v1/designs/${designId()}`, body);
      console.log(JSON.stringify(result));
      break;
    }
    case 'preview': {
      // Render a page to a PNG, download it locally, and print the path so the
      // agent can Read it and critique the layout before generating.
      const page = args.page ?? 0;
      const result = await api.get<{ previewUrl: string; expiresIn: number; page: number }>(
        `/api/v1/designs/${designId()}/preview?page=${encodeURIComponent(page)}`,
      );
      const dest = join(
        tmpdir(),
        `imaginepdf-preview-${args.designId}-p${page}-${Date.now()}.png`,
      );
      await api.download(result.previewUrl, dest);
      console.log(JSON.stringify({ ...result, localPath: dest }));
      break;
    }
    case 'upload': {
      // Upload an image (≤1 MB) to the `uploads` collection (agent images never
      // pollute the user's asset library). Sources: `file` (local path) or `svg`
      // (inline SVG markup — authored artwork without a temp file). Returns
      // `{ uploadId, ref, … }`; use `ref` (uploads:<id>) as an image's data.src.
      if (!args.file && !args.svg) throw new Error('file (local path) or svg (inline markup) is required');
      const MIME_BY_EXT: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        webp: 'image/webp', svg: 'image/svg+xml',
      };
      let blob: Blob;
      let filename: string;
      if (args.svg) {
        blob = new Blob([String(args.svg)], { type: 'image/svg+xml' });
        filename = `${String(args.name || 'artwork').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`;
      } else {
        const buf = await readFile(args.file);
        filename = basename(args.file);
        const ext = filename.split('.').pop()?.toLowerCase() ?? '';
        blob = new Blob([buf], { type: MIME_BY_EXT[ext] ?? 'application/octet-stream' });
      }
      const form = new FormData();
      form.append('file', blob, filename);
      if (args.name) form.append('name', String(args.name));
      const result = await api.postForm<unknown>('/api/v1/uploads', form);
      console.log(JSON.stringify(result));
      break;
    }
    default:
      console.error(
        `Unknown subcommand: ${subcommand}. Use: actions, fonts, create, get, tree, list, patch, update, preview, upload`,
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
