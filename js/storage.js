// Lưu thẻ, thay đổi chưa đồng bộ, cài đặt và lượt xem trong máy
'use strict';

/* ---------- Lưu trong máy ---------- */
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (_) { return fallback; }
}
function store(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; }
}
function persist() {
  if (demo) return true;
  const ok = store(KEYS.items, items) && store(KEYS.pending, pending) && store(KEYS.edits, edits)
    && store(KEYS.deletes, deletes) && store(KEYS.base, base) && store(KEYS.log, log);
  if (!ok) toast('Không lưu được vào bộ nhớ máy. Kiểm tra dung lượng trống.');
  return ok;
}
// Các từ có thay đổi chưa gửi lên Sheet: tiến độ học, bản sửa, từ đã xoá, hoặc từ mới thêm trong app
function changedKeys() {
  const keys = new Set(Object.keys(pending).concat(Object.keys(edits), Object.keys(deletes)));
  items.forEach(x => { if (x.local) keys.add(keyOf(x)); });
  return keys;
}
// Số thẻ có thay đổi chưa gửi lên Sheet, mỗi thẻ tính một lần
function unsynced() { return changedKeys().size; }
// Chụp bản gốc của thẻ ngay trước thay đổi đầu tiên, lúc thẻ còn đúng như trong Sheet. Thẻ đã có thay đổi mà chưa có bản
// gốc (thay đổi làm ở bản app trước) thì không chụp, vì thẻ đã khác Sheet
function keepBase(it) {
  const k = keyOf(it);
  if (!it.local && !base[k] && !pending[k] && !edits[k] && !deletes[k]) base[k] = Object.assign({}, it);
}
function recordChange(item, patch) {
  if (!demo) keepBase(item);             // trước khi đổi thẻ
  Object.assign(item, patch);
  if (!demo) {
    const k = keyOf(item);
    pending[k] = Object.assign({}, pending[k], patch);
    if (patch.lastSeen) {                // mỗi lần ghi last seen lúc học là một lượt xem
      const day = dayKey(new Date(patch.lastSeen));
      log.mine[day] = (log.mine[day] || 0) + 1;
    }
    persist();
  }
  renderTop();
}
// Ngày có lượt xem của máy này mà Sheet chưa ghi đủ
function unsentViews() {
  const out = {};
  Object.keys(log.mine).forEach(d => { if (log.mine[d] > (log.synced[d] || 0)) out[d] = log.mine[d]; });
  return out;
}
// Đọc lượt xem lưu trong máy. Lần đầu mở bản app có thống kê thì đặt tên cho máy
function loadLog() {
  const o = load(KEYS.log, null) || {};
  const fresh = typeof o.device !== 'string' || !o.device;
  log = { device: fresh ? newDevice() : o.device, mine: counts(o.mine), synced: counts(o.synced), others: counts(o.others) };
  if (fresh) store(KEYS.log, log);
}
// Bản sửa chưa gửi được thì trả về hàng đợi; ô nào sửa thêm trong lúc chờ thì giữ "from" cũ, "to" mới
function keepEdits(sent) {
  Object.keys(sent).forEach(k => {
    const ed = Object.assign({}, sent[k]);
    Object.keys(edits[k] || {}).forEach(name => {
      ed[name] = { from: sent[k][name] ? sent[k][name].from : edits[k][name].from, to: edits[k][name].to };
    });
    edits[k] = ed;
  });
}
// Áp các bản sửa còn trong máy lên thẻ vừa nhận từ Sheet. Từ đổi chữ mà Sheet chưa nhận thì Sheet còn ghi chữ cũ: tìm
// thẻ theo chữ cũ, đổi chữ, rồi đổi chữ đó ở ô từ liên kết như lúc đổi trong máy
function applyEdits() {
  const byKey = new Map(items.map(x => [keyOf(x), x]));
  Object.keys(edits).forEach(k => {
    const ed = edits[k], rn = ed && ed.term;     // đổi chữ của từ trước có thể đã làm một bản sửa thành thừa, bị bỏ
    const it = ed && byKey.get(rn ? normTerm(rn.from) : k);
    if (!it) return;
    Object.keys(ed).forEach(name => { it[name] = ed[name].to; });
    if (rn) relinkAll(normTerm(rn.from), rn.to);
  });
}
// Mỗi từ một thẻ: có hai thẻ cùng một từ (Sheet có dòng trùng, hay dữ liệu từ bản app trước) thì giữ thẻ đầu
function dedupe(list) {
  const seen = new Set();
  return list.filter(x => {
    const k = keyOf(x);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
// Bản app trước nhận ra thẻ theo id. Lần đầu mở bản này thì chuyển các thay đổi chưa đồng bộ sang tra theo từ, rồi bỏ id.
// Lệnh xoá một từ mà bộ thẻ vẫn còn thẻ cùng từ lấy từ Sheet (Sheet có hai dòng trùng) thì bỏ, để không xoá nhầm dòng.
// Còn thẻ cùng từ mới thêm trong app (xoá rồi thêm lại) thì giữ: dòng cũ bị xoá, từ mới thành dòng mới.
function migrate() {
  if (!items.some(x => 'id' in x)) return;
  const keyById = new Map(items.map(x => [x.id, keyOf(x)]));
  const rekey = o => {
    const out = dict();
    Object.keys(o).forEach(id => {
      const k = keyById.get(id);
      if (k) out[k] = Object.assign({}, out[k], o[id]);
    });
    return out;
  };
  pending = rekey(pending);
  edits = rekey(edits);
  const kept = dict();
  Object.keys(deletes).forEach(id => {
    const term = deletes[id] && deletes[id].term, k = normTerm(term);
    if (k && !items.some(x => !x.local && keyOf(x) === k)) kept[k] = { term };
  });
  deletes = kept;
  items = dedupe(items);
  items.forEach(x => { delete x.id; });
  persist();
}
