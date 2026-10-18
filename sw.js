// Lưu sẵn các file của app trong máy để mở được khi không có mạng.
// Muốn điện thoại tải lại toàn bộ ngay thì tăng số phiên bản này.
const CACHE = 'tu-vung-v1';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
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
