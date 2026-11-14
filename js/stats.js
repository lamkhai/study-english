// Thống kê: từ mới và lượt xem theo ngày, tuần, tháng
'use strict';

/* ---------- Thống kê ----------
   Từ mới: đếm theo ngày thêm của từng từ còn trong bộ thẻ. Lượt xem: mỗi lần ghi last seen lúc học, cộng cả các máy
   khác dùng chung Sheet. Một biểu đồ cột cho mỗi chỉ số; chạm một cột để xem số của khoảng đó. */
const SPAN = { day: 14, week: 12, month: 12 };            // số cột của biểu đồ
const UNIT = { day: 'ngày', week: 'tuần', month: 'tháng' };
const WEEKDAY = ['Chủ nhật', 'thứ Hai', 'thứ Ba', 'thứ Tư', 'thứ Năm', 'thứ Sáu', 'thứ Bảy'];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
// Ngày đầu của n khoảng (ngày, tuần tính từ thứ Hai, tháng), cũ trước, khoảng cuối chứa hôm nay.
// Thêm một mốc là ngày đầu của khoảng kế tiếp, để biết khoảng cuối hết ở đâu
function periods(unit, n, now) {
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const monday = d - (now.getDay() + 6) % 7;
  const at = unit === 'month' ? i => new Date(y, m - i, 1)
    : unit === 'week' ? i => new Date(y, m, monday - 7 * i)
    : i => new Date(y, m, d - i);
  const out = [];
  for (let i = n - 1; i >= -1; i--) out.push(at(i));
  return out;
}
// Cộng số theo ngày vào từng khoảng
function sums(byDay, bounds) {
  const keys = bounds.map(dayKey);
  const out = keys.slice(1).map(() => 0);
  Object.keys(byDay).forEach(k => {
    if (k < keys[0] || k >= keys[keys.length - 1]) return;
    let i = out.length - 1;
    while (k < keys[i]) i--;
    out[i] += byDay[k];
  });
  return out;
}
function addedByDay() {
  const out = {};
  items.forEach(it => {
    if (!validDate(it.added)) return;
    const k = dayKey(new Date(it.added));
    out[k] = (out[k] || 0) + 1;
  });
  return out;
}
// Lượt xem mỗi ngày: các máy khác cộng với máy này. Sheet có thể chưa ghi kịp số mới nhất của máy này nên lấy số lớn hơn
function viewsByDay() {
  const out = Object.assign({}, log.others);
  const own = Object.assign({}, log.synced);
  Object.keys(log.mine).forEach(k => { own[k] = Math.max(own[k] || 0, log.mine[k]); });
  Object.keys(own).forEach(k => { out[k] = (out[k] || 0) + own[k]; });
  return out;
}
function periodName(unit, s, i, n) {
  const dm = x => `${x.getDate()}/${x.getMonth() + 1}`;
  const last = i === n - 1, prev = i === n - 2;
  if (unit === 'day') return last ? 'hôm nay' : prev ? 'hôm qua' : `${WEEKDAY[s.getDay()]} ${dm(s)}`;
  if (unit === 'week') {
    return last ? 'tuần này' : prev ? 'tuần trước'
      : `tuần ${dm(s)} – ${dm(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6))}`;
  }
  return last ? 'tháng này' : prev ? 'tháng trước' : `tháng ${s.getMonth() + 1}/${s.getFullYear()}`;
}
// Nhãn dưới cột: ngày trong tháng, ngày đầu tuần (cách hai cột ghi một), hay tháng
function tickName(unit, s, i, n) {
  if (unit === 'day') return String(s.getDate());
  if (unit === 'week') return (n - 1 - i) % 3 ? '' : `${s.getDate()}/${s.getMonth() + 1}`;
  return `T${s.getMonth() + 1}`;
}
// Vạch chia trục dọc: số tròn, nhiều nhất 4 khoảng
function ticks(max) {
  for (let p = 1; ; p *= 10) {
    for (const s of [1, 2, 5]) {
      const step = s * p, k = Math.ceil(Math.max(max, 1) / step);
      if (k <= 4) return Array.from({ length: k + 1 }, (_, i) => i * step);
    }
  }
}
function renderStats() {
  const n = SPAN[statUnit], unit = UNIT[statUnit];
  const bounds = periods(statUnit, n, new Date());
  const starts = bounds.slice(0, n);
  const names = starts.map((s, i) => periodName(statUnit, s, i, n));
  const sel = statSel >= 0 && statSel < n ? statSel : n - 1;
  $units.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.u === statUnit)));
  const metrics = [
    { name: 'Từ mới', noun: 'từ', byDay: addedByDay() },
    { name: 'Lượt xem', noun: 'lượt', byDay: viewsByDay() }
  ];
  let html = '';
  metrics.forEach((m, mi) => {
    const data = m.data = sums(m.byDay, bounds);
    const ts = ticks(Math.max(...data));
    const top = ts[ts.length - 1];
    const total = data.reduce((a, b) => a + b, 0);
    // Trung bình tính từ khoảng có số liệu đầu tiên, để thời gian trước khi app bắt đầu ghi không kéo số xuống
    const first = Object.keys(m.byDay).reduce((a, k) => (!a || k < a ? k : a), '');
    const from = first ? starts.findIndex((s, i) => dayKey(bounds[i + 1]) > first) : -1;
    let sum = `${n} ${unit} gần nhất: ${NUM.format(total)} ${m.noun}`;
    if (from !== -1 && n - from > 1) sum += ` · trung bình ${AVG.format(total / (n - from))} mỗi ${unit}`;
    const cols = data.map((v, i) => `<button class="col" type="button" data-i="${i}" aria-pressed="${i === sel}"`
      + ` tabindex="${i === sel ? 0 : -1}" aria-label="${esc(cap(names[i]))}: ${NUM.format(v)} ${m.noun}"`
      + ` style="--h:${v > 0 ? Math.max(v / top, 0.02).toFixed(4) : 0}"><i></i></button>`).join('');
    html += `<section class="metric" aria-labelledby="mt${mi}">
      <h3 id="mt${mi}">${m.name}</h3>
      <p class="fig"><b>${NUM.format(data[sel])}</b> ${m.noun} · ${esc(names[sel])}</p>
      <div class="chart">
        <div class="yax" aria-hidden="true">${ts.map(t => `<span style="--y:${t / top}">${NUM.format(t)}</span>`).join('')}</div>
        <div class="plot">${ts.map(t => `<i class="gl" style="--y:${t / top}"></i>`).join('')}<div class="cols" role="group" aria-label="${m.name} theo ${unit}">${cols}</div></div>
        <div class="xax" aria-hidden="true">${starts.map((s, i) => `<span${i === sel ? ' class="on"' : ''}>${tickName(statUnit, s, i, n)}</span>`).join('')}</div>
      </div>
      <p class="sum">${sum}</p>
    </section>`;
  });
  const rows = names.map((name, i) => `<tr><th scope="row">${esc(cap(name))}</th>`
    + `<td>${NUM.format(metrics[0].data[i])}</td><td>${NUM.format(metrics[1].data[i])}</td></tr>`).reverse().join('');
  html += `<details class="tbl"${statTable ? ' open' : ''}><summary>Xem dạng bảng</summary><table>
    <thead><tr><th scope="col">${cap(unit)}</th><th scope="col">Từ mới</th><th scope="col">Lượt xem</th></tr></thead>
    <tbody>${rows}</tbody></table></details>`;
  const notes = [];
  if (demo) notes.push('Đây là thẻ mẫu. Kết nối Sheet hoặc thêm từ để bắt đầu thống kê.');
  else {
    const unknown = items.filter(x => !validDate(x.added)).length;
    if (unknown) notes.push(`${NUM.format(unknown)} từ được thêm trước khi app ghi ngày thêm nên không tính vào Từ mới.`);
  }
  notes.push('Mỗi lần vuốt sang thẻ khác hay bấm Đã nắm rõ là một lượt xem. Xem trong Tất cả từ thì không tính.');
  html += notes.map(t => `<p class="note">${t}</p>`).join('');
  $statsBody.innerHTML = html;
}
// Chọn một cột: cả hai biểu đồ cùng hiện số của khoảng đó. focus: đưa focus về cột vừa chọn sau khi vẽ lại
function pickPeriod(el, i, focus) {
  const charts = Array.from($statsBody.querySelectorAll('.metric'));
  const k = charts.indexOf(el.closest('.metric'));
  statSel = i;
  renderStats();
  if (focus) $statsBody.querySelectorAll('.metric')[k].querySelector('.col[tabindex="0"]').focus();
}
