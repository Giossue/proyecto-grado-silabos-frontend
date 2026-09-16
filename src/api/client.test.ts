import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/client';

const jsonResponse = (status: number, payload: unknown = {}): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('cliente API', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
    vi.restoreAllMocks();
  });

  it('prepara CSRF antes de una mutación y envía la cookie decodificada', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      if (String(input).endsWith('/sanctum/csrf-cookie')) {
        document.cookie = 'XSRF-TOKEN=token%20seguro; path=/';
        return new Response(null, { status: 204 });
      }

      return jsonResponse(200, { saved: true });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api<{ saved: boolean }>('/resource', { method: 'POST', body: '{}' }))
      .resolves.toEqual({ saved: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({ 'X-XSRF-TOKEN': 'token seguro' });
  });

  it('renueva CSRF y reintenta una sola vez ante 419', async () => {
    document.cookie = 'XSRF-TOKEN=anterior; path=/';
    let apiAttempts = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      if (String(input).endsWith('/sanctum/csrf-cookie')) {
        document.cookie = 'XSRF-TOKEN=nuevo; path=/';
        return new Response(null, { status: 204 });
      }

      apiAttempts += 1;
      return apiAttempts === 1 ? jsonResponse(419, { message: 'CSRF expirado' }) : jsonResponse(200, { saved: true });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api<{ saved: boolean }>('/resource', { method: 'PATCH', body: '{}' }))
      .resolves.toEqual({ saved: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('notifica globalmente cuando la sesión dejó de ser válida', async () => {
    const listener = vi.fn();
    window.addEventListener('silabos:unauthorized', listener, { once: true });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { message: 'No autenticado.' })));

    await expect(api('/session')).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledOnce();
  });
});
