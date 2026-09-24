import type { ApiErrorResponse, FieldError, HttpMethod } from '../types/api.types';

/** Status used when the request never produced an HTTP response (offline, DNS, CORS, abort). */
export const NETWORK_ERROR_STATUS = 0;

const NETWORK_ERROR_MESSAGE = 'Network error';
const INVALID_RESPONSE_MESSAGE = 'Invalid server response';

/**
 * Error thrown by every API call that does not return `{ success: true }`.
 * A 401 is thrown like any other status; callers decide how to handle it (e.g. go to /login).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: FieldError[];

  constructor(status: number, message: string, errors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNetworkError(): boolean {
    return this.status === NETWORK_ERROR_STATUS;
  }
}

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFieldError(value: unknown): value is FieldError {
  return isRecord(value) && typeof value.field === 'string' && typeof value.message === 'string';
}

function isErrorResponse(value: unknown): value is ApiErrorResponse {
  return isRecord(value) && value.success === false && typeof value.message === 'string';
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * Calls a same-origin API endpoint and unwraps the SOP response envelope.
 * @returns the `data` field of a `{ success: true, data }` response
 * @throws {ApiError} on network failure, non-2xx status, or a body that is not the SOP shape
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const hasBody = body !== undefined;

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: hasBody
        ? { Accept: 'application/json', 'Content-Type': 'application/json' }
        : { Accept: 'application/json' },
      body: hasBody ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (cause) {
    const error = new ApiError(NETWORK_ERROR_STATUS, NETWORK_ERROR_MESSAGE);
    error.cause = cause;
    throw error;
  }

  const payload = await readJson(response);

  if (isErrorResponse(payload)) {
    const errors = Array.isArray(payload.errors) ? payload.errors.filter(isFieldError) : [];
    throw new ApiError(response.ok ? 500 : response.status, payload.message, errors);
  }

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText || INVALID_RESPONSE_MESSAGE);
  }

  if (!isRecord(payload) || payload.success !== true || !('data' in payload)) {
    throw new ApiError(response.status, INVALID_RESPONSE_MESSAGE);
  }

  return payload.data as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'POST', body, signal }),
};
