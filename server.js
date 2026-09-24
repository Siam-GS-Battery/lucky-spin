// Serves the app behind a login (JWT in an HttpOnly cookie, 4 h) and proxies Google Sheet calls
// so the Apps Script URL and token stay on the server. No dependencies.
// Env: SCRIPT_GOOGLE_SHEET, SCRIPT_TOKEN, APP_USERNAME, APP_PASSWORD, JWT_SECRET, PORT, HOST.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SESSION_SECONDS = 4 * 60 * 60;
const COOKIE = 'lucky_session';
const MAX_FAILS = 10, LOCK_MS = 15 * 60 * 1000;

// ---- JWT (HS256) ----
const b64u = s => Buffer.from(s).toString('base64url');
const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('base64url');
function signJwt(payload, secret) {
  const data = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + b64u(JSON.stringify(payload));
  return data + '.' + hmac(secret, data);
}
function verifyJwt(token, secret, nowSec) {
  const [h, p, sig] = String(token || '').split('.');
  if (!h || !p || !sig) return null;
  const want = Buffer.from(hmac(secret, h + '.' + p)), got = Buffer.from(sig);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  try {
    if (JSON.parse(Buffer.from(h, 'base64url')).alg !== 'HS256') return null;
    const claims = JSON.parse(Buffer.from(p, 'base64url'));
    return typeof claims.exp === 'number' && claims.exp > nowSec ? claims : null;
  } catch { return null; }
}
const safeEqual = (a, b) => { // constant time, length-independent
  const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(([k]) => k).map(([k, ...v]) => [k, v.join('=')]));
// Booth -> Sheet tab. Must match BOOTHS in index.html. The booth is locked in the session.
const BOOTH_SHEETS = { A: 'Auto Feedback', B: 'Sopify Feedback' };

