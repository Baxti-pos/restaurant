import { clearAuth, getAuth } from './auth';

const API_BASE_URL =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL ?? '/api';

const extractErrorMessage = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as { message?: unknown };
  return typeof candidate.message === 'string' ? candidate.message : null;
};

export const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

export const buildQuery = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `?${query}` : '';
};

const baseRequest = async <T>(
  path: string,
  options: RequestInit = {},
  config?: { skipAuth?: boolean }
): Promise<T> => {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const auth = getAuth();

  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!config?.skipAuth && auth.token) {
    headers.set('Authorization', `Bearer ${auth.token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const raw = await response.text();
  let payload: unknown = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !config?.skipAuth) {
      clearAuth();
      window.location.reload();
    }

    throw new Error(extractErrorMessage(payload) ?? `So'rov bajarilmadi (${response.status})`);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
};

export const authRequest = <T>(path: string, options?: RequestInit) =>
  baseRequest<T>(path, options);

export const publicRequest = <T>(path: string, options?: RequestInit) =>
  baseRequest<T>(path, options, { skipAuth: true });
