(function () {
      if (!("serviceWorker" in navigator)) return;

      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        if (!registrations.length) return;

        return Promise.all(registrations.map(function (registration) {
          return registration.unregister();
        })).then(function () {
          if (!navigator.serviceWorker.controller) return;

          var reloadKey = "telc-selector-reloaded";
          if (sessionStorage.getItem(reloadKey)) return;
          sessionStorage.setItem(reloadKey, "true");
          location.reload();
        });
      }).catch(function (error) {
        console.error("Unable to remove the stale TELC service worker.", error);
      });
    })();
