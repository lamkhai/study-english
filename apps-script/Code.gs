/**
 * Script đồng bộ cho app “Từ vựng”. Một script dùng được cho nhiều Sheet: app gửi ID Sheet và mã bí mật,
 * script mở đúng Sheet đó rồi so mã với ô B1 của tab config trong chính Sheet ấy.
 * Có hai cách dùng (xem README):
 * - Script chung: người quản lý app deploy bằng Gmail bot, người dùng chia sẻ Sheet cho bot.
 * - Tự dựng: trong Sheet mở Extensions → Apps Script, xoá code mẫu, dán toàn bộ file này rồi Deploy thành Web app.
 * Lần đồng bộ đầu tiên, script tự tạo tab english (từ vựng) và tab config (mã bí mật). Hai tab này mang thẻ ẩn
 * (developer metadata), nên script nhận ra chúng kể cả khi bị đổi tên, và không bao giờ đọc hay sửa tab khác của bạn.
 * Code không chứa mã bí mật nào, dán bản mới đè lên bản cũ là xong.
 */

// ===== Cấu hình =====
const WORDS_TAB = 'english';  // tên tab từ vựng khi tạo; trùng tên tab có dữ liệu thì thành english2, english3…
const CONFIG_TAB = 'config';  // tên tab chứa mã khi tạo (A1 ghi "secret", B1 ghi mã); trùng thì thành config2…
const MIN_SECRET = 8;         // mã ngắn hơn thì không nhận, cho khó đoán
// ====================

// Thẻ ẩn đánh dấu tab của app, giá trị là 'words' hoặc 'config'
const TAG = 'tu-vung';
// Bốn cột bạn nhập; từ thêm trong app cũng được ghi vào đây
const INPUT_COLUMNS = ['term', 'meaning', 'example', 'type'];
// Ba cột app sửa được; muốn sửa chữ của từ (term) thì sửa trong Sheet
const EDIT_COLUMNS = ['meaning', 'example', 'type'];
// Ba cột do app tự quản lý, bạn không cần nhập
const AUTO_COLUMNS = ['last_seen', 'mastered', 'id'];

/** Mở link /exec trên trình duyệt để kiểm tra script đã chạy. */
function doGet() {
  return json_({ ok: true, message: 'Script đang chạy. Tự dựng thì dán link này vào ⚙ trong app.' });
}

