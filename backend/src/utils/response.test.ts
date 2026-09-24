import express, { type Request, type Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { created, ok, paginated } from './response.js';

const app = express();
app.get('/ok', (_req: Request, res: Response) => {
  ok(res, { id: 1 });
});
app.post('/created', (_req: Request, res: Response) => {
  created(res, { id: 2 });
});
app.get('/list', (_req: Request, res: Response) => {
  paginated(res, [{ id: 1 }], { page: 1, pageSize: 20, total: 1, totalPages: 1 });
});

describe('response helpers', () => {
  it('ok() sends 200 { success: true, data }', async () => {
    const response = await request(app).get('/ok');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { id: 1 } });
  });

  it('created() sends 201 { success: true, data }', async () => {
    const response = await request(app).post('/created');

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true, data: { id: 2 } });
  });

  it('paginated() adds pagination', async () => {
    const response = await request(app).get('/list');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [{ id: 1 }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
  });
});
