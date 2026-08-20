const CACHE_NAME = "cinetrekker-public-shell-v1";
const OFFLINE_FALLBACK = "/offline.html";
const PUBLIC_NAVIGATION_PATHS = new Set([
  "/",
  "/search",
  "/trending",
  "/discover",
  "/people",
  "/genres",
  "/decades",
  "/awards",
  "/calendar",
  "/about",
  "/privacy",
  "/terms",
  "/cookies",
  "/accessibility",
]);
const DEFAULT_ICON = "/apple-touch-icon.png";
const DEFAULT_BADGE = "/favicon-32x32.png";

function isPublicNavigation(url) {
  return PUBLIC_NAVIGATION_PATHS.has(url.pathname);
}

function isCacheableStaticAsset(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  return ["script", "style", "font", "image"].includes(request.destination);
}

async function cachePublicNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match(OFFLINE_FALLBACK));
  }
}

async function cacheStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_FALLBACK)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("cinetrekker-public-") && key !== CACHE_NAME)
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
  if (request.mode === "navigate" && url.origin === self.location.origin && isPublicNavigation(url)) {
    event.respondWith(cachePublicNavigation(request));
    return;
  }

  if (isCacheableStaticAsset(request, url)) {
    event.respondWith(cacheStaticAsset(request));
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
