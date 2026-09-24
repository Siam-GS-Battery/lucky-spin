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

test('APP_PASSWORD guards everything except /healthz', async () => {
  const s = await start({ password: 'pw' });
  assert.equal((await fetch(s.base + '/')).status, 401);
  assert.equal((await fetch(s.base + '/api/players')).status, 401);
  assert.equal((await fetch(s.base + '/healthz')).status, 200);
  const auth = { headers: { authorization: 'Basic ' + Buffer.from('booth:pw').toString('base64') } };
  assert.equal((await fetch(s.base + '/', auth)).status, 200);
  s.close();
});
