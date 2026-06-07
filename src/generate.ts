/**
 * generate.cjs — render a PDF from an ImaginePDF design.
 *
 *   generate '{"designId":"…","data":{"<variable_name>":"<value>"}}'
 *
 * `data` is OPTIONAL and is keyed by variable NAME (the labels shown in the
 * design's API panel / bound via the design-authoring `bindVariable` op).
 * Returns a short-lived presigned `downloadUrl`.
 */

import { getApiKey, getApiUrl } from './lib/auth.js';
import { createApiClient } from './lib/api-client.js';

async function main() {
  const [subcommand, jsonArg] = process.argv.slice(2);
  if (subcommand !== 'generate') {
    console.error("Usage: generate.cjs generate '{\"designId\":\"…\",\"data\":{…}}'");
    process.exit(1);
  }

  const args = jsonArg ? JSON.parse(jsonArg) : {};
  if (!args.designId) throw new Error('designId is required');

  const api = createApiClient(getApiKey(), getApiUrl());
  const result = await api.post<unknown>(
    `/api/v1/generate?design=${encodeURIComponent(args.designId)}`,
    { data: args.data || {} },
  );
  console.log(JSON.stringify(result));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
