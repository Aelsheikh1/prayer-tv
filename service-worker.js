self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('prayer-tv-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/adhan.mp3'
      ]);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'PRAYER_TIME') {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'SHOW_PRAYER_NOTIFICATION',
          prayer: event.data.prayer
        });
      });
    });
  }
});
