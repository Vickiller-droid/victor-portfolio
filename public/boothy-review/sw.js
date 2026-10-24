// Phone-notification delivery and routing only; this worker does not schedule trips.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const kind = ['before', 'end', 'transit', 'eta', 'test'].includes(data.kind) ? data.kind : 'ride';
  const target = new URL('./index.html', self.registration.scope);
  target.hash = 'notification?' + new URLSearchParams({ kind, ride: String(data.rideId || '') });
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    for (const client of clients) {
      if (client.url.startsWith(self.registration.scope)) {
        try {
          const navigated = await client.navigate(target.href);
          if (navigated) return navigated.focus();
        } catch { /* A closed tab is replaced below. */ }
      }
    }
    return self.clients.openWindow(target.href);
  }));
});
