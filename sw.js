const CACHE_NAME = "absensi-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/login-page.html",
  "/register.html",
  "/dashboard.html",
  "/manifest.json",
  "/sw.js",
  "/icon-192.png",
  "/icon-512.png",
  "/javascript/dashboard.js",
  "/javascript/login.js",
  "/javascript/register.js",
  "https://cdn.jsdelivr.net/npm/chart.js"  // external asset
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
