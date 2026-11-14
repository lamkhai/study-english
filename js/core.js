/* Phần dùng chung: hằng số, biến lưu trạng thái, các ô trên trang, hàm tiện ích.
   App gồm nhiều file JS thường (không phải module), chạy lần lượt theo thứ tự trong index.html và dùng chung biến,
   hàm ở phạm vi toàn cục: file sau dùng được mọi thứ của file trước. Thêm, bớt hay đổi tên file thì sửa cả
   index.html lẫn danh sách FILES trong sw.js. */
'use strict';

const KEYS = {
  items: 'tv.items', pending: 'tv.pending', edits: 'tv.edits', deletes: 'tv.deletes', base: 'tv.base', types: 'tv.types',
  settings: 'tv.settings', lastSync: 'tv.lastSync', log: 'tv.log'
};
const NUM = new Intl.NumberFormat('vi-VN');                                // 1.234
const AVG = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });  // 3,2

// Loại từ do người dùng tạo, lưu ở tab types của Sheet. Đây chỉ là chữ viết tắt quen thuộc đặt trước nghĩa:
// (n) cuộc chạy. Cột abbr ở tab types ghi đè; loại không có ở đây mà chưa ghi abbr thì dùng nguyên tên.
const ABBR = {
  noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv', pronoun: 'pron', preposition: 'prep',
  conjunction: 'conj', interjection: 'interj', 'phrasal verb': 'phr v'
};
// Dòng nghĩa mở đầu bằng nhãn: loại viết tắt, thêm số khi loại đó có từ hai nghĩa: (n) cuộc chạy, (v2) điều hành.
// Tên loại dài tối đa 30 ký tự (ô Loại từ cũng giới hạn vậy), chừa thêm chỗ cho số
const PREFIX = /^\([^)]{1,34}\)/;
// Từ liên kết, mỗi loại một cột trong Sheet và một ô trong bảng Thêm/Sửa từ. id: đầu id của ô (synIn, synTags,
// synSugg). short: chữ đặt trước các từ đó trên thẻ. typed: kèm loại từ của từng từ có trong bộ thẻ, vì từ liên quan
// thường là từ cùng họ khác loại: study (v), student (n).
// Lúc bảng Thêm/Sửa từ mở, mỗi loại còn giữ list: các từ đang có trong ô; auto: các từ app tự điền vào ô; dropped:
// các từ người dùng đã bỏ khỏi ô. auto và dropped ở dạng khoá (normTerm)
const LINKS = [
  { name: 'synonyms', id: 'syn', short: 'syn.', label: 'từ đồng nghĩa' },
  { name: 'antonyms', id: 'ant', short: 'ant.', label: 'từ trái nghĩa' },
  { name: 'related', id: 'rel', short: 'rel.', label: 'từ liên quan', typed: true }
].map(L => Object.assign(L, { list: [], auto: [], dropped: new Set() }));

// Phiên bản giao tiếp với script. Bản 2: app và script nhận ra từng từ theo chữ của từ, Sheet không còn cột id.
// Bản 3: Sheet có thêm cột antonyms (từ trái nghĩa) và related (từ liên quan). Bản 4: app đổi được chữ của từ, script
// đổi chữ ở đúng dòng và ở ô từ liên kết của mọi dòng
const API = 4;

// Thẻ mẫu: chỉ hiện khi chưa đồng bộ lần nào, không được lưu vào máy
const DEMO = [
  { type: 'phrase', term: 'in conjunction with', phonetic: '/ɪn kənˈdʒʌŋkʃən wɪð/', meaning: 'kết hợp với',
    example: 'hooks, states, props, Redux *in conjunction with* React components', synonyms: 'together with',
    lastSeen: '', mastered: false },
  { type: 'grammar', term: 'have/has been + V-ing', phonetic: '',
    meaning: 'thì hiện tại hoàn thành tiếp diễn: việc bắt đầu trong quá khứ và vẫn đang tiếp diễn',
    example: 'I *have been learning* English for two years.\nShe *has been waiting* since 9 a.m.', synonyms: '',
    lastSeen: '2026-10-14T13:00:00.000Z', mastered: false },
  { type: 'phrasal verb', term: 'make up for', phonetic: '/meɪk ʌp fɔːr/', meaning: 'bù đắp cho',
    example: 'He stayed late to *make up for* the lost time.\nNothing can *make up for* that mistake.',
    synonyms: 'compensate for, offset', lastSeen: '', mastered: false }
];

