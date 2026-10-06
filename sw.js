// Service Worker: legt die App-Dateien im Cache ab, damit die App ohne Internet startet.
// Bei jeder neuen App-Version die Nummer hier erhöhen, sonst bleibt die alte Version im Cache.
const VERSION = "2";
const CACHE = "vokabelapp-" + VERSION;
const LOCAL = ["./", "index.html", "firebase-config.js", "manifest.json", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
const LIBS = [FB + "firebase-app-compat.js", FB + "firebase-auth-compat.js", FB + "firebase-firestore-compat.js"];
const FONTS_CSS = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Atkinson+Hyperlegible:wght@400;700&display=swap";

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(LOCAL);
    await c.addAll(LIBS);
    try { const r = await fetch(FONTS_CSS); if (r.ok) await c.put(FONTS_CSS, r); } catch {}
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("vokabelapp-") && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  const mine = u.origin === location.origin || LIBS.includes(req.url) || u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com";
  if (!mine) return; // Firestore und Anmeldung gehen direkt ans Netz
  e.respondWith(answer(e, req));
});

async function answer(e, req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req, { ignoreSearch: req.mode === "navigate", ignoreVary: true });
  const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => null);
  if (hit) { e.waitUntil(net); return hit; }
  return (await net) || (req.mode === "navigate" ? await c.match("index.html") : Response.error());
}
