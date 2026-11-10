const CACHE = "victor-portfolio-offline-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.add(new Request(OFFLINE, { cache: "reload" }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate" ||
      new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(fetch(request).catch(async () => {
    const fallback = await (await caches.open(CACHE)).match(OFFLINE);
    return fallback ?? Response.error();
  }));
});
