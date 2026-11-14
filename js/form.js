// Bảng Thêm/Sửa từ
'use strict';

/* ---------- Thêm và sửa từ ----------
   Mỗi từ một thẻ: gõ một từ đã có thì bảng chuyển sang sửa thẻ đó, không thêm thẻ trùng.
   Từ mới và bản sửa vào máy ngay, kể cả lúc không có mạng; lần đồng bộ sau mới ghi vào Sheet. */
function findWord(term) {
  const k = normTerm(term);
  return demo || !k ? null : items.find(x => keyOf(x) === k) || null;
}
/* Loại từ do người dùng tự tạo. Gợi ý gồm các loại ở tab types của Sheet và các loại đang dùng ở các thẻ,
   loại dùng nhiều đứng trước. Loại mới chỉ được lưu khi từ mang nó được lưu. */
function knownTypes() {
  const seen = new Map();                // normTerm(loại) → { type, uses, order }
  const add = (t, uses) => {
    const k = normTerm(t);
    if (!seen.has(k)) seen.set(k, { type: typeName(t), uses: 0, order: seen.size });
    seen.get(k).uses += uses;
  };
  types.forEach(x => add(x.type, 0));
  if (!demo) items.forEach(it => typesOf(it.type).forEach(t => add(t, 1)));
  return Array.from(seen.values()).sort((a, b) => b.uses - a.uses || a.order - b.order).map(x => x.type);
}
function checkedTypes() { return picked.slice(); }
// Chọn đúng các loại trong list, không đụng tới các cặp Nghĩa – Ví dụ
function setTypes(list) {
  picked = [];
  list.forEach(t => { if (!picked.some(x => normTerm(x) === normTerm(t))) picked.push(typeName(t)); });
  renderTypes();
}
// Hai danh sách (loại từ, từ liên kết) có cùng các mục, không kể thứ tự và hoa thường
function sameSet(a, b) {
  const x = new Set(a.map(normTerm)), y = new Set(b.map(normTerm));
  return x.size === y.size && Array.from(y).every(t => x.has(t));
}
// Viết tắt đặt trước nghĩa: cột abbr ở tab types; bỏ trống thì viết tắt quen thuộc, không có nữa thì nguyên tên
function abbr(type) {
  const k = normTerm(type);
  const t = types.find(x => normTerm(x.type) === k);
  return (t && t.abbr) || ABBR[k] || typeName(type);
}
// Vẽ các mục đã chọn (loại từ, từ liên kết) thành thẻ nhỏ trong ô, ngay trước chỗ gõ
function drawTags(box, input, list, label) {
  box.querySelectorAll('.tag').forEach(el => el.remove());
  list.forEach(t => {
    const el = document.createElement('span');
    el.className = 'tag';
    el.dataset.value = t;
    el.innerHTML = `<span>${esc(t)}</span><button type="button" aria-label="${label} ${esc(t)}">×</button>`;
    box.insertBefore(el, input);
  });
}
// Nút gợi ý bên dưới ô. Có label là nút thêm mục mới, viền nét đứt
function chip(value, label) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.value = value;
  b.textContent = label || value;
  if (label) b.className = 'new';
  return b;
}
// Ô chọn nhiều mục (loại từ, từ liên kết): chạm gợi ý để chọn, chạm × để bỏ, chạm vào ô để gõ. Gõ dấu phẩy là xong
// một mục; ô đang trống mà bấm xoá lùi thì bỏ mục cuối cùng. Nhấn giữ trên nút không lấy focus khỏi ô đang gõ, để bàn
// phím điện thoại không bị đóng rồi mở lại
function tagField(box, input, sugg, pick, unpick, chosen, refresh) {
  sugg.addEventListener('mousedown', e => e.preventDefault());
  sugg.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const keyboard = document.activeElement === b;      // chọn bằng Tab rồi Enter: trả focus về ô gõ
    pick(b.dataset.value);
    if (keyboard) input.focus();
  });
  box.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
  box.addEventListener('click', e => {
    const x = e.target.closest('.tag button');
    if (!x) { input.focus(); return; }
    const keyboard = document.activeElement === x;
    unpick(x.parentNode.dataset.value);
    if (keyboard) input.focus();
  });
  input.addEventListener('input', () => {
    if (input.value.includes(',')) {
      const parts = input.value.split(',');
      const rest = parts.pop();
      parts.forEach(t => pick(t));
      input.value = rest.replace(/^\s+/, '');
    }
    refresh();
    checkAdd();
  });
  input.addEventListener('keydown', e => {
    const list = chosen();
    if (e.key === 'Backspace' && !input.value && list.length && !e.isComposing) unpick(list[list.length - 1]);
  });
}
// Vẽ lại các loại đã chọn trong ô, và hàng gợi ý bên dưới
function renderTypes() {
  drawTags($tags, $typeIn, picked, 'Bỏ loại');
  $typeIn.placeholder = picked.length ? '' : 'Gõ để tìm hoặc thêm loại';
  renderSugg();
}
// Chưa gõ gì: gợi ý mọi loại chưa chọn. Đang gõ: chỉ các loại có chữ vừa gõ (khớp từ đầu thì đứng trước),
// cộng nút tạo loại mới nếu chưa loại nào trùng tên
function renderSugg() {
  const q = typeName($typeIn.value), k = normTerm(q);
  const chosen = new Set(picked.map(normTerm));
  const known = knownTypes();
  let list = known.filter(t => !chosen.has(normTerm(t)));
  if (k) {
    list = list.filter(t => normTerm(t).includes(k))
      .sort((a, b) => normTerm(b).startsWith(k) - normTerm(a).startsWith(k));
  }
  const chips = list.map(t => chip(t));
  if (k && !chosen.has(k) && !known.some(t => normTerm(t) === k)) chips.push(chip(q, `+ Thêm “${q}”`));
  $sugg.replaceChildren(...chips);
}
// Chọn một loại: loại đã có thì giữ đúng cách viết đã có, chưa có thì thành loại mới. Loại nào cũng có ít nhất một cặp
// Nghĩa – Ví dụ: chọn loại đầu tiên thì các cặp chưa có loại thành của loại đó, chọn thêm loại thì có thêm một cặp trống
function pickType(name) {
  const t = typeName(name);
  $typeIn.value = '';
  if (t && !picked.some(x => normTerm(x) === normTerm(t))) {
    const type = knownTypes().find(x => normTerm(x) === normTerm(t)) || t;
    if (picked.length) senses.push(blankSense(type));
    else senses.forEach(s => { s.type = type; });
    picked.push(type);
    tidySenses();
    renderSenses();
  }
  renderTypes();
  checkAdd();
}
// Bỏ một loại: bỏ luôn các cặp của loại đó, cặp đã gõ thì có Hoàn tác. Bỏ loại cuối cùng thì các cặp đã gõ ở lại, thành
// chưa có loại, để chọn loại khác thay vào là xong
function unpickType(name) {
  const t = picked.find(x => normTerm(x) === normTerm(name));
  if (!t) return;
  const undo = senseUndo(), k = normTerm(t);
  const lost = picked.length > 1 ? senses.filter(s => normTerm(s.type) === k && senseFilled(s)).length : 0;
  picked = picked.filter(x => x !== t);
  if (picked.length) senses = senses.filter(s => normTerm(s.type) !== k);
  else senses = senses.filter(senseFilled);
  tidySenses();
  renderTypes();
  renderSenses();
  checkAdd();
  if (lost) toast(`Đã bỏ loại “${t}” cùng ${lost} nghĩa của nó.`, 'Hoàn tác', undo);
}

