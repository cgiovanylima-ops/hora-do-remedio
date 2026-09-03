/* Hora do Remédio — Service Worker
   v4: network-first no HTML (sempre busca a versão nova na internet)
       cache-only nos ícones/manifest (leves, estáticos).
   Integra o OneSignal (importa o worker deles). */
try {
  importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDKWorker.js");
} catch (e) { /* se o CDN falhar, o resto continua funcionando */ }

const CACHE = "hora-do-remedio-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  /* 1) HTML / páginas: SEMPRE da internet (network-first) — evita versão velha no cache */
  const ehPagina = e.request.mode === "navigate" || /\.html$/.test(url.pathname);
  if (ehPagina) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match("./hora-do-remedio.html")))
    );
    return;
  }

  /* 2) demais arquivos: cache com atualização em segundo plano */
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit ||
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
    )
  );
});
