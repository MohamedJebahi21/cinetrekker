/* Basic service worker for offline watchlist caching */
const CACHE_NAME = "cinetrekker-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/placeholder.svg",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API or third-party data requests
  if (
    url.pathname.startsWith("/api/") ||
    request.url.includes("themoviedb.org")
  ) {
    return;
  }

  // Never cache authenticated requests
  if (request.headers.get("authorization")) {
    return;
  }

  const isStaticAsset =
    request.method === "GET" &&
    /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname);

  if (!isStaticAsset && request.mode !== "navigate") {
    return;
  }

  // Cache-first for navigations and static assets only
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        return response;
      });
    }),
  );
});

self.addEventListener("message", (event) => {
  const safePostMessage = async (client, payload) => {
    if (!client || typeof client.postMessage !== "function") {
      return;
    }

    try {
      client.postMessage(payload);
    } catch (error) {
      // Keep SW message channel resilient and avoid unhandled runtime errors.
      console.warn("[SW] Failed to post message to client", error);
    }
  };

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  // Simple sync trigger: client can postMessage { type: 'SYNC_NOW' }
  if (event.data && event.data.type === "SYNC_NOW") {
    // Attempt to notify all clients that a sync should be performed
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) =>
        Promise.allSettled(
          clients.map((client) =>
            safePostMessage(client, { type: "SYNC_STARTED" }),
          ),
        ),
      )
      .catch((error) => {
        console.warn("[SW] Failed to broadcast sync message", error);
      });
    // No background sync implemented here; the app will flush queued mutations when online.
  }
});
