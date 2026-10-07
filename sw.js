// Service worker : jeu jouable hors ligne. Changer VERSION à chaque mise à jour du jeu.
const VERSION = "moustique-v1";
const FICHIERS = [
  "./",
  "css/style.css",
  "favicon.ico",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "img/armoire.svg",
  "img/baignoire.svg",
  "img/bibliotheque.svg",
  "img/bureau.svg",
  "img/canape.svg",
  "img/chaise.svg",
  "img/coeur.svg",
  "img/commode.svg",
  "img/eau.svg",
  "img/fauteuil.svg",
  "img/humain.svg",
  "img/lavabo.svg",
  "img/lit.svg",
  "img/mains-clap.svg",
  "img/mains-ouvertes.svg",
  "img/meuble-tv.svg",
  "img/moustique.svg",
  "img/oeuf.svg",
  "img/panier.svg",
  "img/plante.svg",
  "img/table-basse.svg",
  "img/table-nuit.svg",
  "img/tapis-bain.svg",
  "img/tapis.svg",
  "img/wc.svg",
  "index.html",
  "js/audio.js",
  "js/config.js",
  "js/game.js",
  "js/rooms.js",
  "manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache d'abord (jeu rapide et hors ligne), mise à jour en arrière-plan.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((enCache) => {
      const reseau = fetch(e.request).then((rep) => {
        if (rep.ok || rep.type === "opaque") { const copie = rep.clone(); caches.open(VERSION).then((c) => c.put(e.request, copie)); }
        return rep;
      }).catch(() => enCache);
      return enCache || reseau;
    })
  );
});