/* Cặp Nghĩa – Ví dụ trong bảng Thêm/Sửa từ (xem parseSenses). Các cặp chia nhóm theo loại đã chọn, mỗi nhóm có nút
   + nghĩa (v) để thêm cặp. Chỉ vẽ lại các cặp khi thêm, bỏ cặp hay đổi loại; lúc gõ thì không, để con trỏ không nhảy */
function blankSense(type) { return { type, mean: '', ex: '' }; }
function senseFilled(s) { return !!(s.mean.trim() || lines(s.ex).length); }
// Xếp các nghĩa theo thứ tự loại trong order, cùng một loại thì giữ thứ tự cũ
function byType(list, order) {
  const at = s => Math.max(0, order.findIndex(t => normTerm(t) === normTerm(s.type)));
  return list.map((s, i) => [s, i]).sort((a, b) => at(a[0]) - at(b[0]) || a[1] - b[1]).map(x => x[0]);
}
// Các cặp trong bảng sửa theo thẻ đã đọc (parseSenses): xếp theo thứ tự loại, bỏ nghĩa trống
function sensesOf(p, order) {
  return byType(p.list.filter(s => s.mean || s.ex.length), order)
    .map(s => ({ type: s.type, mean: s.mean, ex: s.ex.join('\n') }));
}
// Giữ các cặp khớp với các loại đã chọn: chưa chọn loại thì mọi cặp chưa có loại; đã chọn thì các cặp xếp theo thứ tự
// loại, loại nào cũng có ít nhất một cặp. Bảng lúc nào cũng có ít nhất một cặp
function tidySenses() {
  if (picked.length) {
    senses.forEach(s => { if (!picked.some(t => normTerm(t) === normTerm(s.type))) s.type = picked[0]; });
    picked.forEach(t => { if (!senses.some(s => normTerm(s.type) === normTerm(t))) senses.push(blankSense(t)); });
    senses = byType(senses, picked);
  } else {
    senses.forEach(s => { s.type = ''; });
  }
  if (!senses.length) senses.push(blankSense(''));
}
// Đặt các cặp trong bảng. Từ cũ có ví dụ chưa gắn nghĩa (loose) thì hiện thêm ô Ví dụ chưa gắn nghĩa
function setSenses(list, loose) {
  senses = list;
  tidySenses();
  $loose.value = loose.join('\n');
  $looseBox.hidden = !loose.length;
  renderSenses();
}
// Hai ô meaning và example theo các cặp đang có trong bảng
function senseCells() {
  return writeSenses(senses.map(s => ({ type: s.type, mean: s.mean.trim(), ex: lines(s.ex) })), lines($loose.value));
}
// Vẽ lại các cặp. Mỗi cặp: nhãn, nút × (nhóm có từ hai cặp), ô Nghĩa, ô Ví dụ. Cuối mỗi nhóm là nút thêm cặp
function renderSenses() {
  const tags = tagList(senses);
  $senses.innerHTML = (picked.length ? picked : ['']).map(g => {
    const k = normTerm(g), own = [];
    senses.forEach((s, i) => { if (normTerm(s.type) === k) own.push(i); });
    const pairs = own.map(i => {
      const tag = tags[i] ? `(${tags[i]})` : '', name = esc(tag ? ` ${tag}` : '');
      const del = own.length > 1 ? `<button type="button" data-del="${i}" aria-label="Bỏ nghĩa${name}">×</button>` : '';
      return '<div class="sense">'
        + (tag || del ? `<div class="shead"><i>${esc(tag)}</i>${del}</div>` : '')
        + `<textarea class="smean" data-i="${i}" data-f="mean" rows="1" autocapitalize="none" enterkeyhint="next" `
        + `placeholder="${i ? 'Nghĩa' : 'Nghĩa: bù đắp cho'}" aria-label="Nghĩa${name}"></textarea>`
        + `<textarea class="sex" data-i="${i}" data-f="ex" rows="2" `
        + `placeholder="${i ? 'Ví dụ' : 'Ví dụ: He stayed late to *make up for* the lost time.'}" `
        + `aria-label="Ví dụ${name}"></textarea></div>`;
    }).join('');
    const add = g ? `+ nghĩa (${abbr(g)})` : '+ Thêm nghĩa';
    return `${pairs}<div class="chips"><button type="button" class="new" data-add="${esc(g)}">${esc(add)}</button></div>`;
  }).join('');
  $senses.querySelectorAll('textarea').forEach(el => {
    el.value = senses[el.dataset.i][el.dataset.f];
    fit(el);
  });
}
// Ô trong cặp cao vừa đủ chữ. Bảng đang đóng thì chưa đo được: showAdd đo lại lúc mở bảng
function fit(el) {
  if (!el.offsetWidth) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
}
// Con trỏ vào ô Nghĩa của cặp thứ i; không ghi i thì vào ô Nghĩa trống đầu tiên
function focusSense(i) {
  const all = Array.from($senses.querySelectorAll('.smean'));
  const el = i === undefined ? all.find(x => !x.value.trim()) || all[0] : all.find(x => Number(x.dataset.i) === i);
  if (el) el.focus();
}
// Nút + nghĩa (v): thêm cặp trống ngay sau các cặp của loại đó, con trỏ vào ô Nghĩa của cặp mới
function addSense(type) {
  const k = normTerm(type);
  let at = -1;
  senses.forEach((s, i) => { if (normTerm(s.type) === k) at = i; });
  senses.splice(at + 1, 0, blankSense(type));
  renderSenses();
  focusSense(at + 1);
  checkAdd();
}
// Nút × của một cặp: bỏ luôn, cặp đã gõ thì có Hoàn tác
function removeSense(i) {
  const s = senses[i];
  if (!s) return;
  const undo = senseUndo(), tag = tagList(senses)[i];
  senses.splice(i, 1);
  tidySenses();
  renderSenses();
  checkAdd();
  if (!senseFilled(s)) return;
  toast(s.mean.trim() ? `Đã bỏ nghĩa “${s.mean.trim()}”.` : `Đã bỏ nghĩa (${tag}) cùng ví dụ của nó.`, 'Hoàn tác', undo);
}
// Hoàn tác việc bỏ cặp hay bỏ loại: các loại và các cặp về như trước. Bảng đã trống lại hay đã nạp từ khác thì thôi
function senseUndo() {
  const run = formRun, was = { picked: picked.slice(), senses: senses.map(s => Object.assign({}, s)) };
  return () => {
    if (run !== formRun || !$add.open) return;
    picked = was.picked;
    senses = was.senses;
    renderTypes();
    renderSenses();
    checkAdd();
  };
}

