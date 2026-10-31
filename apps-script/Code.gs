/**
 * Script đồng bộ cho app “Từ vựng”. Một script dùng được cho nhiều Sheet: app gửi ID Sheet và mã bí mật,
 * script mở đúng Sheet đó rồi so mã với ô B1 của tab config trong chính Sheet ấy.
 * Có hai cách dùng (xem README):
 * - Script chung: người quản lý app deploy bằng Gmail bot, người dùng chia sẻ Sheet cho bot.
 * - Tự dựng: trong Sheet mở Extensions → Apps Script, xoá code mẫu, dán toàn bộ file này rồi Deploy thành Web app.
 * Lần đồng bộ đầu tiên, script tự tạo tab english (từ vựng), tab types (loại từ), tab log (lượt xem mỗi ngày) và tab
 * config (mã bí mật). Bốn tab này mang thẻ ẩn (developer metadata), nên script nhận ra chúng kể cả khi bị đổi tên, và
 * không bao giờ đọc hay sửa tab khác của bạn.
 * Code không chứa mã bí mật nào, dán bản mới đè lên bản cũ là xong.
 */

// ===== Cấu hình =====
const WORDS_TAB = 'english';  // tên tab từ vựng khi tạo; trùng tên tab có dữ liệu thì thành english2, english3…
const TYPES_TAB = 'types';    // tên tab loại từ khi tạo; trùng thì thành types2…
const LOG_TAB = 'log';        // tên tab lượt xem khi tạo; trùng thì thành log2…
const CONFIG_TAB = 'config';  // tên tab chứa mã khi tạo (A1 ghi "secret", B1 ghi mã); trùng thì thành config2…
const MIN_SECRET = 8;         // mã ngắn hơn thì không nhận, cho khó đoán
// ====================

// Thẻ ẩn đánh dấu tab của app, giá trị là 'words', 'types', 'log' hoặc 'config'
const TAG = 'tu-vung';
// Phiên bản giao tiếp với app. Bản 2: app và script nhận ra từng từ theo chữ ở cột term (mỗi từ một dòng), không dùng
// cột id nữa. Bản 3: thêm cột antonyms (từ trái nghĩa) và related (từ liên quan).
const API = 3;
// App cũ nhất script còn nhận. App bản 2 chưa biết hai cột mới nhưng không đụng tới chúng, nên vẫn đồng bộ được.
// App bản 1 còn tìm từ theo cột id, nên script nhắc người dùng mở lại app để tải bản mới.
const OLDEST_APP = 2;
// Tám cột bạn nhập; từ thêm trong app cũng được ghi vào đây
const INPUT_COLUMNS = ['term', 'phonetic', 'meaning', 'example', 'type', 'synonyms', 'antonyms', 'related'];
// Bảy cột app sửa được; muốn sửa chữ của từ (term) thì sửa trong Sheet
const EDIT_COLUMNS = ['phonetic', 'meaning', 'example', 'type', 'synonyms', 'antonyms', 'related'];
// Ba cột từ liên kết, mỗi ô ghi các từ cách nhau bằng dấu phẩy, kèm chú thích ở ô tiêu đề. Chỉ cần ghi ở một từ:
// app hiện liên kết ở cả hai thẻ.
const LINK_NOTES = {
  synonyms: 'Từ đồng nghĩa, cách nhau bằng dấu phẩy: unavoidable, inescapable. Chỉ cần ghi ở một từ: '
    + 'inevitable ghi unavoidable thì thẻ unavoidable trong app cũng hiện inevitable. Bỏ trống cũng được.',
  antonyms: 'Từ trái nghĩa, cách nhau bằng dấu phẩy: avoidable, preventable. Chỉ cần ghi ở một từ: '
    + 'inevitable ghi avoidable thì thẻ avoidable trong app cũng hiện inevitable. Bỏ trống cũng được.',
  related: 'Từ liên quan, như các từ cùng họ, cách nhau bằng dấu phẩy: study ghi student, studious. '
    + 'Chỉ cần ghi ở một từ: thẻ student trong app cũng hiện study. Bỏ trống cũng được.'
};
// Ba cột do app tự quản lý, bạn không cần nhập. Sheet dựng từ bản trước thì cột added được thêm vào cuối.
const AUTO_COLUMNS = ['added', 'last_seen', 'mastered'];
// Hai cột của tab loại từ: tên loại, và chữ viết tắt đặt trước nghĩa
const TYPE_COLUMNS = ['type', 'abbr'];
// Ba cột của tab lượt xem: ngày, số lượt xem thẻ trong ngày đó, và máy đã xem
const LOG_COLUMNS = ['date', 'views', 'device'];
const PHONETIC_NOTE = 'Phiên âm, app hiện đúng như bạn gõ, ví dụ /rʌn/. Bỏ trống cũng được.';
const ADDED_NOTE = 'Ngày thêm từ, script tự ghi. Từ nhập thẳng vào Sheet thì tính từ lần đồng bộ kế tiếp. '
  + 'Từ đã có trước khi có cột này thì để trống.';
