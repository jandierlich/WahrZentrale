/* ============================================================
   wz-theme.js — Gemeinsamer Hell-/Dunkelmodus für die GESAMTE
   WahrZentrale (Zentrale, alle 20 Apps, alle Unterseiten).

   - Standard: beim ersten Start immer Hellmodus – unabhängig von der
     iPhone-Einstellung.
   - Ein Schalter für alles: egal in welcher App umgeschaltet wird, alle
     anderen Apps folgen (Eintrag "wz_theme").
   - Brücke zu den App-eigenen Schaltern: Einige Apps haben einen eigenen
     Umschalter mit eigenem Speicher-Eintrag (z. B. "hw-theme-pref" in
     HimmelsWahr). Diese Einträge werden hier VOR dem Start der App auf den
     gemeinsamen Wert gesetzt, und wenn eine App ihren Eintrag ändert, wird
     das sofort als gemeinsamer Wert übernommen. So bleibt der Code der
     einzelnen Apps unverändert und trotzdem gibt es nur einen Schalter.
   - Wird im <head> als erstes Skript geladen (blockierend, winzig, offline
     gecacht), damit beim Öffnen nichts hell aufblitzt.

   Setzt die Klasse "theme-dark" und das Attribut data-theme="dark|light"
   auf <html>.

   API (global):
     wzTheme.isDark()          -> boolean
     wzTheme.set(true|false)   -> Dunkel/Hell festlegen
     wzTheme.toggle()
     wzTheme.onChange(fn)      -> fn(isDark) bei jedem Wechsel
     wzTheme.bind(element)     -> beliebigen Button nachträglich verdrahten
   ============================================================ */
