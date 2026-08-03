// Registra el service worker para que el navegador (Chrome/Android sobre todo)
// habilite el banner/opción de "Instalar app" / "Agregar a pantalla de inicio".
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
