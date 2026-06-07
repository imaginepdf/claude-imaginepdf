/**
 * Resolve the ImaginePDF API key and base URL.
 *
 * Primary source is Claude Code plugin `userConfig` (set via `/plugin`), which
 * Claude Code exposes to plugin subprocesses as `CLAUDE_PLUGIN_OPTION_<KEY>`
 * environment variables. The sensitive key is stored in the OS keychain, never
 * on disk. For local development you can instead export `IMAGINEPDF_API_KEY` /
 * `IMAGINEPDF_API_URL` directly.
 */

const DEFAULT_API_URL = 'https://api.imaginepdf.com';

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

export function getApiKey(): string {
  const key = firstEnv(
    'CLAUDE_PLUGIN_OPTION_API_KEY',
    'CLAUDE_PLUGIN_OPTION_APIKEY',
    'IMAGINEPDF_API_KEY',
  );
  if (key) return key;

  console.error(
    'ImaginePDF API key not configured.\n\n' +
      'Configure the plugin: run /plugin, open ImaginePDF, and set your API key.\n' +
      'Create a key in the ImaginePDF dashboard: Settings → API Keys.\n' +
      '(For local dev you can instead export IMAGINEPDF_API_KEY.)\n',
  );
  process.exit(1);
}

export function getApiUrl(): string {
  return (
    firstEnv(
      'CLAUDE_PLUGIN_OPTION_API_BASE_URL',
      'CLAUDE_PLUGIN_OPTION_APIBASEURL',
      'IMAGINEPDF_API_URL',
    ) ?? DEFAULT_API_URL
  );
}