// Đặt các từ trong ô của loại L: bỏ từ trùng, và bỏ chính từ đang thêm hay sửa
function setLinks(L, list) {
  const self = normTerm($term.value);
  L.list = [];
  list.forEach(t => {
    const k = normTerm(t);
    if (k && k !== self && !L.list.some(s => normTerm(s) === k)) L.list.push(typeName(t));
  });
  renderLinks(L);
}
function renderLinks(L) {
  drawTags(L.$box, L.$in, L.list, `Bỏ ${L.label}`);
  L.$in.placeholder = L.list.length ? '' : 'Gõ để tìm hoặc thêm từ';
  renderLinkSugg(L);
}
// Đang gõ: gợi ý tối đa 6 từ trong bộ thẻ có chữ vừa gõ (khớp từ đầu thì đứng trước), cộng nút thêm đúng chữ đã gõ
// nếu bộ thẻ chưa có từ đó
function renderLinkSugg(L) {
  const q = typeName(L.$in.value), k = normTerm(q), f = fold(q);
  const skip = new Set(L.list.map(normTerm).concat(normTerm($term.value)));
  const chips = [];
  if (k && !demo) {
    const t = x => searchKeys(x).t;
    items.filter(x => t(x).includes(f) && !skip.has(keyOf(x)))
      .sort((a, b) => t(b).startsWith(f) - t(a).startsWith(f) || (t(a) < t(b) ? -1 : t(a) > t(b) ? 1 : 0))
      .slice(0, 6)
      .forEach(x => chips.push(chip(x.term)));
  }
  if (k && !skip.has(k) && !findWord(q)) chips.push(chip(q, `+ Thêm “${q}”`));
  L.$sugg.replaceChildren(...chips);
}
// Thêm từ vào ô của loại L (gõ "a; b" thì thêm cả hai). Từ có trong bộ thẻ thì giữ đúng cách viết của thẻ
function pickLink(L, text) {
  L.$in.value = '';
  const add = wordsOf(text).map(t => (findWord(t) || { term: t }).term);
  add.forEach(t => L.dropped.delete(normTerm(t)));
  setLinks(L, L.list.concat(add));
  checkAdd();
}
function unpickLink(L, name) {
  const k = normTerm(name);
  L.dropped.add(k);
  setLinks(L, L.list.filter(s => normTerm(s) !== k));
  checkAdd();
}
// Thêm từ mới mà các thẻ khác đã ghi ở cột từ liên kết nào: điền sẵn các thẻ đó vào ô của loại đó, trừ thẻ bạn vừa
// bỏ ra. Gõ sang từ khác thì bỏ những từ đã tự điền
function autoLinks() {
  const k = demo ? '' : normTerm($term.value);
  if (k === autoKey) return;
  dropAutoLinks();
  autoKey = k;
  LINKS.forEach(L => {
    const have = new Set(L.list.map(normTerm));
    const add = linkedFrom(L, k).map(x => x.term).filter(t => !have.has(normTerm(t)) && !L.dropped.has(normTerm(t)));
    if (add.length) setLinks(L, L.list.concat(add));
    L.auto = add.map(normTerm);
  });
}
function dropAutoLinks() {
  LINKS.forEach(L => {
    const auto = new Set(L.auto);
    if (auto.size) setLinks(L, L.list.filter(s => !auto.has(normTerm(s))));
    L.auto = [];
  });
  autoKey = '';
}

