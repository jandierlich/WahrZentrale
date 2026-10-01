/* ============================================================
   wz-hub.js — Startseite der WahrZentrale
   - Kopf: lebendiger Himmel (Tageszeit, Sonne/Mond, Sterne) – lokal berechnet
   - Weitermachen (zuletzt geöffnete App) und Favoriten-Leiste
   - "Heute": Wetter (nur nach Freigabe),
     offene Gedanken, Tagesaufgabe, nächste Zahlung, Urlaub,
     letzte Fahrt, Erinnerung an die Sicherung
   - Bereiche mit allen Apps und kleinen Kennzahlen
   - Suche über Apps und die lokal gespeicherten Einträge
   Alles wird auf dem Gerät gelesen und berechnet; nur das Wetter
   (nach Freigabe) wird bei Open-Meteo abgefragt.
   © 2026 Jan Dierlich – Alle Rechte vorbehalten.
   ============================================================ */
(function () {
  "use strict";
  var WZ = window.WZ, icon = WZ.icon;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Helfer ---------- */
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function json(k, fb) { try { var v = get(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function num(k) { var v = parseFloat(get(k) || "0"); return isFinite(v) ? v : 0; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n, d) { return Number(n).toLocaleString("de-DE", { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); }
  function eur(n) { return Number(n).toLocaleString("de-DE", { style: "currency", currency: "EUR" }); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function hm(d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function daysUntil(iso) { if (!iso) return null; var t = new Date(iso + (iso.length === 10 ? "T00:00:00" : "")); return Math.round((startOfDay(t) - startOfDay(new Date())) / 864e5); }
  function dateDe(d, opts) { return d.toLocaleDateString("de-DE", opts || { day: "numeric", month: "long" }); }
  var CHEV = '<svg class="wz-ic r-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg>';

  // IndexedDB nur lesen – existiert eine Datenbank noch nicht, wird sie NICHT angelegt
  function idbReadAll(name, stores) {
    return new Promise(function (resolve) {
      if (!("indexedDB" in window)) return resolve(null);
      var r;
      try { r = indexedDB.open(name); } catch (e) { return resolve(null); }
      var created = false;
      r.onupgradeneeded = function () { created = true; try { r.transaction.abort(); } catch (e) { } };
      r.onerror = function (e) { if (e && e.preventDefault) e.preventDefault(); resolve(null); };
      r.onblocked = function () { resolve(null); };
      r.onsuccess = function () {
        var db = r.result;
        if (created) { db.close(); return resolve(null); }
        var have = stores.filter(function (s) { return db.objectStoreNames.contains(s); });
        if (!have.length) { db.close(); return resolve({}); }
        var out = {}, tx;
        try { tx = db.transaction(have, "readonly"); } catch (e) { db.close(); return resolve({}); }
        have.forEach(function (s) { tx.objectStore(s).getAll().onsuccess = function (ev) { out[s] = ev.target.result || []; }; });
        tx.oncomplete = function () { db.close(); resolve(out); };
        tx.onerror = function () { db.close(); resolve(out); };
      };
    });
  }

  /* ---------- Himmel: Sonne und Mond (Näherungsformeln, lokal) ---------- */
  var RAD = Math.PI / 180;
  function sunTimes(date, lat, lon) {
    var d = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    var n = Math.round(d / 864e5 + 2440587.5 - 2451545.0 + 0.0008);
    var Js = n - lon / 360;
    var M = (357.5291 + 0.98560028 * Js) % 360;
    var C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
    var L = (M + C + 180 + 102.9372) % 360;
    var Jt = 2451545.0 + Js + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * L * RAD);
    var dec = Math.asin(Math.sin(L * RAD) * Math.sin(23.4397 * RAD));
    var cosH = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(dec)) / (Math.cos(lat * RAD) * Math.cos(dec));
    if (cosH > 1) return { polar: "night" };
    if (cosH < -1) return { polar: "day" };
    var H = Math.acos(cosH) / RAD;
    var toDate = function (J) { return new Date((J - 2440587.5) * 864e5); };
    return { rise: toDate(Jt - H / 360), set: toDate(Jt + H / 360) };
  }
  // Sonnenhöhe in Grad (gleiche Näherung wie oben, plus Sternzeit)
  function sunAlt(date, lat, lon) {
    var d = date.getTime() / 864e5 + 2440587.5 - 2451545.0;
    var M = (357.5291 + 0.98560028 * d) * RAD;
    var C = (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) * RAD;
    var L = M + C + (180 + 102.9372) * RAD, e = 23.4397 * RAD;
    var dec = Math.asin(Math.sin(L) * Math.sin(e)), ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
    var H = (280.16 + 360.9856235 * d) * RAD + lon * RAD - ra, p = lat * RAD;
    return Math.asin(Math.sin(p) * Math.sin(dec) + Math.cos(p) * Math.cos(dec) * Math.cos(H)) / RAD;
  }
  var SYN = 29.530588853, NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
  function moon(now) {
    var age = ((now - NEW_MOON) / 864e5) % SYN; if (age < 0) age += SYN;
    var illum = (1 - Math.cos(2 * Math.PI * age / SYN)) / 2;
    var names = [[1.85, "Neumond"], [5.54, "Zunehmende Sichel"], [9.23, "Erstes Viertel"], [12.92, "Zunehmender Mond"], [16.61, "Vollmond"], [20.3, "Abnehmender Mond"], [23.99, "Letztes Viertel"], [27.68, "Abnehmende Sichel"], [99, "Neumond"]];
    var name = "Neumond"; for (var i = 0; i < names.length; i++) if (age < names[i][0]) { name = names[i][1]; break; }
    var toFull = (14.765 - age + SYN) % SYN;
    return { age: age, illum: illum, name: name, toFull: toFull };
  }

  /* ---------- Wetter (Open-Meteo, nur nach Freigabe) ---------- */
  var WX_TEXT = [[0, "Klar", "sun"], [1, "Überwiegend klar", "sun"], [2, "Teils bewölkt", "cloudsun"], [3, "Bedeckt", "cloud"], [45, "Nebel", "fog"], [48, "Nebel mit Reif", "fog"],
    [51, "Leichter Nieselregen", "rain"], [53, "Nieselregen", "rain"], [55, "Starker Nieselregen", "rain"], [56, "Gefrierender Niesel", "rain"], [57, "Gefrierender Niesel", "rain"],
    [61, "Leichter Regen", "rain"], [63, "Regen", "rain"], [65, "Starker Regen", "rain"], [66, "Gefrierender Regen", "rain"], [67, "Gefrierender Regen", "rain"],
    [71, "Leichter Schneefall", "snow"], [73, "Schneefall", "snow"], [75, "Starker Schneefall", "snow"], [77, "Schneegriesel", "snow"],
    [80, "Regenschauer", "rain"], [81, "Regenschauer", "rain"], [82, "Heftige Schauer", "rain"], [85, "Schneeschauer", "snow"], [86, "Schneeschauer", "snow"],
    [95, "Gewitter", "storm"], [96, "Gewitter mit Hagel", "storm"], [99, "Gewitter mit Hagel", "storm"]];
  var WX_ICON = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/>',
    cloudsun: WZ.ICONS.hw, cloud: WZ.ICONS.weather,
    fog: '<path d="M4 9h16M3 13h18M5 17h14"/>',
    rain: '<path d="M7.6 14.5h9a3.6 3.6 0 00.2-7.2 5 5 0 00-9.4 1.2 3 3 0 00.2 6z"/><path d="M8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
    storm: '<path d="M7.6 15.5h9a3.6 3.6 0 00.2-7.2 5 5 0 00-9.4 1.2 3 3 0 00.2 6z"/><path d="M12.5 15.5l-2 3.5h3l-2 3.5"/>'
  };
  function wxInfo(code) { var t = WX_TEXT[0]; for (var i = 0; i < WX_TEXT.length; i++) if (WX_TEXT[i][0] === code) { t = WX_TEXT[i]; break; } return { text: t[1], icon: t[2] }; }
  function svg(p) { return '<svg class="wz-ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + "</svg>"; }

  var wxReq = null;
  function fetchWeather(loc) {
    if (!wxReq) wxReq = fetchWeatherNow(loc).catch(function (e) { wxReq = null; throw e; });
    return wxReq;
  }
  function fetchWeatherNow(loc) {
    var lat = Math.round(loc.lat * 100) / 100, lon = Math.round(loc.lon * 100) / 100;
    var cache = json("wz_today_wx", null);
    if (cache && cache.lat === lat && cache.lon === lon && Date.now() - cache.t < 30 * 60 * 1000) return Promise.resolve(cache.data);
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1";
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (data) {
      set("wz_today_wx", JSON.stringify({ t: Date.now(), lat: lat, lon: lon, data: data }));
      return data;
    });
  }

  /* ---------- Kennzahlen der Apps (nur lesen) ---------- */
  var FW_NAMES = { zw: "ZahlenturmWahr", kv: "Korvanthiel", hk: "HerzKaroDrei", pk: "PartikelWahr", st: "StrömungsWahr", bw: "BeatWahr" };
  var M = {
    zwBest: function () { return num("ztw-best"); },
    zwGames: function () { var s = json("ztw-stats", null); return (s && s.gamesPlayed) || 0; },
    kvBest: function () { return num("korvanthielBest"); },
    kvDaily: function () { var d = json("korvanthielDaily", null); return d && d.date === ymd(new Date()) ? 1 : 0; },
    hkGames: function () { var s = json("herzkarodrei_stats_v1", null); return (s && s.gamesPlayed) || 0; },
    bwProjects: function () { var p = json("beatwahr_projects_v3", null); return p && typeof p === "object" ? Object.keys(p).length : 0; },
    visit: function (a) { return num("funwahr-zuletzt-" + a); }
  };
  var TASKS = [
    { app: "zw", text: "Neuer Rekord in ZahlenturmWahr", metric: "zwBest", kind: "more" },
    { app: "kv", text: "Tages-Challenge in Korvanthiel", metric: "kvDaily", kind: "flag" },
    { app: "hk", text: "Eine Runde HerzKaroDrei", metric: "hkGames", kind: "more" },
    { app: "pk", text: "Partikelgewitter entfesseln", kind: "visit" },
    { app: "kv", text: "Neuer Rekord in Korvanthiel", metric: "kvBest", kind: "more" },
    { app: "st", text: "Wirbel in StrömungsWahr", kind: "visit" },
    { app: "zw", text: "Ein Turm in ZahlenturmWahr", metric: "zwGames", kind: "more" },
    { app: "bw", text: "Ein Beat in BeatWahr", kind: "visit" }
  ];
  function dailyTask() {
    var d = ymd(new Date()), seed = 0;
    for (var i = 0; i < d.length; i++) seed = (seed * 31 + d.charCodeAt(i)) >>> 0;
    var st = json("funwahr-tagesaufgabe", null);
    if (!st || st.date !== d) {
      var idx = seed % TASKS.length, t = TASKS[idx];
      st = { date: d, idx: idx, base: t.metric ? M[t.metric]() : 0 };
      set("funwahr-tagesaufgabe", JSON.stringify(st));
    }
    var task = TASKS[st.idx] || TASKS[0], done;
    if (task.kind === "more") done = M[task.metric]() > st.base;
    else if (task.kind === "flag") done = M[task.metric]() === 1;
    else done = M.visit(task.app) >= startOfDay(new Date()).getTime();
    return { task: task, done: done };
  }
  function thoughtsOpen() {
    var list = json("losgedacht_thoughts", []);
    if (!Array.isArray(list)) return 0;
    var now = Date.now();
    return list.filter(function (t) { return t && t.status === "open" && !(t.snoozeUntil && t.snoozeUntil > now); }).length;
  }
  function nextPayment() {
    var list = json("alltagwahr_entries_v1", []);
    if (!Array.isArray(list) || !list.length) return null;
    var best = null;
    list.forEach(function (e) {
      if (!e || !e.nextDate) return;
      var d = new Date(e.nextDate + "T00:00:00"), step = { monthly: 1, quarterly: 3, yearly: 12 }[e.rhythm] || 1, guard = 0;
      while (startOfDay(d) < startOfDay(new Date()) && guard++ < 400) d.setMonth(d.getMonth() + step);
      if (!best || d < best.d) best = { d: d, e: e };
    });
    return best;
  }
  function monthlyTotal() {
    var list = json("alltagwahr_entries_v1", []), sum = 0;
    if (!Array.isArray(list)) return 0;
    list.forEach(function (e) { if (!e) return; var a = +e.amount || 0; sum += e.rhythm === "yearly" ? a / 12 : e.rhythm === "quarterly" ? a / 3 : a; });
    return sum;
  }
  function tours() { var t = json("wk-tours", []); return Array.isArray(t) ? t : []; }
  function tripDate() { var d = json("fk_trip_date", null); return typeof d === "string" ? d : null; }
  function hasAnyData() {
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && !/^wz_|theme|onboard|intro-seen|welcomed|seen|consent|zuletzt|tagesaufgabe|sound|location-mode|manual-location|last-location|currentloc|^zh:(lat|lon|place)$/i.test(k)) return true; } } catch (e) { }
    return false;
  }

  /* ---------- Heute ---------- */
  function row(opts) {
    var tag = opts.href ? "a" : (opts.onClick ? "button" : "div");
    var h = "<" + tag + ' class="row' + (opts.cls ? " " + opts.cls : "") + '"' + (opts.href ? ' href="' + opts.href + '"' : "") + (tag === "button" ? ' type="button"' : "") + (opts.id ? ' id="' + opts.id + '"' : "") + ">" +
      '<span class="r-ic">' + (opts.svg || icon(opts.icon)) + "</span>" +
      '<span class="r-txt"><span class="r-l">' + opts.label + '</span><span class="r-v" style="display:block"' + (opts.count ? " data-count" : "") + ">" + opts.value + "</span>" + (opts.note ? '<span class="r-note" style="display:block">' + opts.note + "</span>" : "") + "</span>" +
      (opts.button ? opts.button : (opts.href ? CHEV : "")) + "</" + tag + ">";
    return h;
  }

  /* Heute: Karten ein-/ausblenden und sortieren (wz_today_cfg, nur lokal) */
  var TODAY_CARDS = [
    { id: "wetter", name: "Wetter", desc: "Temperatur und Regen an deinem Ort", def: true, ic: "weather" },
    { id: "gedanken", name: "Offene Gedanken", desc: "aus LosDenkWahr", def: true, cond: true, ic: "thought" },
    { id: "zahlung", name: "Nächste Zahlung", desc: "aus AlltagWahr", def: true, cond: true, ic: "euro" },
    { id: "urlaub", name: "Urlaubs-Countdown", desc: "aus Keysglade", def: true, cond: true, ic: "plane" },
    { id: "fahrt", name: "Letzte Fahrt", desc: "aus NaviWahr", def: true, cond: true, ic: "car" },
    { id: "vorrat", name: "Vorräte", desc: "was in den nächsten 7 Tagen abläuft (VorratsWahr)", def: false, cond: true, ic: "vw" },
    { id: "zuletzt", name: "Zuletzt geöffnet", desc: "deine drei zuletzt genutzten Apps", def: false, cond: true, ic: "clock" },
    { id: "aufgabe", name: "Tagesaufgabe", desc: "eine kleine Aufgabe für heute", def: true, ic: "trophy" },
    { id: "sicherung", name: "Sicherungs-Erinnerung", desc: "wenn länger als 30 Tage nicht gesichert", def: true, cond: true, ic: "backup" }
  ];
  var todayEdit = false;
  function todayCfg() { var c = json("wz_today_cfg", null); return c && typeof c === "object" ? { order: Array.isArray(c.order) ? c.order : [], on: c.on && typeof c.on === "object" ? c.on : {} } : { order: [], on: {} }; }
  function saveTodayCfg(c) { set("wz_today_cfg", JSON.stringify(c)); }
  function todayOrdered() { return byList(TODAY_CARDS, todayCfg().order, "id"); }
  function cardOn(c, cfg) { return Object.prototype.hasOwnProperty.call(cfg.on, c.id) ? !!cfg.on[c.id] : c.def; }

  function expiringStock() {
    var list = json("vw_inventar", []);
    if (!Array.isArray(list)) return [];
    var today = startOfDay(new Date()).getTime(), lim = today + 7 * 864e5;
    return list.filter(function (e) { if (!e || !e.datum) return false; var t = new Date(e.datum + "T00:00:00").getTime(); return isFinite(t) && t <= lim; })
      .sort(function (a, b) { return a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0; });
  }

  function renderToday() {
    var now = new Date();
    $("heute-date").textContent = now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
    var eb = $("todayEdit");
    if (eb) { eb.textContent = todayEdit ? "Fertig" : "Anpassen"; eb.classList.toggle("on", todayEdit); eb.setAttribute("aria-pressed", String(todayEdit)); }
    if (todayEdit) { renderTodayEditor(); return; }
    var loc = window.wzCore ? wzCore.knownLocation() : null;
    var cfg = todayCfg(), wxOn = get("wz_today_weather") === "on", wxShown = false, wxAsk = false;

    var build = {
      wetter: function () {
        if (!wxOn) { wxAsk = true; return ""; }
        if (!loc) return row({ icon: "weather", label: "Wetter", value: "Standort unbekannt", note: "Einmal ermitteln oder in den Einstellungen einen Ort wählen.",
          button: '<button type="button" class="r-btn" id="wxLoc">Ermitteln</button>' });
        wxShown = true;
        return '<a class="row" href="./hw-index.html" id="wxRow"><span class="r-ic">' + icon("weather") + '</span><span class="r-txt"><span class="r-l">Wetter' + (loc.name ? " · " + esc(loc.name) : "") + '</span><span class="r-v" style="display:block">Wird geladen …</span></span>' + CHEV + "</a>";
      },
      gedanken: function () {
        var open = thoughtsOpen();
        return open > 0 ? row({ icon: "thought", label: "LosDenkWahr", value: open + (open === 1 ? " Gedanke wartet" : " Gedanken warten") + " auf dich", count: true, href: "./ld-index.html" }) : "";
      },
      zahlung: function () {
        var np = nextPayment(); if (!np) return "";
        var dd = Math.round((startOfDay(np.d) - startOfDay(now)) / 864e5);
        var when = dd === 0 ? "heute" : dd === 1 ? "morgen" : "am " + dateDe(np.d, { day: "numeric", month: "short" });
        return row({ icon: "euro", label: "Nächste Zahlung", value: esc(np.e.name) + " <small>· " + eur(+np.e.amount || 0) + " " + when + "</small>", href: "./aw-index.html" });
      },
      urlaub: function () {
        var td = tripDate(); if (!td) return "";
        var du = daysUntil(td);
        return du !== null && du >= 0 ? row({ icon: "plane", label: "Keysglade", value: du === 0 ? "Heute geht’s los" : "Urlaub in " + du + (du === 1 ? " Tag" : " Tagen"), count: du > 0, href: "./kg-index.html" }) : "";
      },
      fahrt: function () {
        var tl = tours(); if (!tl.length) return "";
        var last = tl[0];
        var wk = tl.filter(function (t) { return t.startTime >= Date.now() - 7 * 864e5; }).reduce(function (s, t) { return s + (t.distanceKm || 0); }, 0);
        return row({ icon: "car", label: "NaviWahr · letzte Fahrt", value: fmt(last.distanceKm || 0, 1) + " km <small>· " + dateDe(new Date(last.startTime), { day: "numeric", month: "short" }) + "</small>", note: "Diese Woche: " + fmt(wk, 1) + " km", count: true, href: "./wk-index.html" });
      },
      vorrat: function () {
        var ex = expiringStock(); if (!ex.length) return "";
        var today = startOfDay(now).getTime(), gone = ex.filter(function (e) { return new Date(e.datum + "T00:00:00").getTime() < today; }).length;
        var names = ex.slice(0, 3).map(function (e) { return esc(e.name || "Eintrag"); }).join(", ") + (ex.length > 3 ? " …" : "");
        return row({ icon: "vw", label: "VorratsWahr", value: ex.length + (ex.length === 1 ? " Vorrat läuft" : " Vorräte laufen") + " bald ab", note: names + (gone ? " · davon " + gone + " schon abgelaufen" : ""), href: "./vw-index.html" });
      },
      zuletzt: function () {
        var rec = json("wz_recent", {}) || {};
        var apps = WZ.APPS.filter(function (a) { return rec[a.id]; }).sort(function (a, b) { return rec[b.id] - rec[a.id]; }).slice(0, 3);
        if (!apps.length) return "";
        return '<div class="row recent-row"><span class="r-ic">' + icon("clock") + '</span><span class="r-txt"><span class="r-l">Zuletzt geöffnet</span><span class="recent-apps">' +
          apps.map(function (a) { return '<a href="./' + a.href + '" class="recent-app"><span class="recent-ic">' + icon(a.id) + "</span>" + esc(a.name) + "</a>"; }).join("") + "</span></span></div>";
      },
      aufgabe: function () {
        var da = dailyTask();
        return row({ svg: da.done ? icon("check") : icon("trophy"), label: da.done ? "Tagesaufgabe erledigt" : "Tagesaufgabe", value: esc(da.task.text), href: "./" + da.task.app + "-index.html" });
      },
      sicherung: function () {
        var lb = parseInt(get("wz_last_backup") || "0", 10);
        var age = lb ? Math.floor((Date.now() - lb) / 864e5) : null;
        return (age === null || age > 30) && hasAnyData() ? row({ icon: "backup", label: "Sicherung", value: age === null ? "Noch nie gesichert" : "Letzte Sicherung vor " + age + " Tagen", note: "Eine Datei mit allen Daten schützt vor Verlust.", href: "./wz-sichern.html" }) : "";
      }
    };

    var out = [], anyOn = false;
    todayOrdered().forEach(function (c) {
      if (!cardOn(c, cfg)) return;
      anyOn = true;
      var h = ""; try { h = build[c.id](); } catch (e) { h = ""; }
      if (h) out.push(h);
    });
    if (!out.length) out.push(row({ icon: "info", label: "Heute", value: anyOn ? "Gerade gibt es nichts Neues." : "Alle Karten sind ausgeblendet.", note: "Über „Anpassen“ wählst du, was hier erscheint." }));
    if (wxAsk) out.push(row({ icon: "weather", cls: "wx-ask", label: "Wetter", value: "Wetter für deinen Ort anzeigen?", note: "Dein Standort geht dafür an Open-Meteo (Schweiz).",
      button: '<button type="button" class="wx-link" id="wxOn">Anzeigen</button>' }));
    $("today").innerHTML = out.join("");
    countUp($("today"));

    var b = $("wxOn");
    if (b) b.addEventListener("click", function (e) { e.preventDefault(); set("wz_today_weather", "on"); renderToday(); renderSky(); });
    var l = $("wxLoc");
    if (l) l.addEventListener("click", function (e) {
      e.preventDefault();
      if (!navigator.geolocation) return;
      l.textContent = "…";
      navigator.geolocation.getCurrentPosition(function (p) {
        if (window.wzCore) wzCore.rememberGps(p.coords.latitude, p.coords.longitude, "");
        renderToday(); renderSky();
      }, function () { l.textContent = "Ermitteln"; }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
    });
    if (wxShown) {
      fetchWeather(loc).then(function (d) {
        var r = $("wxRow"); if (!r || !d || !d.current) return;
        var w = wxInfo(d.current.weather_code), dl = d.daily || {};
        var mx = dl.temperature_2m_max ? Math.round(dl.temperature_2m_max[0]) : null, mn = dl.temperature_2m_min ? Math.round(dl.temperature_2m_min[0]) : null;
        var pp = dl.precipitation_probability_max ? dl.precipitation_probability_max[0] : null;
        r.querySelector(".r-ic").innerHTML = svg(WX_ICON[w.icon] || WX_ICON.cloud);
        r.querySelector(".r-v").innerHTML = '<span class="wx-big" data-count>' + Math.round(d.current.temperature_2m) + "°</span> <small>" + w.text + (mx !== null ? " · " + mn + "° / " + mx + "°" : "") + (pp !== null ? " · Regen " + pp + " %" : "") + "</small>";
        var note = document.createElement("span"); note.className = "r-note"; note.style.display = "block";
        note.innerHTML = 'Wetterdaten: <span style="text-decoration:underline">Open-Meteo.com</span> (CC BY 4.0)';
        r.querySelector(".r-txt").appendChild(note);
        countUp(r);
      }).catch(function () {
        var r = $("wxRow"); if (r) r.querySelector(".r-v").textContent = "Gerade nicht erreichbar";
      });
    }
  }

  function renderTodayEditor(focusId, focusDir) {
    var cfg = todayCfg(), list = todayOrdered();
    var h = '<p class="t-hint">Wähle, was „Heute“ zeigt, und ändere mit den Pfeilen die Reihenfolge.</p>';
    list.forEach(function (c, i) {
      var on = cardOn(c, cfg);
      h += '<div class="row t-edit' + (on ? "" : " off") + '"><span class="r-ic">' + icon(c.ic) + '</span><span class="r-txt"><span class="r-l">' + esc(c.name) + '</span><span class="r-note" style="display:block">' + esc(c.desc) + (c.cond ? " · erscheint nur, wenn es etwas gibt" : "") + "</span></span>" +
        '<span class="mv-row">' + arrowBtn("up", c.name + " nach oben", 'data-tmv="' + c.id + '" data-dir="-1"', i === 0) + arrowBtn("down", c.name + " nach unten", 'data-tmv="' + c.id + '" data-dir="1"', i === list.length - 1) + "</span>" +
        '<label class="sw"><input type="checkbox" data-ton="' + c.id + '"' + (on ? " checked" : "") + ' aria-label="' + esc(c.name) + ' anzeigen"><span></span></label></div>';
    });
    h += '<div class="t-foot"><button type="button" class="t-reset" id="todayReset">Ursprüngliche Auswahl</button><button type="button" class="r-btn" id="todayDone">Fertig</button></div>';
    $("today").innerHTML = h;
    Array.prototype.forEach.call($("today").querySelectorAll("[data-ton]"), function (inp) {
      inp.addEventListener("change", function () {
        var c = todayCfg(); c.on[inp.getAttribute("data-ton")] = inp.checked; saveTodayCfg(c);
        inp.closest(".t-edit").classList.toggle("off", !inp.checked);
      });
    });
    Array.prototype.forEach.call($("today").querySelectorAll("[data-tmv]"), function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-tmv"), dir = +btn.getAttribute("data-dir");
        var ids = todayOrdered().map(function (c) { return c.id; }), i = ids.indexOf(id), j = i + dir;
        if (j < 0 || j >= ids.length) return;
        ids.splice(j, 0, ids.splice(i, 1)[0]);
        var c = todayCfg(); c.order = ids; saveTodayCfg(c);
        renderTodayEditor(id, dir);
      });
    });
    $("todayReset").addEventListener("click", function () { try { localStorage.removeItem("wz_today_cfg"); } catch (e) { } renderTodayEditor(); });
    $("todayDone").addEventListener("click", function () { todayEdit = false; renderToday(); var s = $("heute"); if (s) s.scrollIntoView({ block: "nearest" }); });
    if (focusId) {
      var f = $("today").querySelector('[data-tmv="' + focusId + '"][data-dir="' + focusDir + '"]:not([disabled])') || $("today").querySelector('[data-tmv="' + focusId + '"]:not([disabled])');
      if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } f.closest(".t-edit").scrollIntoView({ block: "nearest" }); }
    }
  }

  /* ---------- Bereiche und Kacheln ---------- */
  function statFor(id) {
    try {
      switch (id) {
        case "zh": { var m = json("zh:mem", []); return Array.isArray(m) && m.length ? m.length + (m.length === 1 ? " Erinnerung" : " Erinnerungen") : ""; }
        case "as": { var p = json("astrowahr.profiles", []); return Array.isArray(p) && p.length ? p.length + (p.length === 1 ? " Horoskop" : " Horoskope") : ""; }
        case "kw": { var w = json("kw-waypoints", []); return Array.isArray(w) && w.length ? w.length + (w.length === 1 ? " Wegpunkt" : " Wegpunkte") : ""; }
        case "wk": { var t = tours(); return t.length ? t.length + (t.length === 1 ? " Fahrt · " : " Fahrten · ") + fmt(t.reduce(function (s, x) { return s + (x.distanceKm || 0); }, 0), 0) + " km" : ""; }
        case "kg": { var d = tripDate(); var n = d ? daysUntil(d) : null; return n !== null && n >= 0 ? (n === 0 ? "Heute geht’s los" : "Noch " + n + (n === 1 ? " Tag" : " Tage")) : ""; }
        case "aw": { var mt = monthlyTotal(); return mt > 0 ? eur(mt) + " im Monat" : ""; }
        case "vw": { var v = json("vw_inventar", []); return Array.isArray(v) && v.length ? v.length + (v.length === 1 ? " Vorrat" : " Vorräte") : ""; }
        case "ld": { var o = thoughtsOpen(); return o ? o + " offen" : ""; }
        case "zw": { var b = M.zwBest(); return b ? "Rekord " + fmt(b) : ""; }
        case "kv": { var k = M.kvBest(); return k ? "Rekord " + fmt(k) : ""; }
        case "hk": { var g = M.hkGames(); return g ? fmt(g) + (g === 1 ? " Runde" : " Runden") : ""; }
        case "bw": { var pr = M.bwProjects(); return pr ? pr + (pr === 1 ? " Projekt" : " Projekte") : ""; }
      }
    } catch (e) { }
    return "";
  }

  /* ---------- Eigene Gruppen und Symbolfarben ----------
     wz_home_layout: { names: {gruppe: "Titel"}, custom: [{id, title}], assign: {appId: gruppe}, colors: {appId: farbe}, gcolors: {gruppe: farbe} }
     Alles bleibt lokal auf dem Gerät. */
  var ICON_COLORS = [
    ["violett", "Violett", "#7C5CFF", "#5A2FBE", "#3B2585"],
    ["lila", "Lila", "#B06CF0", "#8A3FD1", "#5E2296"],
    ["indigo", "Indigo", "#6C7BFF", "#4453D6", "#2A3496"],
    ["blau", "Blau", "#4DA3FF", "#1F6FD6", "#15479A"],
    ["petrol", "Petrol", "#3CC7C9", "#1C8F9E", "#0F5C6B"],
    ["gruen", "Grün", "#5CCB7A", "#2E9E55", "#1B6B3A"],
    ["gold", "Gold", "#F2B93B", "#C98612", "#8F5A08"],
    ["orange", "Orange", "#FF9A5A", "#E0621F", "#A63F0E"],
    ["rot", "Rot", "#FF6B6B", "#D93B4A", "#9E1F33"],
    ["rosa", "Rosa", "#FF7EB6", "#DB3F8B", "#A01F63"],
    ["graphit", "Graphit", "#8A8799", "#5B5870", "#34323F"]
  ];
  function colorDef(key) { for (var i = 0; i < ICON_COLORS.length; i++) if (ICON_COLORS[i][0] === key) return ICON_COLORS[i]; return null; }
  function gradient(key) { var c = colorDef(key); return c ? "linear-gradient(150deg," + c[2] + " 0%," + c[3] + " 55%," + c[4] + " 100%)" : ""; }
  function layout() {
    var l = json("wz_home_layout", null);
    if (!l || typeof l !== "object") l = {};
    l.names = l.names && typeof l.names === "object" ? l.names : {};
    l.custom = Array.isArray(l.custom) ? l.custom.filter(function (g) { return g && g.id && g.title; }) : [];
    l.assign = l.assign && typeof l.assign === "object" ? l.assign : {};
    l.colors = l.colors && typeof l.colors === "object" ? l.colors : {};
    l.gcolors = l.gcolors && typeof l.gcolors === "object" ? l.gcolors : {};
    return l;
  }
  function saveLayout(l) { set("wz_home_layout", JSON.stringify(l)); }
  function allGroups() {
    var l = layout();
    return WZ.AREAS.map(function (a) { return { id: a.id, title: l.names[a.id] || a.title, sub: l.names[a.id] ? "" : a.sub, builtin: true }; })
      .concat(l.custom.map(function (g) { return { id: g.id, title: g.title, sub: "", builtin: false }; }));
  }
  function groupOf(app, l) {
    l = l || layout();
    var g = l.assign[app.id];
    if (g && (WZ.AREAS.some(function (a) { return a.id === g; }) || l.custom.some(function (c) { return c.id === g; }))) return g;
    return app.area;
  }
  function iconStyle(id, l) {
    l = l || layout();
    var st = homeStyle(), key = l.colors[id] || st.icon;
    var g = key && key !== "violett" ? gradient(key) : "";
    return g ? ' style="background:' + g + '"' : "";
  }
  // Ordner-Symbol (Emblem) einer Gruppe: eigene Farbe > Farbe für alle Ordner > Standard je Bereich
  function groupStyle(id, l) {
    l = l || layout();
    var key = l.gcolors[id] || homeStyle().group, c = colorDef(key);
    return c ? ' style="--area-grad:' + gradient(key) + ';--area-tint:' + c[3] + '"' : "";
  }
  // Symbol einer App mit Tiefe: Abstufung je Bereich, eigene Farbe hat Vorrang
  var AREA_CLS = { himmel: "a-himmel", alltag: "a-alltag", spiel: "a-spiel" };
  function appIcon(app, l) {
    l = l || layout();
    var st = iconStyle(app.id, l), cls = st ? "c-own" : (AREA_CLS[groupOf(app, l)] || "");
    return '<span class="t-ic' + (cls ? " " + cls : "") + '"' + st + ">" + WZ.iconFine(app.id) + "</span>";
  }
  function nameHtml(n) { n = esc(n); return n.length > 9 ? n.replace(/([a-zäöüß])([A-ZÄÖÜ])/g, "$1<wbr>$2") : n; }

  /* ---------- Themenbereiche: Emblem und feines Ornament ---------- */
  var AREA_ART = {
    himmel: {
      em: '<path d="M14.6 4.4a8 8 0 1 0 5.2 11.2 6.3 6.3 0 0 1-5.2-11.2z"/><path d="M19 3v2.6M17.7 4.3h2.6"/><circle cx="21" cy="9.4" r=".6" fill="currentColor" stroke="none"/>',
      orn: '<g fill="none" stroke="currentColor" stroke-width="1"><path d="M40 120l38-46 44 18 40-52 30 30" stroke-dasharray="1 5"/><circle cx="160" cy="62" r="34"/><circle cx="160" cy="62" r="52" opacity=".6"/><path d="M90 14a58 58 0 0 1 120 30" opacity=".6"/></g><g fill="currentColor"><circle cx="40" cy="120" r="2.4"/><circle cx="78" cy="74" r="2"/><circle cx="122" cy="92" r="2.4"/><circle cx="162" cy="40" r="3"/><circle cx="192" cy="70" r="1.8"/><circle cx="20" cy="40" r="1.2"/><circle cx="60" cy="24" r="1"/><circle cx="210" cy="120" r="1.2"/></g>'
    },
    unterwegs: {
      em: '<path d="M5 19.5c0-4 4-3.6 6.2-6.2s.6-4.8 3.6-5.5" stroke-dasharray="1.6 1.6"/><circle cx="5" cy="19.5" r="1.4"/><path d="M17 3a3.6 3.6 0 0 0-3.6 3.6c0 2.8 3.6 6.4 3.6 6.4s3.6-3.6 3.6-6.4A3.6 3.6 0 0 0 17 3z"/><circle cx="17" cy="6.6" r="1.1"/>',
      orn: '<g fill="none" stroke="currentColor" stroke-width="1"><path d="M10 60c40-30 80 10 120-14s60-40 90-20"/><path d="M10 80c40-30 80 10 120-14s60-40 90-20" opacity=".7"/><path d="M10 100c40-30 80 10 120-14s60-40 90-20" opacity=".5"/><path d="M30 140c20-40 60-30 80-60s40-50 90-56" stroke-dasharray="4 5"/></g><circle cx="200" cy="24" r="4" fill="currentColor"/><circle cx="30" cy="140" r="3" fill="currentColor"/>'
    },
    alltag: {
      em: '<rect x="4" y="5" width="16" height="15" rx="2.8"/><path d="M4 9.4h16M8.5 3v4M15.5 3v4"/><path d="M8.6 14.4l2.2 2.2 4.6-4.6"/>',
      orn: '<g fill="none" stroke="currentColor" stroke-width="1"><path d="M20 30h200M20 52h200M20 74h200M20 96h200M20 118h200" opacity=".55"/><path d="M50 10v140" opacity=".7"/><circle cx="170" cy="74" r="40"/><path d="M150 74l14 14 26-28"/></g>'
    },
    spiel: {
      em: '<path d="M10 3.5l1.6 4.4 4.4 1.6-4.4 1.6L10 15.5l-1.6-4.4L4 9.5l4.4-1.6z"/><path d="M17.5 14l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" fill="currentColor" stroke="none"/>',
      orn: '<g fill="none" stroke="currentColor" stroke-width="1.2"><path d="M10 90h16l8-30 10 60 10-80 10 70 8-40 8 20h18"/><path d="M120 40l6 16 16 6-16 6-6 16-6-16-16-6 16-6z"/><path d="M180 90l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/></g><g fill="currentColor"><circle cx="200" cy="30" r="2.4"/><circle cx="160" cy="130" r="1.8"/><circle cx="96" cy="20" r="1.4"/></g>'
    }
  };
  var ART_DEFAULT = { em: '<circle cx="12" cy="12" r="7.5"/><path d="M12 8v8M8 12h8"/>', orn: '<g fill="currentColor"><circle cx="60" cy="40" r="2"/><circle cx="120" cy="80" r="2"/><circle cx="180" cy="40" r="2"/><circle cx="200" cy="120" r="2"/></g>' };
  function areaArt(id) { return AREA_ART[id] || ART_DEFAULT; }

  /* ---------- Weitermachen und Favoriten ---------- */
  var SHORT = { zh: "Sterne", kv: "Korvan&shy;thiel", hk: "HerzKaro<wbr>Drei" };
  var FAV_DEFAULT = ["hw", "wk", "aw", "ld", "zh"], FAV_MAX = 5;
  function favs() {
    var f = json("wz_home_favs", null);
    if (!Array.isArray(f)) f = FAV_DEFAULT;
    return f.filter(function (id, i) { return WZ.app(id) && f.indexOf(id) === i; }).slice(0, FAV_MAX);
  }
  function toggleFav(id) {
    var f = favs(), i = f.indexOf(id), app = WZ.app(id);
    if (i !== -1) f.splice(i, 1);
    else { if (f.length >= FAV_MAX) { toast("Höchstens " + FAV_MAX + " Favoriten – entferne zuerst einen."); return; } f.push(id); }
    set("wz_home_favs", JSON.stringify(f));
    toast(i !== -1 ? "„" + app.name + "“ ist kein Favorit mehr" : "„" + app.name + "“ ist jetzt ein Favorit");
    renderFavs(); renderAreas(null, id);
  }
  function ago(ts) {
    var m = Math.round((Date.now() - ts) / 6e4);
    if (m < 1) return "gerade eben"; if (m < 60) return "vor " + m + " Min.";
    var h = Math.round(m / 60); if (h < 24) return "vor " + h + " Std.";
    var d = Math.round(h / 24); return d === 1 ? "gestern" : "vor " + d + " Tagen";
  }
  function renderJump() {
    var box = $("jump"); if (!box) return;
    var rec = json("wz_recent", {}) || {}, best = null;
    WZ.APPS.forEach(function (a) { if (rec[a.id] && (!best || rec[a.id] > rec[best.id])) best = a; });
    if (!best) { box.innerHTML = ""; return; }
    var stat = statFor(best.id);
    box.innerHTML = '<a class="jump" href="./' + best.href + '" aria-label="Weiter mit ' + esc(best.name) + '">' + '<span class="t-ic">' + WZ.iconFine(best.id) + "</span>" +
      '<span class="j-txt"><span class="j-l" style="display:block">Geöffnet ' + ago(rec[best.id]) + '</span><span class="j-n" style="display:block">' + esc(best.name) + '</span><span class="j-s" style="display:block">' + esc(stat || best.sub) + "</span></span>" +
      '<span class="j-go" aria-hidden="true">Weiter<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 6l6 6-6 6"/></svg></span></a>';
  }
  function renderFavs() {
    var box = $("favs"); if (!box) return;
    var f = favs(), l = layout();
    if (!f.length && !editMode) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '<div class="favs-h"><h2 id="favs-h">Favoriten</h2><button type="button" id="favEdit">' + (editMode ? "Fertig" : "Bearbeiten") + "</button></div>" +
      (f.length ? '<div class="fav-row">' + f.map(function (id) { var a = WZ.app(id); return '<a class="fav" href="./' + a.href + '" aria-label="' + esc(a.name) + '">' + appIcon(a, l) + '<span class="f-n">' + (SHORT[a.id] || nameHtml(a.name, 1)) + "</span></a>"; }).join("") + "</div>"
        : '<p class="t-hint">Tippe unten bei einer App auf den Stern, um sie hier abzulegen.</p>');
    $("favEdit").addEventListener("click", function () {
      if (editMode) { editMode = false; } else { set("wz_home_sort", "eigene"); editMode = true; }
      renderSortBar(); renderAreas(); renderFavs();
      if (editMode) { var s = $("sortbar"); if (s) s.scrollIntoView({ block: "start", behavior: "smooth" }); }
    });
  }

  /* ---------- Echter Ortsname für den Kopfbereich ----------
     Ist nur ein GPS-Standort ohne Namen bekannt, wird der Ort einmalig über Photon
     (komoot, Server in Deutschland) ermittelt – mit auf 2 Nachkommastellen (≈ 1 km)
     gerundeten Koordinaten – und lokal gemerkt. Abschaltbar in den Einstellungen. */
  var PLACE_KEY = "wz_place_name_cache", placeReq = {};
  function shortPlace(n) { return String(n || "").split(",")[0].trim().slice(0, 40); }
  function placeKey(l) { return (+l.lat).toFixed(2) + "," + (+l.lon).toFixed(2); }
  function cachedPlace(l) {
    try { var c = JSON.parse(get(PLACE_KEY) || "{}"); return c[placeKey(l)] || ""; } catch (e) { return ""; }
  }
  function resolvePlace(l) {
    if (get("wz_place_name") === "off" || !window.wzCore || !wzCore.geoReverse || navigator.onLine === false) return Promise.resolve("");
    var k = placeKey(l);
    if (placeReq[k]) return placeReq[k];
    var parts = k.split(",");
    placeReq[k] = wzCore.geoReverse(parts[0], parts[1]).then(function (d) {
      var a = (d && d.address) || {};
      var n = shortPlace(a.city || a.town || a.village || a.suburb || a.county || "");
      if (n) {
        var c = {}; try { c = JSON.parse(get(PLACE_KEY) || "{}") || {}; } catch (e) { c = {}; }
        var keys = Object.keys(c); if (keys.length > 20) delete c[keys[0]];
        c[k] = n; set(PLACE_KEY, JSON.stringify(c));
      }
      return n;
    }).catch(function () { delete placeReq[k]; return ""; });
    return placeReq[k];
  }

  /* Wetter vor Sonne/Mond: Wolke, Regen, Schnee, Gewitter, Nebel (nur bei eingeschaltetem Wetter) */
  function orbWx(icon) {
    if (!icon || icon === "sun") return "";
    var part = icon === "cloudsun";
    var cloud = '<g class="ow-cloud"><circle cx="30" cy="57" r="11"/><circle cx="45" cy="48" r="15"/><circle cx="60" cy="57" r="11"/><rect x="30" y="52" width="30" height="16" rx="8"/></g>';
    var extra = "";
    if (icon === "rain") extra = '<g class="ow-drops" stroke="#CFE0FF" stroke-width="2.6" stroke-linecap="round"><path d="M33 73l-2 6"/><path d="M45 73l-2 6"/><path d="M57 73l-2 6"/></g>';
    else if (icon === "snow") extra = '<g class="ow-drops" fill="#FFFFFF"><circle cx="33" cy="77" r="2.3"/><circle cx="45" cy="80" r="2.3"/><circle cx="57" cy="77" r="2.3"/></g>';
    else if (icon === "storm") extra = '<path class="ow-bolt" d="M47 66l-7 11h6l-3 9 9-13h-6l3-7z" fill="#FFD66B"/>';
    else if (icon === "fog") extra = '<g stroke="rgba(255,255,255,.75)" stroke-width="3" stroke-linecap="round"><path d="M18 74h44"/><path d="M26 81h40"/></g>';
    return '<svg viewBox="0 0 86 86" class="orb-wx' + (part ? " part" : "") + '"><defs><linearGradient id="owG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#DCD3F5"/></linearGradient></defs>' +
      '<g fill="url(#owG)"' + (part ? ' transform="translate(-10 8) scale(.78)"' : "") + ">" + cloud + "</g>" + extra + "</svg>";
  }
  function setOrbWx(icon) {
    var orb = $("skyOrb"); if (!orb) return;
    var old = orb.querySelector(".orb-wx"); if (old) old.remove();
    var h = orbWx(icon);
    orb.classList.toggle("wx-dim", !!h && icon !== "cloudsun");
    if (h) orb.insertAdjacentHTML("beforeend", h);
  }

  /* ---------- Kopf: lebendiger Himmel ---------- */
  var SKY = {
    night: { a: "var(--wzp-241748, #241748)", b: "var(--wzp-15102a, #15102A)", c: "var(--wzp-0b0921, #0B0921)", stars: 1 },
    twilight: { a: "var(--wzp-241748, #241748)", b: "var(--wzp-3b2585, #3B2585)", c: "var(--wzp-5a2fbe, #5A2FBE)", stars: .55 },
    golden: { a: "var(--wzp-3b2585, #3B2585)", b: "var(--wzp-3b2585, #3B2585)", c: "var(--wzp-5a2fbe, #5A2FBE)", stars: 0 },
    day: { a: "var(--wzp-5a2fbe, #5A2FBE)", b: "var(--wzp-3b2585, #3B2585)", c: "var(--wzp-241748, #241748)", stars: 0 }
  };
  function buildStars() {
    var box = $("skyStars"); if (!box || box.childNodes.length) return;
    var seed = 7, h = "";
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 34; i++) {
      h += '<i class="' + (rnd() < .6 ? "s" : "") + '" style="left:' + (rnd() * 100).toFixed(1) + "%;top:" + (rnd() * 78).toFixed(1) + "%;--t:" + (2.4 + rnd() * 3).toFixed(1) + "s;--dl:" + (-rnd() * 5).toFixed(1) + 's"></i>';
    }
    box.innerHTML = h;
  }
  function sunSvg() {
    return '<svg viewBox="0 0 86 86" class="orb-sun"><defs><radialGradient id="skySunG" cx="40%" cy="38%" r="65%"><stop offset="0" stop-color="#FFFBEA"/><stop offset=".55" stop-color="#FFE08A"/><stop offset="1" stop-color="#FFB44D"/></radialGradient></defs>' +
      '<g class="orb-pulse"><circle cx="43" cy="43" r="36" fill="rgba(255,226,150,.16)"/><circle cx="43" cy="43" r="25" fill="url(#skySunG)"/></g></svg>';
  }
  function moonSvg(mo) {
    var cx = 43, cy = 43, r = 25, phase = 2 * Math.PI * mo.age / SYN, waxing = mo.age < SYN / 2;
    var rx = Math.abs(Math.cos(phase)) * r, crescent = mo.illum < .5;
    var lit = waxing ? 1 : 0, term = waxing ? (crescent ? 0 : 1) : (crescent ? 1 : 0);
    var d = "M" + cx + " " + (cy - r) + " A" + r + " " + r + " 0 0 " + lit + " " + cx + " " + (cy + r) + " A" + rx.toFixed(2) + " " + r + " 0 0 " + term + " " + cx + " " + (cy - r) + "Z";
    return '<svg viewBox="0 0 86 86" class="orb-moon"><defs><radialGradient id="skyMoonG" cx="42%" cy="40%" r="70%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#DCD2FA"/></radialGradient><clipPath id="skyMoonC"><path d="' + d + '"/></clipPath></defs>' +
      '<circle cx="43" cy="43" r="33" fill="rgba(220,210,255,.10)"/><circle cx="43" cy="43" r="25" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.22)" stroke-width="1"/>' +
      (mo.illum > .01 ? '<path d="' + d + '" fill="url(#skyMoonG)"/><g clip-path="url(#skyMoonC)" fill="rgba(124,92,255,.16)"><circle cx="35" cy="36" r="5"/><circle cx="50" cy="50" r="6.5"/><circle cx="49" cy="31" r="3"/><circle cx="33" cy="53" r="3.2"/></g>' : "") + "</svg>";
  }
  function renderSky() {
    var sky = $("sky"); if (!sky) return;
    var now = new Date(), loc = window.wzCore ? wzCore.knownLocation() : null, sl = loc || { lat: 51.3, lon: 9.5 };
    var alt = sunAlt(now, sl.lat, sl.lon), st = sunTimes(now, sl.lat, sl.lon), mo = moon(now.getTime());
    var phase = alt < -10 ? "night" : alt < -1 ? "twilight" : alt < 8 ? "golden" : "day", P = SKY[phase];
    var morning = now.getHours() < 12, side = morning ? "0%" : "100%";
    sky.style.setProperty("--sky-a", P.a); sky.style.setProperty("--sky-b", P.b); sky.style.setProperty("--sky-c", P.c);
    sky.style.setProperty("--sky-stars", String(P.stars));
    var glow = phase === "day" ? "radial-gradient(70% 80% at 86% 30%, rgba(255,255,255,.28), rgba(255,255,255,0) 70%), linear-gradient(180deg, rgba(255,255,255,0) 55%, rgba(255,255,255,.10) 100%)"
      : phase === "golden" ? "radial-gradient(110% 70% at " + side + " 100%, rgba(255,200,110,.75) 0%, rgba(255,150,105,.42) 30%, rgba(230,110,160,.16) 56%, rgba(230,110,160,0) 78%)"
      : phase === "twilight" ? "radial-gradient(120% 65% at " + side + " 100%, rgba(255,140,105,.72) 0%, rgba(225,105,160,.38) 33%, rgba(150,90,200,.12) 60%, rgba(150,90,200,0) 80%)"
      : "radial-gradient(60% 70% at 86% 30%, rgba(200,190,255,.16), rgba(200,190,255,0) 70%)";
    sky.querySelector(".sky-glow").style.background = glow;
    if (P.stars) buildStars();
    var orb = $("skyOrb"), isSun = phase === "day" || phase === "golden";
    orb.innerHTML = isSun ? sunSvg() : moonSvg(mo);
    orb.style.setProperty("--orb-y", isSun ? Math.max(-14, Math.min(18, 18 - alt * 0.8)).toFixed(0) + "px" : "0px");
    var hr = now.getHours();
    var greet = hr < 5 ? "Gute Nacht" : hr < 11 ? "Guten Morgen" : hr < 17 ? "Guten Tag" : hr < 22 ? "Guten Abend" : "Gute Nacht";
    var known = loc ? (loc.name ? shortPlace(loc.name) : cachedPlace(loc)) : "";
    $("skyGreet").textContent = greet + " · " + (known || (loc ? "dein Standort" : "Deutschland (Mitte)"));
    if (loc && !known) resolvePlace(loc).then(function (n) { if (n) $("skyGreet").textContent = greet + " · " + n; });
    var big;
    if (st.polar === "day") big = "<span>Heute</span>Die Sonne geht nicht unter";
    else if (st.polar === "night") big = "<span>Heute</span>Die Sonne geht nicht auf";
    else if (now < st.rise) big = "<span>Sonnenaufgang</span>" + hm(st.rise);
    else if (now < st.set) big = "<span>Sonnenuntergang</span>" + hm(st.set);
    else big = "<span>Sonnenaufgang morgen</span>" + hm(new Date(st.rise.getTime() + 864e5));
    $("skyBig").innerHTML = big;
    var full = mo.toFull < 1 ? "heute Vollmond" : "Vollmond in " + Math.round(mo.toFull) + (Math.round(mo.toFull) === 1 ? " Tag" : " Tagen");
    $("skySub").textContent = mo.name + " " + Math.round(mo.illum * 100) + " % · " + full;
    $("skyMain").href = "./hw-index.html";
    $("skyMain").setAttribute("aria-label", greet + ". " + $("skyBig").textContent.replace(/(\D)(\d)/, "$1 $2") + ". " + $("skySub").textContent + ". HimmelsWahr öffnen");
    var chip = $("skyWx");
    if (get("wz_today_weather") === "on" && loc) {
      fetchWeather(loc).then(function (d) {
        if (!d || !d.current) return;
        var w = wxInfo(d.current.weather_code);
        chip.innerHTML = svg(WX_ICON[w.icon] || WX_ICON.cloud) + Math.round(d.current.temperature_2m) + "°";
        chip.setAttribute("aria-label", Math.round(d.current.temperature_2m) + " Grad, " + w.text); chip.title = w.text;
        chip.hidden = false;
        setOrbWx(w.icon);
      }).catch(function () { chip.hidden = true; setOrbWx(""); });
    } else { chip.hidden = true; setOrbWx(""); }
  }

  /* ---------- Zahlen sanft hochzählen (nur beim ersten Aufbau) ---------- */
  var counted = false, countOn = true;
  function countUp(root) {
    if (!countOn || !root) return;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    Array.prototype.forEach.call(root.querySelectorAll("[data-count]"), function (el) {
      var node = null, walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) { if (/\d/.test(walker.currentNode.nodeValue)) { node = walker.currentNode; break; } }
      if (!node) return;
      var m = node.nodeValue.match(/\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?/); if (!m) return;
      var raw = m[0], dec = raw.indexOf(",") !== -1 ? raw.split(",")[1].length : 0;
      var target = parseFloat(raw.replace(/\./g, "").replace(",", ".")); if (!isFinite(target) || target === 0) return;
      var pre = node.nodeValue.slice(0, m.index), post = node.nodeValue.slice(m.index + raw.length), t0 = null, dur = 700;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        node.nodeValue = pre + (target * e).toLocaleString("de-DE", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + post;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------- Darstellung der Startseite ----------
     wz_home_style: { fs: Schriftgröße-Faktor, text: Schriftfarbe, sat: Farbstärke in %, icon: Standard-Symbolfarbe, group: Ordnerfarbe für alle Gruppen ("" = je Bereich) } */
  var FONT_SIZES = [[0.9, "Klein"], [1, "Normal"], [1.12, "Groß"], [1.25, "Sehr groß"]];
  var TEXT_COLORS = [
    ["standard", "Standard", null, null],
    ["kraeftig", "Kräftig", "#140F24", "#FFFFFF"],
    ["violett", "Violett", "#3B2585", "#D8CCFA"],
    ["blaugrau", "Blaugrau", "#2B3345", "#DCE3F0"],
    ["warm", "Warm", "#3A2A22", "#F3E6DA"]
  ];
  function homeStyle() {
    var s = json("wz_home_style", null) || {};
    var fs = +s.fs; if (!FONT_SIZES.some(function (f) { return f[0] === fs; })) fs = 1;
    var sat = Math.round(+s.sat); if (!isFinite(sat) || sat < 40 || sat > 160) sat = 100;
    var text = TEXT_COLORS.some(function (t) { return t[0] === s.text; }) ? s.text : "standard";
    var ic = colorDef(s.icon) ? s.icon : "violett";
    var gc = colorDef(s.group) ? s.group : "";
    return { fs: fs, sat: sat, text: text, icon: ic, group: gc };
  }
  function saveHomeStyle(st) { set("wz_home_style", JSON.stringify(st)); applyHomeStyle(); }
  function applyHomeStyle() {
    var st = homeStyle(), r = document.documentElement;
    r.style.setProperty("--wz-fs", String(st.fs));
    r.style.setProperty("--hub-sat", String(st.sat / 100));
    var dark = window.wzTheme && wzTheme.isDark ? wzTheme.isDark() : r.classList.contains("theme-dark");
    var t = null; TEXT_COLORS.forEach(function (x) { if (x[0] === st.text) t = dark ? x[3] : x[2]; });
    var app = document.querySelector(".app");
    if (app) { if (t) app.style.setProperty("--wz-text", t); else app.style.removeProperty("--wz-text"); }
    r.classList.toggle("hub-big", st.fs >= 1.25);
  }

  /* ---------- Sortierung der Startseite ---------- */
  // wz_home_sort: "eigene" | "az" | "zuletzt"; wz_home_order: { areas: [...], apps: { bereich: [...] } }
  // wz_recent: { appId: Zeitstempel } – wird von wz-core.js beim Öffnen einer App gesetzt
  var editMode = false;
  function sortMode() { var m = get("wz_home_sort"); return m === "az" || m === "zuletzt" ? m : "eigene"; }
  function orderPrefs() { var o = json("wz_home_order", null); return o && typeof o === "object" ? o : { areas: [], apps: {} }; }
  function byList(list, ids, key) { // Einträge nach gespeicherter Reihenfolge, neue hinten anhängen
    var pos = {}; (ids || []).forEach(function (id, i) { pos[id] = i; });
    return list.slice().sort(function (a, b) {
      var pa = pos[a[key]], pb = pos[b[key]];
      if (pa === undefined && pb === undefined) return list.indexOf(a) - list.indexOf(b);
      if (pa === undefined) return 1; if (pb === undefined) return -1; return pa - pb;
    });
  }
  function orderedAreas() { return byList(allGroups(), orderPrefs().areas, "id"); }
  function orderedApps(areaId) {
    var l = layout();
    var apps = WZ.APPS.filter(function (x) { return groupOf(x, l) === areaId; });
    var mode = sortMode();
    if (mode === "az") return apps.slice().sort(function (a, b) { return a.name.localeCompare(b.name, "de"); });
    var custom = byList(apps, (orderPrefs().apps || {})[areaId], "id");
    if (mode === "zuletzt") {
      var rec = json("wz_recent", {}) || {};
      return custom.slice().sort(function (a, b) { return (rec[b.id] || 0) - (rec[a.id] || 0) || custom.indexOf(a) - custom.indexOf(b); });
    }
    return custom;
  }
  function saveOrder(o) { set("wz_home_order", JSON.stringify(o)); }
  function moveArea(id, dir) {
    var ids = orderedAreas().map(function (a) { return a.id; }), i = ids.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    ids.splice(j, 0, ids.splice(i, 1)[0]);
    var o = orderPrefs(); o.areas = ids; saveOrder(o); renderAreas(id);
  }
  function moveApp(areaId, id, dir) {
    var ids = orderedApps(areaId).map(function (a) { return a.id; }), i = ids.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    ids.splice(j, 0, ids.splice(i, 1)[0]);
    var o = orderPrefs(); o.apps = o.apps || {}; o.apps[areaId] = ids; saveOrder(o); renderAreas(null, id);
  }
  var ARR = { up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>', left: '<path d="M19 12H5M11 6l-6 6 6 6"/>', right: '<path d="M5 12h14M13 6l6 6-6 6"/>' };
  function arrowBtn(dir, label, attrs, disabled) {
    return '<button type="button" class="mv" ' + attrs + ' aria-label="' + label + '"' + (disabled ? " disabled" : "") + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ARR[dir] + "</svg></button>";
  }
  function renderSortBar() {
    var m = sortMode(), bar = $("sortbar");
    if (!bar) return;
    var seg = [["eigene", "Eigene"], ["az", "A–Z"], ["zuletzt", "Zuletzt"]].map(function (x) {
      return '<button type="button" data-sort="' + x[0] + '" aria-pressed="' + (m === x[0]) + '">' + x[1] + "</button>";
    }).join("");
    bar.innerHTML = '<div class="sort-seg" role="group" aria-label="Apps sortieren">' + seg + "</div>" +
      '<button type="button" class="sort-ic" id="styleBtn" aria-label="Startseite gestalten" title="Startseite gestalten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 100 18c1.1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 004-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="14.5" cy="7" r="1.2"/></svg></button>' +
      (editMode ? '<button type="button" class="sort-act on" id="sortDone">Fertig</button>'
        : '<button type="button" class="sort-act" id="sortEdit"' + (m !== "eigene" ? " hidden" : "") + '>Anordnen</button>');
    Array.prototype.forEach.call(bar.querySelectorAll("[data-sort]"), function (b) {
      b.addEventListener("click", function () { set("wz_home_sort", b.getAttribute("data-sort")); editMode = false; renderSortBar(); renderAreas(); renderFavs(); });
    });
    var e = $("sortEdit"); if (e) e.addEventListener("click", function () { editMode = true; renderSortBar(); renderAreas(); renderFavs(); });
    var d = $("sortDone"); if (d) d.addEventListener("click", function () { editMode = false; renderSortBar(); renderAreas(); renderFavs(); });
    var sb = $("styleBtn"); if (sb) sb.addEventListener("click", openStyle);
    $("sortHint").hidden = !editMode;
  }

  var PEN = '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>';
  var BIN = '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>';
  function smallBtn(p, label, attrs) {
    return '<button type="button" class="mv" ' + attrs + ' aria-label="' + label + '" title="' + label + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg></button>";
  }
  function renderAreas(focusArea, focusApp) {
    var h = "", areas = orderedAreas(), l = layout();
    var visible = areas.filter(function (a) { return editMode || orderedApps(a.id).length; });
    visible.forEach(function (a, ai) {
      var apps = orderedApps(a.id);
      if (!editMode) {
        var art = areaArt(a.id);
        h += '<section class="sec area ar-' + esc(a.id) + '" id="' + esc(a.id) + '" aria-labelledby="h-' + esc(a.id) + '"' + groupStyle(a.id, l) + '><div class="area-card">' +
          '<svg class="area-orn" viewBox="0 0 230 150" aria-hidden="true">' + art.orn + "</svg>" +
          '<div class="area-h"><span class="area-em"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + art.em + "</svg></span>" +
          '<span class="area-t"><h2 id="h-' + esc(a.id) + '">' + esc(a.title) + "</h2>" + (a.sub ? "<p>" + esc(a.sub) + "</p>" : "") + "</span>" +
          '<span class="area-n">' + apps.length + (apps.length === 1 ? " App" : " Apps") + "</span></div>" +
          '<div class="grid apps">' + apps.map(function (x) {
            return '<a class="tile" href="./' + x.href + '" data-app="' + x.id + '">' + appIcon(x, l) +
              '<span class="t-txt"><span class="t-name">' + esc(x.name) + '</span><span class="t-sub">' + esc(x.sub) + '</span><span class="t-stat" data-count data-stat="' + x.id + '">' + esc(statFor(x.id)) + "</span></span></a>";
          }).join("") + "</div></div></section>";
        return;
      }
      h += '<section class="sec' + (editMode ? " editing" : "") + '" id="' + esc(a.id) + '" aria-labelledby="h-' + esc(a.id) + '"><div class="sec-h"><h2 id="h-' + esc(a.id) + '">' + esc(a.title) + "</h2>" +
        (editMode ? '<span class="mv-row">' +
          '<button type="button" class="mv t-color g-color" data-gcolor="' + esc(a.id) + '" aria-label="Ordnerfarbe für ' + esc(a.title) + '" title="Ordnerfarbe"' + groupStyle(a.id, l) + "><span></span></button>" +
          smallBtn(PEN, "Gruppe „" + esc(a.title) + "“ umbenennen", 'data-rename="' + esc(a.id) + '"') +
          (!a.builtin && !apps.length ? smallBtn(BIN, "Gruppe „" + esc(a.title) + "“ löschen", 'data-delgroup="' + esc(a.id) + '"') : "") +
          arrowBtn("up", esc(a.title) + " nach oben", 'data-area="' + esc(a.id) + '" data-dir="-1"', ai === 0) +
          arrowBtn("down", esc(a.title) + " nach unten", 'data-area="' + esc(a.id) + '" data-dir="1"', ai === visible.length - 1) + "</span>"
          : "") +
        '</div><div class="grid">';
      if (editMode && !apps.length) h += '<p class="grp-empty">Leere Gruppe – verschiebe Apps über „Gruppe“ hierher.</p>';
      apps.forEach(function (x, xi) {
        var isFav = favs().indexOf(x.id) !== -1;
        var inner = appIcon(x, l) + "<span><span class=\"t-name\" style=\"display:block\">" + x.name +
          '</span><span class="t-sub" style="display:block">' + x.sub + '</span><span class="t-stat" style="display:block" data-stat="' + x.id + '">' + esc(statFor(x.id)) + "</span></span>";
        if (editMode) {
          var opts = areas.map(function (g) { return '<option value="' + esc(g.id) + '"' + (g.id === a.id ? " selected" : "") + ">" + esc(g.title) + "</option>"; }).join("");
          h += '<div class="tile is-edit" data-app="' + x.id + '">' + inner +
            '<label class="t-grp"><span>Gruppe</span><select data-assign="' + x.id + '" aria-label="Gruppe für ' + x.name + '">' + opts + "</select></label>" +
            '<span class="mv-row tile-mv">' +
            '<button type="button" class="mv t-fav' + (isFav ? " on" : "") + '" data-fav="' + x.id + '" aria-pressed="' + isFav + '" aria-label="' + x.name + (isFav ? " aus den Favoriten nehmen" : " als Favorit") + '" title="Favorit"><svg viewBox="0 0 24 24" fill="' + (isFav ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg></button>' +
            '<button type="button" class="mv t-color" data-color="' + x.id + '" aria-label="Symbolfarbe für ' + x.name + '" title="Symbolfarbe"><span' + iconStyle(x.id, l) + "></span></button>" +
            arrowBtn("left", x.name + " nach vorne", 'data-app-mv="' + x.id + '" data-area-of="' + esc(a.id) + '" data-dir="-1"', xi === 0) +
            arrowBtn("right", x.name + " nach hinten", 'data-app-mv="' + x.id + '" data-area-of="' + esc(a.id) + '" data-dir="1"', xi === apps.length - 1) + "</span></div>";
        }
      });
      h += "</div></section>";
    });
    if (editMode) h += '<button type="button" class="grp-add" id="grpAdd">+ Neue Gruppe</button>';
    $("areas").innerHTML = h;
    if (editMode) {
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-area]"), function (b) {
        b.addEventListener("click", function () { moveArea(b.getAttribute("data-area"), +b.getAttribute("data-dir")); });
      });
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-app-mv]"), function (b) {
        b.addEventListener("click", function () { moveApp(b.getAttribute("data-area-of"), b.getAttribute("data-app-mv"), +b.getAttribute("data-dir")); });
      });
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-assign]"), function (sel) {
        sel.addEventListener("change", function () { assignApp(sel.getAttribute("data-assign"), sel.value); });
      });
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-fav]"), function (b) {
        b.addEventListener("click", function () { toggleFav(b.getAttribute("data-fav")); });
      });
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-color]"), function (b) {
        b.addEventListener("click", function () { pickColor(b.getAttribute("data-color")); });
      });
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-gcolor]"), function (b) {
        b.addEventListener("click", function () { pickGroupColor(b.getAttribute("data-gcolor")); });
      });
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-rename]"), function (b) {
        b.addEventListener("click", function () { renameGroup(b.getAttribute("data-rename")); });
      });
      Array.prototype.forEach.call($("areas").querySelectorAll("[data-delgroup]"), function (b) {
        b.addEventListener("click", function () { deleteGroup(b.getAttribute("data-delgroup")); });
      });
      var ga = $("grpAdd"); if (ga) ga.addEventListener("click", addGroup);
      var f = focusArea ? document.querySelector('[data-area="' + focusArea + '"]:not([disabled])') : focusApp ? (document.querySelector('[data-app-mv="' + focusApp + '"]:not([disabled])') || document.querySelector('[data-fav="' + focusApp + '"]')) : null;
      if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } }
      if (focusArea) { var sec = document.getElementById(focusArea); if (sec) sec.scrollIntoView({ block: "nearest" }); }
      return;
    }
    countUp($("areas"));
    // asynchron: WowarWahr und BelegParkWahr
    idbReadAll("wowarwahr", ["visits", "trips", "countries"]).then(function (r) {
      if (!r || !r.visits) return;
      var c = {}; r.visits.forEach(function (v) { if (v.cid) c[v.cid] = 1; }); (r.countries || []).forEach(function (x) { if (x.visited) c[x.id] = 1; });
      var n = Object.keys(c).length, el = document.querySelector('[data-stat="wow"]');
      if (el && (n || r.visits.length)) el.textContent = n + (n === 1 ? " Land · " : " Länder · ") + r.visits.length + (r.visits.length === 1 ? " Ort" : " Orte");
    });
    idbReadAll("parken-und-belege", ["parkscheine", "nebenkosten", "fahrten"]).then(function (r) {
      if (!r) return;
      var mk = ymd(new Date()).slice(0, 7), sum = 0, cnt = 0;
      ["parkscheine", "nebenkosten", "fahrten"].forEach(function (s) { (r[s] || []).forEach(function (e) { if (e && e.date && e.date.indexOf(mk) === 0) { sum += +e.betrag || 0; cnt++; } }); });
      var el = document.querySelector('[data-stat="bp"]');
      if (el && cnt) el.textContent = eur(sum) + " diesen Monat";
    });
  }

  /* ---------- Gruppen bearbeiten ---------- */
  function assignApp(appId, groupId) {
    var l = layout(), app = WZ.app(appId); if (!app) return;
    if (groupId === app.area) delete l.assign[appId]; else l.assign[appId] = groupId;
    saveLayout(l);
    // an das Ende der neuen Gruppe stellen
    var o = orderPrefs(); o.apps = o.apps || {};
    var ids = orderedApps(groupId).map(function (a) { return a.id; }).filter(function (i) { return i !== appId; });
    ids.push(appId); o.apps[groupId] = ids; saveOrder(o);
    renderAreas(null, appId);
    toast("„" + app.name + "“ liegt jetzt in „" + groupTitle(groupId) + "“");
  }
  function groupTitle(id) { var t = ""; allGroups().forEach(function (g) { if (g.id === id) t = g.title; }); return t; }
  function renameGroup(id) {
    askText("Gruppe umbenennen", groupTitle(id), function (v) {
      var l = layout(), builtin = WZ.AREAS.filter(function (a) { return a.id === id; })[0];
      if (builtin) { if (!v || v === builtin.title) delete l.names[id]; else l.names[id] = v; }
      else { if (!v) return; l.custom.forEach(function (g) { if (g.id === id) g.title = v; }); }
      saveLayout(l); renderAreas(id);
    });
  }
  function addGroup() {
    askText("Neue Gruppe", "", function (v) {
      if (!v) return;
      var l = layout(), id = "g" + Date.now().toString(36);
      l.custom.push({ id: id, title: v }); saveLayout(l);
      var o = orderPrefs(); o.areas = orderedAreas().map(function (a) { return a.id; }); saveOrder(o);
      renderAreas(id);
    }, "z. B. Favoriten");
  }
  function deleteGroup(id) {
    var l = layout();
    l.custom = l.custom.filter(function (g) { return g.id !== id; });
    Object.keys(l.assign).forEach(function (k) { if (l.assign[k] === id) delete l.assign[k]; });
    delete l.gcolors[id];
    saveLayout(l); renderAreas();
  }

  /* ---------- Kleine Dialoge (Bottom-Sheet) ---------- */
  function openSheet(title, bodyHtml, onReady) {
    var wrap = document.createElement("div");
    wrap.className = "hs-wrap"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-label", title);
    wrap.innerHTML = '<div class="hs"><div class="hs-head"><h2>' + esc(title) + '</h2><button type="button" class="hs-x" aria-label="Schließen"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' + bodyHtml + "</div>";
    function close() { wrap.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(); });
    wrap.querySelector(".hs-x").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    if (onReady) onReady(wrap, close);
    return close;
  }
  function askText(title, value, done, placeholder) {
    openSheet(title, '<input class="hs-in" type="text" maxlength="30" autocomplete="off" value="' + esc(value || "") + '" placeholder="' + esc(placeholder || "") + '"><button type="button" class="hs-ok">Übernehmen</button>', function (w, close) {
      var inp = w.querySelector(".hs-in");
      function ok() { var v = inp.value.trim().slice(0, 30); close(); done(v); }
      w.querySelector(".hs-ok").addEventListener("click", ok);
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") ok(); });
      setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) { } }, 60);
    });
  }
  function swatches(current, withDefault, attr) {
    attr = attr || "data-c";
    return '<div class="hs-sw">' + (withDefault ? '<button type="button" ' + attr + '="" class="' + (!current ? "on" : "") + '"><span class="sw-std">Std</span><em>Standard</em></button>' : "") +
      ICON_COLORS.map(function (c) { return '<button type="button" ' + attr + '="' + c[0] + '" class="' + (current === c[0] ? "on" : "") + '"><span style="background:' + gradient(c[0]) + '"></span><em>' + c[1] + "</em></button>"; }).join("") + "</div>";
  }
  function pickGroupColor(groupId) {
    var l = layout();
    openSheet("Ordnerfarbe: " + groupTitle(groupId), '<p class="hs-note">„Standard“ übernimmt die Ordnerfarbe aus „Startseite gestalten“.</p>' + swatches(l.gcolors[groupId] || "", true), function (w, close) {
      Array.prototype.forEach.call(w.querySelectorAll("[data-c]"), function (b) {
        b.addEventListener("click", function () {
          var l2 = layout(), c = b.getAttribute("data-c");
          if (c) l2.gcolors[groupId] = c; else delete l2.gcolors[groupId];
          saveLayout(l2); close(); renderAreas(groupId);
        });
      });
    });
  }
  function pickColor(appId) {
    var l = layout(), app = WZ.app(appId);
    openSheet("Symbolfarbe: " + app.name, swatches(l.colors[appId] || "", true), function (w, close) {
      Array.prototype.forEach.call(w.querySelectorAll("[data-c]"), function (b) {
        b.addEventListener("click", function () {
          var l2 = layout(), c = b.getAttribute("data-c");
          if (c) l2.colors[appId] = c; else delete l2.colors[appId];
          saveLayout(l2); close(); renderAreas(null, appId); renderFavs();
        });
      });
    });
  }
  function openStyle() {
    var st = homeStyle();
    var fsH = '<div class="hs-seg" role="group" aria-label="Schriftgröße">' + FONT_SIZES.map(function (f) { return '<button type="button" data-fs="' + f[0] + '" aria-pressed="' + (st.fs === f[0]) + '">' + f[1] + "</button>"; }).join("") + "</div>";
    var tcH = '<div class="hs-tc">' + TEXT_COLORS.map(function (t) {
      var dot = t[2] ? '<span style="background:linear-gradient(135deg,' + t[2] + ' 50%,' + t[3] + ' 50%)"></span>' : '<span class="sw-std">Std</span>';
      return '<button type="button" data-tc="' + t[0] + '" aria-pressed="' + (st.text === t[0]) + '">' + dot + "<em>" + t[1] + "</em></button>";
    }).join("") + "</div>";
    var body =
      '<h3>Schriftgröße</h3>' + fsH +
      '<h3>Schriftfarbe</h3>' + tcH +
      '<h3>Farbstärke <output id="hsSatV">' + st.sat + ' %</output></h3><input type="range" id="hsSat" min="40" max="160" step="10" value="' + st.sat + '" aria-label="Farbstärke">' +
      '<div class="hs-scale"><span>dezent</span><span>kräftig</span></div>' +
      '<h3>Symbolfarbe für alle Apps</h3><p class="hs-note">Einzelne Apps färbst du unter „Anordnen“ um.</p>' + swatches(st.icon, false) +
      '<h3>Ordnerfarbe für alle Gruppen</h3><p class="hs-note">„Standard“ = je Bereich leicht abgestuft. Einzelne Ordner färbst du unter „Anordnen“ um.</p>' + swatches(st.group, true, "data-gc") +
      '<button type="button" class="hs-reset">Alles auf Standard</button>';
    openSheet("Startseite gestalten", body, function (w) {
      function upd(fn) { var s2 = homeStyle(); fn(s2); saveHomeStyle(s2); renderAreas(); renderToday(); renderFavs(); }
      Array.prototype.forEach.call(w.querySelectorAll("[data-fs]"), function (b) {
        b.addEventListener("click", function () { upd(function (s2) { s2.fs = +b.getAttribute("data-fs"); }); Array.prototype.forEach.call(w.querySelectorAll("[data-fs]"), function (x) { x.setAttribute("aria-pressed", String(x === b)); }); });
      });
      Array.prototype.forEach.call(w.querySelectorAll("[data-tc]"), function (b) {
        b.addEventListener("click", function () { upd(function (s2) { s2.text = b.getAttribute("data-tc"); }); Array.prototype.forEach.call(w.querySelectorAll("[data-tc]"), function (x) { x.setAttribute("aria-pressed", String(x === b)); }); });
      });
      var sat = w.querySelector("#hsSat");
      sat.addEventListener("input", function () { w.querySelector("#hsSatV").textContent = sat.value + " %"; var s2 = homeStyle(); s2.sat = +sat.value; saveHomeStyle(s2); });
      Array.prototype.forEach.call(w.querySelectorAll("[data-c]"), function (b) {
        b.addEventListener("click", function () { upd(function (s2) { s2.icon = b.getAttribute("data-c"); }); Array.prototype.forEach.call(w.querySelectorAll("[data-c]"), function (x) { x.classList.toggle("on", x === b); }); });
      });
      Array.prototype.forEach.call(w.querySelectorAll("[data-gc]"), function (b) {
        b.addEventListener("click", function () { upd(function (s2) { s2.group = b.getAttribute("data-gc"); }); Array.prototype.forEach.call(w.querySelectorAll("[data-gc]"), function (x) { x.classList.toggle("on", x === b); }); });
      });
      w.querySelector(".hs-reset").addEventListener("click", function () {
        try { localStorage.removeItem("wz_home_style"); } catch (e) { }
        applyHomeStyle(); renderAreas(); renderToday();
        w.remove(); openStyle();
      });
    });
  }
  function toast(msg) {
    var t = document.createElement("div"); t.className = "hs-toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------- Suche ---------- */
  var idx = null;
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss"); }
  function add(list, app, text, sub, href) { if (text && String(text).trim()) list.push({ app: app, text: String(text), sub: sub || "", href: href || ("./" + WZ.app(app).href), n: norm(text + " " + (sub || "")) }); }
  function buildIndex() {
    if (idx) return Promise.resolve(idx);
    var L = [];
    try {
      (json("losgedacht_thoughts", []) || []).forEach(function (t) { if (t && t.text) add(L, "ld", t.text, t.status === "open" ? "offen" : "losgelassen"); });
      tours().forEach(function (t) { add(L, "wk", t.title || ("Fahrt " + fmt(t.distanceKm || 0, 1) + " km"), new Date(t.startTime).toLocaleDateString("de-DE")); (t.notes || []).forEach(function (n) { if (n) add(L, "wk", n.title || n.text, "Notiz zu einer Fahrt"); }); });
      (json("wk-navfavorites", []) || []).forEach(function (f) { if (f) add(L, "wk", f.name, "gemerktes Ziel"); });
      (json("kw-waypoints", []) || []).forEach(function (w) { if (w) add(L, "kw", w.name, "Wegpunkt"); });
      (json("vw_inventar", []) || []).forEach(function (v) { if (v) add(L, "vw", v.name, [v.kategorie, v.notiz].filter(Boolean).join(" · ")); });
      (json("alltagwahr_entries_v1", []) || []).forEach(function (e) { if (e) add(L, "aw", e.name, eur(+e.amount || 0)); });
      (json("astrowahr.profiles", []) || []).forEach(function (p) { if (p) add(L, "as", p.name || p.label || p.title, "Horoskop"); });
      (json("zh:mem", []) || []).forEach(function (m) { if (m) add(L, "zh", m.title, [m.place, m.ms ? new Date(m.ms).toLocaleDateString("de-DE") : ""].filter(Boolean).join(" · ")); });
      (json("hw-fav-locations", []) || []).forEach(function (f) { if (f) add(L, "hw", f.name, "Lieblingsort"); });
      (json("fk_notes", []) || []).forEach(function (n) { if (n) add(L, "kg", n.title, n.text); });
      (json("lw_history", []) || []).forEach(function (h) { if (h && (h.note || h.tag)) add(L, "lw", h.note || h.tag, h.tag || "Messung"); });
    } catch (e) { }
    return Promise.all([
      idbReadAll("parken-und-belege", ["parkscheine", "nebenkosten", "fahrten", "notizen", "kilometerstand"]).then(function (r) {
        if (!r) return;
        (r.parkscheine || []).forEach(function (p) { add(L, "bp", p.ort || "Parkschein", "Parkschein · " + (p.date || "") + (p.betrag ? " · " + eur(p.betrag) : "")); });
        (r.nebenkosten || []).forEach(function (n) { add(L, "bp", n.titel || n.kategorie, [n.kategorie, n.notiz, n.date].filter(Boolean).join(" · ")); });
        (r.fahrten || []).forEach(function (f) { add(L, "bp", [f.von, f.nach].filter(Boolean).join(" – ") || f.zweck || "Fahrt", [f.zweck, f.date, f.km ? fmt(f.km, 1) + " km" : ""].filter(Boolean).join(" · ")); });
        (r.notizen || []).forEach(function (n) { add(L, "bp", n.titel || "Sprachnotiz", "Notiz · " + (n.date || "")); });
        (r.kilometerstand || []).forEach(function (k) { if (k.ort) add(L, "bp", k.ort, "Kilometerstand · " + (k.date || "")); });
      }),
      idbReadAll("wowarwahr", ["visits", "trips", "wishes"]).then(function (r) {
        if (!r) return;
        (r.visits || []).forEach(function (v) { add(L, "wow", v.name, [v.region, v.date].filter(Boolean).join(" · ")); });
        (r.trips || []).forEach(function (t) { add(L, "wow", t.title, "Reise" + (t.start ? " · " + t.start : "")); });
        (r.wishes || []).forEach(function (w) { add(L, "wow", w.name, "Wunschziel"); });
      })
    ]).then(function () { idx = L; return L; });
  }
  function hl(text, q) {
    var t = esc(text), n = norm(text), i = n.indexOf(q);
    if (i < 0 || !q) return t;
    // Position im Originaltext grob übernehmen (gleiche Länge bei einfachen Buchstaben)
    var raw = String(text);
    return esc(raw.slice(0, i)) + "<mark>" + esc(raw.slice(i, i + q.length)) + "</mark>" + esc(raw.slice(i + q.length));
  }
  var searchTimer = null;
  function doSearch() {
    var raw = $("q").value.trim(), q = norm(raw);
    $("qx").hidden = !raw;
    if (!q) { $("results").hidden = true; $("home").hidden = false; return; }
    $("home").hidden = true; $("results").hidden = false;
    var apps = WZ.APPS.filter(function (a) { return norm(a.name + " " + a.sub + " " + a.kw).indexOf(q) !== -1; });
    var h = "";
    if (apps.length) {
      h += '<div class="res-group"><h3>Apps</h3><div class="card today">' + apps.map(function (a) {
        return row({ svg: icon(a.id), label: a.sub, value: hl(a.name, q), href: "./" + a.href });
      }).join("") + "</div></div>";
    }
    $("results").innerHTML = h + '<div id="resData"><p class="res-empty">Suche in deinen Einträgen …</p></div>';
    buildIndex().then(function (L) {
      if (norm($("q").value.trim()) !== q) return;
      var hits = L.filter(function (x) { return x.n.indexOf(q) !== -1; });
      var box = $("resData"); if (!box) return;
      if (!hits.length) { box.innerHTML = apps.length ? "" : '<p class="res-empty">Nichts gefunden.</p>'; return; }
      var by = {};
      hits.forEach(function (x) { (by[x.app] = by[x.app] || []).push(x); });
      var out = "";
      WZ.APPS.forEach(function (a) {
        var g = by[a.id]; if (!g) return;
        out += '<div class="res-group"><h3>' + icon(a.id) + a.name + ' <span style="text-transform:none;letter-spacing:0">(' + g.length + ')</span></h3><div class="card today">' +
          g.slice(0, 8).map(function (x) { return row({ icon: a.id, label: esc(x.sub), value: hl(x.text.length > 120 ? x.text.slice(0, 117) + "…" : x.text, q), href: x.href }); }).join("") +
          (g.length > 8 ? '<a class="row" href="./' + a.href + '"><span class="r-txt"><span class="r-v" style="display:block">Alle ' + g.length + " in " + a.name + " ansehen</span></span>" + CHEV + "</a>" : "") + "</div></div>";
      });
      box.innerHTML = out;
    });
  }

  /* ---------- Immer oben beginnen ----------
     Apps verlinken zurück mit Sprungmarke (z. B. #unterwegs). Die Marke wird
     entfernt und die Seite steht immer am Anfang. */
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) { }
  function toTop() {
    try { if (location.hash) history.replaceState(null, "", location.pathname + location.search); } catch (e) { }
    window.scrollTo(0, 0);
  }
  if (location.hash) toTop();

  /* ---------- Start ---------- */
  function init() {
    applyHomeStyle();
    if (window.wzTheme && wzTheme.onChange) wzTheme.onChange(function () { applyHomeStyle(); });
    renderSky();
    renderJump();
    renderFavs();
    renderToday();
    var te = $("todayEdit");
    if (te) te.addEventListener("click", function () { todayEdit = !todayEdit; renderToday(); });
    renderSortBar();
    renderAreas();
    countOn = false; // ab jetzt keine Zähl-Animation mehr (nur beim ersten Öffnen)
    // sanftes Erscheinen der Bereiche, leicht versetzt
    var parts = [$("jump"), $("favs"), $("heute"), $("sortbar")].concat(Array.prototype.slice.call(document.querySelectorAll("#areas > .sec")));
    var di = 0;
    parts.forEach(function (el) { if (!el || el.hidden || !el.innerHTML.trim()) return; el.classList.add("rise"); el.style.setProperty("--d", (Math.min(di++, 7) * 0.06).toFixed(2) + "s"); });
    setInterval(renderSky, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) renderSky(); });
    var rs = $("sortReset");
    if (rs) rs.addEventListener("click", function () { try { localStorage.removeItem("wz_home_order"); localStorage.removeItem("wz_home_layout"); } catch (e) { } renderAreas(); });
    var q = $("q");
    q.addEventListener("input", function () { clearTimeout(searchTimer); searchTimer = setTimeout(doSearch, 140); });
    q.addEventListener("focus", function () { buildIndex(); }, { once: true });
    $("qx").addEventListener("click", function () { q.value = ""; doSearch(); q.focus(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && q.value) { q.value = ""; doSearch(); } });
    // beim Zurückkehren (z. B. aus einer App) Kennzahlen auffrischen
    window.addEventListener("pageshow", function (e) { if (e.persisted) { idx = null; renderSky(); renderJump(); renderToday(); renderAreas(); renderFavs(); } toTop(); });
    // Beim Zurückkehren immer oben beginnen (Kopf mit Himmel sichtbar)
    toTop();
    setTimeout(toTop, 0);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
