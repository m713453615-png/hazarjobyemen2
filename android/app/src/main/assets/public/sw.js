const CACHE = 'hazar-job-v4'
const APP_SHELL = ['./', './index.html', './hazar-logo.svg', './hazar-logo.png', './manifest.webmanifest']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      // Every entry is added on its own so a single missing file cannot break the install.
      .then(cache => Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // API traffic always goes to the network, the cached copy is only a safety net.
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, copy).catch(() => undefined))
          return response
        })
        .catch(() => caches.match(request).then(cached => cached ?? Response.error())),
    )
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, copy).catch(() => undefined))
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request, { ignoreSearch: true })
          return cached ?? (await caches.match('./index.html')) ?? Response.error()
        }),
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, copy).catch(() => undefined))
        }
        return response
      })
      .catch(() => caches.match(request).then(cached => cached ?? Response.error())),
  )
})