// Những ô trong bảng khác với thẻ. Từ liên kết so với những từ thẻ đang hiện, kể cả từ do thẻ khác ghi. Đang đổi chữ
// thì chữ mới cũng là một ô sửa. Các cặp Nghĩa – Ví dụ so với thẻ đã đọc và ghi lại theo cùng một cách, nên mở bảng rồi
// đóng không tính là sửa, kể cả khi ô trong Sheet ghi khác (như (v) chạy / (v) điều hành chưa đánh số). Từ có từ hai
// nghĩa mà cặp đã đổi thì ghi lại cả hai ô meaning và example, để nhãn ở hai ô luôn khớp nhau. Từ một nghĩa thì ví dụ
// không có nhãn, nên chỉ ghi ô đã đổi: chỉ sửa ví dụ thì ô meaning trong Sheet giữ nguyên chữ cũ
function formDiff(it) {
  const diff = {};
  const term = typeName($term.value), phonetic = $phonetic.value.trim();
  const cells = senseCells(), p = parseSenses(it), was = writeSenses(byType(p.list, typesOf(it.type)), p.loose);
  const both = senses.filter(senseFilled).length > 1 && (cells.meaning !== was.meaning || cells.example !== was.example);
  if (renaming && term && term !== it.term) diff.term = term;
  if (phonetic !== (it.phonetic || '')) diff.phonetic = phonetic;
  if ((both || cells.meaning !== was.meaning) && cells.meaning !== lines(it.meaning).join('\n')) {
    diff.meaning = cells.meaning;
  }
  if ((both || cells.example !== was.example) && cells.example !== lines(it.example).join('\n')) {
    diff.example = cells.example;
  }
  if (!sameSet(checkedTypes(), typesOf(it.type))) diff.type = checkedTypes().join(', ');
  LINKS.forEach(L => { if (!sameSet(L.list, linksOf(it, L))) diff[L.name] = L.list.join(', '); });
  return diff;
}
// Cần có từ. Đang thêm thì từ đó chưa có trong bộ thẻ. Đang sửa thì cần có ô khác thẻ, hoặc chữ gõ dở trong ô Loại từ
// hay ô từ liên kết mà thẻ chưa có (bấm lưu là chữ đó được thêm vào). Đổi chữ thì chữ mới phải dùng được.
// Dòng báo dưới ô Từ: từ đã có, chữ mới không dùng được, cách đổi chữ, hay thẻ đã nắm rõ
function checkAdd() {
  const term = typeName($term.value), self = normTerm(term);
  const typed = normTerm($typeIn.value);
  const newType = !!typed && !picked.some(x => normTerm(x) === typed);
  const newLink = LINKS.some(L => {
    const t = normTerm(L.$in.value);
    return !!t && t !== self && !L.list.some(x => normTerm(x) === t);
  });
  const taken = editing ? null : findWord(term);
  const block = renaming && term ? renameBlock(term) : '';
  let msg = '', warn = true;
  if (taken) msg = `“${taken.term}” đã có trong bộ thẻ. Chạm vào từ này ở gợi ý phía trên để sửa.`;
  else if (block) msg = block;
  else if (renaming) {
    msg = `Gõ chữ mới rồi bấm Cập nhật. Từ nào đang ghi “${editing.term}” ở ô đồng nghĩa, trái nghĩa hay liên quan `
      + 'cũng đổi theo.';
    warn = false;
  } else if (editing && editing.mastered) {
    msg = 'Thẻ này đã nắm rõ.';
    warn = false;
  }
  $addMsg.textContent = msg;
  $addMsg.classList.toggle('warn', warn);
  $addMsg.hidden = !msg;
  $addSave.disabled = !term || !!taken || !!block
    || (!!editing && !Object.keys(formDiff(editing)).length && !newType && !newLink);
}
// Chữ mới khi đổi chữ phải còn trống: chưa là từ nào khác, không chờ xoá trong Sheet, và không là chữ cũ của một từ vừa
// đổi chữ mà chưa đồng bộ (Sheet vẫn còn dòng mang chữ đó). Trả về câu báo, dùng được thì ''
function renameBlock(term) {
  const k = normTerm(term), self = keyOf(editing), x = findWord(term);
  if (x && x !== editing) return `“${x.term}” đã có trong bộ thẻ. Hãy chọn chữ khác.`;
  const wait = k !== self && (!!deletes[k]
    || Object.keys(edits).some(e => e !== self && edits[e].term && normTerm(edits[e].term.from) === k));
  return wait ? `“${term}” còn chờ đồng bộ với Sheet. Bấm ↻ rồi hãy đổi sang chữ này.` : '';
}
// Bảng còn nội dung chưa lưu. Đang sửa: có ô khác thẻ. Đang thêm: đã gõ gì đó ngoài ô Từ, vì chữ ở ô Từ cũng là chữ để
// tìm (các từ liên kết app tự điền thì không tính). Chữ gõ dở ở ô Loại từ hay ô từ liên kết thì lúc nào cũng tính
function dirty() {
  if (typeName($typeIn.value) || LINKS.some(L => typeName(L.$in.value))) return true;
  if (editing) return Object.keys(formDiff(editing)).length > 0;
  return !!($phonetic.value.trim() || picked.length || senses.some(senseFilled) || lines($loose.value).length
    || LINKS.some(L => L.list.some(t => !L.auto.includes(normTerm(t)))));
}
// Đổi việc bảng đang làm: sửa một từ khác, hay thôi sửa để gõ từ khác. Bảng còn nội dung chưa lưu thì hỏi trước khi bỏ.
// then: câu nói nội dung đó sẽ ra sao
function confirmSwitch(then, act) {
  if (!dirty()) { act(); return; }
  const what = editing ? `Bạn đã sửa “${editing.term}” mà chưa bấm Cập nhật.` : 'Bảng Thêm từ mới còn nội dung chưa lưu.';
  confirmAct('Bỏ thay đổi chưa lưu?', `${what} ${then}`, 'Bỏ thay đổi', () => { $del.close(); act(); });
}

