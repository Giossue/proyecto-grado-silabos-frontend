export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

const baseUrl = (
  window.__SILABOS_CONFIG__?.apiUrl ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000'
).replace(/\/$/, '');

const readCookie = (name: string): string | null => {
  const prefix = `${name}=`;
  const value = document.cookie.split('; ').find((cookie) => cookie.startsWith(prefix));

  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
};

export async function initializeCsrfProtection(): Promise<void> {
  const response = await fetch(`${baseUrl}/sanctum/csrf-cookie`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new ApiError('No se pudo preparar la sesión segura.', response.status);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const csrfToken = method === 'GET' || method === 'HEAD' ? null : readCookie('XSRF-TOKEN');
  const isFormData = init.body instanceof FormData;
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
      ...init.headers,
    },
    ...init,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    errors?: Record<string, string[]>;
  };

  if (!response.ok) {
    throw new ApiError(payload.message ?? 'No se pudo completar la solicitud.', response.status, payload.errors);
  }

  return payload as T;
}

export async function apiBlob(path: string): Promise<Blob> {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    credentials: 'include',
    headers: { Accept: 'application/octet-stream' },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new ApiError(payload.message ?? 'No se pudo descargar el archivo.', response.status);
  }

  return response.blob();
}
