/* global module */
/* Doravo LMS offline app shell (L10.2, D-129). Caches ONLY the public app shell so the portal can open with no connection:
   hashed build files under /assets/ and /fonts/ (cache first) and index.html (network first, so a new release is picked up whenever the learner is online).
   NEVER cached: anything under /api/, /uploads/, /socket.io, /lms-feed, any non-GET, any cross-origin request, Range requests, redirects and error answers.
   So no learner, teacher or tenant data is ever stored by this file. Offline lesson packs and queued work are NOT handled here (see lmsOfflineQueue.js). */
var CACHE = "doravo-lms-shell-v1";
var PREFIX = "doravo-lms-shell-";
var MAX_ASSETS = 150;
var SHELL_KEY = "/index.html";
var NEVER = /^\/(api|uploads|socket\.io|lms-feed)(\/|$)/;
var ASSET = /^\/(assets|fonts)\/[^?#]+\.(js|css|woff2?|ttf|otf|svg|png|jpe?g|webp|gif|ico)$/i;

/* Pure decision: "asset" | "shell" | null (do not touch). `req` needs method, mode, headers.get. */
function classify(req, origin) {
  if (!req || req.method !== "GET") return null;
  var u; try { u = new URL(req.url); } catch { return null; }
  if (u.origin !== origin) return null;
  if (req.headers && req.headers.get && req.headers.get("range")) return null;
  if (NEVER.test(u.pathname)) return null;
  if (ASSET.test(u.pathname)) return "asset";
  if (req.mode === "navigate") return "shell";
  return null;
}
function cacheable(res) { return !!res && res.status === 200 && res.type === "basic" && !res.redirected; }

if (typeof self !== "undefined" && typeof self.addEventListener === "function" && typeof caches !== "undefined") {
  self.addEventListener("install", function () { self.skipWaiting(); });
  self.addEventListener("activate", function (e) {
    e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf(PREFIX) === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
  });
  self.addEventListener("fetch", function (e) {
    var kind = classify(e.request, self.location.origin);
    if (!kind) return;
    if (kind === "asset") {
      e.respondWith(caches.open(CACHE).then(function (c) {
        return c.match(e.request).then(function (hit) {
          if (hit) return hit;
          return fetch(e.request).then(function (res) {
            if (cacheable(res)) { var copy = res.clone(); c.put(e.request, copy).then(function () { return trim(c); }).catch(function () {}); }
            return res;
          });
        });
      }));
      return;
    }
    e.respondWith(fetch(e.request).then(function (res) {
      var ct = res.headers.get("content-type") || "";
      if (cacheable(res) && ct.indexOf("text/html") === 0) { var copy = res.clone(); caches.open(CACHE).then(function (c) { return c.put(SHELL_KEY, copy); }).catch(function () {}); }
      return res;
    }).catch(function () {
      return caches.open(CACHE).then(function (c) { return c.match(SHELL_KEY); }).then(function (hit) { return hit || Response.error(); });
    }));
  });
}
function trim(c) {
  return c.keys().then(function (ks) {
    var assets = ks.filter(function (r) { return ASSET.test(new URL(r.url).pathname); });
    var extra = assets.length - MAX_ASSETS;
    return extra > 0 ? Promise.all(assets.slice(0, extra).map(function (r) { return c.delete(r); })) : null;
  });
}
if (typeof module !== "undefined" && module.exports) module.exports = { classify: classify, cacheable: cacheable, CACHE: CACHE };
