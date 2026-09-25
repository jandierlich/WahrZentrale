/* ============================================================
   wz-shared.js — Gemeinsame, reine Hilfsfunktionen für die
   Wahr-Apps mit OCR-Scan (aktuell: ProduktWahr, VorratsWahr).

   Zweck: ProduktWahr und VorratsWahr enthielten identischen bzw.
   fast identischen Code für Tesseract-Laden, HTML-Escaping und
   Dark/Light-Mode. Diese Datei bündelt die Teile, die wortgleich
   waren (wzEscapeHtml, wzLoadTesseract) sowie das Theme-Handling
   (wzInitTheme), das sich nur in Storage-Key/Button-ID unterschied.

   Bewusst NICHT hier enthalten: Kamera-Start/-Stop, Live-Scan-Pass,
   Frame-Erfassung. Diese Funktionen unterscheiden sich zwischen den
   Apps in Detailverhalten (unterschiedliche View-IDs, unterschiedliche
   Nachbearbeitung der erkannten Treffer) und sind ohne Kamera-Test auf
   einem echten Gerät zu riskant für eine automatische Zusammenlegung.
   Empfehlung: das kann in einem zweiten, für sich testbaren Schritt
   passieren, wenn du auf einem echten iPhone gegentesten kannst.
   ============================================================ */
(function (global) {
  "use strict";

  /** HTML-Escaping für alles, was per innerHTML/Text in die Seite
   *  eingefügt wird (OCR-Text, Nutzereingaben, externe Produktdaten). */
  function wzEscapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /** Lädt Tesseract.js einmalig nach (CDN), Promise-basiert.
   *  Bei erneutem Aufruf, während Tesseract schon vorhanden ist,
   *  löst das Promise sofort auf. */
  function wzLoadTesseract() {
    return new Promise(function (resolve, reject) {
      if (window.Tesseract) { resolve(); return; }
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /** Initialisiert Dark/Light-Mode inkl. Umschalt-Button und dauerhafter
   *  Speicherung in localStorage, wie bisher separat in pw-app.js und
   *  vw-app.js. Deckt auch den optionalen theme-color-Meta-Tag ab
   *  (bei ProduktWahr vorhanden, bei VorratsWahr nicht — daher optional).
   *
   *  opts:
   *    storageKey        z.B. "pw_theme" / "vw_theme"  (Pflicht)
   *    toggleBtnId       ID des Umschalt-Buttons        (Pflicht)
   *    themeColorElId    ID des <meta name="theme-color">, optional
   *    darkColor/lightColor  Hex-Werte für den Meta-Tag, optional
   *
   *  Rückgabe: { isDark } — Funktion zum Abfragen des aktuellen Zustands,
   *  falls eine App das an anderer Stelle braucht.
   */
  function wzInitTheme(opts) {
    var storageKey = opts.storageKey;
    var toggleBtn = document.getElementById(opts.toggleBtnId);
    var themeColorEl = opts.themeColorElId ? document.getElementById(opts.themeColorElId) : null;
    var darkColor = opts.darkColor || "#B9A6F5";
    var lightColor = opts.lightColor || "#5D3FA3";

    function ladeTheme() {
      try { return localStorage.getItem(storageKey) === "dark"; } catch (e) { return false; }
    }
    function speichereTheme(dark) {
      try { localStorage.setItem(storageKey, dark ? "dark" : "light"); } catch (e) { }
    }

    var manual = ladeTheme();

    function applyTheme() {
      var dark = manual === true;
      document.documentElement.classList.toggle("theme-dark", dark);
      if (toggleBtn) toggleBtn.innerHTML = dark ? global.wzIcon("sun") : global.wzIcon("moon");
      if (themeColorEl) themeColorEl.setAttribute("content", dark ? darkColor : lightColor);
    }

    if (toggleBtn) {
      toggleBtn.addEventListener("click", function () {
        manual = manual === true ? false : true;
        speichereTheme(manual);
        applyTheme();
      });
    }
    applyTheme();

    return { isDark: function () { return manual === true; } };
  }

  global.wzEscapeHtml = wzEscapeHtml;
  global.wzLoadTesseract = wzLoadTesseract;
  global.wzInitTheme = wzInitTheme;
})(window);
