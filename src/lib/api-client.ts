/**
 * Minimal HTTP client for the ImaginePDF public API (`/api/v1`).
 *
 * Auth is the workspace API key on the `X-API-Key` header. The workspace is
 * resolved server-side from the key — the plugin never needs a workspace id.
 * Every response uses the canonical `{ status, data, error }` envelope.
 */

interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
}

async function request<T>(
  apiKey: string,
  apiUrl: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${apiUrl}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let json: ApiResponse<T>;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`API returned non-JSON response: HTTP ${response.status} ${response.statusText}`);
  }

  if (!response.ok || json.error) {
    const msg = json.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(msg);
  }

  return json.data as T;
}

export function createApiClient(apiKey: string, apiUrl: string) {
  return {
    get: <T>(path: string) => request<T>(apiKey, apiUrl, 'GET', path),
    post: <T>(path: string, body?: unknown) => request<T>(apiKey, apiUrl, 'POST', path, body),
    patch: <T>(path: string, body?: unknown) => request<T>(apiKey, apiUrl, 'PATCH', path, body),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
