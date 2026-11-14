// Đồng bộ với Google Sheet, và bảng cài đặt
'use strict';

/* ---------- Đồng bộ với Google Sheet ---------- */
async function sync() {
  if (syncing) return;
  if (!sheetIdOf(settings.sheet) || !scriptUrl()) { openSettings(); return; }
  syncing = true;
  syncRuns++;
  $sync.classList.add('busy');
  const sending = pending;
  pending = dict();
  const fixing = edits;                          // sửa thêm trong lúc chờ thì vào edits mới, gửi lần sau
  edits = dict();
  const dropping = deletes;                      // xoá thêm trong lúc chờ cũng vậy
  deletes = dict();
  const adding = items.filter(x => x.local);
  adding.forEach(x => { x.tried = true; });      // đã gửi đi: xoá từ này sau đó thì phải báo cả Sheet
  const views = unsentViews();
  renderChanges();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    // Mỗi thay đổi kèm chữ của từ; script tìm dòng trong Sheet theo chữ đó. Đổi chữ thì gửi ở trường rename (chữ cũ,
    // chữ mới), vì trường term đã là chữ của từ
    const changes = Object.keys(sending).map(k => Object.assign({ term: k }, sending[k]));
    const fixes = Object.keys(fixing).map(k => {
      const ed = Object.assign({}, fixing[k]), rename = ed.term;
      delete ed.term;
      return Object.assign({ term: k }, ed, rename ? { rename } : {});
    });
    const removes = Object.keys(dropping).map(k => ({ term: k }));
    // body là chuỗi nên trình duyệt gửi dạng text/plain, Apps Script nhận được mà không vướng CORS
    const res = await fetch(scriptUrl(), {
      method: 'POST',
      body: JSON.stringify({ api: API, sheet: sheetIdOf(settings.sheet), key: settings.key, changes, adds: adding,
        edits: fixes, deletes: removes, device: log.device, views }),
      signal: ctrl.signal
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch (_) {}
    if (!data || typeof data !== 'object') {
      throw new Error(settings.url
        ? 'Link chưa đúng. Dùng link Web app đuôi /exec, quyền truy cập Anyone.'
        : 'Script chung đang trục trặc, thử lại sau.');
    }
    if (!data.ok) throw new Error(`Sheet báo lỗi: ${data.error || 'không rõ'}.`);
    if (data.key) {                              // script vừa thiết lập Sheet trống và tạo mã
      settings.key = String(data.key);
      store(KEYS.settings, settings);
    }
    // Script bản trước chưa biết đổi chữ (bản trước nữa chưa có cột antonyms, related, hay còn tìm từ theo cột id) nên
    // không ghi đủ những gì app gửi: giữ mọi thay đổi trong máy, gửi lại khi script đã cập nhật. Gửi lại không bị trùng:
    // từ đã có dòng thì script chỉ điền ô còn trống, bản sửa đã ghi rồi thì thôi
    if (!(data.api >= API)) {
      throw new Error('Script chưa được cập nhật nên chưa nhận thay đổi từ app. Thay đổi vẫn lưu trong máy.');
    }

    const wasDemo = demo;
    demo = false;
    types = (Array.isArray(data.types) ? data.types : []).filter(x => x && typeName(x.type))
      .map(x => ({ type: typeName(x.type), abbr: String(x.abbr == null ? '' : x.abbr).trim() }));
    store(KEYS.types, types);
    const got = dedupe((Array.isArray(data.items) ? data.items : []).map(fill));
    const gotBy = new Map(got.map(x => [keyOf(x), x]));
    // Lượt xem Sheet đã ghi. Lượt xem Sheet chưa ghi đủ thì để gửi lần sau
    if (data.log && typeof data.log === 'object') {
      log.synced = counts(data.log.mine);
      log.others = counts(data.log.others);
    }
    // Bản gốc mới (xem keepBase) cho những từ còn thay đổi chưa gửi: thẻ như Sheet vừa trả về, chụp trước khi áp các
    // thay đổi đó lên thẻ. Từ đổi chữ mà Sheet chưa nhận thì Sheet còn ghi chữ cũ
    const fresh = dict();
    const keep = k => {
      const rn = edits[k] && edits[k].term;
      const x = gotBy.get(rn ? normTerm(rn.from) : k);
      if (x && !fresh[k]) fresh[k] = Object.assign({}, x);
    };
    // Đổi chữ Sheet không nhận (chữ mới đã là từ khác trong Sheet, hay không còn dòng mang chữ cũ): script bỏ qua mọi
    // thay đổi của từ đó lần này
    const unrenamed = new Set((Array.isArray(data.unrenamed) ? data.unrenamed : []).map(normTerm));
    // Chữ Sheet đang ghi cho một thẻ trong máy: từ đổi chữ mà Sheet chưa nhận thì Sheet còn ghi chữ cũ
    const sheetKey = x => {
      const k = keyOf(x), sent = fixing[k] && fixing[k].term, later = edits[k] && edits[k].term;
      const rn = (sent && unrenamed.has(k) && sent) || later;
      return rn ? normTerm(rn.from) : k;
    };
    // Ngày thêm: ô trong Sheet còn trống mà thẻ trong máy có ngày (từ thêm lúc script chưa có cột added) thì giữ ngày
    // trong máy, và gửi lên ở lần đồng bộ sau
    const had = new Map(items.map(x => [sheetKey(x), x.added]));
    got.forEach(x => {
      const k = keyOf(x), a = had.get(k);
      if (x.added || !validDate(a)) return;
      keep(k);                                   // bản gốc giữ ô ngày thêm còn trống, như trong Sheet
      x.added = a;
      pending[k] = Object.assign({}, pending[k], { added: a });
    });
    // Bản sửa: Sheet đã có nội dung mới thì xong; nằm trong conflicts thì Sheet giữ bản của nó (ô vừa được sửa thẳng
    // trong Sheet, hay từ không còn trong Sheet). Còn lại thì giữ để gửi lần sau
    const conflicts = new Set((Array.isArray(data.conflicts) ? data.conflicts : []).map(normTerm));
    // Đổi chữ Sheet không nhận: từ giữ chữ cũ, các thay đổi khác của nó đi theo chữ cũ để gửi lần sau
    const lost = [], lostRename = [];
    Object.keys(fixing).forEach(k => {
      const it = gotBy.get(k), rn = fixing[k].term;
      if (rn && unrenamed.has(k)) {
        lostRename.push(rn);
        const old = normTerm(rn.from), rest = Object.assign({}, fixing[k]);
        [pending, edits].forEach(o => {      // thay đổi làm trong lúc chờ đồng bộ cũng đi theo chữ cũ
          if (!o[k]) return;
          o[old] = Object.assign({}, o[old], o[k]);
          delete o[k];
        });
        if (edits[old]) delete edits[old].term;
        delete rest.term;
        if (Object.keys(rest).length) keepEdits({ [old]: rest });
        if (edits[old] && !Object.keys(edits[old]).length) delete edits[old];
        if (sending[k]) pending[old] = Object.assign({}, sending[k], pending[old]);
        return;
      }
      const ed = Object.assign({}, fixing[k]);
      if (rn && it && it.term === rn.to) delete ed.term;   // Sheet đã đổi chữ: không gửi lại lần sau
      if (it && Object.keys(ed).every(name => it[name] === ed[name].to)) return;
      if (conflicts.has(k)) lost.push(it ? it.term : '');
      else keepEdits({ [k]: ed });
    });
    // Từ đã xoá thì script xoá dòng của từ đó (dòng không còn thì thôi), nên không cần làm gì thêm.
    // Từ mới thêm trong lúc chờ đồng bộ thì giữ lại trong máy. Từ xoá trong lúc chờ thì vẫn ẩn
    items = got.concat(items.filter(x => x.local && !gotBy.has(keyOf(x)))).filter(x => !deletes[keyOf(x)]);
    changedKeys().forEach(keep);
    base = fresh;
    // Đổi chữ Sheet không nhận: các bản sửa và từ mới thêm trong máy đang ghi chữ mới ở ô từ liên kết thì về chữ cũ. Thẻ
    // lấy từ Sheet thì để nguyên, vì chữ mới ở đó có thể là của từ khác
    lostRename.forEach(rn => relinkAll(normTerm(rn.to), rn.from, items.filter(x => x.local)));
    applyEdits();                                // đổi chữ trước, để tiến độ học tìm được thẻ theo chữ mới
    const byKey = new Map(items.map(x => [keyOf(x), x]));
    Object.keys(pending).forEach(k => {          // thao tác làm trong lúc đang chờ đồng bộ
      const it = byKey.get(k);
      if (it) Object.assign(it, pending[k]);
    });
    lastSync = new Date().toISOString();
    store(KEYS.lastSync, lastSync);
    persist();
    const same = !wasDemo && current ? byKey.get(keyOf(current)) : null;
    if (same && !same.mastered) show(same); else next();
    refreshLib();
    // Sheet có từ ở nhiều dòng: app chỉ dùng dòng trên cùng, nhắc người dùng gộp lại
    const dupes = (Array.isArray(data.dupes) ? data.dupes : []).map(String);
    const rn0 = lostRename[0];
    toast(data.key ? `Đã thiết lập Sheet, mã bí mật là ${data.key}. Xem lại trong ⚙.`
      : lostRename.length === 1 ? `Không đổi được “${rn0.from}” thành “${rn0.to}”: Sheet đã có “${rn0.to}”, `
        + `hoặc “${rn0.from}” vừa bị đổi hay xoá trong Sheet.`
      : lostRename.length ? `${lostRename.length} từ không đổi được chữ: Sheet đã có chữ mới, hoặc chữ cũ vừa bị đổi `
        + 'hay xoá trong Sheet.'
      : lost.length === 1 && lost[0] ? `Bản sửa “${lost[0]}” không được ghi vì từ này vừa đổi trong Sheet.`
      : lost.length ? `${lost.length} bản sửa không được ghi vì từ đã đổi hoặc bị xoá trong Sheet.`
      : dupes.length === 1 ? `“${dupes[0]}” có ở nhiều dòng trong Sheet, app chỉ dùng dòng trên cùng.`
      : dupes.length ? `${dupes.length} từ có ở nhiều dòng trong Sheet (${dupes.slice(0, 3).join(', ')}`
        + `${dupes.length > 3 ? '…' : ''}), app chỉ dùng dòng trên cùng.`
      : `Đã đồng bộ ${got.length} thẻ`);
  } catch (err) {
    Object.keys(sending).forEach(k => { pending[k] = Object.assign({}, sending[k], pending[k]); });
    keepEdits(fixing);
    Object.assign(deletes, dropping);
    persist();
    toast(!navigator.onLine ? 'Chưa có mạng. Thay đổi vẫn lưu trong máy, có mạng thì bấm đồng bộ lại.'
      : err.name === 'AbortError' ? 'Script không trả lời sau 30 giây. Bấm đồng bộ lại.'
      : err instanceof TypeError ? 'Không gọi được script. Kiểm tra mạng và link trong ⚙.'
      : err.message);
  } finally {
    clearTimeout(timer);
    syncing = false;
    $sync.classList.remove('busy');
    renderTop();
    renderChanges();
    if ($dlg.open) renderInfo();
  }
}

/* ---------- Cài đặt ---------- */
function openSettings() {
  $sheet.value = settings.sheet;
  $key.value = settings.key;
  $url.value = settings.url;
  renderInfo();
  if (!$dlg.open) $dlg.showModal();
}
// Dòng cuối bảng cài đặt: lần đồng bộ gần nhất, số thay đổi chưa gửi, và nút xem các thay đổi đó
function renderInfo() {
  const n = unsynced();
  $info.textContent = (lastSync ? `Đồng bộ gần nhất lúc ${fmtDateTime(lastSync)}.` : 'Chưa đồng bộ lần nào.')
    + (n ? ` Còn ${n} thay đổi chưa gửi lên Sheet.` : '');
  $seeChg.hidden = !n;
}
function saveSettings() {
  settings = { sheet: $sheet.value.trim(), key: $key.value.trim(), url: $url.value.trim() };
  const saved = store(KEYS.settings, settings);
  $dlg.close();
  if (!saved) { toast('Không lưu được cài đặt vào máy.'); return; }
  if (!settings.sheet) return;
  if (!sheetIdOf(settings.sheet)) {
    toast('Link Sheet cần có dạng https://docs.google.com/spreadsheets/d/…');
    return;
  }
  if (settings.url && !/^https:\/\/script\.google\.com\/.+\/exec$/.test(settings.url)) {
    toast('Link script cần có dạng https://script.google.com/…/exec');
    return;
  }
  if (!scriptUrl()) { toast('Chưa có script chung, hãy dán link Apps Script của bạn.'); return; }
  sync();
}
