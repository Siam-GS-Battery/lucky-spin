import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  UpstreamError,
  ValidationError,
} from '../utils/errors.js';
import { errorHandler } from './errorHandler.js';
import { validate } from './validate.js';

function appThatThrows(error: unknown): express.Express {
  const app = express();
  app.get('/boom', (_req: Request, _res: Response, next: NextFunction) => {
    next(error);
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [new UnauthorizedError(), 401, 'Unauthorized'],
    [new ForbiddenError(), 403, 'Forbidden'],
    [new NotFoundError('Player'), 404, 'Player not found'],
    [new ConflictError('Player already played'), 409, 'Player already played'],
    [new UpstreamError(), 502, 'Upstream service unavailable'],
  ])('maps %s to its status code and message', async (error, status, message) => {
    const response = await request(appThatThrows(error)).get('/boom');

    expect(response.status).toBe(status);
    expect(response.body).toEqual({ success: false, message });
  });

  it('includes field errors for ValidationError', async () => {
    const error = new ValidationError('Validation failed', [{ field: 'pin', message: 'Required' }]);

    const response = await request(appThatThrows(error)).get('/boom');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'pin', message: 'Required' }],
    });
  });

  it('returns a generic 500 and never echoes the internal message', async () => {
    const writeSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    const response = await request(appThatThrows(new Error('db password is hunter2'))).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: 'Internal server error' });
    expect(JSON.stringify(response.body)).not.toContain('hunter2');
    expect(writeSpy).toHaveBeenCalledOnce();
  });

  it('treats non-Error throwables as 500', async () => {
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    const response = await request(appThatThrows({ type: 'unknown.kind', status: 418 })).get(
      '/boom',
    );

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: 'Internal server error' });
  });

  it('renders validate() failures as the SOP 400 shape end to end', async () => {
    const app = express();
    app.use(express.json());
    app.post(
      '/login',
      validate({ body: z.object({ username: z.string().min(1, 'Username is required') }) }),
      (_req: Request, res: Response) => {
        res.json({ success: true, data: null });
      },
    );
    app.use(errorHandler);

    const response = await request(app).post('/login').send({ username: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'username', message: 'Username is required' }],
    });
  });
});
