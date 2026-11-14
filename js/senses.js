// Nghĩa và ví dụ của một từ: đọc và ghi hai ô meaning, example theo từng cặp
'use strict';

/* ---------- Nghĩa và ví dụ ----------
   Mỗi nghĩa của từ đi cùng ví dụ của nó. Ô meaning mỗi nghĩa một dòng, mở đầu bằng nhãn: loại viết tắt, thêm số khi
   loại đó có từ hai nghĩa: (v1) chạy, (v2) điều hành, (n) cuộc chạy. Ô example mỗi ví dụ một dòng; từ có từ hai nghĩa
   thì ví dụ mở đầu bằng nhãn của nghĩa nó thuộc về: (v2) She runs a small company. Từ chỉ có một nghĩa thì ví dụ không
   cần nhãn, Sheet giống hệt lúc chưa có cặp. Từ chưa có loại mà có từ hai nghĩa thì nhãn là (1), (2).
   Nhãn là để ghép, không phải số thứ tự: xoá dòng (v1) thẳng trong Sheet thì (v2) vẫn ghép đúng ví dụ của nó. Số hiện
   trên thẻ luôn tính lại theo thứ tự, và app đánh lại số ở cả hai ô mỗi lần lưu các cặp. */

// "(v2) điều hành" → { tag: 'v2', base: 'v', n: 2, rest: 'điều hành' }. Dòng không mở đầu bằng nhãn thì null
function labelOf(l) {
  const m = PREFIX.exec(l);
  if (!m) return null;
  const tag = m[0].slice(1, -1).trim(), d = /^(.*?)\s*(\d+)$/.exec(tag);
  return { tag, base: d ? d[1] : tag, n: d ? Number(d[2]) : null, rest: l.slice(m[0].length).trim() };
}
/* Đọc hai ô meaning và example của thẻ it. Trả về { list, loose }:
   - list: các nghĩa theo thứ tự trong ô, mỗi nghĩa { type, n, mean, ex }. type: loại của nghĩa, '' khi từ chưa có loại.
     n: số ghi trong nhãn, null khi không ghi. mean: nghĩa, đã bỏ nhãn. ex: các ví dụ của nghĩa đó.
     Dòng không nhãn là nghĩa tiếp theo của loại ở dòng trên; dòng không nhãn đứng đầu ô là của loại đầu tiên.
     Dòng có nhãn lạ hay nhãn ghép, như (n, v) chạy, thì có raw: true, mean giữ nguyên cả dòng, tags là các loại mà nhãn
     ghép ghi tên. Loại chưa có dòng nào thì có một nghĩa trống, ngay sau các nghĩa của loại trước nó. list không rỗng.
   - loose: các ví dụ chưa gắn nghĩa nào, giữ nguyên cả dòng. */
