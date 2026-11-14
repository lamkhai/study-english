// Khởi động: nạp dữ liệu trong máy, gắn sự kiện, đăng ký service worker
'use strict';

/* ---------- Khởi động ---------- */
function init() {
  const $ = id => document.getElementById(id);
  $card = $('card'); $stats = $('stats'); $badge = $('badge'); $sync = $('btnSync');
  $master = $('btnMaster'); $next = $('btnNext'); $hint = $('hint'); $toast = $('toast'); $toastMsg = $('toastMsg');
  $toastAct = $('toastAct'); $dlg = $('dlg'); $sheet = $('inSheet'); $key = $('inKey'); $url = $('inUrl');
  $help = $('help'); $info = $('info'); $seeChg = $('btnSeeChg');
  $add = $('dlgAdd'); $addTitle = $('addTitle'); $addMsg = $('addMsg');
  $term = $('inTerm'); $phonetic = $('inPhonetic'); $tags = $('tags'); $typeIn = $('inType'); $sugg = $('sugg');
  $senses = $('senses'); $loose = $('inLoose'); $looseBox = $('looseBox'); $addSave = $('btnAddSave');
  LINKS.forEach(L => { L.$box = $(L.id + 'Tags'); L.$in = $(L.id + 'In'); L.$sugg = $(L.id + 'Sugg'); });
  $termSugg = $('termSugg'); $rename = $('btnRename'); $unpick = $('btnUnpick');
  $addDel = $('btnAddDel'); $del = $('dlgDel'); $delTitle = $('delTitle'); $delText = $('delText'); $delOk = $('btnDelOk');
  $lib = $('dlgLib'); $tabWords = $('tabWords'); $tabStats = $('tabStats'); $paneWords = $('paneWords');
  $paneStats = $('paneStats'); $find = $('inFind'); $sort = $('inSort'); $filt = $('filt'); $words = $('words');
  $wordsBox = $('wordsBox'); $wordsNone = $('wordsNone'); $units = $('units'); $statsBox = $('statsBox');
  $statsBody = $('statsBody');
  $view = $('dlgView'); $viewCard = $('viewCard'); $viewPos = $('viewPos'); $viewHint = $('viewHint');
  $prev = $('btnPrev'); $nextWord = $('btnNextWord');
  $chg = $('dlgChg'); $chgBox = $('chgBox'); $chgNote = $('chgNote'); $chgBody = $('chgBody'); $chgAll = $('btnChgAll');
  $chgSync = $('btnChgSync');
  if (SHARED_URL) {
    $('lblUrl').textContent = 'Link Apps Script riêng (không bắt buộc)';
    $url.placeholder = 'Bỏ trống để dùng script chung';
    if (BOT_EMAIL) {
      $help.textContent = `Dùng script chung thì chia sẻ Sheet cho ${BOT_EMAIL} với quyền Người chỉnh sửa.`;
      $help.hidden = false;
    }
  }

  items = load(KEYS.items, []).map(fill);
  pending = dict(load(KEYS.pending, {}));
  edits = dict(load(KEYS.edits, {}));
  deletes = dict(load(KEYS.deletes, {}));
  base = dict(load(KEYS.base, {}));
  types = load(KEYS.types, []);
  if (!Array.isArray(types)) types = [];
  settings = Object.assign({ sheet: '', key: '', url: '' }, load(KEYS.settings, {}));
  lastSync = load(KEYS.lastSync, '');
  loadLog();
  migrate();
  if (!items.length && !lastSync) {
    items = DEMO.map(x => fill(Object.assign({}, x)));
    demo = true;
  }
  next();
  renderTop();
  renderTypes();
  setSenses([], []);
  LINKS.forEach(L => renderLinks(L));

  $card.addEventListener('pointerdown', onDown);
  $card.addEventListener('pointermove', onMove);
  $card.addEventListener('pointerup', onUp);
  $card.addEventListener('pointercancel', onUp);
  $master.addEventListener('click', master);
  $next.addEventListener('click', () => swipe(-1));
  $sync.addEventListener('click', sync);
  $('btnSettings').addEventListener('click', openSettings);
  $('btnSave').addEventListener('click', saveSettings);
  $('btnClose').addEventListener('click', () => $dlg.close());
  [$sheet, $key, $url].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') saveSettings(); }));
  $('btnAdd').addEventListener('click', () => openAdd());
  $card.addEventListener('click', e => { if (!busy && current && e.target.closest('.edit')) openAdd(current); });
  $addSave.addEventListener('click', saveWord);
  $('btnAddClose').addEventListener('click', () => $add.close());
  $addDel.addEventListener('click', askDelete);
  $('btnDelCancel').addEventListener('click', () => $del.close());
  $add.addEventListener('close', () => { if (editing) resetForm(); });  // đóng bảng sửa thì bỏ phần chưa bấm Cập nhật
  // Gõ ô Từ: gợi ý các từ đã có ngay. Ngừng gõ một chút thì điền sẵn từ liên kết cho từ mới
  $term.addEventListener('input', () => {
    renderTermSugg();
    checkAdd();
    clearTimeout(lookupTimer);
    lookupTimer = setTimeout(() => { if ($add.open) lookup(); }, 400);
  });
  // Chạm từ gợi ý: nhấn giữ không lấy focus khỏi ô Từ, để bấm Huỷ ở hộp hỏi thì gõ tiếp được ngay
  $termSugg.addEventListener('mousedown', e => e.preventDefault());
  $termSugg.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) pickTerm(b.dataset.value);
  });
  $rename.addEventListener('click', toggleRename);
  $unpick.addEventListener('click', leaveEdit);
  [$phonetic, $loose].forEach(el => el.addEventListener('input', checkAdd));
  // Gõ trong cặp Nghĩa – Ví dụ. Ô Nghĩa chỉ có một dòng: dán nhiều dòng vào thì nối lại
  $senses.addEventListener('input', e => {
    const el = e.target, s = senses[el.dataset.i];
    if (!s) return;
    if (el.dataset.f === 'mean' && el.value.includes('\n')) el.value = el.value.replace(/\s*\n\s*/g, ' ');
    s[el.dataset.f] = el.value;
    fit(el);
    checkAdd();
  });
  $senses.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b && b.dataset.add !== undefined) addSense(b.dataset.add);
    else if (b && b.dataset.del !== undefined) removeSense(Number(b.dataset.del));
  });
  tagField($tags, $typeIn, $sugg, pickType, unpickType, () => picked, renderSugg);
  LINKS.forEach(L => tagField(L.$box, L.$in, L.$sugg, t => pickLink(L, t), t => unpickLink(L, t), () => L.list,
    () => renderLinkSugg(L)));
  // Enter ở ô Từ: tra từ rồi sang ô Phiên âm; ở ô Phiên âm: sang ô Loại từ; ở ô Loại từ: chọn loại vừa gõ, ô trống thì
  // sang ô Nghĩa trống đầu tiên; ở ô Nghĩa: sang ô Ví dụ cùng cặp; ở ô từ liên kết: thêm từ vừa gõ, ô trống thì sang ô
  // kế tiếp. Ctrl+Enter (Mac: ⌘+Enter) ở ô nào cũng là bấm nút chính
  $add.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    const li = LINKS.findIndex(L => L.$in === e.target);
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); saveWord(); }
    else if (e.target === $term) { e.preventDefault(); lookup(); $phonetic.focus(); }
    else if (e.target === $phonetic) { e.preventDefault(); $typeIn.focus(); }
    else if (e.target === $typeIn) {
      e.preventDefault();
      if (typeName($typeIn.value)) pickType($typeIn.value); else focusSense();
    } else if (e.target.matches('.smean')) {
      e.preventDefault();
      e.target.nextElementSibling.focus();
    } else if (li !== -1) {
      e.preventDefault();
      const L = LINKS[li];
      if (typeName(L.$in.value)) pickLink(L, L.$in.value);
      else if (li + 1 < LINKS.length) LINKS[li + 1].$in.focus();
    }
  });
  // Tất cả từ và Thống kê. Chạm số thẻ ở thanh trên là mở Thống kê; lúc còn thẻ mẫu thì mở cài đặt để kết nối Sheet
  $('btnLib').addEventListener('click', () => openLib('words'));
  $stats.addEventListener('click', () => { if (demo) openSettings(); else openLib('stats'); });
  $('btnLibClose').addEventListener('click', () => $lib.close());
  $tabWords.addEventListener('click', () => showTab('words'));
  $tabStats.addEventListener('click', () => showTab('stats'));
  $('tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const words = !$paneWords.hidden;
    showTab(words ? 'stats' : 'words');
    (words ? $tabStats : $tabWords).focus();
  });
  $find.addEventListener('input', () => renderWords());
  $sort.addEventListener('change', () => { libSort = $sort.value; renderWords(); });
  $filt.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) { libFilter = b.dataset.f; renderWords(); }
  });
  $words.addEventListener('click', e => {
    const b = e.target.closest('.row');
    if (b) openView(Number(b.dataset.i));
  });
  $wordsBox.addEventListener('scroll', () => {
    if ($wordsBox.scrollTop + $wordsBox.clientHeight > $wordsBox.scrollHeight - 800) moreWords();
  }, { passive: true });
  $units.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.dataset.u === statUnit) return;
    statUnit = b.dataset.u;
    statSel = -1;
    renderStats();
  });
  $statsBody.addEventListener('click', e => {
    const c = e.target.closest('.col');
    if (c) pickPeriod(c, Number(c.dataset.i), document.activeElement === c);
  });
  // Rê chuột trên máy tính cũng chọn cột, như chạm trên điện thoại
  $statsBody.addEventListener('pointerover', e => {
    const c = e.pointerType === 'mouse' && e.target.closest('.col');
    if (c && c.getAttribute('aria-pressed') !== 'true') pickPeriod(c, Number(c.dataset.i), false);
  });
  $statsBody.addEventListener('keydown', e => {
    const c = e.target.closest('.col');
    if (!c) return;
    const i = Number(c.dataset.i), n = SPAN[statUnit];
    const to = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    if (to >= 0 && to < n) pickPeriod(c, to, true);
  });
  $statsBody.addEventListener('toggle', e => { statTable = e.target.open; }, true);
  // Xem một từ
  $('btnViewBack').addEventListener('click', () => $view.close());
  $prev.addEventListener('click', () => viewStep(-1));
  $nextWord.addEventListener('click', () => viewStep(1));
  $viewCard.addEventListener('click', e => {
    const it = !viewBusy && e.target.closest('.edit') && viewItem();
    if (it) openAdd(it);
  });
  $viewCard.addEventListener('pointerdown', onViewDown);
  $viewCard.addEventListener('pointermove', onViewMove);
  $viewCard.addEventListener('pointerup', onViewUp);
  $viewCard.addEventListener('pointercancel', onViewUp);
  // Thay đổi chưa đồng bộ, mở từ bảng cài đặt. Đóng thì bảng cài đặt ghi lại số thay đổi còn lại
  $seeChg.addEventListener('click', openChanges);
  $('btnChgClose').addEventListener('click', () => $chg.close());
  $chg.addEventListener('close', () => { if ($dlg.open) renderInfo(); });
  $chgAll.addEventListener('click', askDiscardAll);
  $chgSync.addEventListener('click', () => {
    // Chưa kết nối Sheet: về bảng cài đặt ngay bên dưới, giữ nguyên những gì đang gõ dở trong đó
    if (!sheetIdOf(settings.sheet) || !scriptUrl()) { $chg.close(); $sheet.focus(); return; }
    sync();
  });
  // Bấm Bỏ bằng bàn phím: sau khi danh sách vẽ lại, đưa focus sang nút Bỏ của từ kế tiếp
  $chgBody.addEventListener('click', e => {
    const b = e.target.closest('.cx');
    if (!b) return;
    const keyboard = document.activeElement === b, i = Number(b.dataset.i);
    discardOne(i);
    if (!keyboard) return;
    const left = $chgBody.querySelectorAll('.cx');
    (left[Math.min(i, left.length - 1)] || $('btnChgClose')).focus();
  });
  // Quay lại danh sách: cuộn tới từ vừa xem
  $view.addEventListener('close', () => {
    const k = viewKeys[viewAt];
    const i = libList.findIndex(x => keyOf(x) === k);
    if (!$lib.open || i === -1) return;
    moreWords(i + 1);
    const row = $words.children[i];
    if (!row) return;
    row.scrollIntoView({ block: 'nearest' });
    row.firstElementChild.focus({ preventScroll: true });
  });

  // Phím ← →: đổi thẻ lúc học, sang từ trước/sau lúc xem một từ. Đang mở bảng khác thì để phím cho bảng đó
  document.addEventListener('keydown', e => {
    const top = topDialog();
    if (top === $view) {
      if (e.key === 'ArrowRight') viewStep(1);
      else if (e.key === 'ArrowLeft') viewStep(-1);
      return;
    }
    if (top) return;
    if (e.key === 'ArrowRight') swipe(1);
    else if (e.key === 'ArrowLeft') swipe(-1);
  });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

if (typeof document !== 'undefined') init();
