/* Offline app-shell cache. Browser-local records remain on this device; no server sync is implied. */
const CACHE_NAME = "chapter-co-app-shell-v2";
const APP_SHELL = ["./", "./index.html", "./style.css", "./script.js"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith("chapter-co-app-shell-") && key !== CACHE_NAME).map(key => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedPage = await cache.match("./index.html");
      try {
        const networkRequest = fetch(request);
        const response = await Promise.race([
          networkRequest,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Navigation timed out")), 2500))
        ]);
        if (response && response.ok) cache.put("./index.html", response.clone()).catch(() => {});
        return response;
      } catch {
        return cachedPage || new Response("You are offline and the app shell is not cached yet. Reconnect once and reload.", {
          status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const network = fetch(request).then(response => {
      if (response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    }).catch(() => null);
    if (cached) {
      // Return cached assets immediately on flaky connections while refreshing them in the background.
      network.catch(() => {});
      return cached;
    }
    const response = await network;
    return response || new Response("Offline and this resource is not cached.", {
      status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  })());
});
