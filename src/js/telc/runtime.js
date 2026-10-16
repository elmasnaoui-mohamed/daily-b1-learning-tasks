(function () {
      window.tpHardRefresh = function () {
        location.reload();
      };
      window.tpResetClientSession = function () {
        try {
          localStorage.removeItem('telc_session');
          localStorage.removeItem('_ts_telc_session');
        } catch (_) { }
        location.reload();
      };
    })();

// Local mirror: the final bundle tag already loads the app directly.

// Local mirror: disable production cache and service-worker recovery logic.

// Show the helper button everywhere except on the selector screen.
    (function () {
      var LANDING_MARKERS = [
        'Try for free',
        'Activate via WhatsApp',
        'Explore the platform',
        'Choose your exam',
      ];
      function isLandingPage() {
        try {
          var root = document.getElementById('root');
          if (!root || root.children.length === 0) return true; // app not ready yet -> keep it hidden
          var text = root.textContent || '';
          for (var i = 0; i < LANDING_MARKERS.length; i++) {
            if (text.indexOf(LANDING_MARKERS[i]) !== -1) return true;
          }
        } catch (_) { }
        return false;
      }
      function tpUpdate() {
        var fab = document.getElementById('tpSprechenFab');
        if (!fab) return;
        if (isLandingPage()) fab.classList.remove('tp-show');
        else fab.classList.add('tp-show');
      }
      function init() {
        tpUpdate();
        setInterval(tpUpdate, 1000);
        if ('MutationObserver' in window) {
          var root = document.getElementById('root');
          if (root) new MutationObserver(tpUpdate).observe(root, { childList: true, subtree: false });
        }
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
      else init();
    })();

// Local-only auth shim: preserve the original UI while bypassing the sign-in flow.
    (function () {
      var SESSION_KEY = "telc_session";
      var LOCAL_SESSION = {
        id: "local-learning-copy",
        email: "local@learn.invalid",
        accessType: "premium",
        user_token: "local-learning-token"
      };
      var EXPIRY = "2099-12-31T23:59:59.000Z";

      function saveSession() {
        try {
          var current = JSON.parse(localStorage.getItem(SESSION_KEY) || "null") || {};
          localStorage.setItem(SESSION_KEY, JSON.stringify(Object.assign({}, current, LOCAL_SESSION)));
          window.__TELC_IS_TRIAL = false;
          window.__TELC_AUTH_EMAIL = LOCAL_SESSION.email;
        } catch (_) { }
      }

      function jsonResponse(payload) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: function () {
            return Promise.resolve(payload);
          }
        });
      }

      function parseRequestBody(init) {
        if (!init || typeof init.body !== "string") return null;
        try {
          return JSON.parse(init.body);
        } catch (_) {
          return null;
        }
      }

      function buildAudioStatusPayload(body) {
        var files = {};
        var slots = body && Array.isArray(body.slots) ? body.slots : null;

        if (slots) {
          slots.forEach(function (slot) {
            if (typeof slot === "string" && slot) {
              files[slot] = { exists: false, url: "" };
            }
          });
        }

        return { success: true, files: files };
      }

      function buildExercisesPayload(body) {
        var action = body && body.action;

        if (action === "list") {
          return { success: true, exercises: [] };
        }

        return { success: true };
      }

      function isLocalPhpApi(url) {
        return url.indexOf("/api/audio.php") !== -1 ||
          url.indexOf("/api/exercises.php") !== -1 ||
          url.indexOf("/api/ai_enhanced.php") !== -1 ||
          url.indexOf("/api/ai.php") !== -1 ||
          url.indexOf("/api/srs.php") !== -1 ||
          url.indexOf("/api/themes.php") !== -1;
      }

      function buildShimPayload(url, body) {
        if (url.indexOf("/api/audio.php") !== -1) {
          return buildAudioStatusPayload(body);
        }

        if (url.indexOf("/api/exercises.php") !== -1) {
          return buildExercisesPayload(body);
        }

        if (url.indexOf("/api/audio.php") === -1) {
          return { success: false, disabled: true };
        }

        return null;
      }

      function emitXhrEvent(xhr, type) {
        try {
          if (typeof xhr.dispatchEvent === "function" && typeof Event === "function") {
            xhr.dispatchEvent(new Event(type));
          }
        } catch (_) { }

        try {
          var handler = xhr["on" + type];
          if (typeof handler === "function") {
            handler.call(xhr);
          }
        } catch (_) { }
      }

      saveSession();

      var originalFetch = window.fetch ? window.fetch.bind(window) : null;
      if (!originalFetch) return;

      window.fetch = function (input, init) {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        var body = parseRequestBody(init);

        if (url.indexOf("check_session.php") !== -1) {
          saveSession();
          return jsonResponse({
            valid: true,
            id: LOCAL_SESSION.id,
            email: LOCAL_SESSION.email,
            accessType: LOCAL_SESSION.accessType,
            expiresAt: EXPIRY,
            user_token: LOCAL_SESSION.user_token
          });
        }

        if (url.indexOf("login.php") !== -1 || url.indexOf("register.php") !== -1) {
          saveSession();
          return jsonResponse({
            success: true,
            id: LOCAL_SESSION.id,
            email: LOCAL_SESSION.email,
            accessType: LOCAL_SESSION.accessType,
            expiresAt: EXPIRY,
            user_token: LOCAL_SESSION.user_token
          });
        }

        if (url.indexOf("logout.php") !== -1) {
          saveSession();
          return jsonResponse({ success: true });
        }

        if (isLocalPhpApi(url)) {
          return jsonResponse(buildShimPayload(url, body));
        }

        return originalFetch(input, init);
      };

      var NativeXHR = window.XMLHttpRequest;
      if (!NativeXHR || !NativeXHR.prototype) return;

      var nativeOpen = NativeXHR.prototype.open;
      var nativeSend = NativeXHR.prototype.send;
      var nativeSetRequestHeader = NativeXHR.prototype.setRequestHeader;

      NativeXHR.prototype.open = function (method, url) {
        var targetUrl = typeof url === "string" ? url : String(url || "");
        this.__telcShim = isLocalPhpApi(targetUrl) ? {
          method: method,
          url: targetUrl,
          responseType: ""
        } : null;

        if (this.__telcShim) {
          return;
        }

        return nativeOpen.apply(this, arguments);
      };

      NativeXHR.prototype.setRequestHeader = function (name, value) {
        if (this.__telcShim) {
          if (!this.__telcShim.headers) this.__telcShim.headers = {};
          this.__telcShim.headers[name] = value;
          return;
        }

        return nativeSetRequestHeader.apply(this, arguments);
      };

      NativeXHR.prototype.send = function (body) {
        if (!this.__telcShim) {
          return nativeSend.apply(this, arguments);
        }

        var xhr = this;
        var parsedBody = typeof body === "string" ? parseRequestBody({ body: body }) : null;
        var payload = buildShimPayload(this.__telcShim.url, parsedBody);
        var responseText = JSON.stringify(payload);
        var requestedType = xhr.responseType || xhr.__telcShim.responseType || "";
        xhr.__telcShim.responseType = requestedType;

        Object.defineProperties(xhr, {
          readyState: { configurable: true, get: function () { return 4; } },
          status: { configurable: true, get: function () { return 200; } },
          statusText: { configurable: true, get: function () { return "OK"; } },
          responseURL: { configurable: true, get: function () { return xhr.__telcShim.url; } },
          responseText: { configurable: true, get: function () { return responseText; } },
          responseXML: { configurable: true, get: function () { return null; } },
          responseType: {
            configurable: true,
            get: function () { return xhr.__telcShim.responseType || ""; },
            set: function (value) { xhr.__telcShim.responseType = value || ""; }
          },
          response: {
            configurable: true,
            get: function () {
              return xhr.__telcShim.responseType === "json" ? payload : responseText;
            }
          }
        });

        setTimeout(function () {
          emitXhrEvent(xhr, "readystatechange");
          emitXhrEvent(xhr, "load");
          emitXhrEvent(xhr, "loadend");
        }, 0);
      };
    })();
