import { translateApiError } from './errors';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

const TOKEN_KEY = 'brasa_access_token';
const USER_KEY = 'brasa_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function clearStoredSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let rawMessage: string | string[] | undefined;
    try {
      const body = (await response.json()) as {
        message?: string | string[];
      };
      rawMessage = body.message;
    } catch {
      // ignore non-JSON body
    }
    const message = translateApiError(rawMessage, response.status);
    if (response.status === 401 && path !== '/auth/login') {
      clearStoredSession();
      window.location.href = '/login';
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (val: string | number) => {
    const str = String(val ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
