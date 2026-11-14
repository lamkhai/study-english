// Lưu sẵn các file của app trong máy để mở được khi không có mạng.
// Muốn điện thoại tải lại toàn bộ ngay thì tăng số phiên bản này. Thêm, bớt hay đổi tên file của app (trong css/, js/)
// thì sửa danh sách FILES và tăng số phiên bản, không thì app mở lúc không có mạng sẽ thiếu file.
const CACHE = 'tu-vung-v2';
const FILES = [
  './',
  './index.html',
  './css/base.css',
  './css/card.css',
  './css/form.css',
  './css/lib.css',
  './js/config.js',
  './js/core.js',
  './js/storage.js',
  './js/senses.js',
  './js/card.js',
  './js/form.js',
  './js/library.js',
  './js/stats.js',
  './js/changes.js',
  './js/sync.js',
  './js/main.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  // Tải thẳng từ mạng, không lấy bản cũ trong bộ nhớ đệm của trình duyệt, để các file luôn cùng một phiên bản
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Mở app: dùng bản trong máy cho nhanh, đồng thời tải bản mới (nếu có mạng) cho lần mở sau.
// Yêu cầu đồng bộ gửi tới Google không đi qua đây.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  const fresh = fetch(req).then(res => {
    if (!res.ok) return res;
    const copy = res.clone();
    return caches.open(CACHE).then(cache => cache.put(req, copy)).then(() => res);
  });
  event.waitUntil(fresh.then(() => {}, () => {}));
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => cached || fresh)
  );
});
