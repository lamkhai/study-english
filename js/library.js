// Tất cả từ, và xem từng từ trong danh sách
'use strict';

/* ---------- Tất cả từ ----------
   Xem lại mọi từ, kể cả từ đã nắm rõ. Xem ở đây không ghi last seen và không tính lượt xem.
   Danh sách vẽ dần từng đoạn khi cuộn tới, nên bộ thẻ vài nghìn từ vẫn mở nhanh. */
const CHUNK = 100;
const folded = new WeakMap();            // thẻ → chữ đã bỏ dấu để tìm; thẻ đổi chữ thì tính lại
function searchKeys(it) {
  let k = folded.get(it);
  if (!k || k.term !== it.term || k.meaning !== it.meaning) {
    k = { term: it.term, meaning: it.meaning, t: fold(it.term), m: fold(String(it.meaning).replace(/\*/g, '')) };
    folded.set(it, k);
  }
  return k;
}
function openLib(tab) {
  statSel = -1;
  showTab(tab);
  $statsBox.scrollTop = 0;               // mở lại thì thống kê bắt đầu từ trên cùng
  if (!$lib.open) $lib.showModal();
}
function showTab(tab) {
  const words = tab === 'words';
  $tabWords.setAttribute('aria-selected', String(words));
  $tabStats.setAttribute('aria-selected', String(!words));
  $tabWords.tabIndex = words ? 0 : -1;
  $tabStats.tabIndex = words ? -1 : 0;
  $paneWords.hidden = !words;
  $paneStats.hidden = words;
  if (words) renderWords(); else renderStats();
}
// Bộ thẻ vừa đổi (sửa, xoá, đồng bộ xong) trong lúc đang mở bảng: vẽ lại, giữ chỗ đang cuộn
function refreshLib() {
  if (!$lib.open) return;
  if ($paneWords.hidden) renderStats(); else renderWords(true);
  if ($view.open) renderView();
}
function renderWords(keep) {
  const q = fold($find.value);
  const rank = new Map();                // khớp ở đâu: 0 từ bắt đầu bằng chữ tìm, 1 từ có chữ đó, 2 nghĩa có chữ đó
  let list = items;
  if (q) {
    list = items.filter(it => {
      const k = searchKeys(it);
      const r = k.t.startsWith(q) ? 0 : k.t.includes(q) ? 1 : k.m.includes(q) ? 2 : -1;
      if (r !== -1) rank.set(it, r);
      return r !== -1;
    });
  }
  const done = list.filter(x => x.mastered).length;
  const n = { all: list.length, learn: list.length - done, done };
  $filt.querySelectorAll('button').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.f === libFilter));
    b.querySelector('small').textContent = NUM.format(n[b.dataset.f]);
  });
  if (libFilter !== 'all') list = list.filter(x => x.mastered === (libFilter === 'done'));
  // Mới thêm: theo ngày thêm, mới trước; từ chưa có ngày thêm thì dòng dưới trong Sheet đứng trước.
  // Lâu chưa xem: thẻ chưa xem trước, rồi tới thẻ xem lâu nhất. Tính sẵn khoá để xếp vài nghìn từ vẫn nhanh
  const pos = new Map(items.map((x, i) => [x, i]));
  const key = new Map(list.map(x => [x, libSort === 'az' ? searchKeys(x).t
    : Date.parse(libSort === 'new' ? x.added : x.lastSeen) || 0]));
  const by = {
    new: (a, b) => key.get(b) - key.get(a) || pos.get(b) - pos.get(a),
    az: (a, b) => (key.get(a) < key.get(b) ? -1 : key.get(a) > key.get(b) ? 1 : pos.get(a) - pos.get(b)),
    old: (a, b) => key.get(a) - key.get(b) || pos.get(a) - pos.get(b)
  }[libSort];
  libList = list.slice().sort((a, b) => (rank.get(a) || 0) - (rank.get(b) || 0) || by(a, b));
  const top = $wordsBox.scrollTop, shown = libShown;
  libShown = 0;
  $words.textContent = '';
  moreWords(keep ? shown : 0);
  $wordsBox.scrollTop = keep ? top : 0;
  $wordsNone.hidden = libList.length > 0;
  $wordsNone.textContent = !items.length ? 'Chưa có từ nào.'
    : q ? `Không có từ nào khớp “${$find.value.trim()}”.`
    : libFilter === 'done' ? 'Chưa có từ nào đã nắm rõ.' : 'Bạn đã nắm rõ hết các từ.';
}
// Vẽ thêm một đoạn danh sách, hoặc vẽ cho tới dòng thứ upTo
function moreWords(upTo) {
  const end = Math.min(libList.length, Math.max(libShown + CHUNK, upTo || 0));
  if (end <= libShown) return;
  const now = Date.now();
  $words.insertAdjacentHTML('beforeend',
    libList.slice(libShown, end).map((it, k) => rowHtml(it, libShown + k, now)).join(''));
  libShown = end;
}
function rowHtml(it, i, now) {
  const meaning = lines(it.meaning).join(' · ').replace(/\*/g, '');
  const seen = validDate(it.lastSeen) ? `xem ${agoText(daysAgo(it.lastSeen, now))}` : 'chưa xem';
  return `<li><button class="row" type="button" data-i="${i}">`
    + `<span class="rt"><b>${esc(it.term)}</b>${it.phonetic ? ` <span>${esc(it.phonetic)}</span>` : ''}</span>`
    + (meaning ? `<span class="rm">${esc(meaning)}</span>` : '')
    + `<span class="rs">${seen}${it.mastered ? '<br><em>đã nắm rõ</em>' : ''}</span></button></li>`;
}

