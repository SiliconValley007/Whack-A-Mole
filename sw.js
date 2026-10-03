const VERSION = "wam-v11";
const ASSETS = [
  "./",
  "index.html",
  "style.css?v=11",
  "game.js?v=11",
  "manifest.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-192.png",
  "icon-maskable-512.png",
  "og-image.png",
];
const CORE = new Set(
  ASSETS.map((a) => new URL(a, self.location.href).pathname)
);

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (CORE.has(url.pathname)) {
    e.respondWith(
      caches.open(VERSION).then((cache) =>
        cache.match(e.request).then((cached) => {
          if (cached) return cached;
          return fetch(e.request).catch(() => {
            if (e.request.mode === "navigate") {
              return cache
                .match("index.html")
                .then((idx) => idx || cache.match("./") || Response.error());
            }
            return Response.error();
          });
        })
      )
    );
    return;
  }
  const netP = fetch(e.request)
    .then((res) => {
      if (res && res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
      }
      return res;
    })
    .catch(() => null);
  e.waitUntil(netP);
  e.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(e.request, { ignoreSearch: true });
      if (cached) return cached;
      const res = await netP;
      if (res) return res;
      if (e.request.mode === "navigate") {
        return (
          (await cache.match("index.html", { ignoreSearch: true })) ||
          (await cache.match("./", { ignoreSearch: true }))
        );
      }
      return Response.error();
    })()
  );
});
