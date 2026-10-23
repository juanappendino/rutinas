// Service worker: la app funciona sin conexión (en el gimnasio suele no haber señal).
// Red primero para tener siempre la versión nueva; si no hay red, lo último que se bajó.
const CACHE = "rutinas-web-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return (await cache.match(req)) ?? (req.mode === "navigate" ? await cache.match("./") : undefined) ?? Response.error();
    }
  })());
});
