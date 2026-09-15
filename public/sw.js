function safePushPath(path) {
  return typeof path === "string" && (/^\/checkin\/[0-9a-f-]{36}$/.test(path) || /^\/agenda\?date=\d{4}-\d{2}-\d{2}$/.test(path)) ? path : "/feed";
}
/* No page caching: authenticated pages must never be served from another session. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { /* Show a safe fallback. */ }
  if (!data || typeof data !== "object") data = {};
  const path = safePushPath(data.url);
  const agenda = data.kind === "agenda" && path.startsWith("/agenda?");
  event.waitUntil(self.registration.showNotification(agenda ? "Hora de cuidar dos seus planos ⏰" : "Mais uma conquista por aqui 🎉", {
    body: agenda ? "Uma atividade da sua agenda está começando. Bora dar esse passo?" : "Uma nova atividade foi compartilhada. Toque para ver.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: typeof data.tag === "string" ? data.tag : "checkins",
    data: { url: path },
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const path = event.notification.data?.url;
  const url = new URL(safePushPath(path), self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === url.origin && "navigate" in client) {
        await client.navigate(url.href);
        return client.focus();
      }
    }
    return self.clients.openWindow(url.href);
  })());
});
