// Only notification support: no cached private pages and no background timers.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL('./index.html#ride', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    for (const client of clients) {
      if (client.url.startsWith(self.registration.scope)) { await client.navigate(target); return client.focus(); }
    }
    return self.clients.openWindow(target);
  }));
});