/** App gọi vào đây mỗi lần bấm đồng bộ: nhận tiến độ, từ mới và bản sửa, ghi vào Sheet, trả về toàn bộ thẻ. */
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    body = null;
  }
  if (!body || typeof body !== 'object') return fail_('dữ liệu gửi lên không hợp lệ');

  // 1. Mở đúng Sheet theo ID app gửi lên
  const id = text_(body.sheet);
  if (!/^[\w-]{20,100}$/.test(id)) return fail_('link Sheet không hợp lệ');
  let ss;
  try {
    ss = SpreadsheetApp.openById(id);
  } catch (err) {
    return fail_('không mở được Sheet, kiểm tra link và quyền chia sẻ');
  }

  // 2. Tìm hai tab của app theo thẻ ẩn (không theo tên), và chắc chắn script ghi được vào Sheet
  let words = tagged_(ss, 'words');
  let config = tagged_(ss, 'config');
  if (!(words || config || ss.getSheets()[0]).getRange(1, 1).canEdit()) {
    return fail_('script mới có quyền xem Sheet, hãy chia sẻ quyền Người chỉnh sửa');
  }

  // 3. So mã bí mật với ô B1 của tab config. Chưa có mã thì tự thiết lập ở bước 4.
  const key = text_(body.key);
  const secret = codeOf_(config);
  if (secret) {
    const where = 'ô B1 của tab ' + config.getName();
    if (secret.length < MIN_SECRET) return fail_('mã bí mật ở ' + where + ' cần ít nhất ' + MIN_SECRET + ' ký tự');
    if (!key) return fail_('Sheet đã có mã bí mật, hãy nhập mã ở ' + where);
    if (key !== secret) return fail_('sai mã bí mật');
  } else if (key && key.length < MIN_SECRET) {
    return fail_('mã bí mật cần ít nhất ' + MIN_SECRET + ' ký tự');
  }

  const lock = LockService.getScriptLock(); // tránh hai máy ghi cùng lúc; khoá này dùng chung cho mọi Sheet
  if (!lock.tryLock(20000)) return fail_('script đang bận, bấm đồng bộ lại sau ít giây');
  try {
    // 4. Chưa có mã: đọc lại, vì trong lúc chờ khoá máy khác có thể vừa thiết lập xong
    let created = '';
    if (!secret) {
      config = tagged_(ss, 'config');
      const now = codeOf_(config);
      if (now && now !== key) {
        return fail_('Sheet vừa được máy khác thiết lập, hãy nhập mã ở ô B1 của tab ' + config.getName());
      }
      if (!now) created = key || newCode_();
    }
    // Tab từ vựng làm trước tab config, để tab trống duy nhất của Sheet mới thành tab english.
    // Lỡ xoá tab từ vựng thì đến đây cũng được tạo lại.
    words = tagged_(ss, 'words') || makeWords_(ss);
    if (created) writeCode_(config || makeConfig_(ss), created);

    const changes = Array.isArray(body.changes) ? body.changes : [];
    const adds = Array.isArray(body.adds) ? body.adds : [];
    const edits = Array.isArray(body.edits) ? body.edits : [];
    const out = sync_(words, changes, adds, edits);
    const res = { ok: true, items: out.items, conflicts: out.conflicts };
    if (created) res.key = created;
    SpreadsheetApp.flush(); // ghi hết vào Sheet trước khi nhả khoá
    return json_(res);
  } catch (err) {
    return fail_(String((err && err.message) || err));
  } finally {
    lock.releaseLock();
  }
}

