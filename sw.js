// Rise of Realms offline support: the page and scripts come from the network first (so updates arrive),
// art, voices and fonts are cached after the first visit so the game opens fast and works offline vs bots.
const CACHE = 'rr-v3-2';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'art/cover.webp?v=1', 'art/icon-192.png']).catch(() => { }))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const asset = /\.(webp|png|jpg|svg|mp3|woff2?)$/.test(u.pathname) || u.hostname.includes('fonts.g');
  if (u.origin !== location.origin && !u.hostname.includes('fonts.g')) return; // multiplayer servers are never cached
  if (asset) e.respondWith(caches.open(CACHE).then(c => c.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; }))));
  else e.respondWith(fetch(r).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(r, res.clone())); return res; }).catch(() => caches.match(r).then(h => h || caches.match('index.html'))));
});
