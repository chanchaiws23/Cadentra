const CACHE = 'cadentra-shell-v1'
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone()
    caches.open(CACHE).then((cache) => cache.put(event.request, copy))
    return response
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))))
})

self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {}
  event.waitUntil(self.registration.showNotification(payload.title || 'Cadentra', {
    body: payload.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: payload.url || '/today' },
    tag: payload.tag || 'cadentra-reminder',
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => 'focus' in client)
    return existing ? existing.focus() : self.clients.openWindow(event.notification.data?.url || '/today')
  }))
})
