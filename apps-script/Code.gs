/**
 * Script đồng bộ cho app “Từ vựng”.
 * Cách dùng: trong file Google Sheet, mở Extensions → Apps Script, xoá code mẫu,
 * dán toàn bộ file này, đổi SECRET bên dưới, rồi Deploy thành Web app (xem README).
 */

// ===== Cấu hình =====
// Đổi SECRET trong trình soạn thảo Apps Script. Bản commit lên GitHub giữ nguyên mã mẫu này,
// vì repo công khai thì ai cũng đọc được.
const SECRET = 'doi-thanh-ma-bi-mat-cua-ban'; // nhập y hệt mã này vào ⚙ trong app
const SHEET_NAME = 'Vocab';                    // tab chứa từ; không có tab này thì dùng tab đầu tiên
// ====================

// Ba cột do app tự quản lý, bạn không cần nhập
const AUTO_COLUMNS = ['last_seen', 'mastered', 'id'];

/** Mở link /exec trên trình duyệt để kiểm tra script đã chạy. */
function doGet() {
  return json_({ ok: true, message: 'Script đang chạy. Dán link này vào ⚙ trong app.' });
}

/** App gọi vào đây mỗi lần bấm đồng bộ: nhận tiến độ, ghi vào Sheet, trả về toàn bộ thẻ. */
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'dữ liệu gửi lên không hợp lệ' });
  }
  if (body.key !== SECRET) return json_({ ok: false, error: 'sai mã bí mật' });

  const lock = LockService.getScriptLock(); // tránh hai máy ghi cùng lúc
  try {
    lock.waitLock(20000);
    return json_({ ok: true, items: sync_(Array.isArray(body.changes) ? body.changes : []) });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

function sync_(changes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];

  // 1. Đọc tiêu đề ở hàng 1 (sheet trống thì tạo sẵn tiêu đề)
  if (sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, 4).setValues([['term', 'meaning', 'example', 'type']]);
  }
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => text_(h).toLowerCase());
  if (header.indexOf('term') === -1) {
    throw new Error('không thấy cột "term" ở hàng 1 của tab ' + sheet.getName());
  }
  // Thiếu cột tự quản lý thì thêm vào cuối
  AUTO_COLUMNS.forEach(name => {
    if (header.indexOf(name) !== -1) return;
    header.push(name);
    if (header.length > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), 1);
    sheet.getRange(1, header.length).setValue(name);
  });
  const col = {};
  ['term', 'meaning', 'example', 'type'].concat(AUTO_COLUMNS).forEach(name => {
    col[name] = header.indexOf(name);
  });

  const n = sheet.getLastRow() - 1;
  if (n < 1) return [];
  const rows = sheet.getRange(2, 1, n, header.length).getValues();
  const hasTerm = r => text_(r[col.term]) !== '';

  // 2. Gắn id cho dòng mới, và cho dòng copy bị trùng id
  const byId = {};
  rows.forEach(r => {
    if (!hasTerm(r)) return;
    let id = text_(r[col.id]);
    if (!id || byId[id]) id = Utilities.getUuid().slice(0, 8);
    r[col.id] = id;
    byId[id] = r;
    if (r[col.mastered] === '') r[col.mastered] = false;
  });

  // 3. Ghi tiến độ app gửi lên: last_seen giữ mốc mới hơn, mastered lấy giá trị app gửi
  changes.forEach(ch => {
    const r = byId[text_(ch.id)];
    if (!r) return;
    const seen = toDate_(ch.lastSeen);
    const old = toDate_(r[col.last_seen]);
    if (seen && (!old || seen > old)) r[col.last_seen] = seen;
    if (typeof ch.mastered === 'boolean') r[col.mastered] = ch.mastered;
  });

  // 4. Chỉ ghi lại 3 cột tự quản lý, không đụng tới các cột bạn nhập
  AUTO_COLUMNS.forEach(name => {
    sheet.getRange(2, col[name] + 1, n, 1).setValues(rows.map(r => [r[col[name]]]));
  });
  sheet.getRange(2, col.last_seen + 1, n, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  sheet.getRange(2, col.mastered + 1, n, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());

  // 5. Trả toàn bộ thẻ về app
  return rows.filter(hasTerm).map(r => ({
    id: r[col.id],
    term: text_(r[col.term]),
    meaning: col.meaning === -1 ? '' : text_(r[col.meaning]),
    example: col.example === -1 ? '' : text_(r[col.example]),
    type: col.type === -1 ? '' : text_(r[col.type]),
    lastSeen: toIso_(r[col.last_seen]),
    mastered: r[col.mastered] === true || text_(r[col.mastered]).toUpperCase() === 'TRUE'
  }));
}

function text_(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function toDate_(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function toIso_(v) {
  const d = toDate_(v);
  return d ? d.toISOString() : '';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