const DAY = /^\d{4}-\d{2}-\d{2}$/;  // ngày app gửi lên, dạng 2026-10-27

/** Mở link /exec trên trình duyệt để kiểm tra script đã chạy. */
function doGet() {
  return json_({ ok: true, message: 'Script đang chạy. Tự dựng thì dán link này vào ⚙ trong app.' });
}

/**
 * App gọi vào đây mỗi lần bấm đồng bộ: nhận tiến độ, từ mới, bản sửa, từ đã xoá và lượt xem, ghi vào Sheet, trả về
 * toàn bộ thẻ cùng danh sách loại từ và lượt xem mỗi ngày.
 */
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    body = null;
  }
  if (!body || typeof body !== 'object') return fail_('dữ liệu gửi lên không hợp lệ');
  // App bản 1 nhận ra từ theo cột id, mà script này đã bỏ cột đó: nhắc mở lại app để tải bản mới
  if (!(Number(body.api) >= OLDEST_APP)) return fail_('app đang là bản cũ, hãy đóng hẳn app rồi mở lại để cập nhật');

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
    // Tab từ vựng làm trước, để tab trống duy nhất của Sheet mới thành tab english; tab loại từ nằm ngay sau nó, rồi
    // tới tab lượt xem. Lỡ xoá tab nào trong ba tab này thì đến đây cũng được tạo lại.
    words = tagged_(ss, 'words') || makeWords_(ss);
    const types = tagged_(ss, 'types') || makeTypes_(ss, words);
    const log = tagged_(ss, 'log') || makeLog_(ss, types);
    if (created) writeCode_(config || makeConfig_(ss), created);

    const changes = Array.isArray(body.changes) ? body.changes : [];
    const adds = Array.isArray(body.adds) ? body.adds : [];
    const edits = Array.isArray(body.edits) ? body.edits : [];
    const deletes = Array.isArray(body.deletes) ? body.deletes : [];
    const out = sync_(words, changes, adds, edits, deletes);
    // Trường api cho app biết script này ghi được những cột nào (từ bản 3: antonyms và related)
    const res = { ok: true, api: API, items: out.items, types: syncTypes_(types, out.items),
      log: syncLog_(log, body.device, body.views), conflicts: out.conflicts, dupes: out.dupes };
    if (created) res.key = created;
    SpreadsheetApp.flush(); // ghi hết vào Sheet trước khi nhả khoá
    return json_(res);
  } catch (err) {
    return fail_(String((err && err.message) || err));
  } finally {
    lock.releaseLock();
  }
}

