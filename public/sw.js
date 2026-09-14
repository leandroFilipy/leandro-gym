// Service worker do Leandro Gym.
// - Arquivos estáticos (_next/static, ícones): cache-first.
// - Navegação: network-first com fallback para a última versão em cache
//   (permite reabrir o treino atual com internet ruim) e, na falta dela,
//   uma página offline dedicada.
// - Notificação do fim do descanso e clique para abrir o app.
const CACHE = "lg-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/192"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          // Offline: tenta a última versão em cache desta rota (ex.: a sessão de
          // treino aberta antes de cair a rede); se não houver, mostra a página offline.
          caches.match(req).then((hit) => hit || caches.match(OFFLINE_URL)),
        ),
    );
  }
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "notify") {
    self.registration.showNotification(data.title || "Leandro Gym", {
      body: data.body || "",
      icon: "/icons/192",
      badge: "/icons/192",
      tag: data.tag || "lg",
      renotify: true,
      vibrate: [200, 100, 200],
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/treino";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const client = list.find((c) => "focus" in c);
      if (client) {
        client.navigate(url).catch(() => {});
        return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});

// Push do servidor (Web Push). Payload JSON: { title, body, url, tag }.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Leandro Gym", {
      body: data.body || "",
      icon: "/icons/192",
      badge: "/icons/192",
      tag: data.tag || "lg-push",
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || "/treino" },
    }),
  );
});
