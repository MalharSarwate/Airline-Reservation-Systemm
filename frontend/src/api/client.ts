import { useSession } from '../store';
import type { Tokens } from '../types';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
let refreshing: Promise<void> | null = null;
async function renew() {
  const refreshToken = useSession.getState().refreshToken;
  if (!refreshToken) throw new ApiError(401, 'Please sign in to continue.');
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    useSession.getState().clear();
    throw new ApiError(401, 'Your session expired. Sign in again.');
  }
  useSession.getState().set((await response.json()) as Tokens);
}
export async function request(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  const token = useSession.getState().accessToken;
  const response = await fetch('/api' + path, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (
    response.status === 401 &&
    retry &&
    !path.startsWith('/auth/') &&
    useSession.getState().refreshToken
  ) {
    if (!refreshing)
      refreshing = renew().finally(() => {
        refreshing = null;
      });
    await refreshing;
    return request(path, init, false);
  }
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof data.message === 'string'
        ? data.message
        : response.status === 401
          ? 'Please sign in to continue.'
          : `Request failed (${response.status}). Please try again.`,
    );
  }
  return response;
}
export async function api<T>(
  path: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
): Promise<T> {
  const response = await request(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
export const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.';
