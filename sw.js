// オフライン用：アプリ本体をキャッシュ（Googleへの通信はキャッシュしない）
const CACHE = 'notebox-v33';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, {cache: 'reload'})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('.webmanifest') || url.pathname.endsWith('version.json')) return; // アプリ情報は常に最新を取得（インストール判定に使われるため）
  // アプリ本体（ページ）はネット優先：更新がすぐ反映される。オフラインや応答が遅いときは保存分を使う
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then(async cache => {
      const cached = () => cache.match('./index.html');
      try {
        const r = await Promise.race([fetch(e.request, {cache: 'no-cache'}), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
        if (r.ok) { cache.put('./index.html', r.clone()); return r; }
        return (await cached()) || r;
      } catch { return (await cached()) || Response.error(); }
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(e.request, {ignoreSearch: true});
    const net = fetch(e.request).then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net; // キャッシュを即返し、裏で最新版に更新（次回起動時に反映）
  }));
});