// Nạp thẻ it vào bảng để sửa. Ô Từ khoá lại để không lỡ tay đổi chữ: muốn đổi thì bấm Đổi chữ
function startEdit(it) {
  resetForm();
  editing = it;
  $term.value = it.term;
  $phonetic.value = it.phonetic || '';
  setTypes(typesOf(it.type));
  const p = parseSenses(it);
  setSenses(sensesOf(p, picked), p.loose);
  LINKS.forEach(L => setLinks(L, linksOf(it, L)));
  renderMode();
}
function resetForm() {
  clearTimeout(lookupTimer);
  editing = null;
  renaming = false;
  formRun++;
  $term.value = $phonetic.value = $typeIn.value = '';
  setTypes([]);
  setSenses([], []);
  autoKey = '';
  LINKS.forEach(L => {
    L.$in.value = '';
    L.auto = [];
    L.dropped = new Set();
    setLinks(L, []);
  });
  renderMode();
}
// Tiêu đề, nút và ô Từ theo việc bảng đang làm: thêm từ mới; sửa một từ (ô Từ khoá lại); hay đổi chữ của từ đang sửa
function renderMode() {
  $addTitle.textContent = editing ? 'Sửa từ' : 'Thêm từ mới';
  $addSave.textContent = editing ? 'Cập nhật' : 'Thêm';
  $addDel.hidden = !editing;
  $term.readOnly = !!editing && !renaming;
  $rename.hidden = !editing;
  $rename.textContent = renaming ? 'Huỷ' : 'Đổi chữ';
  $rename.setAttribute('aria-label', renaming ? 'Huỷ đổi chữ' : 'Đổi chữ của từ này');
  $unpick.hidden = !editing || renaming;
  renderTermSugg();
  checkAdd();
}
// Đang thêm từ mới: gợi ý tối đa 6 từ trong bộ thẻ có chữ vừa gõ, không cần gõ dấu. Từ trùng hẳn chữ đã gõ đứng đầu, rồi
// tới từ khớp từ đầu. Chạm một từ thì bảng chuyển sang sửa từ đó
function renderTermSugg() {
  const q = typeName($term.value), k = normTerm(q), f = fold(q);
  let list = [];
  if (f && !editing && !demo) {
    const t = x => searchKeys(x).t;
    list = items.filter(x => t(x).includes(f))
      .sort((a, b) => (keyOf(b) === k) - (keyOf(a) === k) || t(b).startsWith(f) - t(a).startsWith(f)
        || (t(a) < t(b) ? -1 : t(a) > t(b) ? 1 : 0))
      .slice(0, 6);
  }
  $termSugg.replaceChildren(...list.map(x => chip(x.term)));
}
// Chạm một từ gợi ý ở ô Từ: chuyển hẳn sang sửa từ đó. Ô Từ khoá lại nên bàn phím điện thoại đóng, thấy được cả bảng
function pickTerm(term) {
  const it = findWord(term);
  if (!it) return;
  confirmSwitch(`Chuyển sang sửa “${it.term}” thì phần này mất.`, () => {
    startEdit(it);
    $term.blur();
    $term.focus();
  });
}
// Nút Đổi chữ: mở ô Từ để gõ chữ mới cho từ đang sửa. Bấm Huỷ thì ô về chữ cũ và khoá lại
function toggleRename() {
  if (!editing) return;
  renaming = !renaming;
  $term.value = editing.term;
  renderMode();
  if (renaming) { $term.focus(); $term.select(); }
}
// Nút ×: thôi sửa từ này, bảng trống để gõ từ khác. Còn thay đổi chưa lưu thì hỏi trước
function leaveEdit() {
  confirmSwitch('Gõ từ khác thì phần này mất.', () => { resetForm(); $term.focus(); });
}
// Ngừng gõ ô Từ một chút: từ mới thì điền sẵn các thẻ đã ghi nó ở cột từ liên kết
function lookup() {
  clearTimeout(lookupTimer);
  if (!editing) autoLinks();
  checkAdd();
}
function openAdd(it) {
  if (it) {                              // nút ✎: mở bảng sửa cho thẻ đang xem
    confirmSwitch(`Mở “${it.term}” để sửa thì phần này mất.`, () => { startEdit(it); showAdd(); });
    return;
  }
  lookup();                              // bản nháp còn lại có thể trùng từ vừa đồng bộ về
  showAdd();
}
function showAdd() {
  renderSugg();                          // loại từ và các từ trong bộ thẻ có thể vừa đổi sau lần đồng bộ
  LINKS.forEach(L => renderLinkSugg(L));
  renderTermSugg();
  checkAdd();
  if (!$add.open) $add.showModal();
  $senses.querySelectorAll('textarea').forEach(fit);  // lúc bảng còn đóng thì chưa đo được chiều cao ô
}
function saveWord() {
  if (typeName($typeIn.value)) pickType($typeIn.value);  // loại gõ dở mà chưa bấm Enter cũng được tính
  LINKS.forEach(L => { if (typeName(L.$in.value)) pickLink(L, L.$in.value); });  // từ liên kết gõ dở cũng vậy
  if (!editing) lookup();                // từ mới: điền nốt các thẻ đã ghi nó ở cột từ liên kết
  checkAdd();
  if ($addSave.disabled) { if (!$term.value.trim()) $term.focus(); return; }
  if (editing) updateWord(); else addWord();
}
function addWord() {
  const term = $term.value.trim(), cells = senseCells();
  const it = {
    term, phonetic: $phonetic.value.trim(), type: checkedTypes().join(', '), meaning: cells.meaning,
    example: cells.example, added: new Date().toISOString(), lastSeen: '', mastered: false, local: true
  };
  LINKS.forEach(L => { it[L.name] = L.list.join(', '); });
  if (demo) { items = []; demo = false; }  // từ đầu tiên của bạn thay cho thẻ mẫu
  unlink(term);
  items.push(it);
  saved(it, `Đã thêm “${term}”. Bấm ↻ để gửi lên Sheet.`);
}
function updateWord() {
  const it = editing, diff = formDiff(it), from = it.term;
  if (diff.term) renameCard(it, diff.term);
  delete diff.term;
  editCard(it, diff);
  unlink(it.term);
  saved(it, it.term !== from ? `Đã đổi “${from}” thành “${it.term}”. Bấm ↻ để gửi lên Sheet.`
    : `Đã sửa “${it.term}”. Bấm ↻ để gửi lên Sheet.`);
}
/* Đổi chữ của từ it thành to. Mọi thứ của từ (nghĩa, ngày thêm, last seen, nắm rõ, thay đổi chưa đồng bộ) đi theo chữ
   mới, và các thẻ đang ghi nó ở ô từ liên kết cũng đổi theo. Từ đã lên Sheet thì ghi lại bản sửa term: lần đồng bộ sau
   script đổi chữ ở đúng dòng cũ, rồi đổi chữ đó ở ô từ liên kết của mọi dòng. Từ chưa lên Sheet thì chỉ cần đổi trong
   máy; đã gửi đi mà chưa nhận được trả lời thì Sheet có thể đã có dòng chữ cũ, nên xoá dòng đó, từ thành dòng mới. */