/* ---------- Xem một từ ----------
   Bấm một dòng trong Tất cả từ: hiện thẻ như lúc học, đi qua các từ theo thứ tự của danh sách lúc bấm vào.
   Không ghi last seen. */
function openView(i) {
  viewKeys = libList.map(keyOf);
  viewAt = i;
  renderView();
  if (!$view.open) $view.showModal();
}
function viewItem() {
  const k = viewKeys[viewAt];
  return items.find(x => keyOf(x) === k) || null;
}
function renderView() {
  const byKey = new Map(items.map(x => [keyOf(x), x]));
  const cur = viewKeys[viewAt];
  viewKeys = viewKeys.filter(k => byKey.has(k));    // bỏ từ vừa bị xoá, trong app hay trong Sheet
  const at = viewKeys.indexOf(cur);
  viewAt = Math.max(0, Math.min(at !== -1 ? at : viewAt, viewKeys.length - 1));
  const it = byKey.get(viewKeys[viewAt]);
  if (!it) { $view.close(); return; }
  $viewCard.className = cardClass(it);
  $viewCard.innerHTML = cardHtml(it);
  $viewPos.textContent = `${NUM.format(viewAt + 1)} / ${NUM.format(viewKeys.length)}`;
  $viewHint.textContent = (validDate(it.added) ? `Thêm ngày ${fmtDate(it.added)}` : 'Chưa rõ ngày thêm')
    + (it.mastered ? ' · đã nắm rõ' : '');
  $prev.disabled = viewAt === 0;
  $nextWord.disabled = viewAt >= viewKeys.length - 1;
}
// Sang từ trước (dir -1) hay từ sau (1): thẻ cũ trượt ra, thẻ mới trượt vào từ phía bên kia
function viewStep(dir) {
  const to = viewAt + dir;
  if (viewBusy || to < 0 || to >= viewKeys.length) return;
  viewBusy = true;
  $viewCard.style.transition = '';
  $viewCard.style.transform = `translateX(${-dir * (window.innerWidth + 60)}px)`;
  $viewCard.style.opacity = '0';
  setTimeout(() => {
    viewAt = to;
    renderView();
    $viewCard.style.transition = 'none';
    $viewCard.style.transform = `translateX(${dir * 40}px)`;
    void $viewCard.offsetWidth;
    $viewCard.style.transition = '';
    $viewCard.style.transform = '';
    $viewCard.style.opacity = '';
    viewBusy = false;
  }, 200);
}
// Vuốt thẻ: sang trái là từ sau, sang phải là từ trước
function onViewDown(e) {
  if (viewBusy || (e.pointerType === 'mouse' && e.button !== 0)) return;
  vdrag = { id: e.pointerId, x: e.clientX, y: e.clientY, on: false };
}
function onViewMove(e) {
  if (!vdrag || e.pointerId !== vdrag.id) return;
  if (!vdrag.on) {
    const dx = e.clientX - vdrag.x, dy = e.clientY - vdrag.y;
    if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
    vdrag.on = true;
    vdrag.x += Math.sign(dx) * 10;
    try { $viewCard.setPointerCapture(e.pointerId); } catch (_) {}
    $viewCard.style.transition = 'none';
  }
  $viewCard.style.transform = `translateX(${e.clientX - vdrag.x}px)`;
}
function onViewUp(e) {
  if (!vdrag || e.pointerId !== vdrag.id) return;
  const on = vdrag.on, dx = e.clientX - vdrag.x;
  vdrag = null;
  if (!on) return;
  const dir = dx < 0 ? 1 : -1;
  const to = viewAt + dir;
  if (e.type === 'pointerup' && Math.abs(dx) > Math.min(80, $viewCard.offsetWidth * 0.2)
    && to >= 0 && to < viewKeys.length) {
    viewStep(dir);
  } else {
    $viewCard.style.transition = '';
    $viewCard.style.transform = '';
  }
}
