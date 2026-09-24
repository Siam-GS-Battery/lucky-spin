// Proxy: hides the Apps Script URL, adds the token, maps upstream failure to 502, enforces the password.
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { createApp } = require('./server');

const URL_ = 'https://script.google.com/macros/s/SECRET/exec';
async function start(opts) {
  const calls = [];
  const fetchFn = opts.fetchFn || (async (url, init = {}) => { calls.push({ url, init }); return new Response('{"ok":true}'); });
  const srv = http.createServer(createApp({ scriptUrl: URL_, token: 'tk', ...opts, fetchFn })).listen(0);
  await new Promise(r => srv.once('listening', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  return { base, calls, close: () => srv.close() };
}

test('page does not leak the Apps Script URL', async () => {
  const s = await start({});
  const html = await (await fetch(s.base + '/?booth=A')).text();
  assert.ok(html.includes('const ENV = {"proxy":true}'));
  assert.ok(!html.includes('SECRET'));
  s.close();
});

test('players and post forward with token', async () => {
  const s = await start({});
  assert.deepEqual(await (await fetch(s.base + '/api/players?sheet=Auto%20Feedback')).json(), { ok: true });
  const u = new URL(s.calls[0].url);
  assert.equal(u.searchParams.get('sheet'), 'Auto Feedback');
  assert.equal(u.searchParams.get('token'), 'tk');
  await fetch(s.base + '/api/post', { method: 'POST', body: JSON.stringify({ action: 'play', id: 'row-2', prize: 'x' }) });
  assert.deepEqual(JSON.parse(s.calls[1].init.body), { action: 'play', id: 'row-2', prize: 'x', token: 'tk' });
  assert.equal((await fetch(s.base + '/api/post', { method: 'POST', body: '{"action":"drop"}' })).status, 400);
  s.close();
});

test('upstream failure returns 502 so the page queues the result', async () => {
  const s = await start({ fetchFn: async () => { throw new Error('network down'); } });
  const r = await fetch(s.base + '/api/post', { method: 'POST', body: '{"action":"play"}' });
  assert.equal(r.status, 502);
  s.close();
});

test('login issues a 4 h JWT cookie and guards the app', async () => {
  let t = Date.parse('2026-10-01T12:00:00Z');
  const s = await start({ password: 'pw', jwtSecret: 'sec', now: () => t });
  const opt = { redirect: 'manual' };
  const r0 = await fetch(s.base + '/?booth=A', opt);
  assert.equal(r0.status, 303);
  assert.equal(r0.headers.get('location'), '/login?next=%2F%3Fbooth%3DA');
  assert.equal((await fetch(s.base + '/api/players', opt)).status, 401);
  assert.equal((await fetch(s.base + '/healthz', opt)).status, 200);
  assert.equal((await fetch(s.base + '/login', opt)).status, 200);

  const form = (u, p, next = '/?booth=A') => fetch(s.base + '/login', { ...opt, method: 'POST', body: new URLSearchParams({ username: u, password: p, next }) });
  const bad = await form('booth', 'nope');
  assert.match(bad.headers.get('location'), /^\/login\?e=bad/);
  assert.equal(bad.headers.get('set-cookie'), null);

  const ok = await form('booth', 'pw');
  assert.equal(ok.headers.get('location'), '/?booth=A');
  const setCookie = ok.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly; SameSite=Strict; Max-Age=14400/);
  const cookie = setCookie.split(';')[0];
  assert.equal((await fetch(s.base + '/?booth=A', { ...opt, headers: { cookie } })).status, 200);
  assert.equal((await fetch(s.base + '/api/players', { headers: { cookie } })).status, 200);

  const tampered = cookie.slice(0, -2) + (cookie.endsWith('A') ? 'BB' : 'AA');
  assert.equal((await fetch(s.base + '/', { ...opt, headers: { cookie: tampered } })).status, 303);

  t += 4 * 3600 * 1000; // exactly 4 h later: expired
  const exp = await fetch(s.base + '/', { ...opt, headers: { cookie } });
  assert.match(exp.headers.get('location'), /e=expired/);
  assert.equal((await fetch(s.base + '/api/players', { headers: { cookie } })).status, 401);
  s.close();
});

test('open redirect blocked and repeated failures lock out', async () => {
  const s = await start({ password: 'pw', jwtSecret: 'sec' });
  const opt = { redirect: 'manual', method: 'POST' };
  const ok = await fetch(s.base + '/login', { ...opt, body: new URLSearchParams({ username: 'booth', password: 'pw', next: '//evil.com' }) });
  assert.equal(ok.headers.get('location'), '/');
  const bs = await fetch(s.base + '/login', { ...opt, body: new URLSearchParams({ username: 'booth', password: 'pw', next: '/\\evil.com' }) });
  assert.equal(bs.headers.get('location'), '/');
  for (let i = 0; i < 10; i++) await fetch(s.base + '/login', { ...opt, body: new URLSearchParams({ username: 'x', password: 'y' }) });
  const locked = await fetch(s.base + '/login', { ...opt, body: new URLSearchParams({ username: 'booth', password: 'pw' }) });
  assert.equal(locked.headers.get('location'), '/login?e=locked');
  s.close();
});

test('JWT with alg none or wrong secret is rejected', () => {
  const { signJwt, verifyJwt } = require('./server');
  const now = 1000, good = signJwt({ sub: 'booth', exp: now + 10 }, 'k');
  assert.equal(verifyJwt(good, 'k', now).sub, 'booth');
  assert.equal(verifyJwt(good, 'other', now), null);
  const none = Buffer.from('{"alg":"none"}').toString('base64url') + '.' + good.split('.')[1] + '.';
  assert.equal(verifyJwt(none, 'k', now), null);
});
