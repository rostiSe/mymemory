import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { z } from 'zod';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Dev client / native: Metro serves API routes at the packager host.
 * Web: same origin as the tab — use relative `/api/...` so requests hit the Expo web server.
 */
export function getApiBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return '';
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    return `http://${hostUri}`;
  }
  return 'http://localhost:8081';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

export async function fetchApi<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const token = 'mock-auth-token';

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const raw = await res.text();
  let json: unknown;
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    throw new ApiError(
      raw.slice(0, 120) || 'Server returned non-JSON (is the API route running?)',
      res.status,
    );
  }

  if (!res.ok || (typeof json === 'object' && json !== null && (json as { success?: boolean }).success === false)) {
    const err =
      typeof json === 'object' && json !== null && 'error' in json
        ? String((json as { error?: string }).error)
        : 'API request failed';
    throw new ApiError(err, res.status);
  }

  return schema.parse(json);
}