function sync_(sheet, changes, adds, edits) {
  // 1. Đọc tiêu đề ở hàng 1 (sheet trống thì tạo sẵn tiêu đề)
  if (sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, INPUT_COLUMNS.length).setValues([INPUT_COLUMNS]);
  }
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => text_(h).toLowerCase());
  if (header.indexOf('term') === -1) {
    throw new Error('không thấy cột "term" ở hàng 1 của tab ' + sheet.getName());
  }
  // Thiếu cột tự quản lý thì thêm vào cuối. Có từ mới hay bản sửa thì thêm cả cột nhập còn thiếu, để không mất chữ nào
  AUTO_COLUMNS.concat(adds.length || edits.length ? INPUT_COLUMNS : []).forEach(name => {
    if (header.indexOf(name) !== -1) return;
    header.push(name);
    if (header.length > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), 1);
    sheet.getRange(1, header.length).setValue(name);
  });
  const col = {};
  INPUT_COLUMNS.concat(AUTO_COLUMNS).forEach(name => {
    col[name] = header.indexOf(name);
  });

  const n = sheet.getLastRow() - 1;
  const rows = n > 0 ? sheet.getRange(2, 1, n, header.length).getValues() : [];
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

  // 3. Từ mới app gửi lên thì thêm vào cuối tab, giữ nguyên id app đặt. Id đã có trong Sheet là từ
  //    đã thêm ở lần trước mà app chưa nhận được trả lời, nên bỏ qua để không thành hai dòng.
  const fresh = [];
  adds.forEach(a => {
    const id = text_(a && a.id);
    if (!id || byId[id] || !text_(a.term)) return;
    const r = header.map(() => '');
    INPUT_COLUMNS.forEach(name => { r[col[name]] = text_(a[name]); });
    r[col.id] = id;
    r[col.last_seen] = toDate_(a.lastSeen) || '';
    r[col.mastered] = a.mastered === true;
    byId[id] = r;
    fresh.push(r);
  });
  const all = rows.concat(fresh);

  // 4. Bản sửa từ app: chỉ ghi khi ô trong Sheet vẫn như lúc app lấy về, hoặc đã đúng bản mới. Ô đã được sửa
  //    trong Sheet, hay dòng không còn, thì giữ nguyên Sheet và báo id đó lại cho app.
  const conflicts = [];
  const edited = [];                      // [dòng, tên cột] của các ô cần ghi
  edits.forEach(e => {
    const id = text_(e && e.id);
    const names = EDIT_COLUMNS.filter(name => e && e[name] && typeof e[name] === 'object');
    if (!id || !names.length) return;
    const r = byId[id];
    const ok = r && names.every(name => {
      const now = text_(r[col[name]]);
      return now === text_(e[name].from) || now === text_(e[name].to);
    });
    if (!ok) {
      conflicts.push(id);
      return;
    }
    names.forEach(name => {
      const to = text_(e[name].to);
      if (text_(r[col[name]]) === to) return;
      r[col[name]] = to;
      edited.push([r, name]);
    });
  });

  // 5. Ghi tiến độ app gửi lên: last_seen giữ mốc mới hơn, mastered lấy giá trị app gửi
  changes.forEach(ch => {
    const r = byId[text_(ch.id)];
    if (!r) return;
    const seen = toDate_(ch.lastSeen);
    const old = toDate_(r[col.last_seen]);
    if (seen && (!old || seen > old)) r[col.last_seen] = seen;
    if (typeof ch.mastered === 'boolean') r[col.mastered] = ch.mastered;
  });

  // 6. Dòng của từ mới thì ghi cả 4 cột nhập, ô vừa được sửa thì ghi riêng ô đó. Ngoài ra chỉ ghi lại 3 cột
  //    tự quản lý, không đụng tới các cột bạn nhập. Id và chữ ghi dạng chữ, để "0012ab34" hay "24/7" không bị
  //    đổi thành số hay ngày tháng.
  if (all.length) {
    const short = all.length + 1 - sheet.getMaxRows();
    if (short > 0) sheet.insertRowsAfter(sheet.getMaxRows(), short);
    if (fresh.length) {
      INPUT_COLUMNS.forEach(name => {
        sheet.getRange(rows.length + 2, col[name] + 1, fresh.length, 1).setNumberFormat('@')
          .setValues(fresh.map(r => [r[col[name]]]));
      });
    }
    edited.forEach(([r, name]) => {
      const i = rows.indexOf(r);           // dòng mới thêm thì đã ghi ở trên
      if (i !== -1) sheet.getRange(i + 2, col[name] + 1).setNumberFormat('@').setValue(r[col[name]]);
    });
    sheet.getRange(2, col.id + 1, all.length, 1).setNumberFormat('@');
    AUTO_COLUMNS.forEach(name => {
      sheet.getRange(2, col[name] + 1, all.length, 1).setValues(all.map(r => [r[col[name]]]));
    });
    sheet.getRange(2, col.last_seen + 1, all.length, 1).setNumberFormat('dd/mm/yyyy hh:mm');
    sheet.getRange(2, col.mastered + 1, all.length, 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  }

  // 7. Trả toàn bộ thẻ về app, kèm id các bản sửa không ghi được
  const items = all.filter(hasTerm).map(r => ({
    id: r[col.id],
    term: text_(r[col.term]),
    meaning: col.meaning === -1 ? '' : text_(r[col.meaning]),
    example: col.example === -1 ? '' : text_(r[col.example]),
    type: col.type === -1 ? '' : text_(r[col.type]),
    lastSeen: toIso_(r[col.last_seen]),
    mastered: r[col.mastered] === true || text_(r[col.mastered]).toUpperCase() === 'TRUE'
  }));
  return { items, conflicts };
}

/** Tab mang thẻ ẩn của app (role là 'words' hoặc 'config'); người dùng đổi tên tab thì vẫn nhận ra. */
function tagged_(ss, role) {
  return ss.getSheets().find(s => roleOf_(s) === role) || null;
}

function roleOf_(sheet) {
  const tag = sheet.getDeveloperMetadata().find(m => m.getKey() === TAG);
  return tag ? tag.getValue() : '';
}

