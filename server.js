// Serves index.html and proxies Google Sheet calls so the Apps Script URL and token stay on the server.
// Env: SCRIPT_GOOGLE_SHEET (Apps Script /exec URL), SCRIPT_TOKEN (matches Script Property TOKEN),
//      APP_PASSWORD (optional HTTP Basic auth for the whole site), PORT, HOST. No dependencies.
const http = require('http');
const fs = require('fs');
const path = require('path');

function createApp({ scriptUrl = '', token = '', password = '', fetchFn = fetch } = {}) {
  if (scriptUrl && !/^https:\/\/script\.google\.com\//.test(scriptUrl)) throw new Error('SCRIPT_GOOGLE_SHEET must start with https://script.google.com/');
  const env = JSON.stringify({ proxy: !!scriptUrl }).replace(/</g, '\\u003c');
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8').replace('/*LUCKY_ENV*/{}', env);
  const expectedAuth = password ? 'Basic ' + Buffer.from('booth:' + password).toString('base64') : '';

  const send = (res, code, body, type = 'application/json; charset=utf-8') =>
    res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(body);

  async function upstream(url, init) {
    const r = await fetchFn(url, { ...init, redirect: 'follow', signal: AbortSignal.timeout(25000) });
    if (!r.ok) throw new Error('Apps Script HTTP ' + r.status);
    return r.text();
  }

  return async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/healthz') return send(res, 200, 'ok', 'text/plain');
    if (expectedAuth && req.headers.authorization !== expectedAuth) {
      return res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Lucky Draw"' }).end();
    }
    try {
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return send(res, 200, html, 'text/html; charset=utf-8');
      if (!scriptUrl || !url.pathname.startsWith('/api/')) return send(res, 404, 'Not found', 'text/plain');

      if (req.method === 'GET' && url.pathname === '/api/players') {
        const q = new URLSearchParams({ sheet: url.searchParams.get('sheet') || '', token, t: Date.now() });
        return send(res, 200, await upstream(scriptUrl + '?' + q));
      }
      if (req.method === 'POST' && url.pathname === '/api/post') {
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (raw.length > 10000) return send(res, 413, '{"ok":false,"reason":"body too large"}'); }
        const body = JSON.parse(raw);
        if (!['play', 'reset'].includes(body.action)) return send(res, 400, '{"ok":false,"reason":"action ไม่ถูกต้อง"}');
        return send(res, 200, await upstream(scriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...body, token }) }));
      }
      return send(res, 404, 'Not found', 'text/plain');
    } catch (err) {
      // 502 makes the page treat it as offline, so play results go to the retry queue
      return send(res, 502, JSON.stringify({ ok: false, reason: String(err.message || err) }));
    }
  };
}

module.exports = { createApp };

if (require.main === module) {
  for (const f of [path.join(__dirname, '.env'), path.join(__dirname, '..', '.env')]) {
    if (fs.existsSync(f)) { process.loadEnvFile(f); break; }
  }
  const e = process.env;
  const PORT = Number(e.PORT) || 8787;
  const HOST = e.HOST || '127.0.0.1'; // Docker/Railway set HOST=0.0.0.0
  const scriptUrl = (e.SCRIPT_GOOGLE_SHEET || '').trim();
  http.createServer(createApp({ scriptUrl, token: e.SCRIPT_TOKEN || '', password: e.APP_PASSWORD || '' })).listen(PORT, HOST, () => {
    const base = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
    console.log(`Google Sheet: ${scriptUrl ? 'proxied via server' : 'not set, using demo data'}${e.SCRIPT_TOKEN ? ', token on' : ''}${e.APP_PASSWORD ? ', password on' : ''}`);
    console.log(`Booth A: ${base}/?booth=A`);
    console.log(`Booth B: ${base}/?booth=B`);
  });
}
