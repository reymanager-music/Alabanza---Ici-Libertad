// Service worker — Alabanza ICI. Estrategia: la página SIEMPRE intenta la red primero (así tus
// actualizaciones aparecen al instante); si no hay conexión, usa la última copia guardada.
const VERSION = 'v3-2026-11-23';
const SHELL = `shell-${VERSION}`;
const RUNTIME = 'runtime-v3';
const PRECACHE = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png'];
const STATIC_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'www.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Los datos (Firestore / Auth) nunca pasan por aquí: Firestore guarda su propia copia sin conexión.
  if (url.hostname.endsWith('googleapis.com') && url.hostname !== 'fonts.googleapis.com') return;
  if (url.hostname.endsWith('firebaseio.com') || url.hostname.endsWith('firebaseapp.com') && url.pathname.startsWith('/__/')) return;

  // Página y archivos propios: red primero, copia guardada como respaldo
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)); return res;
      }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./') : Response.error())))
    );
    return;
  }
  // Fuentes, íconos y librerías (versiones fijas): copia guardada primero
  if (STATIC_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(RUNTIME).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