function sync_(sheet, changes, adds, edits, deletes) {
  // 1. Đọc tiêu đề ở hàng 1 (sheet trống thì tạo sẵn tiêu đề)
  if (sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, INPUT_COLUMNS.length).setValues([INPUT_COLUMNS]);
  }
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => text_(h).toLowerCase());
  if (header.indexOf('term') === -1) {
    throw new Error('không thấy cột "term" ở hàng 1 của tab ' + sheet.getName());
  }
  // Cột id của bản trước không cần nữa, vì app giờ nhận ra từ theo chữ ở cột term: xoá đi
  const idCol = header.indexOf('id');
  if (idCol !== -1) {
    sheet.deleteColumn(idCol + 1);
    header.splice(idCol, 1);
  }
  // Tab dựng từ bản chưa có cột phonetic (phiên âm): chèn ngay sau cột term, để bạn thấy mà nhập
  if (header.indexOf('phonetic') === -1) {
    const at = header.indexOf('term') + 1;   // số thứ tự (đếm từ 1) của cột term
    sheet.insertColumnsAfter(at, 1);
    sheet.getRange(1, at + 1).setValue('phonetic').setNote(PHONETIC_NOTE);
    header.splice(at, 0, 'phonetic');
  }
  // Tab dựng từ bản chưa có cột synonyms, antonyms hay related (từ liên kết): chèn ngay sau cột nhập cuối cùng,
  // thường là cột type hay cột từ liên kết vừa chèn, để ba cột nằm cạnh nhau
  Object.keys(LINK_NOTES).forEach(name => {
    if (header.indexOf(name) !== -1) return;
    const at = Math.max.apply(null, INPUT_COLUMNS.map(n => header.indexOf(n))) + 1;
    sheet.insertColumnsAfter(at, 1);
    sheet.getRange(1, at + 1).setValue(name).setNote(LINK_NOTES[name]);
    header.splice(at, 0, name);
  });
  // Thiếu cột tự quản lý thì thêm vào cuối. Có từ mới hay bản sửa thì thêm cả cột nhập còn thiếu, để không mất chữ nào
  AUTO_COLUMNS.concat(adds.length || edits.length ? INPUT_COLUMNS : []).forEach(name => {
    if (header.indexOf(name) !== -1) return;
    header.push(name);
    if (header.length > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), 1);
    const cell = sheet.getRange(1, header.length).setValue(name);
    if (name === 'added') cell.setNote(ADDED_NOTE);
  });
  const col = {};
  INPUT_COLUMNS.concat(AUTO_COLUMNS).forEach(name => {
    col[name] = header.indexOf(name);
  });

  const n = sheet.getLastRow() - 1;
  const rows = n > 0 ? sheet.getRange(2, 1, n, header.length).getValues() : [];
  const hasTerm = r => text_(r[col.term]) !== '';
  const stamp = new Date();                // lúc đồng bộ, làm ngày thêm cho dòng mới

  // 2. Mỗi từ một dòng: tìm dòng theo chữ của từ, không phân biệt hoa thường. Sheet có nhiều dòng cùng một từ thì
  //    dùng dòng trên cùng.
  const byTerm = new Map();
  rows.forEach(r => {
    const k = normTerm_(r[col.term]);
    if (k && !byTerm.has(k)) byTerm.set(k, r);
  });

  // 3. Từ đã xoá trong app: xoá dòng của từ đó, không thấy dòng nào thì coi như đã xoá. Làm trước khi thêm từ mới,
  //    để xoá một từ rồi thêm lại đúng từ đó thì thành dòng mới. Dòng được xoá thật ở cuối bước ghi, để không làm lệch
  //    số dòng lúc ghi.
  const removed = new Set();
  deletes.forEach(d => {
    const k = normTerm_(d && d.term);
    const r = byTerm.get(k);
    if (!r) return;
    removed.add(r);
    byTerm.delete(k);
  });

  // 4. Từ mới app gửi lên thì thêm vào cuối tab. Từ đã có dòng thì không thêm dòng nữa, chỉ điền những ô còn trống:
  //    thường là từ đã gửi ở lần trước mà app chưa nhận được trả lời.
  const fresh = [];
  const edited = [];                      // [dòng, tên cột] của các ô cần ghi
  adds.forEach(a => {
    const k = normTerm_(a && a.term);
    if (!k) return;
    const had = byTerm.get(k);
    if (had) {
      INPUT_COLUMNS.forEach(name => {
        const v = text_(a[name]);
        if (!v || text_(had[col[name]]) !== '') return;
        had[col[name]] = v;
        edited.push([had, name]);
      });
      if (!toDate_(had[col.added]) && toDate_(a.added)) had[col.added] = toDate_(a.added);
      return;
    }
    const r = header.map(() => '');
    INPUT_COLUMNS.forEach(name => { r[col[name]] = text_(a[name]); });
    r[col.added] = toDate_(a.added) || stamp;   // không có ngày thêm thì lấy lúc đồng bộ
    r[col.last_seen] = toDate_(a.lastSeen) || '';
    r[col.mastered] = a.mastered === true;
    byTerm.set(k, r);
    fresh.push(r);
  });
  const all = rows.concat(fresh);

  // 5. Dòng mới nhập thẳng vào Sheet: script chưa gặp dòng này nên ô mastered còn trống. Lấy lúc này làm ngày thêm.
  //    Từ có trước khi có cột added thì đã có ô mastered, nên ngày thêm vẫn để trống.
  rows.forEach(r => {
    if (!hasTerm(r) || r[col.mastered] !== '') return;
    if (!toDate_(r[col.added])) r[col.added] = stamp;
    r[col.mastered] = false;
  });

  // 6. Bản sửa từ app: chỉ ghi khi ô trong Sheet vẫn như lúc app lấy về, hoặc đã đúng bản mới. Ô đã được sửa
  //    trong Sheet, hay từ không còn trong Sheet, thì giữ nguyên Sheet và báo từ đó lại cho app.
  const conflicts = [];
  edits.forEach(e => {
    const k = normTerm_(e && e.term);
    const names = EDIT_COLUMNS.filter(name => e && e[name] && typeof e[name] === 'object');
    if (!k || !names.length) return;
    const r = byTerm.get(k);
    const ok = r && names.every(name => {
      const now = text_(r[col[name]]);
      return now === text_(e[name].from) || now === text_(e[name].to);
    });
    if (!ok) {
      conflicts.push(k);
      return;
    }
    names.forEach(name => {
      const to = text_(e[name].to);
      if (text_(r[col[name]]) === to) return;
      r[col[name]] = to;
      edited.push([r, name]);
    });
  });

  // 7. Ghi tiến độ app gửi lên: last_seen giữ mốc mới hơn, mastered lấy giá trị app gửi. Ngày thêm chỉ ghi vào ô
  //    còn trống: app gửi lại ngày của từ đã thêm lúc script chưa có cột added.
  changes.forEach(ch => {
    const r = byTerm.get(normTerm_(ch && ch.term));
    if (!r) return;
    const seen = toDate_(ch.lastSeen);
    const old = toDate_(r[col.last_seen]);
    if (seen && (!old || seen > old)) r[col.last_seen] = seen;
    if (typeof ch.mastered === 'boolean') r[col.mastered] = ch.mastered;
    const added = toDate_(ch.added);
    if (added && !toDate_(r[col.added])) r[col.added] = added;
  });

  // 8. Dòng của từ mới thì ghi mọi cột nhập, ô vừa được sửa hay vừa điền thì ghi riêng ô đó. Ngoài ra chỉ ghi lại
  //    3 cột tự quản lý, không đụng tới các cột bạn nhập. Chữ ghi dạng chữ, để "24/7" không bị đổi thành ngày tháng.
  //    Cuối cùng mới xoá dòng của từ đã xoá.
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
    AUTO_COLUMNS.forEach(name => {
      sheet.getRange(2, col[name] + 1, all.length, 1).setValues(all.map(r => [r[col[name]]]));
    });
    sheet.getRange(2, col.added + 1, all.length, 1).setNumberFormat('dd/mm/yyyy hh:mm');
    sheet.getRange(2, col.last_seen + 1, all.length, 1).setNumberFormat('dd/mm/yyyy hh:mm');
    sheet.getRange(2, col.mastered + 1, all.length, 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
    // Xoá từ dưới lên để số dòng phía trên không đổi. Sheet không cho xoá hết các dòng không cố định,
    // nên nếu cần thì thêm một dòng trống trước khi xoá.
    const gone = all.map((r, i) => removed.has(r) ? i + 2 : 0).filter(Boolean);
    if (gone.length) {
      if (sheet.getMaxRows() - gone.length <= sheet.getFrozenRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
      gone.reverse().forEach(n => sheet.deleteRow(n));
    }
  }

  // 9. Trả về app mỗi từ một thẻ theo thứ tự trong Sheet, lấy dòng trên cùng của từ. Kèm các từ có bản sửa không ghi
  //    được, và các từ có ở nhiều dòng để app báo người dùng gộp lại.
  const items = [];
  const first = new Map();                // từ → chữ ở dòng trên cùng
  const dupes = new Set();
  all.forEach(r => {
    if (!hasTerm(r) || removed.has(r)) return;
    const k = normTerm_(r[col.term]);
    if (first.has(k)) {
      dupes.add(first.get(k));
      return;
    }
    first.set(k, text_(r[col.term]));
    items.push({
      term: text_(r[col.term]),
      phonetic: text_(r[col.phonetic]),
      meaning: col.meaning === -1 ? '' : text_(r[col.meaning]),
      example: col.example === -1 ? '' : text_(r[col.example]),
      type: col.type === -1 ? '' : text_(r[col.type]),
      synonyms: text_(r[col.synonyms]),
      antonyms: text_(r[col.antonyms]),
      related: text_(r[col.related]),
      added: toIso_(r[col.added]),
      lastSeen: toIso_(r[col.last_seen]),
      mastered: r[col.mastered] === true || text_(r[col.mastered]).toUpperCase() === 'TRUE'
    });
  });
  return { items, conflicts, dupes: Array.from(dupes) };
}