/** Gắn thẻ ở mức DOCUMENT để cả script chung lẫn script tự dựng đều đọc được. */
function tag_(sheet, role) {
  sheet.addDeveloperMetadata(TAG, role, SpreadsheetApp.DeveloperMetadataVisibility.DOCUMENT);
}

/** Tạo tab từ vựng: Sheet mới thì dùng luôn tab trống duy nhất, không thì dùng lại tab english trống hoặc tạo tab mới. */
function makeWords_(ss) {
  const sheets = ss.getSheets();
  let sheet;
  if (sheets.length === 1 && isBlank_(sheets[0])) {
    sheet = sheets[0];
    if (!sameName_(sheet, WORDS_TAB)) sheet.setName(freeName_(ss, WORDS_TAB));
  } else {
    sheet = newTab_(ss, WORDS_TAB, 0);
  }
  tag_(sheet, 'words');
  const head = INPUT_COLUMNS.concat(AUTO_COLUMNS);
  sheet.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.getRange(1, 2).setNote('Từ có nhiều loại: mỗi nghĩa một dòng, mở đầu bằng loại viết tắt như (n), (v). Xuống dòng trong ô bằng Ctrl+Enter.');
  sheet.getRange(1, 3).setNote('Bọc *cụm từ* để in đậm. Nhiều ví dụ thì xuống dòng trong ô bằng Ctrl+Enter.');
  sheet.getRange(1, 4).setNote('Loại từ như noun, verb, adjective, hoặc grammar cho cấu trúc ngữ pháp. Nhiều loại thì cách nhau bằng dấu phẩy: noun, verb. Bỏ trống cũng được.');
  return sheet;
}

function makeConfig_(ss) {
  const sheet = newTab_(ss, CONFIG_TAB, ss.getSheets().length);
  tag_(sheet, 'config');
  return sheet;
}

/** Tab tên `name` hoàn toàn trống thì dùng lại; không thì tạo tab mới tên chưa ai dùng (name, name2, …). */
function newTab_(ss, name, index) {
  return ss.getSheets().find(s => sameName_(s, name) && isBlank_(s)) || ss.insertSheet(freeName_(ss, name), index);
}

/** Tab hoàn toàn trống và chưa thuộc app. */
function isBlank_(sheet) {
  return sheet.getLastRow() === 0 && !roleOf_(sheet);
}

function sameName_(sheet, name) {
  return sheet.getName().trim().toLowerCase() === name.toLowerCase();
}

/** Tên tab chưa ai dùng: base, base2, base3… */
function freeName_(ss, base) {
  const taken = ss.getSheets().map(s => s.getName().trim().toLowerCase());
  let name = base;
  for (let i = 2; taken.indexOf(name.toLowerCase()) !== -1; i++) name = base + i;
  return name;
}

/** Mã bí mật ở ô B1 của tab config; chưa có tab hoặc ô trống thì trả về chuỗi rỗng. */
function codeOf_(config) {
  return config ? text_(config.getRange('B1').getDisplayValue()) : '';
}

/** Ghi mã vào ô B1 dạng chữ (mã toàn số không bị đổi thành số), kèm nhãn và câu hướng dẫn. */
function writeCode_(config, code) {
  config.getRange('A1:B1').setNumberFormat('@').setValues([['secret', code]]);
  config.getRange('A2').setValue('Mã để app kết nối Sheet này. Máy khác nhập mã ở ô B1 vào ⚙ trong app. Muốn đổi mã thì sửa ô B1.');
}

/** Mã ngẫu nhiên dạng xxxx-xxxx-xxxx, bỏ các ký tự dễ nhầm 0, o, 1, l, i. */
function newCode_() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const hex = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  let s = '';
  for (let i = 0; i < 12; i++) s += abc[parseInt(hex.substr(i * 4, 4), 16) % abc.length];
  return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8);
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

function fail_(error) {
  return json_({ ok: false, error });
}
