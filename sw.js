// Service worker : garde une copie de l'appli pour l'ouvrir sans réseau.
// Stratégie : réseau d'abord (pour recevoir les mises à jour), copie en cache en secours.
var CACHE = "recettes-v1";

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(["./", "index.html"]); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async function () {
    var cache = await caches.open(CACHE);
    try {
      var res = await Promise.race([
        fetch(req),
        new Promise(function (_, reject) { setTimeout(reject, 4000); })
      ]);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(req)) || (await cache.match("index.html")) || Response.error();
    }
  })());
});