function createApp({ scriptUrl = '', token = '', username = 'booth', password = '', jwtSecret = '', fetchFn = fetch, now = Date.now } = {}) {
  if (scriptUrl && !/^https:\/\/script\.google\.com\//.test(scriptUrl)) throw new Error('SCRIPT_GOOGLE_SHEET must start with https://script.google.com/');
  const authOn = !!password;
  const secret = jwtSecret || crypto.randomBytes(32).toString('hex'); // ponytail: random secret logs everyone out on restart, set JWT_SECRET to keep sessions
  const env = JSON.stringify({ proxy: !!scriptUrl }).replace(/</g, '\\u003c');
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8').replace('/*LUCKY_ENV*/{}', env);
  const loginHtml = fs.readFileSync(path.join(__dirname, 'login.html'), 'utf8');
  const fails = new Map(); // ip -> {n, until}   ponytail: in-memory, fine for one instance

  const send = (res, code, body, type = 'application/json; charset=utf-8', extra = {}) =>
    res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff', ...extra }).end(body);
  const redirect = (res, to, extra = {}) => res.writeHead(303, { Location: to, 'Cache-Control': 'no-store', ...extra }).end();
  const secure = req => req.headers['x-forwarded-proto'] === 'https' || !!req.socket.encrypted;
  const cookie = (req, value, maxAge) =>
    `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure(req) ? '; Secure' : ''}`;
  const ipOf = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  async function readBody(req) {
    let raw = '';
    for await (const chunk of req) { raw += chunk; if (raw.length > 10000) throw Object.assign(new Error('body too large'), { code: 413 }); }
    return raw;
  }
  async function upstream(url, init) {
    const r = await fetchFn(url, { ...init, redirect: 'follow', signal: AbortSignal.timeout(25000) });
    if (!r.ok) throw new Error('Apps Script HTTP ' + r.status);
    return r.text();
  }

  async function login(req, res) {
    const ip = ipOf(req), f = fails.get(ip);
    if (f && f.until > now()) return redirect(res, '/login?e=locked');
    const form = new URLSearchParams(await readBody(req));
    const booth = String(form.get('booth') || '').toUpperCase();
    if (!BOOTH_SHEETS[booth]) return redirect(res, '/login?e=booth');
    const ok = safeEqual(form.get('username') || '', username) & safeEqual(form.get('password') || '', password); // & not &&: always compare both
    if (!ok) {
      const n = (f && !f.until ? f.n : 0) + 1; // an expired lock starts the count again
      fails.set(ip, { n, until: n >= MAX_FAILS ? now() + LOCK_MS : 0 });
      return redirect(res, '/login?e=bad&booth=' + booth);
    }
    fails.delete(ip);
    const iat = Math.floor(now() / 1000);
    const jwt = signJwt({ sub: username, booth, iat, exp: iat + SESSION_SECONDS }, secret);
    return redirect(res, '/?booth=' + booth, { 'Set-Cookie': cookie(req, jwt, SESSION_SECONDS) });
  }

  return async (req, res) => {
    const url = new URL(req.url, 'http://x');
    let sheet = null; // set from the session when login is on
    try {
      if (url.pathname === '/healthz') return send(res, 200, 'ok', 'text/plain');
      if (authOn) {
        if (url.pathname === '/logout') return redirect(res, '/login', { 'Set-Cookie': cookie(req, '', 0) });
        const raw = cookies(req)[COOKIE];
        const claims = verifyJwt(raw, secret, Math.floor(now() / 1000));
        const valid = claims && BOOTH_SHEETS[claims.booth];
        if (url.pathname === '/login' && req.method === 'POST') return await login(req, res);
        if (url.pathname === '/login' && !valid) return send(res, 200, loginHtml, 'text/html; charset=utf-8');
        if (!valid) {
          if (url.pathname.startsWith('/api/')) return send(res, 401, '{"ok":false,"reason":"session expired"}');
          return redirect(res, '/login' + (raw ? '?e=expired' : ''));
        }
        // Any page other than the booth's own goes back to it; the API only touches the booth's tab.
        if (!url.pathname.startsWith('/api/') && (url.pathname !== '/' || url.search !== '?booth=' + claims.booth)) return redirect(res, '/?booth=' + claims.booth);
        if (url.pathname.startsWith('/api/')) sheet = BOOTH_SHEETS[claims.booth];
      }

      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return send(res, 200, html, 'text/html; charset=utf-8');
      if (!scriptUrl || !url.pathname.startsWith('/api/')) return send(res, 404, 'Not found', 'text/plain');

      if (req.method === 'GET' && url.pathname === '/api/players') {
        const q = new URLSearchParams({ sheet: sheet ?? (url.searchParams.get('sheet') || ''), token, t: now() });
        return send(res, 200, await upstream(scriptUrl + '?' + q));
      }
      if (req.method === 'POST' && url.pathname === '/api/post') {
        const body = JSON.parse(await readBody(req));
        if (!['play', 'reset'].includes(body.action)) return send(res, 400, '{"ok":false,"reason":"action ไม่ถูกต้อง"}');
        return send(res, 200, await upstream(scriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...body, sheet: sheet ?? body.sheet, token }) }));
      }
      return send(res, 404, 'Not found', 'text/plain');
    } catch (err) {
      if (err.code === 413) return send(res, 413, '{"ok":false,"reason":"body too large"}');
      if (err instanceof SyntaxError) return send(res, 400, '{"ok":false,"reason":"invalid JSON"}');
      // 502 makes the page treat it as offline, so play results go to the retry queue
      return send(res, 502, JSON.stringify({ ok: false, reason: String(err.message || err) }));
    }
  };
}

module.exports = { createApp, signJwt, verifyJwt };

if (require.main === module) {
  for (const f of [path.join(__dirname, '.env'), path.join(__dirname, '..', '.env')]) {
    if (fs.existsSync(f)) { process.loadEnvFile(f); break; }
  }
  const e = process.env;
  const PORT = Number(e.PORT) || 8787;
  const HOST = e.HOST || '127.0.0.1'; // Docker/Railway set HOST=0.0.0.0
  const scriptUrl = (e.SCRIPT_GOOGLE_SHEET || '').trim();
  if (e.APP_PASSWORD && !e.JWT_SECRET) console.warn('JWT_SECRET not set: sessions reset on every restart');
  if (!e.APP_PASSWORD) console.warn('APP_PASSWORD not set: login is OFF');
  http.createServer(createApp({
    scriptUrl, token: e.SCRIPT_TOKEN || '', username: e.APP_USERNAME || 'booth', password: e.APP_PASSWORD || '', jwtSecret: e.JWT_SECRET || '',
  })).listen(PORT, HOST, () => {
    const base = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
    console.log(`Google Sheet: ${scriptUrl ? 'proxied via server' : 'not set, using demo data'}${e.SCRIPT_TOKEN ? ', token on' : ''}${e.APP_PASSWORD ? ', login on (4 h session)' : ''}`);
    console.log(`Booth A: ${base}/?booth=A`);
    console.log(`Booth B: ${base}/?booth=B`);
  });
}
