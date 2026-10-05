/* AP-09 offline shell. SIN-250: Cache-Name an den Build gekoppelt (sw.js?v=<buildId>),
   HTML network-first, /_next/static cache-first, alte Caches (auch cal-shell-v1) werden geräumt. */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const PREFIX = "cal-shell-";
const CACHE = PREFIX + VERSION;
const PRECACHE = ["/offline.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function store(request, response) {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  // Versionierte Build-Dateien: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((r) => store(request, r))),
    );
    return;
  }

  // Alles andere (HTML, Manifest, ...): network-first, nur offline aus dem Cache.
  event.respondWith(
    fetch(request)
      .then((response) => store(request, response))
      .catch(() =>
        caches.match(request).then(
          (cached) =>
            cached || (request.mode === "navigate" ? caches.match("/offline.html") : Response.error()),
        ),
      ),
  );
});
