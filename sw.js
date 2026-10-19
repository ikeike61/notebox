// オフライン用：アプリ本体をキャッシュ（Googleへの通信はキャッシュしない）
const CACHE = 'notebox-v4';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('.webmanifest')) return; // アプリ情報は常に最新を取得（インストール判定に使われるため）
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(e.request, {ignoreSearch: true});
    const net = fetch(e.request).then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net; // キャッシュを即返し、裏で最新版に更新（次回起動時に反映）
  }));
});
