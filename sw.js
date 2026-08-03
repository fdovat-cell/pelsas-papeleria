// Service worker mínimo: solo lo necesario para que el navegador
// habilite "Instalar app" / "Agregar a pantalla de inicio".
// No cachea agresivo a propósito: los precios y el catálogo se actualizan
// seguido, así que todo pasa por la red normal (network-first).
const CACHE = 'pelsas-papeleria-v1';
const APP_SHELL = ['index.html', 'css/style.css', 'manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first con fallback a cache (para que abra algo si no hay señal).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
