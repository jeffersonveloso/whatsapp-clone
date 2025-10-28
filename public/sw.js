self.addEventListener("push", (event) => {
  const run = async () => {
    if (!event.data) {
      console.warn("Push event received without payload.");
      return;
    }

    let payload;
    try {
      payload = event.data.json();
    } catch (_error) {
      payload = { title: "Nova mensagem", body: event.data.text() };
    }

    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      console.warn("Notification suppressed: permission is not granted.");
      return;
    }

    const title = payload.title || "Nova mensagem";
    const options = {
      body: payload.body,
      icon: payload.icon || "/whatsapp.png",
      badge: payload.badge || "/whatsapp.png",
      data: payload.data || {},
    };

    try {
      await self.registration.showNotification(title, options);
    } catch (error) {
      console.error("showNotification failed", error);
    }
  };
  event.waitUntil(run());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if ("focus" in client) {
          await client.focus();
        }

        if (url && "navigate" in client) {
          await client.navigate(url);
        }

        return;
      }

      if (url && self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })(),
  );
});
