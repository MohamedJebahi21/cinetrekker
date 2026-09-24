const CACHE_NAME = "cinetrekker-shell-v2";
const OFFLINE_FALLBACK = "/offline.html";
const DEFAULT_ICON = "/apple-touch-icon.png";
const DEFAULT_BADGE = "/favicon-32x32.png";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_FALLBACK)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // For HTML navigations, always fetch from network first.
  // Only if the network fails completely (offline) do we serve the offline fallback.
  // Never cache HTML responses in CacheStorage to prevent stale chunk mismatches across deploys.
  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(OFFLINE_FALLBACK)) || Response.error();
      }),
    );
    return;
  }
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || "You have a new CineTrekker update." };
  }

  const title = typeof payload.title === "string" ? payload.title : "CineTrekker";
  const body = typeof payload.body === "string" ? payload.body : "You have a new update.";
  const url = typeof payload.url === "string" && payload.url.startsWith("/")
    ? payload.url
    : "/notifications";
  const tag = typeof payload.tag === "string" ? payload.tag : "cinetrekker-update";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: DEFAULT_ICON,
      badge: DEFAULT_BADGE,
      tag,
      renotify: false,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const existingClient = windowClients.find((client) => client.url.startsWith(self.location.origin));
      if (existingClient) {
        return existingClient.focus().then(() => existingClient.navigate(targetUrl));
      }
      return clients.openWindow(targetUrl);
    }),
  );
});
