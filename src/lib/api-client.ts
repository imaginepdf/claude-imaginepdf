/**
 * Minimal HTTP client for the ImaginePDF public API (`/api/v1`).
 *
 * Auth is the workspace API key on the `X-API-Key` header. The workspace is
 * resolved server-side from the key — the plugin never needs a workspace id.
 * Every response uses the canonical `{ status, data, error }` envelope.
 */

import { writeFile } from 'node:fs/promises';

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

  return unwrap<T>(response);
}

/**
 * RAW GET — returns the response body as-is, WITHOUT unwrapping the
 * `{status,data,error}` envelope. The design-tree endpoint
 * (`GET /api/v1/designs/:id/tree`) returns the raw tree on success; errors still
 * come back enveloped, so we surface `error.message` on a non-2xx.
 */
async function requestRaw<T>(apiKey: string, apiUrl: string, path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'GET',
    headers: { 'X-API-Key': apiKey },
  });
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error(`API returned non-JSON response: HTTP ${response.status} ${response.statusText}`);
  }
  if (!response.ok) {
    const msg =
      (json as ApiResponse<T>)?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(msg);
  }
  return json as T;
}

/**
 * Multipart request (file upload). Content-Type is intentionally NOT set —
 * fetch derives it (with the boundary) from the FormData body.
 */
async function requestForm<T>(
  apiKey: string,
  apiUrl: string,
  method: string,
  path: string,
  form: FormData,
): Promise<T> {
  const url = `${apiUrl}${path}`;
  const response = await fetch(url, {
    method,
    headers: { 'X-API-Key': apiKey },
    body: form,
  });
  return unwrap<T>(response);
}

async function unwrap<T>(response: Response): Promise<T> {
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

/**
 * Download a (presigned, absolute) URL to a local file. No API key — the URL
 * already carries its own signature. Used to pull a preview PNG so the agent
 * can read it.
 */
async function download(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: HTTP ${response.status} ${response.statusText}`);
  }
  const buf = Buffer.from(await response.arrayBuffer());
  await writeFile(destPath, buf);
}

export function createApiClient(apiKey: string, apiUrl: string) {
  return {
    get: <T>(path: string) => request<T>(apiKey, apiUrl, 'GET', path),
    getRaw: <T>(path: string) => requestRaw<T>(apiKey, apiUrl, path),
    post: <T>(path: string, body?: unknown) => request<T>(apiKey, apiUrl, 'POST', path, body),
    patch: <T>(path: string, body?: unknown) => request<T>(apiKey, apiUrl, 'PATCH', path, body),
    postForm: <T>(path: string, form: FormData) =>
      requestForm<T>(apiKey, apiUrl, 'POST', path, form),
    download,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