/**
 * Tab loại từ: loại đang dùng ở các thẻ mà tab chưa có thì ghi thêm vào cuối, rồi trả về các loại trong tab để app gợi ý.
 * Script chỉ thêm dòng, không sửa hay xoá dòng bạn đã có.
 */
function syncTypes_(sheet, items) {
  if (sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, TYPE_COLUMNS.length).setValues([TYPE_COLUMNS]);
  }
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => text_(h).toLowerCase());
  TYPE_COLUMNS.forEach(name => {
    if (header.indexOf(name) !== -1) return;
    header.push(name);
    if (header.length > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), 1);
    sheet.getRange(1, header.length).setValue(name);
  });
  const ct = header.indexOf('type');
  const ca = header.indexOf('abbr');
  const n = sheet.getLastRow() - 1;
  const rows = n > 0 ? sheet.getRange(2, 1, n, header.length).getValues() : [];

  // Loại đã có trong tab, theo thứ tự dòng. Hoa thường khác nhau vẫn là một loại; ô ghi mấy loại thì tính từng loại.
  const list = [];
  const seen = {};
  const add = (type, abbr) => {
    const k = normTerm_(type);
    if (seen[k]) return false;
    seen[k] = true;
    list.push({ type, abbr });
    return true;
  };
  rows.forEach(r => {
    const names = typesOf_(r[ct]);
    names.forEach(type => add(type, names.length === 1 ? text_(r[ca]) : ''));
  });
  // Loại đang dùng mà tab chưa có, theo thứ tự gặp trong tab từ vựng. Ghi dạng chữ, để "1/2" không thành ngày tháng.
  const fresh = [];
  items.forEach(it => typesOf_(it.type).forEach(type => {
    if (add(type, '')) fresh.push([type]);
  }));
  if (fresh.length) {
    const start = sheet.getLastRow() + 1;
    const short = start + fresh.length - 1 - sheet.getMaxRows();
    if (short > 0) sheet.insertRowsAfter(sheet.getMaxRows(), short);
    sheet.getRange(start, ct + 1, fresh.length, 1).setNumberFormat('@').setValues(fresh);
  }
  return list;
}