let items = [];                        // toàn bộ thẻ, mỗi từ một thẻ; từ thêm trong app mà Sheet chưa nhận thì có local: true
// Ba bảng dưới đây tra theo từ (keyOf: chữ của từ viết thường, gọn khoảng trắng)
let pending = dict();                  // thay đổi chưa đồng bộ: { từ: { lastSeen, mastered } }
let edits = dict();                    // bản sửa chưa đồng bộ: { từ: { meaning: { from, to }, … } }
let deletes = dict();                  // từ đã xoá trong app, chờ xoá trong Sheet: { từ: { term } }
// Bản gốc của từ có thay đổi chưa đồng bộ: thẻ như trong Sheet ở lần đồng bộ gần nhất, để bỏ thay đổi thì thẻ trở về
// như cũ (xem keepBase). Từ mới thêm trong app thì không có
let base = dict();
let types = [];                        // loại từ ở tab types của Sheet, nhận về lúc đồng bộ: [{ type, abbr }]
let settings = { sheet: '', key: '', url: '' }; // url: link script riêng, bỏ trống thì dùng SHARED_URL
let lastSync = '';
// Lượt xem mỗi ngày, cho thống kê: { '2026-10-27': 35 }. mine: của máy này, đếm trong máy; synced: của máy này mà
// Sheet đã ghi; others: của các máy khác dùng chung Sheet
let log = { device: '', mine: {}, synced: {}, others: {} };
let current = null;                    // thẻ đang hiện
let demo = false, busy = false, syncing = false, drag = null, toastTimer = 0;
let editing = null, renaming = false, lookupTimer = 0;  // bảng đang sửa thẻ nào, và có đang đổi chữ của thẻ đó không
let picked = [];                       // loại từ đang chọn trong bảng Thêm/Sửa từ
// Các cặp Nghĩa – Ví dụ trong bảng Thêm/Sửa từ, xếp theo loại đã chọn: [{ type, mean, ex }]. type: loại của cặp, ''
// khi chưa chọn loại nào; ex: chữ trong ô Ví dụ, mỗi ví dụ một dòng
let senses = [];
let formRun = 0;                       // tăng mỗi lần bảng trống lại hay nạp từ khác, để Hoàn tác không làm nhầm bảng
let autoKey = '';                      // từ mới đang gõ lúc app điền sẵn các ô từ liên kết (xem LINKS và autoLinks)
let libFilter = 'all', libSort = 'new', libList = [], libShown = 0;  // Tất cả từ: lọc, cách xếp, danh sách, số dòng đã vẽ
let statUnit = 'day', statSel = -1, statTable = false;  // Thống kê: theo ngày/tuần/tháng, cột đang chọn (-1: hiện tại)
let viewKeys = [], viewAt = 0, viewBusy = false, vdrag = null;  // Xem một từ: danh sách lúc bấm vào, đang ở từ thứ mấy
let chgList = [], syncRuns = 0;        // Thay đổi chưa đồng bộ: các mục đang hiện; số lần đã bắt đầu đồng bộ
let $card, $stats, $badge, $sync, $master, $next, $hint, $toast, $toastMsg, $toastAct, $dlg, $sheet, $key, $url, $help, $info;
let $seeChg;
let $add, $addTitle, $addMsg, $term, $phonetic, $tags, $typeIn, $sugg, $senses, $loose, $looseBox;
let $addSave, $addDel, $termSugg, $rename, $unpick;
let $del, $delTitle, $delText, $delOk;
let $chg, $chgBox, $chgNote, $chgBody, $chgAll, $chgSync;
let $lib, $tabWords, $tabStats, $paneWords, $paneStats, $find, $sort, $filt, $words, $wordsBox, $wordsNone, $units;
let $statsBox, $statsBody;
let $view, $viewCard, $viewPos, $viewHint, $prev, $nextWord;

