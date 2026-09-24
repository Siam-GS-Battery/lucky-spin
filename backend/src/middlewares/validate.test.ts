import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '../utils/errors.js';
import { validate } from './validate.js';

function buildRequest(parts: Partial<Pick<Request, 'body' | 'query' | 'params'>>): Request {
  return { body: undefined, query: {}, params: {}, ...parts } as Request;
}

const response = {} as Response;

describe('validate middleware', () => {
  const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    booth: z.enum(['A', 'B']),
  });

  it('calls next() with no error and replaces body with parsed data', () => {
    const request = buildRequest({ body: { username: 'booth', booth: 'A', extra: 'dropped' } });
    const next = vi.fn<(error?: unknown) => void>();

    validate({ body: loginSchema })(request, response, next);

    expect(next).toHaveBeenCalledWith();
    expect(request.body).toEqual({ username: 'booth', booth: 'A' });
  });

  it('forwards a ValidationError listing every invalid field', () => {
    const request = buildRequest({ body: { username: '', booth: 'C' } });
    const next = vi.fn<(error?: unknown) => void>();

    validate({ body: loginSchema })(request, response, next);

    const error: unknown = next.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(ValidationError);
    const validationError = error as ValidationError;
    expect(validationError.statusCode).toBe(400);
    expect(validationError.message).toBe('Validation failed');
    expect(validationError.errors.map((fieldError) => fieldError.field)).toEqual([
      'username',
      'booth',
    ]);
    expect(validationError.errors[0]?.message).toBe('Username is required');
  });

  it('uses the request part as field name when the whole value is invalid', () => {
    const request = buildRequest({ body: undefined });
    const next = vi.fn<(error?: unknown) => void>();

    validate({ body: z.string() })(request, response, next);

    const error = next.mock.calls[0]?.[0] as ValidationError;
    expect(error.errors).toEqual([{ field: 'body', message: expect.any(String) as string }]);
  });

  it('validates and coerces query and params', () => {
    const request = buildRequest({ query: { page: '2' }, params: { id: '7' } });
    const next = vi.fn<(error?: unknown) => void>();

    validate({
      query: z.object({ page: z.coerce.number().int() }),
      params: z.object({ id: z.coerce.number().int() }),
    })(request, response, next);

    expect(next).toHaveBeenCalledWith();
    expect(request.query).toEqual({ page: 2 });
    expect(request.params).toEqual({ id: 7 });
  });

  it('does not mutate the request when validation fails', () => {
    const originalBody = { username: 'booth', booth: 'A' };
    const request = buildRequest({ body: originalBody, params: { id: 'abc' } });
    const next = vi.fn<(error?: unknown) => void>();

    validate({ body: loginSchema, params: z.object({ id: z.coerce.number().int() }) })(
      request,
      response,
      next,
    );

    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
    expect(request.body).toBe(originalBody);
    expect(request.params).toEqual({ id: 'abc' });
  });
});
