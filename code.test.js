// Runs Code.gs against an in-memory fake sheet (AC-03, AC-05, AC-09, BR-S02, BR-S03).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');

function load(grid, TOKEN = null) {
  const sh = {
    getDataRange: () => ({ getDisplayValues: () => grid.map(r => r.slice()) }),
    getLastColumn: () => grid[0].length,
    getLastRow: () => grid.length,
    getRange: (r, c, nr = 1, nc = 1) => ({
      getDisplayValues: () => grid.slice(r - 1, r - 1 + nr).map(row => row.slice(c - 1, c - 1 + nc)),
      getDisplayValue: () => grid[r - 1][c - 1],
      setValue: v => { grid[r - 1][c - 1] = v; },
    }),
  };
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheets: () => [sh], getSheetByName: n => (n === 'Form' ? sh : null) }), flush() {} },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => TOKEN }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ setMimeType: () => JSON.parse(s) }) },
  };
  vm.runInNewContext(fs.readFileSync(__dirname + '/Code.gs', 'utf8'), ctx);
  return { get: p => ctx.doGet({ parameter: p }), post: b => ctx.doPost({ postData: { contents: JSON.stringify(b) } }) };
}
test('setupSheet adds columns and summary formulas', () => {
  const tabs = { 'Booth A': [['Timestamp', 'ชื่อ']], 'Booth B': [['Timestamp', 'ชื่อ', 'played', 'รางวัล']] };
  const mk = (name, grid) => ({
    getName: () => name,
    getLastColumn: () => grid[0].length,
    getRange: (r, c, nr = 1, nc = 1) => ({
      getDisplayValues: () => grid.slice(r - 1, r - 1 + nr).map(row => row.slice(c - 1, c - 1 + nc)),
      setValue: v => { grid[r - 1][c - 1] = v; },
      setValues: v => { v.forEach((row, i) => { grid[r - 1 + i] = row; }); },
    }),
    clear: () => { grid.length = 0; },
  });
  const sheets = Object.entries(tabs).map(([n, g]) => mk(n, g));
  const out = [];
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheets: () => sheets, getSheetByName: () => null,
      insertSheet: () => { const s = mk('คงเหลือ', out); sheets.push(s); return s; },
    }) },
  };
  vm.runInNewContext(fs.readFileSync(__dirname + '/Code.gs', 'utf8'), ctx);
  ctx.setupSheet();
  assert.deepEqual(tabs['Booth A'][0], ['Timestamp', 'ชื่อ', 'played', 'รางวัล']);
  assert.deepEqual(out[0], ['รางวัล', 'ทั้งหมด', 'Booth A แจกแล้ว', 'Booth B แจกแล้ว', 'คงเหลือ']);
  assert.deepEqual(out[1], ['กระบอกน้ำ', 6, "=COUNTIF('Booth A'!D:D,A2)", "=COUNTIF('Booth B'!D:D,A2)", '=B2-SUM(C2:D2)']);
  assert.equal(out.length, 4);
});

const sheet = () => [
  ['Timestamp', 'id', 'ชื่อ', 'Played', 'รางวัล'],
  ['t', 'P001', 'A', '', ''],
  ['t', '', 'B', '', ''],
];

test('GET returns headers and rows with _row', () => {
  const d = load(sheet()).get({});
  assert.equal(d.ok, true);
  assert.deepEqual(d.rows[0], { _row: 2, cells: ['t', 'P001', 'A', '', ''] });
  assert.equal(load(sheet()).get({ sheet: 'nope' }).ok, false);
});

test('play writes once, second play returns original prize', () => {
  const g = sheet(), api = load(g);
  assert.deepEqual(api.post({ action: 'play', id: 'P001', prize: 'iPad' }), { ok: true });
  assert.deepEqual(g[1].slice(3), ['yes', 'iPad']);
  assert.deepEqual(api.post({ action: 'play', id: 'P001', prize: 'Bag' }), { ok: false, reason: 'played', prize: 'iPad' });
  assert.equal(g[1][4], 'iPad');
});

test('row-N id targets that row; reset clears it', () => {
  const g = sheet(), api = load(g);
  assert.equal(api.post({ action: 'play', id: 'row-3', prize: 'Bag' }).ok, true);
  assert.deepEqual(g[2].slice(3), ['yes', 'Bag']);
  assert.equal(api.post({ action: 'reset', id: 'row-3' }).ok, true);
  assert.deepEqual(g[2].slice(3), ['', '']);
});

test('unknown player and missing columns', () => {
  assert.equal(load(sheet()).post({ action: 'play', id: 'X', prize: 'a' }).reason, 'ไม่พบผู้เล่นนี้ในชีต');
  assert.equal(load([['ชื่อ'], ['A']]).post({ action: 'play', id: 'row-2', prize: 'a' }).reason, 'ไม่พบคอลัมน์ id, played หรือ รางวัล');
});

test('TOKEN property rejects requests without the matching token', () => {
  const api = load(sheet(), 's3cret');
  assert.deepEqual(api.get({}), { ok: false, reason: 'unauthorized' });
  assert.equal(api.get({ token: 's3cret' }).ok, true);
  assert.equal(api.post({ action: 'play', id: 'P001', prize: 'a' }).reason, 'unauthorized');
  assert.equal(api.post({ action: 'play', id: 'P001', prize: 'a', token: 's3cret' }).ok, true);
});
