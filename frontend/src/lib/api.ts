/**
 * Minimal API client.
 *
 * The frontend has no sign-in screen yet, so the access token is read from
 * `localStorage` under `AUTH_TOKEN_KEY`. That is a placeholder, not a decision:
 * the task that builds authentication should replace it, and should weigh
 * keeping the token out of JavaScript's reach entirely.
 */

export const AUTH_TOKEN_KEY = 'axa-admin.accessToken';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function readToken(): string | null {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies).
    return null;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();

    if (body && typeof body === 'object' && 'message' in body) {
      const { message } = body as { message: unknown };

      return Array.isArray(message) ? message.join(', ') : String(message);
    }
  } catch {
    // Fall through to the status text.
  }

  return response.statusText || `Request failed with status ${response.status}`;
}
