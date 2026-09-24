/**
 * Lucky Draw — Google Apps Script Web App (REQUIREMENTS.md section 7)
 * Deploy: Execute as "Me", Who has access "Anyone".
 * Set Script Property TOKEN (Project Settings › Script Properties) to the same value as SCRIPT_TOKEN
 * on the server; requests without it are rejected. If TOKEN is not set, every request is accepted.
 */

function doGet(e) {
  try {
    checkToken_(e.parameter.token);
    const sh = getSheet_(e.parameter.sheet);
    const values = sh.getDataRange().getDisplayValues();
    const headers = values.shift() || [];
    const rows = values.map((cells, i) => ({ _row: i + 2, cells }));
    return json_({ ok: true, headers, rows });
  } catch (err) {
    return json_({ ok: false, reason: String(err.message || err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock(); // BR-S01
  try {
    lock.waitLock(15000);
    const body = JSON.parse(e.postData.contents);
    checkToken_(body.token);
    const sh = getSheet_(body.sheet);
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(h => String(h).trim().toLowerCase());
    const col = names => headers.findIndex(h => names.includes(h)) + 1; // 1-based, 0 = missing
    const idCol = col(['id']), playedCol = col(['played']), prizeCol = col(['รางวัล', 'prize']);
    if (!playedCol || !prizeCol) return json_({ ok: false, reason: 'ไม่พบคอลัมน์ id, played หรือ รางวัล' });

    const row = findRow_(sh, idCol, String(body.id || ''));
    if (!row) return json_({ ok: false, reason: 'ไม่พบผู้เล่นนี้ในชีต' });

    if (body.action === 'reset') {
      sh.getRange(row, playedCol).setValue('');
      sh.getRange(row, prizeCol).setValue('');
      SpreadsheetApp.flush();
      return json_({ ok: true });
    }
    if (body.action === 'play') {
      // BR-S02: re-read latest value under lock, never overwrite a played row
      const played = String(sh.getRange(row, playedCol).getDisplayValue()).trim();
      if (/^(yes|y|true|1|เล่นแล้ว)$/i.test(played)) {
        return json_({ ok: false, reason: 'played', prize: sh.getRange(row, prizeCol).getDisplayValue() });
      }
      sh.getRange(row, playedCol).setValue('yes');
      sh.getRange(row, prizeCol).setValue(String(body.prize || ''));
      SpreadsheetApp.flush(); // BR-S04
      return json_({ ok: true });
    }
    return json_({ ok: false, reason: 'action ไม่ถูกต้อง' });
  } catch (err) {
    return json_({ ok: false, reason: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function checkToken_(token) {
  const want = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (want && token !== want) throw new Error('unauthorized');
}

function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = name ? ss.getSheetByName(name) : ss.getSheets()[0];
  if (!sh) throw new Error('ไม่พบแท็บ "' + name + '"');
  return sh;
}

function findRow_(sh, idCol, id) {
  const last = sh.getLastRow();
  const m = /^row-(\d+)$/.exec(id); // BR-S03
  if (m) { const r = Number(m[1]); return r >= 2 && r <= last ? r : 0; }
  if (!idCol || !id || last < 2) return 0;
  const ids = sh.getRange(2, idCol, last - 1, 1).getDisplayValues();
  const i = ids.findIndex(v => String(v[0]).trim() === id); // first match wins
  return i < 0 ? 0 : i + 2;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run once from the Apps Script editor (select setupSheet, click Run).
 * Adds played/รางวัล columns to every response tab and (re)builds the "คงเหลือ" summary tab.
 * Safe to run again: existing columns are kept, the summary tab is rewritten.
 */
const SUMMARY = 'คงเหลือ';
const PRIZES = [['กระบอกน้ำ', 6], ['กระเป๋าผ้า', 15], ['ผ้าเย็น', 160]];

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const booths = ss.getSheets().filter(sh => sh.getName() !== SUMMARY);
  const prizeCols = booths.map(sh => {
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(h => String(h).trim().toLowerCase());
    let col = headers.indexOf('played') + 1;
    if (!col) { col = headers.length + 1; sh.getRange(1, col).setValue('played'); headers.push('played'); }
    col = headers.findIndex(h => h === 'รางวัล' || h === 'prize') + 1;
    if (!col) { col = headers.length + 1; sh.getRange(1, col).setValue('รางวัล'); }
    return columnLetter_(col);
  });

  const sum = ss.getSheetByName(SUMMARY) || ss.insertSheet(SUMMARY, ss.getSheets().length); // keep last so it is never the default tab
  sum.clear();
  const ref = (sh, letter) => "'" + sh.getName().replace(/'/g, "''") + "'!" + letter + ':' + letter;
  const rows = [['รางวัล', 'ทั้งหมด'].concat(booths.map(sh => sh.getName() + ' แจกแล้ว'), ['คงเหลือ'])];
  PRIZES.forEach(([name, total], i) => {
    const r = i + 2;
    const counts = booths.map((sh, j) => '=COUNTIF(' + ref(sh, prizeCols[j]) + ',A' + r + ')');
    const firstCount = columnLetter_(3), lastCount = columnLetter_(2 + booths.length);
    rows.push([name, total].concat(counts, [total === '' ? '' : '=B' + r + '-SUM(' + firstCount + r + ':' + lastCount + r + ')']));
  });
  sum.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}

function columnLetter_(n) {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s;
  return s;
}
