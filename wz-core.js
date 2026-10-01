/* ============================================================
   wz-core.js — Gemeinsamer Kern der WahrZentrale
   Wird in JEDER Seite direkt nach wz-theme.js im <head> geladen.

   1. Ein Standort für alle Apps
      Kanonischer Eintrag "wz_location" = { mode: "auto"|"manual",
      lat, lon, name }. Vor dem Start einer App wird er in deren eigene
      Einträge gespiegelt (HimmelsWahr, KompassWahr, AstroWahr,
      Sternenhimmel). Wählt man in einer App einen Ort bzw. schaltet auf
      "automatisch", gilt das ab sofort für alle Apps.
      Der zuletzt per GPS ermittelte Standort landet in "wz_last_gps".

   2. Eine Karten-Einwilligung für alle Apps
      "wz_map_consent" = "granted"|"declined" wird mit den Einträgen von
      NaviWahr und Keysglade abgeglichen (gleiche Werte).

   3. Heimknopf zur Zentrale
      Seiten mit <html data-wz-home="tl|tr|bl|br"> bekommen einen kleinen
      runden Knopf, der zur WahrZentrale führt (nicht in iFrames).

   Alles bleibt auf dem Gerät; es wird nichts übertragen.
   ============================================================ */
(function (global) {
  "use strict";

  var store = null;
  try { store = global.localStorage; } catch (e) { store = null; }
  var proto = global.Storage && global.Storage.prototype;
  var rawSet = proto ? proto.setItem : null;
  var html = document.documentElement;

  function get(k) { try { return store ? store.getItem(k) : null; } catch (e) { return null; } }
  function getJSON(k) { try { var v = get(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function rawWrite(k, v) { try { if (store && rawSet) rawSet.call(store, k, v); } catch (e) { } }
  function num(x) { var n = Number(x); return isFinite(n) ? n : null; }
  function validLoc(l) { return l && num(l.lat) !== null && num(l.lon) !== null && Math.abs(l.lat) <= 90 && Math.abs(l.lon) <= 180; }

  /* ---------------- 1. Standort ---------------- */
  var LOC = "wz_location", GPS = "wz_last_gps";

  function canonical() {
    var c = getJSON(LOC);
    if (c && (c.mode === "auto" || (c.mode === "manual" && validLoc(c)))) return c;
    // Ersteinrichtung aus bereits vorhandenen App-Einträgen übernehmen
    if (get("hw-location-mode") === "manual" && validLoc(getJSON("hw-manual-location"))) {
      var h = getJSON("hw-manual-location");
      return { mode: "manual", lat: +h.lat, lon: +h.lon, name: h.name || "" };
    }
    if (get("kw-location-mode") === "manual" && validLoc(getJSON("kw-manual-location"))) {
      var k = getJSON("kw-manual-location");
      return { mode: "manual", lat: +k.lat, lon: +k.lon, name: k.name || "" };
    }
    return { mode: "auto" };
  }

  function mirror(c) {
    if (c.mode === "manual") {
      var loc = JSON.stringify({ lat: c.lat, lon: c.lon, name: c.name || "" });
      if (get("hw-location-mode") !== "manual") rawWrite("hw-location-mode", "manual");
      if (get("hw-manual-location") !== loc) rawWrite("hw-manual-location", loc);
      if (get("kw-location-mode") !== "manual") rawWrite("kw-location-mode", "manual");
      if (get("kw-manual-location") !== loc) rawWrite("kw-manual-location", loc);
      var as = getJSON("astrowahr.currentloc");
      if (!as || as.lat !== c.lat || as.lon !== c.lon) rawWrite("astrowahr.currentloc", JSON.stringify({ lat: c.lat, lon: c.lon, place: c.name || "Gewählter Ort" }));
      rawWrite("zh:lat", JSON.stringify(c.lat));
      rawWrite("zh:lon", JSON.stringify(c.lon));
      rawWrite("zh:place", JSON.stringify((c.name || "Gewählter Ort").slice(0, 60)));
    } else {
      if (get("hw-location-mode") !== "auto") rawWrite("hw-location-mode", "auto");
      if (get("kw-location-mode") !== "auto") rawWrite("kw-location-mode", "auto");
    }
  }

  function setCanonical(c, fromApp) {
    rawWrite(LOC, JSON.stringify(c));
    if (!fromApp) mirror(c); else mirrorLater(c);
  }
  // Eine App schreibt gerade selbst – die anderen Apps erst danach angleichen
  var pending = null;
  function mirrorLater(c) {
    pending = c;
    setTimeout(function () { if (pending) { var p = pending; pending = null; mirror(p); } }, 0);
  }

  function rememberGps(lat, lon, name) {
    if (num(lat) === null || num(lon) === null) return;
    rawWrite(GPS, JSON.stringify({ lat: +lat, lon: +lon, name: name || "", t: Date.now() }));
  }

  /* ---------------- 2. Karten-Einwilligung ---------------- */
  var CONSENT = "wz_map_consent";
  var CONSENT_KEYS = ["wk_map_consent_v2", "kg_map_consent"];
  // Kartenanbieter gewechselt (FOSSGIS/tile.openstreetmap.de statt OpenStreetMap Foundation/Fastly):
  // eine frühere Zustimmung galt einem anderen Empfänger und wird deshalb einmal neu eingeholt.
  var CONSENT_REV = "2";
  function migrateConsent() {
    if (get("wz_map_consent_rev") === CONSENT_REV) return;
    var had = get(CONSENT) === "granted";
    for (var i = 0; i < CONSENT_KEYS.length; i++) if (get(CONSENT_KEYS[i]) === "granted") had = true;
    if (had) {
      try { store.removeItem(CONSENT); } catch (e) { }
      for (var j = 0; j < CONSENT_KEYS.length; j++) { try { store.removeItem(CONSENT_KEYS[j]); } catch (e) { } }
    }
    rawWrite("wz_map_consent_rev", CONSENT_REV);
  }
  function syncConsent() {
    try { migrateConsent(); } catch (e) { }
    var c = get(CONSENT);
    if (c !== "granted" && c !== "declined") {
      for (var i = 0; i < CONSENT_KEYS.length; i++) {
        var v = get(CONSENT_KEYS[i]);
        if (v === "granted") { c = "granted"; break; }
        if (v === "declined") c = "declined";
      }
      if (c === "granted" || c === "declined") rawWrite(CONSENT, c);
    }
    if (c === "granted" || c === "declined") {
      for (var j = 0; j < CONSENT_KEYS.length; j++) if (get(CONSENT_KEYS[j]) !== c) rawWrite(CONSENT_KEYS[j], c);
    } else {
      // keine Entscheidung: auch in den Apps keine (alte) Einzelentscheidung stehen lassen
      for (var n = 0; n < CONSENT_KEYS.length; n++) {
        try { if (store && get(CONSENT_KEYS[n]) !== null) store.removeItem(CONSENT_KEYS[n]); } catch (e) { }
      }
    }
  }

  /* ---------------- Speicher-Brücke ---------------- */
  if (proto && rawSet && !proto.__wzCoreHook) {
    proto.__wzCoreHook = true;
    var prevSet = proto.setItem; // evtl. schon von wz-theme.js erweitert
    proto.setItem = function (k, v) {
      prevSet.apply(this, arguments);
      if (this !== store) return;
      try {
        switch (k) {
          case "hw-location-mode":
          case "kw-location-mode":
            if (v === "auto" && canonical().mode !== "auto") setCanonical({ mode: "auto" }, true);
            break;
          case "hw-manual-location":
          case "kw-manual-location": {
            var l = JSON.parse(v);
            var modeKey = k === "hw-manual-location" ? "hw-location-mode" : "kw-location-mode";
            // KompassWahr setzt den Modus vor dem Ort, HimmelsWahr danach – beides abdecken
            if (validLoc(l) && (get(modeKey) === "manual" || k === "hw-manual-location")) {
              var cur = canonical();
              if (cur.mode !== "manual" || cur.lat !== +l.lat || cur.lon !== +l.lon) setCanonical({ mode: "manual", lat: +l.lat, lon: +l.lon, name: l.name || "" }, true);
            }
            break;
          }
          case "astrowahr.currentloc": {
            var a = JSON.parse(v);
            if (!validLoc(a)) break;
            if (a.auto) { rememberGps(a.lat, a.lon, a.place); break; }
            var c2 = canonical();
            if (c2.mode !== "manual" || c2.lat !== +a.lat || c2.lon !== +a.lon) setCanonical({ mode: "manual", lat: +a.lat, lon: +a.lon, name: a.place || "" }, true);
            break;
          }
          case "hw-last-location": {
            var g = JSON.parse(v);
            if (validLoc(g)) rememberGps(g.lat, g.lon, "");
            break;
          }
          case "wk_map_consent_v2":
          case "kg_map_consent":
            if ((v === "granted" || v === "declined") && get(CONSENT) !== v) {
              rawWrite(CONSENT, v);
              for (var i = 0; i < CONSENT_KEYS.length; i++) if (CONSENT_KEYS[i] !== k) rawWrite(CONSENT_KEYS[i], v);
            }
            break;
        }
      } catch (e) { }
    };
  }

  try { mirror(canonical()); } catch (e) { }

  /* Zuletzt benutzte Apps (nur lokal, für die Sortierung "Zuletzt" auf der Startseite) */
  (function () {
    var app = html.getAttribute("data-wz-app");
    if (!app || app === "wz") return;
    try { if (global.self !== global.top) return; } catch (e) { return; }
    try {
      var r = getJSON("wz_recent") || {};
      r[app] = Date.now();
      rawWrite("wz_recent", JSON.stringify(r));
    } catch (e) { }
  })();
  try { syncConsent(); } catch (e) { }

  /* ---------------- 3. Heimknopf ---------------- */
  var AREA = {
    hw: "himmel", as: "himmel", zh: "himmel", kw: "himmel",
    wk: "unterwegs", kg: "unterwegs", wow: "unterwegs", bp: "unterwegs",
    aw: "alltag", pw: "alltag", vw: "alltag", qr: "alltag", lw: "alltag", ld: "alltag",
    zw: "spiel", kv: "spiel", hk: "spiel", pk: "spiel", st: "spiel", bw: "spiel"
  };
  function homeHref() {
    var app = html.getAttribute("data-wz-app") || "";
    // Eigene Gruppierung der Startseite berücksichtigen (wz_home_layout.assign)
    var grp = AREA[app];
    try { var lay = getJSON("wz_home_layout"); if (lay && lay.assign && lay.assign[app]) grp = String(lay.assign[app]); } catch (e) { }
    return "./index.html" + (grp ? "#" + encodeURIComponent(grp) : "");
  }
  var HOME_SVG = '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M4 11.5L12 4l8 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10.5V20h4.5v-5.5h3V20H18v-9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

  function injectHome() {
    var pos = html.getAttribute("data-wz-home");
    if (!pos || pos === "none") return;
    try { if (global.self !== global.top) return; } catch (e) { return; }
    if (document.getElementById("wz-home")) return;
    var a = document.createElement("a");
    a.id = "wz-home";
    a.className = "wz-home wz-home-" + pos;
    a.href = homeHref();
    a.setAttribute("aria-label", "Zur WahrZentrale");
    a.setAttribute("title", "Zur WahrZentrale");
    a.innerHTML = HOME_SVG;
    document.body.appendChild(a);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectHome);
  else injectHome();

  /* ---------- Zurück zur vorherigen App ----------
     Home-Bildschirm-Apps haben keinen Zurück-Knopf des Browsers. Springt man
     per Querverweis in eine andere App (z. B. HimmelsWahr → Sternenhimmel,
     NaviWahr → BelegParkWahr) oder auf eine gemeinsame Seite (Impressum,
     Datenschutz, Sichern …), merkt sich die WahrZentrale die Herkunft – nur für
     diese Sitzung (sessionStorage) – und zeigt „Zurück zu …“.
     Von der Startseite aus beginnt der Weg immer neu. */
  var NAMES = {
    hw: "HimmelsWahr", zh: "Sternenhimmel", as: "AstroWahr", kw: "KompassWahr", wk: "NaviWahr", kg: "Keysglade",
    wow: "WowarWahr", bp: "BelegParkWahr", aw: "AlltagWahr", pw: "ProduktWahr", vw: "VorratsWahr", ld: "LosDenkWahr",
    qr: "QRWahr", lw: "LautstärkeWahr", zw: "ZahlenturmWahr", kv: "Korvanthiel", hk: "HerzKaroDrei", pk: "PartikelWahr",
    st: "StrömungsWahr", bw: "BeatWahr"
  };
  // Abstand des Zurück-Knopfs vom unteren Rand je App (Tab-Leisten, Zeitleisten …)
  var BACK_BOTTOM = { hw: 84, zh: 118, as: 104, wow: 84, kg: 84, wk: 84, bp: 16, aw: 84, lw: 84, ld: 16, zw: 62, hk: 62, pk: 128, st: 62, bw: 62 };
  var BACK_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var X_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var ss = null;
  try { ss = global.sessionStorage; } catch (e) { ss = null; }
  function ssGet(k) { try { var v = ss && ss.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function ssSet(k, v) { try { if (ss) { if (v === null) ss.removeItem(k); else ss.setItem(k, JSON.stringify(v)); } } catch (e) { } }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var navStack = [];
  (function trackNav() {
    try { if (global.self !== global.top) return; } catch (e) { return; }
    if (!ss) return;
    var app = html.getAttribute("data-wz-app") || "";
    var file = (location.pathname.split("/").pop() || "index.html");
    var url = "./" + file + location.search + location.hash;
    var isHub = app === "wz" && file === "index.html";
    var last = ssGet("wz_nav_last");
    var stack = ssGet("wz_nav_stack") || [];
    var skip = ss.getItem("wz_nav_skip") === "1";
    try { ss.removeItem("wz_nav_skip"); } catch (e) { }
    if (isHub) stack = [];
    else if (last && !skip) {
      if (last.hub) stack = [];
      else if (last.app !== app) stack.push({ app: last.app, url: last.url, title: last.title });
    }
    stack = stack.filter(function (x) { return x.app !== app; }).slice(-5);
    var title = app === "wz" ? (document.title || "").split(/\s+[–-]\s+/)[0] : (NAMES[app] || "");
    ssSet("wz_nav_stack", stack);
    ssSet("wz_nav_last", { app: app, url: url, hub: isHub, title: title });
    navStack = stack;
    // Beim Verlassen die dann gültige Adresse merken (Apps entfernen z. B. "?neu=park" nach dem Öffnen
    // oder wechseln per #… zwischen Ansichten) – so führt „Zurück“ genau dorthin, ohne Aktionen neu auszulösen.
    function remember() {
      var l = ssGet("wz_nav_last");
      if (!l || l.app !== app) return;
      l.url = "./" + (location.pathname.split("/").pop() || "index.html") + location.search + location.hash;
      ssSet("wz_nav_last", l);
    }
    global.addEventListener("pagehide", remember);
    document.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (a) remember();
    }, true);
  })();
  function navBackTarget() { return navStack.length ? navStack[navStack.length - 1] : null; }
  function goBack(e) {
    var t = navBackTarget(); if (!t) return;
    if (e) e.preventDefault();
    navStack.pop(); ssSet("wz_nav_stack", navStack);
    try { ss.setItem("wz_nav_skip", "1"); } catch (x) { }
    location.href = t.url;
  }
  function backName(t) { return t.app === "wz" ? (t.title || "WahrZentrale") : (NAMES[t.app] || "vorheriger App"); }
  function injectBack() {
    var t = navBackTarget(); if (!t) return;
    try { if (global.self !== global.top) return; } catch (e) { return; }
    var app = html.getAttribute("data-wz-app") || "";
    var name = backName(t);
    if (app === "wz") {
      var nav = document.querySelector(".wz-doc-nav");
      if (!nav) return;
      var a = document.createElement("a");
      a.href = t.url; a.className = "wz-doc-back"; a.id = "wz-back";
      a.innerHTML = BACK_SVG + " Zurück zu " + esc(name);
      a.addEventListener("click", goBack);
      nav.insertBefore(a, nav.firstChild);
      return;
    }
    var box = document.createElement("div");
    box.id = "wz-back"; box.className = "wz-back";
    box.style.bottom = "calc(env(safe-area-inset-bottom, 0px) + " + (BACK_BOTTOM[app] || 16) + "px)";
    box.innerHTML = '<a href="' + esc(t.url) + '" class="wz-back-go" aria-label="Zurück zu ' + esc(name) + '">' + BACK_SVG + "<span>" + esc(name) + "</span></a>" +
      '<button type="button" class="wz-back-x" aria-label="Zurück-Knopf ausblenden">' + X_SVG + "</button>";
    box.querySelector("a").addEventListener("click", goBack);
    box.querySelector("button").addEventListener("click", function () { navStack = []; ssSet("wz_nav_stack", []); box.remove(); });
    document.body.appendChild(box);
  }
  // Einfache Haus-Links der Apps springen direkt zum eigenen Bereich der Startseite
  function fixHomeLinks() {
    var app = html.getAttribute("data-wz-app") || "";
    if (!AREA[app]) return;
    var list = document.querySelectorAll('a[href="./index.html"], a[href="index.html"]');
    for (var i = 0; i < list.length; i++) list[i].setAttribute("href", homeHref());
  }
  function navReady() { fixHomeLinks(); injectBack(); try { if (store) store.removeItem("wz_nws_consent"); } catch (e) { } }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", navReady);
  else navReady();

  /* ---------------- 4. Bibliotheken bei Bedarf laden (alles lokal) ---------------- */
  var loaded = {};
  function loadScript(src) {
    if (!loaded[src]) loaded[src] = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { delete loaded[src]; reject(new Error("Laden fehlgeschlagen: " + src)); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  function loadCss(href) {
    if (!loaded[href]) loaded[href] = new Promise(function (resolve) {
      var l = document.createElement("link");
      l.rel = "stylesheet"; l.href = href;
      l.onload = function () { resolve(); }; l.onerror = function () { resolve(); };
      document.head.appendChild(l);
    });
    return loaded[href];
  }
  function loadLeaflet() {
    if (global.L && global.L.map) return Promise.resolve(global.L);
    return Promise.all([loadCss("./lib-leaflet.css"), loadScript("./lib-leaflet.js")]).then(function () { return global.L; });
  }

  /* ---------------- Adress- und Ortssuche (Photon, Server in Deutschland) ----------------
     Ersetzt Nominatim (nominatim.openstreetmap.org wird über den US-Dienstleister Fastly
     ausgeliefert). Photon von komoot durchsucht dieselben OpenStreetMap-Daten und läuft auf
     Servern in Deutschland. Die Ergebnisse werden in das von den Apps erwartete Format
     (wie Nominatim: lat, lon, display_name, address) umgewandelt. */
  var PHOTON = "https://photon.komoot.io";
  function photonItem(f) {
    var p = (f && f.properties) || {}, c = (f && f.geometry && f.geometry.coordinates) || [];
    var street = [p.street, p.housenumber].filter(Boolean).join(" ");
    var place = [p.postcode, p.city || p.town || p.village].filter(Boolean).join(" ");
    var first = p.name && p.name !== p.street && p.name !== (p.city || "") ? p.name : "";
    var parts = [first, street, p.district || p.locality, place || p.county, p.state, p.country].filter(function (x, i, arr) { return x && arr.indexOf(x) === i; });
    if (!parts.length && p.name) parts = [p.name];
    return {
      lat: String(c[1]), lon: String(c[0]),
      display_name: parts.join(", "),
      address: {
        house_number: p.housenumber || undefined, road: p.street || undefined, postcode: p.postcode || undefined,
        city: p.city || undefined, town: p.town || undefined, village: p.village || undefined,
        suburb: p.district || p.locality || undefined, county: p.county || undefined, state: p.state || undefined, country: p.country || undefined
      }
    };
  }
  function geoSearch(q, limit, signal) {
    var url = PHOTON + "/api/?q=" + encodeURIComponent(q) + "&limit=" + (limit || 5) + "&lang=de";
    return fetch(url, signal ? { signal: signal } : undefined).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (d) { return ((d && d.features) || []).map(photonItem).filter(function (x) { return x.lat && x.lon && x.lat !== "undefined"; }); });
  }
  function geoReverse(lat, lon) {
    return fetch(PHOTON + "/reverse?lat=" + lat + "&lon=" + lon + "&lang=de").then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (d) { var f = d && d.features && d.features[0]; return f ? photonItem(f) : { display_name: "", address: {} }; });
  }

  /* ---------------- 5. Einheitliche Karten-Einwilligung ---------------- */
  var MAP_TEXT = "Für die Karte werden Kartenbilder (Kacheln) vom OpenStreetMap-Kartenserver des FOSSGIS e.V. " +
    "(tile.openstreetmap.de, Server in Deutschland und der EU) geladen. Dabei werden deine IP-Adresse und der angezeigte " +
    "Kartenausschnitt dorthin übertragen – nicht in Länder außerhalb der EU. Die Kartenbibliothek selbst " +
    "ist Teil der WahrZentrale und wird nicht von fremden Servern geladen. Deine Wahl gilt für alle Karten in der " +
    "WahrZentrale und lässt sich jederzeit unter Einstellungen ändern. Ohne Einwilligung funktionieren alle Apps weiter, " +
    "nur ohne Kartenbild.";
  // Fragt nur, solange noch nicht entschieden wurde (oder mit {ask:true} ausdrücklich erneut)
  function ensureMapConsent(opts) {
    var c = get(CONSENT);
    if (c === "granted") return Promise.resolve(true);
    if (c === "declined" && !(opts && opts.ask)) return Promise.resolve(false);
    return new Promise(function (resolve) {
      var wrap = document.createElement("div");
      wrap.className = "wz-consent";
      wrap.setAttribute("role", "dialog");
      wrap.setAttribute("aria-modal", "true");
      wrap.innerHTML = '<div class="wz-consent-sheet"><h2>Karte anzeigen?</h2><p></p>' +
        '<div class="wz-consent-btns"><button type="button" class="wz-consent-no">Nicht jetzt</button>' +
        '<button type="button" class="wz-consent-yes">Karte laden</button></div>' +
        '<a class="wz-consent-more" href="./datenschutz.html#karten">Mehr im Datenschutz</a></div>';
      wrap.querySelector("p").textContent = MAP_TEXT;
      function done(ok) {
        wrap.remove();
        global.wzCore.setMapConsent(ok ? "granted" : "declined");
        resolve(ok);
      }
      wrap.querySelector(".wz-consent-yes").addEventListener("click", function () { done(true); });
      wrap.querySelector(".wz-consent-no").addEventListener("click", function () { done(false); });
      document.body.appendChild(wrap);
      setTimeout(function () { try { wrap.querySelector(".wz-consent-yes").focus(); } catch (e) { } }, 30);
    });
  }

  /* ---------------- 6. Kleines Auswahlblatt (für Querverbindungen) ---------------- */
  // wzCore.sheet({ title, text, actions: [{ label, href?, onClick?, primary? }], closeLabel? })
  function sheet(opts) {
    var wrap = document.createElement("div");
    wrap.className = "wz-consent wz-sheet";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    var box = document.createElement("div");
    box.className = "wz-consent-sheet";
    var h = document.createElement("h2"); h.textContent = opts.title || ""; box.appendChild(h);
    if (opts.text) { var p = document.createElement("p"); p.textContent = opts.text; box.appendChild(p); }
    var list = document.createElement("div"); list.className = "wz-sheet-actions";
    function close() { wrap.remove(); }
    (opts.actions || []).forEach(function (a) {
      var el = document.createElement(a.href ? "a" : "button");
      if (a.href) el.href = a.href; else el.type = "button";
      el.className = "wz-sheet-btn" + (a.primary ? " primary" : "");
      el.textContent = a.label;
      el.addEventListener("click", function (e) { if (a.onClick) { e.preventDefault(); a.onClick(); } if (!a.href) close(); });
      list.appendChild(el);
    });
    var c = document.createElement("button"); c.type = "button"; c.className = "wz-sheet-btn ghost";
    c.textContent = opts.closeLabel || "Nicht jetzt"; c.addEventListener("click", close);
    list.appendChild(c);
    box.appendChild(list);
    wrap.appendChild(box);
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
    document.body.appendChild(wrap);
    return { close: close };
  }

  /* ---------------- 7. Hinweis bei neuer Version ---------------- */
  // Der Service Worker holt Updates automatisch. Wechselt er während eine Seite offen ist,
  // erscheint in jeder App derselbe kleine Hinweis zum Neuladen (kein automatisches Neuladen,
  // damit z. B. eine laufende Fahrtaufzeichnung nie unterbrochen wird).
  // Hier – und nur hier – wird der eine Service Worker (sw.js) für alle Apps angemeldet.
  (function () {
    if (!("serviceWorker" in navigator)) return;
    try { if (global.self !== global.top) return; } catch (e) { return; }
    if (/^https?:$/.test(location.protocol)) {
      var reg = function () { navigator.serviceWorker.register("./sw.js").catch(function () { }); };
      if (document.readyState === "complete") reg(); else global.addEventListener("load", reg);
    }
    var had = !!navigator.serviceWorker.controller, shown = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!had) { had = true; return; }
      if (shown) return; shown = true;
      var bar = document.createElement("div");
      bar.className = "wz-update"; bar.setAttribute("role", "status");
      bar.innerHTML = '<span>Neue Version verfügbar</span><button type="button" class="wz-update-go">Neu laden</button><button type="button" class="wz-update-x" aria-label="Später"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>';
      bar.querySelector(".wz-update-go").addEventListener("click", function () { location.reload(); });
      bar.querySelector(".wz-update-x").addEventListener("click", function () { bar.remove(); });
      (document.body || html).appendChild(bar);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.update().catch(function () { }); }).catch(function () { });
    });
  })();

  global.wzCore = {
    sheet: sheet,
    loadScript: loadScript,
    loadCss: loadCss,
    loadLeaflet: loadLeaflet,
    ensureMapConsent: ensureMapConsent,
    mapConsentText: MAP_TEXT,
    location: function () { return canonical(); },
    // Bester bekannter Standort (manuell gewählt, sonst letzter GPS-Wert) – ohne neue Abfrage
    knownLocation: function () {
      var c = canonical();
      if (c.mode === "manual") return c;
      var g = getJSON(GPS);
      return validLoc(g) ? g : null;
    },
    setManualLocation: function (lat, lon, name) { setCanonical({ mode: "manual", lat: +lat, lon: +lon, name: name || "" }); },
    setAutoLocation: function () { setCanonical({ mode: "auto" }); },
    rememberGps: rememberGps,
    mapConsent: function () { return get(CONSENT); },
    setMapConsent: function (v) {
      if (v === "granted" || v === "declined") { rawWrite(CONSENT, v); syncConsent(); }
      else {
        // Entscheidung zurücksetzen: überall, damit die nächste Karte wieder fragt
        try { store.removeItem(CONSENT); for (var i = 0; i < CONSENT_KEYS.length; i++) store.removeItem(CONSENT_KEYS[i]); } catch (e) { }
      }
    },
    homeHref: homeHref,
    navBack: navBackTarget,
    geoSearch: geoSearch,
    geoReverse: geoReverse
  };
})(window);
