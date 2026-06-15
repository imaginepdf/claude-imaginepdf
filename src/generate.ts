/**
 * generate.cjs — render PDFs from an ImaginePDF design.
 *
 *   generate       '{"designId":"…","data":{"<variable_name>":"<value>"}}'
 *   batch          '{"designId":"…","rows":[{"<variable_name>":"<value>"}, …]}'
 *   batch-status   '{"jobId":"…"}'
 *   batch-download '{"jobId":"…"}'
 *
 * `data` / each `rows[]` entry is keyed by variable NAME (the labels bound via
 * the design `bind_variables` op). `generate` returns a presigned `downloadUrl`;
 * `batch` returns a `jobId` to poll with `batch-status`, then `batch-download`
 * for the zip. Batch requires the workspace's plan to include batch generation.
 */

import { getApiKey, getApiUrl } from './lib/auth.js';
import { createApiClient } from './lib/api-client.js';

/**
 * A generate-time image value must be an `assets:<id>` ref — never inline
 * `data:` bytes (upload the image first, then pass its ref). Drop any inline
 * blob so we never ship a whole base64 image in the request; the server renders
 * the design's own image when a field is omitted.
 */
function stripInlineImages(values: unknown): unknown {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return values;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values as Record<string, unknown>)) {
    if (typeof v === 'string' && v.startsWith('data:')) {
      console.error(`[imaginepdf] dropping inline data: image for '${k}' — pass an assets:<id> ref (upload first)`);
      continue;
    }
    out[k] = v;
  }
  return out;
}

async function main() {
  const [subcommand, jsonArg] = process.argv.slice(2);
  const valid = ['generate', 'batch', 'batch-status', 'batch-download'];
  if (!subcommand || !valid.includes(subcommand)) {
    console.error(
      "Usage: generate.cjs <generate|batch|batch-status|batch-download> '<json>'",
    );
    process.exit(1);
  }

  const args = jsonArg ? JSON.parse(jsonArg) : {};
  const api = createApiClient(getApiKey(), getApiUrl());

  switch (subcommand) {
    case 'generate': {
      if (!args.designId) throw new Error('designId is required');
      const result = await api.post<unknown>(
        `/api/v1/generate?design=${encodeURIComponent(args.designId)}`,
        { data: stripInlineImages(args.data || {}) },
      );
      console.log(JSON.stringify(result));
      break;
    }
    case 'batch': {
      if (!args.designId) throw new Error('designId is required');
      if (!Array.isArray(args.rows) || args.rows.length === 0) {
        throw new Error('rows must be a non-empty array of { variable_name: value } objects');
      }
      const result = await api.post<unknown>(
        `/api/v1/batch/generate?design=${encodeURIComponent(args.designId)}`,
        { rows: args.rows.map(stripInlineImages) },
      );
      console.log(JSON.stringify(result));
      break;
    }
    case 'batch-status': {
      if (!args.jobId) throw new Error('jobId is required');
      const result = await api.get<unknown>(
        `/api/v1/batch/${encodeURIComponent(args.jobId)}/status`,
      );
      console.log(JSON.stringify(result));
      break;
    }
    case 'batch-download': {
      if (!args.jobId) throw new Error('jobId is required');
      const result = await api.get<unknown>(
        `/api/v1/batch/${encodeURIComponent(args.jobId)}/download`,
      );
      console.log(JSON.stringify(result));
      break;
    }
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
