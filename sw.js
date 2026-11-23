const cacheName = 'poruch-shell-v1';
const files = [
  'index.html', 'styles.css', 'app.mjs', 'model.mjs', 'lessons.mjs',
  'manifest.webmanifest', 'assets/hero.jpg', 'assets/icon-192.png', 'assets/icon-512.png'
];
const urlFor = file => new URL(file, self.registration.scope).href;
const appFiles = new Set(files.map(urlFor));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(
    files.map(file => new Request(urlFor(file), {cache:'reload'}))
  )));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('poruch-shell-') && name !== cacheName)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const {request} = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  const url = new URL(request.url);
  const cleanUrl = url.origin + url.pathname;
  const homeUrls = [self.registration.scope, urlFor('index.html')];
  if (request.mode === 'navigate' && homeUrls.includes(cleanUrl)) {
    event.respondWith(caches.open(cacheName).then(async cache =>
      (await cache.match(urlFor('index.html'))) ?? fetch(request)
    ));
  } else if (appFiles.has(cleanUrl)) {
    event.respondWith(caches.open(cacheName).then(async cache =>
      (await cache.match(cleanUrl)) ?? fetch(request)
    ));
  }
});