/**
 * Tab lượt xem: mỗi dòng là số lượt xem thẻ của một máy trong một ngày. App gửi tổng số lượt của từng ngày chứ không
 * gửi số cộng thêm, và script giữ số lớn hơn, nên gửi lại mấy lần cũng không bị đếm trùng. Trả về số lượt theo ngày
 * của chính máy đó (mine) và của các máy khác cộng lại (others).
 */
function syncLog_(sheet, device, views) {
  if (sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, LOG_COLUMNS.length).setValues([LOG_COLUMNS]);
  }
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => text_(h).toLowerCase());
  LOG_COLUMNS.forEach(name => {
    if (header.indexOf(name) !== -1) return;
    header.push(name);
    if (header.length > sheet.getMaxColumns()) sheet.insertColumnsAfter(sheet.getMaxColumns(), 1);
    sheet.getRange(1, header.length).setValue(name);
  });
  const cd = header.indexOf('date');
  const cv = header.indexOf('views');
  const cm = header.indexOf('device');
  // Ngày ghi trong Sheet theo múi giờ của Sheet, đọc ra cũng theo múi giờ đó, để không lệch sang ngày bên cạnh
  const tz = sheet.getParent().getSpreadsheetTimeZone();
  const dayOf = v => v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : text_(v);
  const n = sheet.getLastRow() - 1;
  const rows = n > 0 ? sheet.getRange(2, 1, n, header.length).getValues() : [];

  // 1. Ghi số lượt của máy này: ngày đã có dòng thì giữ số lớn hơn, ngày chưa có thì thêm dòng ở cuối tab
  const me = /^[\w-]{1,40}$/.test(text_(device)) ? text_(device) : '';
  const own = {};
  if (me) rows.forEach((r, i) => { if (text_(r[cm]) === me) own[dayOf(r[cd])] = i; });
  const sent = me && views && typeof views === 'object' && !Array.isArray(views) ? views : {};
  const fresh = [];
  Object.keys(sent).forEach(day => {
    const v = Math.floor(Number(sent[day]));
    if (!(v > 0) || !isDay_(day, tz)) return;
    if (Object.prototype.hasOwnProperty.call(own, day)) {
      const r = rows[own[day]];
      if (v > (Number(r[cv]) || 0)) {
        r[cv] = v;
        sheet.getRange(own[day] + 2, cv + 1).setValue(v);
      }
      return;
    }
    const r = header.map(() => '');
    r[cd] = Utilities.parseDate(day, tz, 'yyyy-MM-dd');
    r[cv] = v;
    r[cm] = me;
    fresh.push(r);
  });
  if (fresh.length) {
    const start = rows.length + 2;
    const short = start + fresh.length - 1 - sheet.getMaxRows();
    if (short > 0) sheet.insertRowsAfter(sheet.getMaxRows(), short);
    sheet.getRange(start, cd + 1, fresh.length, 1).setNumberFormat('dd/mm/yyyy');
    sheet.getRange(start, cm + 1, fresh.length, 1).setNumberFormat('@');
    sheet.getRange(start, 1, fresh.length, header.length).setValues(fresh);
  }

  // 2. Cộng theo ngày. Một máy lỡ có hai dòng cùng ngày (dòng bị copy) thì chỉ lấy dòng lớn hơn.
  const best = {};
  rows.concat(fresh).forEach(r => {
    const day = dayOf(r[cd]);
    const v = Math.floor(Number(r[cv]));
    if (!DAY.test(day) || !(v > 0)) return;
    const k = text_(r[cm]) + '|' + day;
    best[k] = Math.max(best[k] || 0, v);
  });
  const mine = {};
  const others = {};
  Object.keys(best).forEach(k => {
    const at = k.lastIndexOf('|');
    const bag = me && k.slice(0, at) === me ? mine : others;
    const day = k.slice(at + 1);
    bag[day] = (bag[day] || 0) + best[k];
  });
  return { mine, others };
}