/* ---------- Hàm tiện ích ---------- */
const pad = n => String(n).padStart(2, '0');
function validDate(iso) { return !!iso && !isNaN(Date.parse(iso)); }
function fmtDate(iso) {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function fmtDateTime(iso) {
  const d = new Date(iso);
  return `${fmtDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function daysAgo(iso, now) {
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  return Math.round((day(now ? new Date(now) : new Date()) - day(new Date(iso))) / 86400000);
}
function agoText(n) { return n <= 0 ? 'hôm nay' : n === 1 ? 'hôm qua' : `${n} ngày trước`; }
function esc(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
// *cụm từ*  →  cụm từ in đậm, tô dạ quang
function rich(s) { return esc(s).replace(/\*(.+?)\*/g, '<b>$1</b>'); }
function lines(s) { return String(s == null ? '' : s).split(/\r?\n/).map(l => l.trim()).filter(Boolean); }
// Tên loại từ hay từ liên kết gọn: bỏ khoảng trắng thừa
function typeName(s) { return String(s == null ? '' : s).trim().replace(/\s+/g, ' '); }
// "noun,  phrasal   verb" → ['noun', 'phrasal verb']
function typesOf(type) { return String(type == null ? '' : type).split(',').map(typeName).filter(Boolean); }
// Các từ trong một ô từ liên kết: "unavoidable, inescapable" → ['unavoidable', 'inescapable']. Gõ trong Sheet thì
// cách nhau bằng chấm phẩy hay xuống dòng cũng được
function wordsOf(s) { return String(s == null ? '' : s).split(/[,;\n]/).map(typeName).filter(Boolean); }
// So từ, và so loại từ: không phân biệt hoa thường và khoảng trắng thừa
function normTerm(s) { return String(s == null ? '' : s).normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase(); }
// Mỗi từ một thẻ, nên app nhận ra thẻ theo chữ của từ. Script cũng tìm dòng trong Sheet theo đúng cách này
function keyOf(it) { return normTerm(it.term); }
// Bảng tra theo từ. Không kế thừa gì từ Object, để từ như "constructor" không trùng tên có sẵn của JavaScript
function dict(o) { return Object.assign(Object.create(null), o); }
// Thẻ lưu trong máy từ bản app trước chưa có phiên âm, từ liên kết hay ngày thêm
function fill(it) {
  if (typeof it.phonetic !== 'string') it.phonetic = '';
  LINKS.forEach(L => { if (typeof it[L.name] !== 'string') it[L.name] = ''; });
  if (typeof it.added !== 'string') it.added = '';
  return it;
}
// Ngày theo giờ trong máy, dạng 2026-10-27. So hai chuỗi này là so hai ngày
function dayKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
// Số theo ngày đọc trong máy hay nhận từ Sheet: chỉ giữ ngày đúng dạng và số dương
function counts(o) {
  const out = {};
  if (o && typeof o === 'object') {
    Object.keys(o).forEach(d => {
      const n = Math.floor(Number(o[d]));
      if (/^\d{4}-\d{2}-\d{2}$/.test(d) && n > 0) out[d] = n;
    });
  }
  return out;
}
// Bỏ dấu và hoa thường để tìm: gõ "bu dap" vẫn ra "bù đắp"
function fold(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
// ID của Sheet: lấy từ link …/spreadsheets/d/<ID>/edit (kể cả dạng /u/1/d/), hoặc nhận thẳng ID
function sheetIdOf(s) {
  const m = /\/spreadsheets\/(?:u\/\d+\/)?d\/([\w-]{20,})/.exec(s) || /^([\w-]{20,})$/.exec(s);
  return m ? m[1] : '';
}
function scriptUrl() { return settings.url || SHARED_URL; }
// Tên máy ghi ở cột device của tab log: loại máy cho dễ nhận ra, cộng 6 ký tự ngẫu nhiên
function newDevice() {
  const ua = navigator.userAgent;
  const kind = /iPhone/.test(ua) ? 'iphone' : /iPad/.test(ua) ? 'ipad' : /Android/.test(ua) ? 'android'
    : /Mac/.test(ua) ? 'mac' : /Windows/.test(ua) ? 'windows' : 'web';
  const tail = Array.from(crypto.getRandomValues(new Uint8Array(3)), b => b.toString(16).padStart(2, '0')).join('');
  return `${kind}-${tail}`;
}
// Loại dành cho cấu trúc ngữ pháp
function isGrammar(type) { return ['grammar', 'ngữ pháp', 'ngu phap'].includes(normTerm(type)); }
