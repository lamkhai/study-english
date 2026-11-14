// Thay đổi chưa đồng bộ: xem và bỏ từng thay đổi
'use strict';

/* ---------- Thay đổi chưa đồng bộ ----------
   Xem các từ có thay đổi chưa gửi lên Sheet, và bỏ thay đổi của một từ hay của tất cả, kể cả lúc không có mạng. Bỏ thì
   từ trở về như lúc đồng bộ gần nhất: từ mới thêm trong app thì mất, từ đã xoá thì hiện lại, bản sửa và tiến độ học thì
   về như cũ. Lượt xem trong Thống kê thì giữ, vì thẻ vẫn đã được xem. */
// Tên các ô sửa được, theo thứ tự trong bảng Thêm/Sửa từ
const FIELDS = Object.assign({ term: 'Từ', phonetic: 'Phiên âm', type: 'Loại từ', meaning: 'Nghĩa' },
  Object.fromEntries(LINKS.map(L => [L.name, cap(L.label)])), { example: 'Ví dụ' });
// Các nhóm trong danh sách, theo thứ tự hiện. Từ có mấy loại thay đổi thì vào nhóm đứng trước
const KINDS = [
  { kind: 'add', name: 'Từ mới' }, { kind: 'edit', name: 'Đã sửa' }, { kind: 'del', name: 'Đã xoá' },
  { kind: 'done', name: 'Đã nắm rõ' }, { kind: 'seen', name: 'Đã xem' }, { kind: 'other', name: 'Khác' }
];
// Lúc xem thẻ: hôm nay lúc 14:32
function seenAt(iso) {
  const d = new Date(iso);
  return `${agoText(daysAgo(iso))} lúc ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
// Nghĩa của từ trên một dòng, như ở Tất cả từ
function gistLine(it) { return esc(lines(it.meaning).join(' · ').replace(/\*/g, '')); }
// Một ô đã sửa: Nghĩa: cũ → mới. Ô nhiều dòng thì nối các dòng bằng dấu ·
function fieldLine(name, from, to) {
  const val = (s, tag) => {
    const t = lines(s).join(' · ');
    return t ? `<${tag}>${esc(t)}</${tag}>` : '<em>trống</em>';
  };
  return `${FIELDS[name]}: ${val(from, 'del')} → ${val(to, 'ins')}`;
}
// Mỗi từ có thay đổi chưa đồng bộ một mục: { k, term, kind (nhóm), info (các dòng mô tả, dạng HTML), at (để xếp: mới
// trước), later (bỏ lệnh xoá mà chưa có bản gốc: từ chỉ hiện lại sau lần đồng bộ kế tiếp) }
function changeList() {
  const byKey = new Map(items.map(x => [keyOf(x), x]));
  const out = [];
  changedKeys().forEach(k => {
    const it = byKey.get(k), p = pending[k] || {}, ed = edits[k] || {}, b = base[k];
    const term = (it || deletes[k] || b || { term: k }).term;
    const info = [];
    let kind, at = 0;
    if (it && it.local) {                // bản sửa và tiến độ học của từ mới thì đi cùng từ mới, không cần ghi riêng
      kind = 'add';
      at = Date.parse(it.added) || 0;
      if (deletes[k]) info.push('Xoá dòng cũ trong Sheet, thêm lại thành dòng mới');
      info.push(gistLine(it));
    } else if (deletes[k]) {
      kind = 'del';
      if (b) info.push(gistLine(b));
    } else {
      const seen = validDate(p.lastSeen);
      const done = p.mastered === true, undone = p.mastered === false && !!b && b.mastered === true;
      kind = Object.keys(ed).length ? 'edit' : done ? 'done' : seen ? 'seen' : 'other';
      if (kind === 'done' || kind === 'seen') at = Date.parse(p.lastSeen) || 0;
      Object.keys(FIELDS).forEach(name => { if (ed[name]) info.push(fieldLine(name, ed[name].from, ed[name].to)); });
      // Nhóm Đã nắm rõ và Đã xem chỉ cần ghi lúc xem
      const what = undone ? 'Bỏ đánh dấu nắm rõ' : kind !== 'edit' ? '' : done ? 'Đã nắm rõ' : seen ? 'Đã xem' : '';
      const line = [what, seen ? seenAt(p.lastSeen) : ''].filter(Boolean).join(' ');
      if (line) info.push(cap(line));
      if (validDate(p.added)) info.push(`Ghi ngày thêm ${fmtDate(p.added)} vào Sheet`);
      if (!it) info.push('Từ này không còn trong bộ thẻ');
    }
    out.push({ k, term, kind, info: info.filter(Boolean), at, later: !!deletes[k] && !b });
  });
  // Chưa có giờ để xếp (bản sửa, từ đã xoá) thì thay đổi làm sau đứng trước
  const rank = new Map(KINDS.map((K, i) => [K.kind, i]));
  return out.reverse().sort((x, y) => rank.get(x.kind) - rank.get(y.kind) || y.at - x.at);
}
function renderChanges() {
  if (!$chg.open) return;
  $chgSync.disabled = syncing;
  $chgSync.textContent = syncing ? 'Đang đồng bộ…' : 'Đồng bộ';
  // Đang đồng bộ thì các thay đổi đang trên đường lên Sheet: giữ danh sách đang hiện nhưng chưa cho bỏ, đợi Sheet trả
  // lời rồi mới vẽ lại
  if (syncing) {
    $chgAll.disabled = true;
    $chgBody.querySelectorAll('.cx').forEach(b => { b.disabled = true; });
    $chgNote.textContent = 'Đang gửi các thay đổi lên Sheet…';
    return;
  }
  chgList = changeList();
  $chgAll.disabled = !chgList.length;
  $chgNote.textContent = chgList.length
    ? `${NUM.format(chgList.length)} từ có thay đổi chưa gửi lên Sheet. Bấm Đồng bộ để gửi. Bấm Bỏ ở một từ thì từ đó `
      + 'trở về như lúc đồng bộ gần nhất: từ mới thêm thì mất, từ đã xoá thì hiện lại.'
    : 'Không còn thay đổi nào chưa gửi lên Sheet.' + (lastSync ? ` Đồng bộ gần nhất lúc ${fmtDateTime(lastSync)}.` : '');
  let html = '', kind = '';
  chgList.forEach((e, i) => {
    if (e.kind !== kind) {
      const n = chgList.filter(x => x.kind === e.kind).length;
      html += `${kind ? '</ul>' : ''}<h3>${KINDS.find(K => K.kind === e.kind).name}<small>${NUM.format(n)}</small></h3><ul>`;
      kind = e.kind;
    }
    html += `<li><div class="cw"><p class="ct"><b>${esc(e.term)}</b></p>`
      + e.info.map(l => `<p class="cd">${l}</p>`).join('')
      + `</div><button class="cx" type="button" data-i="${i}" aria-label="Bỏ thay đổi của “${esc(e.term)}”">Bỏ</button></li>`;
  });
  $chgBody.innerHTML = html + (kind ? '</ul>' : '');
}
function openChanges() {
  if (!$chg.open) $chg.showModal();
  // Mở lúc đang đồng bộ thì chưa biết các thay đổi đang gửi đi: danh sách để trống cho tới khi Sheet trả lời
  if (syncing) { chgList = []; $chgBody.textContent = ''; }
  renderChanges();
  $chgBox.scrollTop = 0;
}

// Thẻ như trong Sheet ở lần đồng bộ gần nhất. Thẻ có thay đổi từ bản app trước thì chưa có bản gốc: lấy thẻ trong máy,
// trả các ô đã sửa về như cũ, và bỏ đánh dấu nắm rõ (chỉ thẻ chưa nắm rõ mới bấm Đã nắm rõ được); last seen thì đợi lần
// đồng bộ sau. Từ mới thêm trong app, hay từ đã xoá mà chưa có bản gốc, thì không có
function sheetCopy(k, it) {
  if (base[k]) return fill(Object.assign({}, base[k]));
  if (!it || it.local) return null;
  const x = Object.assign({}, it);
  Object.keys(edits[k] || {}).forEach(name => { x[name] = edits[k][name].from; });
  if (pending[k] && pending[k].mastered === true) x.mastered = false;
  return x;
}
// Bỏ mọi thay đổi chưa đồng bộ của từ k. Thẻ cũ được thay bằng bản như trong Sheet chứ không bị sửa, nên hoàn tác chỉ
// cần đặt thẻ cũ về chỗ. Từ vừa đổi chữ thì về chữ cũ, và các thẻ ghi nó ở ô từ liên kết cũng về chữ cũ. Trả về hàm
// hoàn tác
function dropChanges(k) {
  const at = items.findIndex(x => keyOf(x) === k);
  const old = at === -1 ? null : items[at], copy = sheetCopy(k, old);
  const rn = edits[k] && edits[k].term;
  const was = { pending: pending[k], edits: edits[k], deletes: deletes[k], base: base[k] };
  delete pending[k];
  delete edits[k];
  delete deletes[k];
  delete base[k];
  if (old && copy) items[at] = copy;
  else if (old) items.splice(at, 1);
  else if (copy) {                       // từ đã xoá hiện lại, sau các thẻ lấy từ Sheet
    const end = items.findIndex(x => x.local);
    items.splice(end === -1 ? items.length : end, 0, copy);
  }
  if (rn) relinkAll(k, rn.from);
  return () => {
    if (was.pending) pending[k] = was.pending;
    if (was.edits) edits[k] = was.edits;
    if (was.deletes) deletes[k] = was.deletes;
    if (was.base) base[k] = was.base;
    const i = copy ? items.indexOf(copy) : -1;
    if (old && i !== -1) items[i] = old;
    else if (old) items.splice(Math.min(at, items.length), 0, old);
    else if (i !== -1) items.splice(i, 1);
    if (rn) relinkAll(normTerm(rn.from), rn.to);
  };
}
// Thẻ đang học vừa được thay hay bị bỏ: hiện thẻ cùng từ nếu còn và chưa nắm rõ, không thì sang thẻ khác. Chưa có thẻ nào
// để học thì cũng chọn lại, vì có khi vừa có thẻ hết nắm rõ
function reshow() {
  const k = current ? keyOf(current) : '';
  const same = k ? items.find(x => keyOf(x) === k) : null;
  if (same && !same.mastered) show(same); else next();
}
// Bộ thẻ vừa đổi vì bỏ thay đổi hay hoàn tác: vẽ lại thẻ đang học, danh sách thay đổi và Tất cả từ, rồi lưu
function afterDiscard() {
  reshow();
  renderTop();
  renderChanges();
  refreshLib();
  return persist();
}
function discardOne(i) {
  const e = chgList[i];
  if (!e || syncing) return;
  const undo = dropChanges(e.k), runs = syncRuns;
  if (!afterDiscard()) return;
  toast(`Đã bỏ thay đổi của “${e.term}”.${e.later ? ' Từ này hiện lại sau lần đồng bộ kế tiếp.' : ''}`, 'Hoàn tác', () => {
    // Đã đồng bộ từ lúc bỏ thì thôi, vì bộ thẻ giờ là bản Sheet vừa trả về
    if (syncing || runs !== syncRuns) { toast('Đã đồng bộ nên không hoàn tác được nữa.'); return; }
    undo();
    afterDiscard();
  });
}
function askDiscardAll() {
  if (syncing || !chgList.length) return;
  const adds = chgList.filter(e => e.kind === 'add').length, rest = chgList.length - adds;
  confirmAct('Bỏ mọi thay đổi chưa đồng bộ?',
    [rest ? `${NUM.format(rest)} từ trở về như lúc đồng bộ gần nhất.` : '',
      adds ? `${NUM.format(adds)} từ mới thêm trong app sẽ mất hẳn.` : ''].filter(Boolean).join(' '),
    'Bỏ thay đổi', discardAll);
}
function discardAll() {
  $del.close();
  if (syncing) return;
  const keys = changedKeys();
  const later = Array.from(keys).some(k => deletes[k] && !base[k]);
  keys.forEach(k => dropChanges(k));
  if (afterDiscard()) {
    toast(later ? 'Đã bỏ mọi thay đổi. Từ đã xoá hiện lại sau lần đồng bộ kế tiếp.' : 'Đã bỏ mọi thay đổi chưa đồng bộ.');
  }
}
