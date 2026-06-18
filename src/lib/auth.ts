/**
 * Resolve the ImaginePDF API key and base URL.
 *
 * Both come from environment variables: export `IMAGINEPDF_API_KEY` (and,
 * optionally, `IMAGINEPDF_API_URL`) in your shell BEFORE launching `claude` — a
 * session that's already running won't pick up a later export. The base URL
 * defaults to production.
 */

const DEFAULT_API_URL = 'https://api.imaginepdf.com';

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function getApiKey(): string {
  const key = readEnv('IMAGINEPDF_API_KEY');
  if (key) return key;

  console.error(
    'ImaginePDF API key not configured.\n\n' +
      'Set it before launching Claude:\n' +
      '  export IMAGINEPDF_API_KEY=pc_live_...\n' +
      '  claude\n\n' +
      'Create a key in the ImaginePDF dashboard: Settings → API Keys.\n',
  );
  process.exit(1);
}

export function getApiUrl(): string {
  return readEnv('IMAGINEPDF_API_URL') ?? DEFAULT_API_URL;
}
