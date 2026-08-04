// Service worker mínimo: solo lo necesario para que el navegador
// habilite "Instalar app" / "Agregar a pantalla de inicio".
// No cachea agresivo a propósito: los precios y el catálogo se actualizan
// seguido, así que todo pasa por la red normal (network-first).
const CACHE = 'pelsas-papeleria-v2';
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

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Precios y catálogo (todo /data/): red pura, siempre. Nunca se guardan
  // ni se sirven desde caché — un precio viejo servido "por las dudas"
  // es peor que un error de red visible.
  if (url.pathname.includes('/data/')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }

  // Resto (shell, imágenes): network-first con fallback a cache para que
  // abra algo si no hay señal.
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