(function (global) {
  "use strict";

  var KEY = "wz_theme";
  // Frühere, pro App getrennte Speicherstellen – werden einmalig aufgeräumt.
  var LEGACY_KEYS = ["pw_theme", "vw_theme", "qr_theme", "kw_theme", "lw_theme", "alltagwahr_theme", "hw-theme"];
  // App-eigene Schalter, die dem gemeinsamen Wert folgen (Wert: "dark" | "light")
  var BRIDGE_KEYS = ["hw-theme-pref", "wk-theme", "astrowahr.theme", "reisewahr-theme", "ztw-theme", "beatwahr_theme"];
  var DARK_META = "#1E1B2E";
  var root = document.documentElement;
  var listeners = [];
  var buttons = [];
  var store = null;
  try { store = global.localStorage; } catch (e) { store = null; }
  var proto = global.Storage && global.Storage.prototype;
  var rawSet = proto ? proto.setItem : null;
  var rawRemove = proto ? proto.removeItem : null;

  /* ---------- Farbwelten ----------
     "wz_palette" wählt eine Farbwelt für ALLE Apps. Die Umrechnung macht palette.py
     beim Bauen (wz-palette.css); hier wird nur das Attribut gesetzt und die Datei
     geladen – und zwar nur, wenn nicht der Standard "Nachthimmel" gewählt ist. */
  var PALETTE_KEY = "wz_palette";
  var PALETTES = [
    { id: "nachthimmel", name: "Nachthimmel", hue: null, sat: 1 },
    { id: "nachtblau", name: "Nachtblau", hue: 218, sat: 1 },
    { id: "abendrot", name: "Abendrot", hue: 336, sat: 0.92 },
    { id: "bernstein", name: "Bernstein", hue: 28, sat: 0.95 },
    { id: "graphit", name: "Graphit", hue: null, sat: 0.10 }
  ];
  function paletteInfo(id) { for (var i = 0; i < PALETTES.length; i++) if (PALETTES[i].id === id) return PALETTES[i]; return PALETTES[0]; }
  function storedPalette() { try { var v = store ? store.getItem(PALETTE_KEY) : null; return paletteInfo(v).id; } catch (e) { return "nachthimmel"; } }
  // gleiche Rechnung wie palette.py: Farbton verschieben, relative Leuchtdichte beibehalten
  function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function lumi(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
  function toHls(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, sat = 0, d = mx - mn;
    if (d) { sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, l, sat];
  }
  function fromHls(h, l, sat) {
    function f(n) { var k = (n + h / 30) % 12, a = sat * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }
    return [f(0), f(8), f(4)];
  }
  function shiftColor(hex, id) {
    var p = paletteInfo(id || storedPalette());
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m || p.id === "nachthimmel") return hex;
    var x = m[1].length === 3 ? m[1].replace(/(.)/g, "$1$1") : m[1];
    var c = [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
    var hl = toHls(c);
    if (hl[2] < 0.07 || hl[0] < 236 || hl[0] > 292 || hl[1] <= 0.02 || hl[1] >= 0.99) return hex;
    var nh = p.hue === null ? hl[0] : (hl[0] + p.hue - 258 + 360) % 360, ns = Math.min(1, hl[2] * p.sat), want = lumi(c), lo = 0, hi = 1;
    for (var i = 0; i < 30; i++) { var mid = (lo + hi) / 2; if (lumi(fromHls(nh, mid, ns)) < want) lo = mid; else hi = mid; }
    var o = fromHls(nh, (lo + hi) / 2, ns);
    return "#" + o.map(function (v) { return ("0" + Math.max(0, Math.min(255, v)).toString(16)).slice(-2); }).join("").toUpperCase();
  }
  function ensurePaletteCss() {
    if (document.getElementById("wz-palette-css")) return;
    if (document.readyState === "loading" && !document.body) {
      document.write('<link rel="stylesheet" href="./wz-palette.css" id="wz-palette-css">');
    } else {
      var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "./wz-palette.css"; l.id = "wz-palette-css";
      document.head.appendChild(l);
    }
  }
  function applyPalette() {
    var id = storedPalette();
    if (id === "nachthimmel") root.removeAttribute("data-wz-palette");
    else { root.setAttribute("data-wz-palette", id); ensurePaletteCss(); }
  }

  var ICON_MOON = '<svg class="wzi" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.5 15.2A8 8 0 1110.3 4.1a6.4 6.4 0 108.2 11.1z" fill="currentColor"/></svg>';
  var ICON_SUN = '<svg class="wzi" viewBox="0 0 24 24" aria-hidden="true"><g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none"/><line x1="12" y1="1.8" x2="12" y2="4.2"/><line x1="12" y1="19.8" x2="12" y2="22.2"/><line x1="1.8" y1="12" x2="4.2" y2="12"/><line x1="19.8" y1="12" x2="22.2" y2="12"/><line x1="4.6" y1="4.6" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.4" y2="19.4"/><line x1="4.6" y1="19.4" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.4" y2="4.6"/></g></svg>';

  function rawWrite(k, v) { try { if (store && rawSet) rawSet.call(store, k, v); } catch (e) { } }
  function rawDelete(k) { try { if (store && rawRemove) rawRemove.call(store, k); } catch (e) { } }

  function stored() {
    try {
      var v = store ? store.getItem(KEY) : null;
      return v === "dark" || v === "light" ? v : null;
    } catch (e) { return null; }
  }
  function isDark() { return stored() === "dark"; }

  // Gemeinsamen Wert in die App-eigenen Einträge spiegeln
  function syncBridge(dark) {
    var v = dark ? "dark" : "light";
    for (var i = 0; i < BRIDGE_KEYS.length; i++) {
      try { if (store && store.getItem(BRIDGE_KEYS[i]) !== v) rawWrite(BRIDGE_KEYS[i], v); } catch (e) { }
    }
  }

  function paintButton(btn, dark) {
    btn.innerHTML = dark ? ICON_SUN : ICON_MOON;
    var label = dark ? "Hellmodus einschalten" : "Dunkelmodus einschalten";
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
  }

  // Apps mit reiner Nachtansicht (Spiele, LosDenkWahr) tragen data-wz-fixed="dark"
  var FIXED = root.getAttribute("data-wz-fixed");
  function apply() {
    var dark = FIXED === "dark" ? true : isDark();
    root.classList.toggle("theme-dark", dark);
    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.style.colorScheme = dark ? "dark" : "light";
    if (document.body) document.body.classList.toggle("wz-dark", dark);
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      var m = metas[i];
      if (!m.hasAttribute("data-light")) m.setAttribute("data-light", m.getAttribute("content") || "#5A2FBE");
      setMeta(m, dark ? DARK_META : m.getAttribute("data-light"));
    }
    for (var b = 0; b < buttons.length; b++) paintButton(buttons[b], isDark());
    for (var l = 0; l < listeners.length; l++) {
      try { listeners[l](dark); } catch (e) { }
    }
  }

  // theme-color der Statusleiste an die Farbwelt anpassen – auch wenn eine App ihn selbst setzt
  var metaGuard = false;
  function setMeta(m, v) { metaGuard = true; m.setAttribute("content", shiftColor(v)); metaGuard = false; }
  function watchMetas() {
    if (!global.MutationObserver) return;
    new MutationObserver(function (list) {
      if (metaGuard || storedPalette() === "nachthimmel") return;
      list.forEach(function (r) {
        var m = r.target; if (!m || m.getAttribute("name") !== "theme-color") return;
        var v = m.getAttribute("content"), sv = shiftColor(v);
        if (sv !== v) setMeta(m, v);
      });
    }).observe(document.head || root, { attributes: true, attributeFilter: ["content"], subtree: true });
  }

  function setPalette(id) {
    id = paletteInfo(id).id;
    if (id === "nachthimmel") rawDelete(PALETTE_KEY); else rawWrite(PALETTE_KEY, id);
    applyPalette();
    // theme-color neu berechnen (Originalwerte stehen in data-light bzw. werden neu gelesen)
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) { var m = metas[i]; setMeta(m, isDark() || FIXED === "dark" ? DARK_META : (m.getAttribute("data-light") || m.getAttribute("content"))); }
    for (var l = 0; l < listeners.length; l++) { try { listeners[l](isDark()); } catch (e) { } }
  }

  function set(dark) {
    if (dark) rawWrite(KEY, "dark"); else rawDelete(KEY);
    syncBridge(dark);
    apply();
  }
  function toggle() { set(!isDark()); }

  function bind(btn) {
    if (!btn || btn.__wzThemeBound) return;
    btn.__wzThemeBound = true;
    buttons.push(btn);
    paintButton(btn, isDark());
    btn.addEventListener("click", function (e) { e.preventDefault(); toggle(); });
  }

  function bindAll() {
    var list = document.querySelectorAll("[data-wz-theme-toggle]");
    for (var i = 0; i < list.length; i++) bind(list[i]);
    apply(); // theme-color-Metas, die erst nach diesem Skript im <head> stehen
  }

  // Brücke: ändert eine App ihren eigenen Eintrag, gilt das für alle Apps
  if (proto && rawSet && !proto.__wzThemeHook) {
    proto.__wzThemeHook = true;
    proto.setItem = function (k, v) {
      rawSet.apply(this, arguments);
      if (this === store && BRIDGE_KEYS.indexOf(k) !== -1) {
        var val = String(v);
        var dark = val === "dark" || (val === "system" && global.matchMedia && global.matchMedia("(prefers-color-scheme: dark)").matches);
        if (dark !== isDark()) set(dark); else syncBridge(dark);
      }
    };
  }

  // Einmaliges Aufräumen der alten, getrennten Einstellungen
  for (var k = 0; k < LEGACY_KEYS.length; k++) rawDelete(LEGACY_KEYS[k]);

  syncBridge(isDark());
  applyPalette();
  apply();
  watchMetas();

  global.addEventListener("storage", function (e) {
    if (e.key === KEY) { syncBridge(isDark()); apply(); }
    if (e.key === PALETTE_KEY) { applyPalette(); apply(); }
  });
  global.addEventListener("pageshow", function () { syncBridge(isDark()); applyPalette(); apply(); }); // Zurück-Navigation aus dem Cache

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindAll);
  else bindAll();

  /* ---------- Zwei-Finger-Zoom überall unterbinden ----------
     iOS ignoriert "user-scalable=no" im Viewport-Meta, daher zusätzlich die
     WebKit-Gesten und Mehrfinger-Bewegungen abfangen. Doppeltipp-Zoom
     verhindert "touch-action: manipulation" in wz-common.css / wz-unify.css. */
  function blockGesture(e) { e.preventDefault(); }
  document.addEventListener("gesturestart", blockGesture, { passive: false });
  document.addEventListener("gesturechange", blockGesture, { passive: false });
  document.addEventListener("gestureend", blockGesture, { passive: false });
  document.addEventListener("touchmove", function (e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  /* ---------- Volle Bildschirmhöhe (gegen Balken am unteren Rand) ----------
     Als App vom Home-Bildschirm rechnet iOS die CSS-Einheiten 100vh/100dvh teils zu
     klein – dann bleibt unter Menüleisten ein leerer Streifen. Alle Apps nutzen deshalb
     "--wz-vh" (echte, gemessene Höhe) statt 100vh/100dvh. */
  var vhProbe = null, vhNow = 0;
  // Für Spiele mit Zeichenfläche: echte nutzbare Höhe in Pixeln
  global.wzVH = function () { return vhNow || global.innerHeight; };
  function safeTop() {
    try {
      if (!vhProbe) {
        vhProbe = document.createElement("div");
        vhProbe.style.cssText = "position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none";
        (document.body || root).appendChild(vhProbe);
      }
      return vhProbe.offsetHeight || 0;
    } catch (e) { return 0; }
  }
  function setVh() {
    var h = Math.max(global.innerHeight || 0, root.clientHeight || 0);
    try {
      var standalone = global.navigator.standalone === true ||
        (global.matchMedia && global.matchMedia("(display-mode: standalone)").matches);
      var iPhone = /iPhone|iPod/.test(global.navigator.userAgent || "");
      if (standalone && iPhone && global.screen) {
        var portrait = (global.innerWidth || 0) <= (global.innerHeight || 0);
        var full = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
        // Nur wenn die App hinter der Statusleiste gezeichnet wird, entspricht die
        // Bildschirmhöhe exakt der nutzbaren Fläche.
        if (full > h && full - h <= 120 && safeTop() > 0) h = full;
      }
    } catch (e) { }
    if (h > 0) { vhNow = h; root.style.setProperty("--wz-vh", h + "px"); }
  }
  setVh();
  global.addEventListener("resize", setVh);
  global.addEventListener("orientationchange", function () { setTimeout(setVh, 250); });
  global.addEventListener("pageshow", setVh);
  document.addEventListener("DOMContentLoaded", setVh);

  global.wzTheme = {
    isDark: isDark,
    set: set,
    toggle: toggle,
    bind: bind,
    onChange: function (fn) { if (typeof fn === "function") listeners.push(fn); },
    palettes: function () { return PALETTES.map(function (p) { return { id: p.id, name: p.name }; }); },
    palette: storedPalette,
    setPalette: setPalette,
    shiftColor: shiftColor
  };
})(window);
