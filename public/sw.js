const DEFAULT_ICON = "/apple-touch-icon.png";
const DEFAULT_BADGE = "/favicon-32x32.png";

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
