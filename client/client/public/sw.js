// PWA Service Worker for Mesh Alert System - Offline First
self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('SW installed');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  console.log('SW activated');
});

// Cache app shell + assets for offline
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('localhost:8080')) return; // Don't cache signaling server
  
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => caches.match('/')) // Fallback to index.html
  );
});

// Background sync when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'mesh-sync') {
    event.waitUntil(syncMeshData());
  }
});

async function syncMeshData() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_OFFLINE_DATA' });
  });
}

// Push notifications for incoming SOS
self.addEventListener('push', (event) => {
  const data = event.data?.json();
  const options = {
    body: data?.text || 'New mesh alert',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'mesh-alert',
    data: data
  };
  event.waitUntil(self.registration.showNotification('🚨 Mesh Alert', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});

// Periodic ping for offline status
setInterval(() => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage({ type: 'PING_OFFLINE_STATUS' }));
  });
}, 30000);

