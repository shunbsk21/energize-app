self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // event.data.text は存在しない場合があるので安全に扱う
    let text = '';
    try { text = event.data && typeof event.data.text === 'function' ? event.data.text() : ''; } catch (_) {}
    data = { title: '通知', body: text };
  }

  const title = data.title || '通知';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    data: data.url || '/',
    badge: data.badge || '/favicon.ico',
    requireInteraction: !!data.requireInteraction
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client && client.url === url && typeof client.focus === 'function') {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});