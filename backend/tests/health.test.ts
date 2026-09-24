import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('app without a frontend build', () => {
  const app = createApp({ frontendDist: path.join(os.tmpdir(), 'lucky-spin-missing-dist') });

  it('GET /healthz returns 200', async () => {
    const response = await request(app).get('/healthz');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('sets security headers', async () => {
    const response = await request(app).get('/healthz');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('unknown /api route returns 404 in the SOP error shape', async () => {
    const response = await request(app).get('/api/x');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, message: 'Route not found' });
  });

  it('malformed JSON body returns 400 without echoing parser internals', async () => {
    const response = await request(app)
      .post('/api/x')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: 'Invalid JSON body' });
  });

  it('JSON body over 10kb returns 413', async () => {
    const response = await request(app)
      .post('/api/x')
      .send({ padding: 'a'.repeat(11 * 1024) });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({ success: false, message: 'Request body too large' });
  });
});

describe('app with a frontend build', () => {
  let frontendDist = '';

  beforeAll(() => {
    frontendDist = fs.mkdtempSync(path.join(os.tmpdir(), 'lucky-spin-dist-'));
    fs.writeFileSync(path.join(frontendDist, 'index.html'), '<!doctype html><title>spa</title>');
    fs.writeFileSync(path.join(frontendDist, 'app.js'), 'export {};');
  });

  afterAll(() => {
    fs.rmSync(frontendDist, { recursive: true, force: true });
  });

  it('serves static assets', async () => {
    const response = await request(createApp({ frontendDist })).get('/app.js');

    expect(response.status).toBe(200);
    expect(response.text).toBe('export {};');
  });

  it('falls back to index.html for client-side routes', async () => {
    const response = await request(createApp({ frontendDist })).get('/booth/admin');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('<title>spa</title>');
  });

  it('does not fall back to index.html for unknown /api routes', async () => {
    const response = await request(createApp({ frontendDist })).get('/api/x');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, message: 'Route not found' });
  });
});
