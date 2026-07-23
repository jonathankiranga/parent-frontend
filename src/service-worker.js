import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

const SW = self;

SW.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const title = data.title || 'Education APP';
  const options = {
    body: data.body || 'New notification',
    icon: data.icon || '/icons/icon-192.svg',
    badge: data.badge || '/icons/icon-192.svg',
    data: { url: data.url || '/' }
  };
  event.waitUntil(SW.registration.showNotification(title, options));
});

SW.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