/** Chuỗi dạng 2026-10-27 là một ngày có thật. */
function isDay_(s, tz) {
  if (!DAY.test(s)) return false;
  try {
    return Utilities.formatDate(Utilities.parseDate(s, tz, 'yyyy-MM-dd'), tz, 'yyyy-MM-dd') === s;
  } catch (err) {
    return false;
  }
}

/** Tab mang thẻ ẩn của app (role là 'words', 'types', 'log' hoặc 'config'); người dùng đổi tên tab thì vẫn nhận ra. */
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
  const note = (name, text) => sheet.getRange(1, head.indexOf(name) + 1).setNote(text);
  note('term', 'Mỗi từ một dòng: app nhận ra từ theo chữ ở cột này, không phân biệt hoa thường. Hai dòng cùng một từ thì app chỉ dùng dòng trên cùng.');
  note('phonetic', PHONETIC_NOTE);
  note('meaning', 'Từ có nhiều loại: mỗi nghĩa một dòng, mở đầu bằng loại viết tắt như (n), (v). Xuống dòng trong ô bằng Ctrl+Enter.');
  note('example', 'Bọc *cụm từ* để in đậm. Nhiều ví dụ thì xuống dòng trong ô bằng Ctrl+Enter.');
  note('type', 'Loại từ như noun, verb, adjective, hoặc grammar cho cấu trúc ngữ pháp. Nhiều loại thì cách nhau bằng dấu phẩy: noun, verb. Loại mới được thêm vào tab types để app gợi ý. Bỏ trống cũng được.');
  Object.keys(LINK_NOTES).forEach(name => note(name, LINK_NOTES[name]));
  note('added', ADDED_NOTE);
  return sheet;
}