function parseSenses(it) {
  const ts = typesOf(it.type);
  // Nhãn của một loại ghi viết tắt ở tab types, viết tắt quen thuộc hoặc nguyên tên: adjective nhận cả (adj) lẫn
  // (adjective), kể cả khi tab types đổi viết tắt thành a
  const keys = ts.map(t => new Set([abbr(t), ABBR[normTerm(t)], t].filter(Boolean).map(normTerm)));
  const typeOf = lb => {                 // loại mà nhãn ghi; nhãn không phải của loại nào thì null
    if (!ts.length) return !lb.base && lb.n !== null ? '' : null;
    const i = keys.findIndex(k => k.has(normTerm(lb.base)));
    return i === -1 ? null : ts[i];
  };
  const list = [];
  let cur = ts.length ? ts[0] : '';
  lines(it.meaning).forEach(l => {
    const lb = labelOf(l), t = lb ? typeOf(lb) : cur;
    if (t === null) {
      const tags = lb.tag.split(/[,/]/).map(s => typeOf({ base: s.trim(), n: null })).filter(Boolean);
      list.push({ type: cur, n: null, mean: l, ex: [], raw: true, tags });
      return;
    }
    cur = t;
    list.push({ type: t, n: lb ? lb.n : null, mean: lb ? lb.rest : l, ex: [] });
  });
  // Loại chưa có dòng nào: thêm nghĩa trống ngay sau các nghĩa của loại đứng trước, để thẻ vẫn hiện (v)
  let at = 0;
  ts.forEach(t => {
    const k = normTerm(t);
    const own = s => s.raw ? s.tags.some(x => normTerm(x) === k) : normTerm(s.type) === k;
    let last = -1;
    list.forEach((s, j) => { if (own(s)) last = j; });
    if (last < 0) list.splice(at++, 0, { type: t, n: null, mean: '', ex: [] });
    else at = last + 1;
  });
  if (!list.length) list.push({ type: '', n: null, mean: '', ex: [] });
  // Ví dụ có nhãn: ghép với nghĩa ghi đúng nhãn đó. Loại đó có từ hai nghĩa mà chưa ghi số ở dòng nào (dữ liệu cũ, như
  // (v) chạy / (v) điều hành) thì (v2) là nghĩa verb thứ hai. Ví dụ không nhãn: từ có một nghĩa thì thuộc nghĩa đó, có
  // từ hai nghĩa thì chưa gắn nghĩa nào
  const rest = [];                       // ví dụ chưa ghép được, theo thứ tự trong ô; plain: không có nhãn
  lines(it.example).forEach(l => {
    const lb = labelOf(l), t = lb ? typeOf(lb) : null;
    if (t === null) { rest.push({ l, plain: true }); return; }
    const group = list.filter(s => !s.raw && normTerm(s.type) === normTerm(t));
    const s = group.find(x => x.n === lb.n)
      || (lb.n !== null && group.length > 1 && group.every(x => x.n === null) ? group[lb.n - 1] : null);
    if (!s) rest.push({ l, plain: false });
    else if (lb.rest) s.ex.push(lb.rest);
  });
  const filled = list.filter(s => s.mean || s.ex.length), loose = [];
  rest.forEach(x => {
    if (x.plain && filled.length <= 1) (filled[0] || list[0]).ex.push(x.l);
    else loose.push(x.l);
  });
  return { list, loose };
}
// Nhãn của từng nghĩa trong list, theo thứ tự: loại viết tắt, thêm số khi loại đó có từ hai nghĩa trong list: v1, v2,
// n. Từ chưa có loại mà có từ hai nghĩa thì 1, 2; chỉ một nghĩa thì không có nhãn ('')
function tagList(list) {
  const count = new Map(), seen = new Map();
  list.forEach(s => { const k = normTerm(s.type); count.set(k, (count.get(k) || 0) + 1); });
  return list.map(s => {
    const k = normTerm(s.type), i = (seen.get(k) || 0) + 1;
    seen.set(k, i);
    return (s.type ? abbr(s.type) : '') + (count.get(k) > 1 ? i : '');
  });
}
/* Ghi các nghĩa vào hai ô meaning và example. list: các nghĩa theo thứ tự, mỗi nghĩa { type, mean, ex: [ví dụ] };
   nghĩa không có chữ nào thì bỏ. loose: ví dụ chưa gắn nghĩa, ghi nguyên ở cuối ô example. Trả về { meaning, example } */
function writeSenses(list, loose) {
  const keep = list.filter(s => s.mean || s.ex.length), pair = keep.length > 1, tags = tagList(keep);
  const meaning = [], example = [];
  keep.forEach((s, i) => {
    const lab = tags[i] ? `(${tags[i]})` : '';
    // Từ có từ hai nghĩa mà nghĩa để trống: vẫn giữ dòng chỉ có nhãn, để ví dụ còn ghép được
    if (s.mean) meaning.push(lab ? `${lab} ${s.mean}` : s.mean);
    else if (pair) meaning.push(lab);
    s.ex.forEach(e => example.push(pair ? `${lab} ${e}` : e));
  });
  return { meaning: meaning.join('\n'), example: example.concat(loose).join('\n') };
}
/* Các dòng nghĩa trên thẻ, mỗi dòng kèm ví dụ của nó: [{ text, ex }]. Nghĩa trống thì không hiện, trừ khi loại đó chưa
   có nghĩa nào: dòng chỉ có (v), như lúc chọn loại trong bảng Thêm/Sửa từ. Dòng nhãn lạ hiện nguyên văn, không đánh số */
function senseRows(p) {
  const counted = p.list.filter(s => !s.raw && (s.mean || s.ex.length));
  const tags = new Map(tagList(counted).map((t, i) => [counted[i], t]));
  const done = new Set();                // loại đã có dòng nghĩa
  p.list.forEach(s => {
    if (s.raw) s.tags.forEach(t => done.add(normTerm(t)));
    else if (tags.has(s)) done.add(normTerm(s.type));
  });
  const rows = [];
  p.list.forEach(s => {
    if (s.raw) rows.push({ text: s.mean, ex: s.ex });
    else if (tags.has(s)) {
      const t = tags.get(s);
      rows.push({ text: t ? `(${t}) ${s.mean}`.trim() : s.mean, ex: s.ex });
    } else if (s.type && !done.has(normTerm(s.type))) {
      done.add(normTerm(s.type));
      rows.push({ text: `(${abbr(s.type)})`, ex: [] });
    }
  });
  return rows;
}