function renameCard(it, to) {
  const from = it.term, oldKey = keyOf(it), newKey = normTerm(to);
  keepBase(it);                          // bỏ thay đổi thì từ về chữ cũ, như trong Sheet
  if (newKey !== oldKey) {
    [pending, edits, base].forEach(o => {
      if (o[oldKey]) { o[newKey] = o[oldKey]; delete o[oldKey]; }
    });
  }
  if (it.local) {
    if ((it.tried || syncing) && newKey !== oldKey) deletes[oldKey] = { term: from };
  } else {
    const ed = edits[newKey] || {}, orig = ed.term ? ed.term.from : from;
    if (orig === to) delete ed.term; else ed.term = { from: orig, to };
    if (Object.keys(ed).length) edits[newKey] = ed; else delete edits[newKey];
  }
  it.term = to;
  relinkAll(oldKey, to);
}
// Đổi chữ của một từ (fromKey: chữ cũ dạng khoá) trong ô từ liên kết của mọi thẻ, bản gốc và bản sửa chưa đồng bộ:
// "lack sth; need" → "lack [sth], need". Script đổi các ô trong Sheet đúng như vậy, nên bản sửa vẫn khớp với Sheet.
// cards: chỉ đổi ở những thẻ này (và các bản sửa), thay cho mọi thẻ và bản gốc
function relinkAll(fromKey, to, cards) {
  const swap = s => {
    const ws = wordsOf(s);
    if (!ws.some(w => normTerm(w) === fromKey)) return s;
    const out = [];
    ws.forEach(w => {
      const v = normTerm(w) === fromKey ? to : w;
      if (!out.some(o => normTerm(o) === normTerm(v))) out.push(v);
    });
    return out.join(', ');
  };
  (cards || items.concat(Object.values(base))).forEach(x => LINKS.forEach(L => {
    const v = swap(x[L.name]);
    if (v !== x[L.name]) x[L.name] = v;
  }));
  Object.keys(edits).forEach(k => {
    const ed = edits[k];
    LINKS.forEach(L => {
      if (!ed[L.name]) return;
      const f = swap(ed[L.name].from), t = swap(ed[L.name].to);
      if (f === t) delete ed[L.name]; else ed[L.name] = { from: f, to: t };
    });
    if (!Object.keys(ed).length) delete edits[k];
  });
}
// Sửa thẻ trong máy ngay, và ghi lại bản sửa để gửi lên Sheet.
// Sửa nhiều lần trước khi đồng bộ thì giữ "from" của lần đầu; sửa về như cũ thì bỏ.
function editCard(it, diff) {
  const k = keyOf(it), ed = edits[k] || {};
  keepBase(it);
  Object.keys(diff).forEach(name => {
    const from = ed[name] ? ed[name].from : it[name];
    if (from === diff[name]) delete ed[name]; else ed[name] = { from, to: diff[name] };
  });
  if (Object.keys(ed).length) edits[k] = ed; else delete edits[k];
  Object.assign(it, diff);
}
// Bỏ khỏi ô một từ mà thẻ kia đã ghi (thẻ kia ghi từ này ở cùng cột) thì sửa luôn thẻ kia, không thì hai thẻ vẫn
// hiện nhau
function unlink(term) {
  const k = normTerm(term);
  LINKS.forEach(L => {
    const keep = new Set(L.list.map(normTerm));
    linkedFrom(L, k).forEach(x => {
      const xk = keyOf(x);
      if (!L.dropped.has(xk) || keep.has(xk)) return;
      editCard(x, { [L.name]: wordsOf(x[L.name]).filter(s => normTerm(s) !== k).join(', ') });
    });
  });
}
function saved(it, msg) {
  resetForm();
  $add.close();
  // Sửa từ trong Tất cả từ thì thẻ đang học giữ nguyên, chỉ vẽ lại phòng khi đó chính là từ vừa sửa
  if ($lib.open) { renderCard(); refreshLib(); } else show(it);
  renderTop();
  if (persist()) toast(msg);
}