/** Tạo tab loại từ ngay sau tab từ vựng. */
function makeTypes_(ss, words) {
  const sheet = newTab_(ss, TYPES_TAB, words.getIndex());
  tag_(sheet, 'types');
  sheet.getRange(1, 1, 1, TYPE_COLUMNS.length).setValues([TYPE_COLUMNS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1).setNote('Các loại app gợi ý khi thêm từ. Loại nào dùng ở tab từ vựng mà chưa có ở đây thì script tự thêm vào cuối. Loại không dùng nữa thì xoá dòng đó.');
  sheet.getRange(1, 2).setNote('Viết tắt đặt trước nghĩa khi một từ có nhiều loại, ví dụ (n) cuộc chạy. Bỏ trống thì noun là n, verb là v, adjective là adj, adverb là adv…, loại khác dùng nguyên tên.');
  return sheet;
}

/** Tạo tab lượt xem ngay sau tab loại từ. */
function makeLog_(ss, types) {
  const sheet = newTab_(ss, LOG_TAB, types.getIndex());
  tag_(sheet, 'log');
  sheet.getRange(1, 1, 1, LOG_COLUMNS.length).setValues([LOG_COLUMNS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1).setNote('App tự ghi tab này. Mỗi dòng là số lượt xem thẻ của một máy (cột device) trong một ngày. Cộng các dòng cùng ngày là số lượt xem của ngày đó.');
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

/** So term, và so loại từ, như app: không phân biệt hoa thường và khoảng trắng thừa. */
function normTerm_(v) {
  return text_(v).normalize('NFC').replace(/\s+/g, ' ').toLowerCase();
}

/** "noun,  phrasal   verb" → ['noun', 'phrasal verb'] */
function typesOf_(v) {
  return text_(v).split(',').map(t => t.trim().replace(/\s+/g, ' ')).filter(Boolean);
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
