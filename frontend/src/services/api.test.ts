import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, NETWORK_ERROR_STATUS, request } from './api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('Expected the request to reject');
}

describe('api service', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('returns data from a success envelope and sends same-origin credentials', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { booth: 'A' } }));

    const data = await api.get<{ booth: string }>('/api/auth/me');

    expect(data).toEqual({ booth: 'A' });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/auth/me');
    expect(init?.method).toBe('GET');
    expect(init?.credentials).toBe('same-origin');
    expect(init?.body).toBeUndefined();
  });

  it('serialises a JSON body on POST', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { id: 1 } }, 201));

    await api.post('/api/spins', { playerId: 'p-1' });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ playerId: 'p-1' }));
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
  });

  it('throws ApiError with status, message and field errors from an error envelope', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'username', message: 'Required' }, { bogus: true }],
        },
        400
      )
    );

    const error = await captureError(api.post('/api/auth/login', {}));

    expect(error.status).toBe(400);
    expect(error.message).toBe('Validation failed');
    expect(error.errors).toEqual([{ field: 'username', message: 'Required' }]);
    expect(error.isUnauthorized).toBe(false);
  });

  it('throws a 401 ApiError for the caller to handle', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false, message: 'Unauthorized' }, 401));

    const error = await captureError(api.get('/api/players'));

    expect(error.status).toBe(401);
    expect(error.isUnauthorized).toBe(true);
    expect(error.errors).toEqual([]);
  });

  it('throws a network ApiError when fetch rejects', async () => {
    const cause = new TypeError('Failed to fetch');
    fetchMock.mockRejectedValue(cause);

    const error = await captureError(api.get('/api/players'));

    expect(error.status).toBe(NETWORK_ERROR_STATUS);
    expect(error.isNetworkError).toBe(true);
    expect(error.cause).toBe(cause);
  });

  it('throws when a non-2xx response has no SOP body', async () => {
    fetchMock.mockResolvedValue(
      new Response('Bad Gateway', { status: 502, statusText: 'Bad Gateway' })
    );

    const error = await captureError(request('/api/prizes'));

    expect(error.status).toBe(502);
    expect(error.message).toBe('Bad Gateway');
  });

  it('throws when a 2xx response is not the SOP success shape', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ booth: 'A' }));

    const error = await captureError(request('/api/auth/me'));

    expect(error.status).toBe(200);
    expect(error.message).toBe('Invalid server response');
  });
});