// Hỏi lại trước khi làm việc khó hoàn tác (xoá từ, bỏ mọi thay đổi): nút đỏ mang chữ ok, bấm thì chạy act
function confirmAct(title, text, ok, act) {
  $delTitle.textContent = title;
  $delText.textContent = text;
  $delOk.textContent = ok;
  $delOk.onclick = act;
  $del.showModal();
}
// Xoá từ đang sửa: hỏi lại trước khi xoá
function askDelete() {
  const it = editing;
  if (!it) return;
  confirmAct(`Xoá “${it.term}”?`, it.local && !it.tried
    ? 'Từ này chưa lên Sheet, xoá rồi là mất hẳn.'
    : 'Thẻ sẽ mất khỏi bộ thẻ, và dòng của từ này trong Sheet bị xoá ở lần đồng bộ kế tiếp.', 'Xoá', deleteWord);
}
function deleteWord() {
  const shown = editing;
  $del.close();
  if (!shown) return;
  // Từ vừa đổi chữ mà Sheet chưa nhận: trả về như trong Sheet (chữ cũ, các từ liên kết cũng về chữ cũ), rồi xoá dòng
  // mang chữ cũ
  let it = shown;
  const rn = edits[keyOf(it)] && edits[keyOf(it)].term;
  if (rn) {
    dropChanges(keyOf(it));
    it = items.find(x => keyOf(x) === normTerm(rn.from)) || it;
  }
  const k = keyOf(it);
  keepBase(it);                          // bỏ lệnh xoá thì thẻ hiện lại như trong Sheet
  items = items.filter(x => x !== it);
  delete pending[k];
  delete edits[k];
  // Từ chưa từng gửi lên Sheet thì không cần báo script. Còn lại thì xoá dòng trong Sheet ở lần đồng bộ sau.
  // Xoá rồi thêm lại đúng từ đó trước khi đồng bộ thì lệnh xoá vẫn giữ: dòng cũ bị xoá, từ mới thành dòng mới
  const inSheet = !it.local || it.tried || syncing;
  if (inSheet) deletes[k] = { term: it.term };
  resetForm();
  $add.close();
  if (current === shown || current === it) next(); else renderCard();
  renderTop();
  refreshLib();
  if (persist()) toast(inSheet ? `Đã xoá “${shown.term}”. Bấm ↻ để xoá trong Sheet.` : `Đã xoá “${shown.term}”.`);
}
