// Thẻ đang học: chọn thẻ tiếp theo, vẽ thẻ, đổi thẻ, kéo thẻ, và thông báo nhỏ phía dưới
'use strict';

/* ---------- Chọn thẻ tiếp theo ----------
   Ngẫu nhiên có trọng số: thẻ chưa xem 1.5, thẻ xem cách đây từ 3 ngày trở lên 1,
   thẻ vừa xem gần bằng 0 nên hầu như không lặp lại ngay. */
function weight(item, now) {
  if (!validDate(item.lastSeen)) return 1.5;
  const days = Math.max(0, (now - Date.parse(item.lastSeen)) / 86400000);
  return Math.min(1, 0.01 + days / 3);
}
function pickNext(list, exclude, now, rnd) {
  now = now || Date.now();
  rnd = rnd || Math.random;
  let pool = list.filter(x => !x.mastered);
  if (pool.length > 1) pool = pool.filter(x => x !== exclude);
  if (!pool.length) return null;
  const w = pool.map(x => weight(x, now));
  let r = rnd() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= w[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/* ---------- Giao diện ---------- */
function renderTop() {
  const left = items.filter(x => !x.mastered).length;
  $stats.innerHTML = demo
    ? 'Thẻ mẫu, bấm ⚙ để kết nối Sheet'
    : `<span><b>${left}</b> đang học,</span> <span><b>${items.length - left}</b> đã nắm rõ</span>`;
  $stats.setAttribute('aria-label', demo ? 'Thẻ mẫu. Kết nối Sheet'
    : `${left} đang học, ${items.length - left} đã nắm rõ. Xem thống kê`);
  const n = unsynced();
  $badge.hidden = n === 0;
  $badge.textContent = n > 99 ? '99+' : String(n);
  $sync.setAttribute('aria-label', n ? `Đồng bộ (${n} thay đổi chưa đồng bộ)` : 'Đồng bộ');
}

function renderCard() {
  const it = current;
  $master.disabled = $next.disabled = !it;
  $hint.style.visibility = it ? '' : 'hidden';
  if (!it) {
    $card.className = 'card';
    $card.innerHTML = `<p class="empty">${items.length
      ? 'Bạn đã nắm rõ hết các thẻ.<br>Bấm + để thêm từ mới.'
      : 'Sheet chưa có từ nào.<br>Bấm + để thêm từ mới.'}</p>`;
    return;
  }
  $card.className = cardClass(it);
  $card.innerHTML = cardHtml(it);
}

// Thẻ ngữ pháp có đường kẻ màu khác
function cardClass(it) {
  return typesOf(it.type).some(isGrammar) ? 'card grammar' : 'card';
}
/* Từ liên kết (đồng nghĩa, trái nghĩa, liên quan): mỗi thẻ ghi các từ của nó ở cột của từng loại. Thẻ hiện thêm các
   thẻ khác ghi nó ở cùng cột, nên chỉ cần ghi ở một bên: inevitable ghi unavoidable là từ đồng nghĩa thì thẻ
   unavoidable cũng hiện inevitable, kể cả khi unavoidable được thêm sau. */
const linkCache = new WeakMap();         // thẻ → { tên cột: các từ thẻ tự ghi ở cột đó, dạng khoá }; ô đổi thì tính lại
function linkKeys(it, L) {
  let c = linkCache.get(it);
  if (!c) linkCache.set(it, c = {});
  let e = c[L.name];
  if (!e || e.raw !== it[L.name]) {
    e = c[L.name] = { raw: it[L.name], keys: new Set(wordsOf(it[L.name]).map(normTerm)) };
  }
  return e.keys;
}
// Các thẻ ghi từ k ở cột của loại L
function linkedFrom(L, k) { return k ? items.filter(x => linkKeys(x, L).has(k)) : []; }
// Các từ loại L hiện trên thẻ: các từ thẻ tự ghi, rồi tới các thẻ ghi nó ở cùng cột
function linksOf(it, L) {
  const self = keyOf(it), seen = new Set([self]), out = [];
  const add = t => {
    const k = normTerm(t);
    if (!seen.has(k)) { seen.add(k); out.push(t); }
  };
  wordsOf(it[L.name]).forEach(add);
  linkedFrom(L, self).forEach(x => add(x.term));
  return out;
}
// Loại từ viết tắt của một từ trong bộ thẻ, đặt sau từ đó: student (n). Từ chưa có thẻ hay chưa ghi loại thì không có
function typeNote(term) {
  const k = normTerm(term), x = items.find(y => keyOf(y) === k);
  const ts = x ? typesOf(x.type).map(abbr) : [];
  return ts.length ? ` <i>(${esc(ts.join(', '))})</i>` : '';
}
// Nội dung một thẻ, dùng cho thẻ đang học và thẻ xem trong Tất cả từ
function cardHtml(it) {
  // Từ liên kết đứng đầu, mỗi loại một dòng: syn. unavoidable. Rồi tới các nghĩa: (v1) chạy, phần nhãn ở đầu dòng in
  // nghiêng. Từ có từ hai nghĩa thì ví dụ nằm ngay dưới nghĩa của nó, ví dụ chưa gắn nghĩa ở dưới cùng; từ một nghĩa
  // thì mọi ví dụ ở dưới cùng như cũ
  const p = parseSenses(it), rows = senseRows(p);
  const pair = p.list.filter(s => s.mean || s.ex.length).length > 1;
  const line = l => rich(l).replace(PREFIX, '<i>$&</i>');
  const exs = (ls, cls) => ls.map((l, i) => `<p class="${cls}">${i === 0 ? '<i>e.g.</i> ' : ''}${rich(l)}</p>`).join('');
  const links = LINKS.map(L => {
    const words = linksOf(it, L).map(t => esc(t) + (L.typed ? typeNote(t) : ''));
    return words.length ? `<p class="link"><i>${L.short}</i> ${words.join(', ')}</p>` : '';
  }).join('');
  let meaning = '';
  if (pair) meaning = rows.map(r => `<p class="meaning">${line(r.text)}</p>${exs(r.ex, 'ex sub')}`).join('');
  else if (rows.length) meaning = `<p class="meaning">${rows.map(r => line(r.text)).join('<br>')}</p>`;
  const gist = links + meaning;
  const examples = exs(pair ? p.loose : rows.flatMap(r => r.ex).concat(p.loose), 'ex');
  const seen = validDate(it.lastSeen)
    ? `${fmtDate(it.lastSeen)} (${agoText(daysAgo(it.lastSeen))})`
    : 'chưa xem';
  const edit = demo ? '' : '<button class="edit" type="button" aria-label="Sửa thẻ này"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>';
  const phon = it.phonetic ? `<p class="phon">${esc(it.phonetic)}</p>` : '';
  return `
    <div class="head"><h1 class="term">${esc(it.term)}</h1>${phon}</div>
    <div class="body">${gist ? `<div class="gist">${gist}</div>` : ''}${examples}</div>
    <div class="foot"><span class="seen">last seen: ${seen}</span>${edit}</div>`;
}

function show(it) { current = it; renderCard(); }
function next() { show(pickNext(items, current)); }

// Thẻ cũ bay ra (dir: -1 trái, 1 phải, 0 lên trên), thẻ mới trồi lên từ chồng thẻ
function leave(dir, after) {
  busy = true;
  $card.style.transition = '';
  $card.style.transform = dir === 0
    ? 'translateY(-40px) scale(.96)'
    : `translateX(${dir * (window.innerWidth + 60)}px) rotate(${dir * 12}deg)`;
  $card.style.opacity = '0';
  setTimeout(() => {
    after();
    $card.style.transition = 'none';
    $card.style.transform = 'translateY(14px) scale(.98)';
    void $card.offsetWidth;
    $card.style.transition = '';
    $card.style.transform = '';
    $card.style.opacity = '';
    busy = false;                        // thẻ mới vừa hiện là kéo tiếp được, không phải đợi nó trồi lên xong
  }, 200);
}

// Vuốt: ghi lại lúc vừa xem thẻ này, rồi sang thẻ khác
function swipe(dir) {
  if (busy || !current) return;
  const it = current;
  leave(dir, () => {
    recordChange(it, { lastSeen: new Date().toISOString() });
    next();
  });
}

function master() {
  if (busy || !current) return;
  const it = current;
  recordChange(it, { mastered: true, lastSeen: new Date().toISOString() });
  leave(0, next);
  toast(`Đã nắm rõ “${it.term}”`, 'Hoàn tác', function undo() {
    if (busy) { setTimeout(undo, 120); return; }
    recordChange(it, { mastered: false });
    show(it);
  });
}

/* ---------- Kéo thẻ ---------- */
function onDown(e) {
  if (busy || !current || (e.pointerType === 'mouse' && e.button !== 0)) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, dx: 0, v: 0, on: false };
}
function onMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  if (!drag.on) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
    drag.on = true;
    drag.x += Math.sign(dx) * 10;        // bỏ phần ngưỡng 10px, để thẻ không giật một phát lúc bắt đầu chạy
    try { $card.setPointerCapture(e.pointerId); } catch (_) {}
    $card.style.transition = 'none';
  }
  const dx = e.clientX - drag.x, dt = e.timeStamp - drag.t;
  if (dt > 0) drag.v = 0.8 * (dx - drag.dx) / dt + 0.2 * drag.v;   // vận tốc (px/ms), làm mượt cho đỡ nhiễu
  drag.dx = dx;
  drag.t = e.timeStamp;
  $card.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`;
}
function onUp(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const { on, dx } = drag;
  const v = e.timeStamp - drag.t < 50 ? drag.v : 0;       // dừng tay rồi mới thả thì không tính là hất
  drag = null;
  if (!on) return;
  $card.style.transition = '';
  // Đổi thẻ khi kéo đủ xa, hoặc khi hất nhanh theo đúng chiều đang kéo dù quãng ngắn
  const far = Math.abs(dx) > Math.min(100, $card.offsetWidth * 0.25);
  const flick = Math.abs(v) > 0.4 && Math.abs(dx) > 25 && v * dx > 0;
  if (e.type === 'pointerup' && (far || flick)) swipe(dx > 0 ? 1 : -1);
  else $card.style.transform = '';
}

/* ---------- Thông báo ---------- */
// Bảng đang mở trên cùng: bảng hỏi lại nằm trên bảng sửa hay bảng thay đổi, bảng sửa trên bảng xem từ, xem từ trên Tất
// cả từ, bảng thay đổi trên bảng cài đặt
function topDialog() { return [$del, $add, $view, $lib, $chg, $dlg].find(d => d.open) || null; }
function toast(msg, actionLabel, action) {
  // Đang mở bảng thì đặt thông báo vào bảng trên cùng, không thì bảng che mất
  const host = topDialog() || document.body;
  if ($toast.parentNode !== host) host.appendChild($toast);
  $toastMsg.textContent = msg;
  $toastAct.hidden = !actionLabel;
  $toastAct.textContent = actionLabel || '';
  $toastAct.onclick = actionLabel ? () => { hideToast(); action(); } : null;
  $toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, actionLabel ? 5000 : msg.length > 60 ? 6000 : 3500);
}
function hideToast() { $toast.classList.remove('show'); }
