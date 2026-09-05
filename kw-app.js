"use strict";

/* ===================== Hilfsfunktionen ===================== */
function kwToRad(d){ return d*Math.PI/180; }
function kwToDeg(r){ return r*180/Math.PI; }
function kwNorm360(d){ d = d % 360; if (d < 0) d += 360; return d; }

function kwHaversine(lat1, lon1, lat2, lon2){
  const R = 6371000;
  const dLat = kwToRad(lat2-lat1);
  const dLon = kwToRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(kwToRad(lat1))*Math.cos(kwToRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function kwBearing(lat1, lon1, lat2, lon2){
  const y = Math.sin(kwToRad(lon2-lon1)) * Math.cos(kwToRad(lat2));
  const x = Math.cos(kwToRad(lat1))*Math.sin(kwToRad(lat2)) - Math.sin(kwToRad(lat1))*Math.cos(kwToRad(lat2))*Math.cos(kwToRad(lon2-lon1));
  return kwNorm360(kwToDeg(Math.atan2(y, x)));
}
function kwCompassLabel(deg){
  const dirs = ["N","NO","O","SO","S","SW","W","NW"];
  return dirs[Math.round(kwNorm360(deg)/45) % 8];
}
/* Öffnet ein Ziel per offiziellem Apple-Maps-Link (maps.apple.com) – kein API-Key,
   keine Bibliothek nötig, funktioniert als Web-Link auf iOS direkt in der Karten-App. */
function kwMapsUrl(lat, lon, name){
  return `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=w&q=${encodeURIComponent(name || "Ziel")}`;
}
function kwFormatDist(m){
  if (m < 1000) return Math.round(m) + " m";
  return (m/1000).toFixed(1).replace(".", ",") + " km";
}
/* HTML-Escaping für alle Namen, die aus OSM-Daten (Overpass) oder Nutzereingaben
   stammen und per innerHTML in die Seite eingefügt werden – verhindert, dass ein
   manipulierter Name (z.B. in OSM oder ein selbst eingegebener Wegpunktname) als
   Code im Browser ausgeführt wird. */
function kwEsc(s){ return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
/* Einmalige, statt bei jedem Klick wiederholte, Zustimmung pro externem Dienst –
   analog zu OrteWahr: Bestätigung erscheint nur beim allerersten Aufruf, danach
   läuft die Funktion ohne Unterbrechung. Bei Ablehnung bleibt der Dienst gesperrt
   und der Hinweis kommt beim nächsten Versuch erneut. Details stehen zusätzlich
   dauerhaft in der Datenschutzerklärung. */
function kwAskOnce(key, message){
  if (localStorage.getItem(key) === "1") return true;
  if (confirm(message + "\n\nDieser Hinweis erscheint nur einmal – die Angaben stehen dauerhaft in der Datenschutzerklärung.")) { localStorage.setItem(key, "1"); return true; }
  return false;
}

/* ===================== Astronomie (Näherungsformeln) ===================== */
function kwJulianDay(date){ return date.getTime()/86400000 + 2440587.5; }

function kwSunPosition(date, latDeg, lonDeg){
  const d = kwJulianDay(date) - 2451545.0;
  const L = kwNorm360(280.460 + 0.9856474*d);
  const g = kwNorm360(357.528 + 0.9856003*d);
  const lambda = kwNorm360(L + 1.915*Math.sin(kwToRad(g)) + 0.020*Math.sin(kwToRad(2*g)));
  const eps = 23.439 - 0.0000004*d;
  const RA = kwNorm360(kwToDeg(Math.atan2(Math.cos(kwToRad(eps))*Math.sin(kwToRad(lambda)), Math.cos(kwToRad(lambda)))));
  const dec = kwToDeg(Math.asin(Math.sin(kwToRad(eps))*Math.sin(kwToRad(lambda))));
  const GMST = kwNorm360(280.46061837 + 360.98564736629*d);
  const LST = kwNorm360(GMST + lonDeg);
  let H = kwNorm360(LST - RA); if (H > 180) H -= 360;
  const latR = kwToRad(latDeg), decR = kwToRad(dec), HR = kwToRad(H);
  const alt = kwToDeg(Math.asin(Math.sin(decR)*Math.sin(latR) + Math.cos(decR)*Math.cos(latR)*Math.cos(HR)));
  const az = kwNorm360(kwToDeg(Math.atan2(-Math.sin(HR), Math.tan(decR)*Math.cos(latR) - Math.sin(latR)*Math.cos(HR))));
  return { alt, az, lambda };
}

function kwMoonPosition(date, latDeg, lonDeg){
  const d = kwJulianDay(date) - 2451545.0;
  const Lm = kwNorm360(218.316 + 13.176396*d);
  const Mm = kwNorm360(134.963 + 13.064993*d);
  const F  = kwNorm360(93.272 + 13.229350*d);
  const lambda = kwNorm360(Lm + 6.289*Math.sin(kwToRad(Mm)));
  const beta = 5.128*Math.sin(kwToRad(F));
  const eps = 23.439 - 0.0000004*d;
  const lambdaR = kwToRad(lambda), betaR = kwToRad(beta), epsR = kwToRad(eps);
  const RA = kwNorm360(kwToDeg(Math.atan2(
    Math.sin(lambdaR)*Math.cos(epsR) - Math.tan(betaR)*Math.sin(epsR), Math.cos(lambdaR)
  )));
  const dec = kwToDeg(Math.asin(Math.sin(betaR)*Math.cos(epsR) + Math.cos(betaR)*Math.sin(epsR)*Math.sin(lambdaR)));
  const GMST = kwNorm360(280.46061837 + 360.98564736629*d);
  const LST = kwNorm360(GMST + lonDeg);
  let H = kwNorm360(LST - RA); if (H > 180) H -= 360;
  const latR = kwToRad(latDeg), decR = kwToRad(dec), HR = kwToRad(H);
  const alt = kwToDeg(Math.asin(Math.sin(decR)*Math.sin(latR) + Math.cos(decR)*Math.cos(latR)*Math.cos(HR)));
  const az = kwNorm360(kwToDeg(Math.atan2(-Math.sin(HR), Math.tan(decR)*Math.cos(latR) - Math.sin(latR)*Math.cos(HR))));
  return { alt, az, lambda };
}

function kwMoonPhaseInfo(date){
  const sun = kwSunPosition(date, 0, 0);
  const moon = kwMoonPosition(date, 0, 0);
  const elong = kwNorm360(moon.lambda - sun.lambda);
  const illum = (1 - Math.cos(kwToRad(elong))) / 2;
  let name;
  if (elong < 11.25 || elong >= 348.75) name = "Neumond";
  else if (elong < 78.75) name = "zunehmende Sichel";
  else if (elong < 101.25) name = "Erstes Viertel";
  else if (elong < 168.75) name = "zunehmender Mond";
  else if (elong < 191.25) name = "Vollmond";
  else if (elong < 258.75) name = "abnehmender Mond";
  else if (elong < 281.25) name = "Letztes Viertel";
  else name = "abnehmende Sichel";
  return { illum, name };
}

/* ===================== Planeten (Kepler-Bahnelemente, Näherungsformeln) =====================
   Klassische, frei verfügbare Näherungsformeln (nach P. Schlyter, "How to compute planetary
   positions") – Genauigkeit ca. 1 Bogenminute, für eine AR-Kompass-Anzeige mehr als ausreichend.
   Referenzepoche der Bahnelemente: 31.12.1999 0:00 UT (JD 2451543.5), daher eigener Tageszähler
   dOrbit getrennt von der Sternzeit-Berechnung (die weiterhin auf J2000.0 wie bei Sonne/Mond läuft). */
const KW_PLANET_ELEMENTS = {
  venus:   { N:[76.6799,2.46590e-5],  i:[3.3946,2.75e-8],   w:[54.8910,1.38374e-5],  a:0.723330, e:[0.006773,-1.302e-9], M:[48.0052,1.6021302244] },
  mars:    { N:[49.5574,2.11081e-5],  i:[1.8497,-1.78e-8],  w:[286.5016,2.92961e-5], a:1.523688, e:[0.093405,2.516e-9],  M:[18.6021,0.5240207766] },
  jupiter: { N:[100.4542,2.76854e-5], i:[1.3030,-1.557e-7], w:[273.8777,1.64505e-5], a:5.20256,  e:[0.048498,4.469e-9],  M:[19.8950,0.0830853001] },
  saturn:  { N:[113.6634,2.38980e-5], i:[2.4886,-1.081e-7], w:[339.3939,2.97661e-5], a:9.55475,  e:[0.055546,-9.499e-9], M:[316.9670,0.0334442282] },
};
const KW_SUN_ELEMENTS = { w:[282.9404,4.70935e-5], e:[0.016709,-1.151e-9], M:[356.0470,0.9856002585] };

function kwOrbitalValue(pair, d){ return pair[0] + pair[1]*d; }

/* Löst die Kepler-Gleichung M = E - e*sin(E) iterativ nach E auf (Newton-Verfahren). */
function kwSolveKepler(Mdeg, e){
  const M = kwToRad(kwNorm360(Mdeg));
  let E = M + e*Math.sin(M)*(1 + e*Math.cos(M));
  for (let n = 0; n < 6; n++){
    const dE = (E - e*Math.sin(E) - M) / (1 - e*Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E;
}

/* Geozentrische Position der Sonne in der Ekliptik-Ebene (x,y in AE) – wird als Verschiebung
   gebraucht, um die heliozentrische Planetenposition in eine geozentrische umzurechnen. */
function kwSunXY(dOrbit){
  const e = kwOrbitalValue(KW_SUN_ELEMENTS.e, dOrbit);
  const M = kwOrbitalValue(KW_SUN_ELEMENTS.M, dOrbit);
  const w = kwOrbitalValue(KW_SUN_ELEMENTS.w, dOrbit);
  const E = kwSolveKepler(M, e);
  const xv = Math.cos(E) - e;
  const yv = Math.sqrt(1-e*e) * Math.sin(E);
  const v = kwToDeg(Math.atan2(yv, xv));
  const r = Math.sqrt(xv*xv + yv*yv);
  const lonSun = kwToRad(kwNorm360(v + w));
  return { x: r*Math.cos(lonSun), y: r*Math.sin(lonSun) };
}

function kwPlanetPosition(key, date, latDeg, lonDeg){
  const el = KW_PLANET_ELEMENTS[key];
  const dOrbit = kwJulianDay(date) - 2451543.5;
  const d = kwJulianDay(date) - 2451545.0; // wie bei Sonne/Mond, für Sternzeit/Schiefe der Ekliptik
  const N = kwOrbitalValue(el.N, dOrbit), i = kwOrbitalValue(el.i, dOrbit), w = kwOrbitalValue(el.w, dOrbit);
  const e = kwOrbitalValue(el.e, dOrbit), M = kwOrbitalValue(el.M, dOrbit);
  const E = kwSolveKepler(M, e);
  const xv = el.a*(Math.cos(E) - e);
  const yv = el.a*(Math.sqrt(1-e*e) * Math.sin(E));
  const v = kwToDeg(Math.atan2(yv, xv));
  const r = Math.sqrt(xv*xv + yv*yv);
  const NR = kwToRad(N), iR = kwToRad(i), vwR = kwToRad(v + w);
  const xh = r*(Math.cos(NR)*Math.cos(vwR) - Math.sin(NR)*Math.sin(vwR)*Math.cos(iR));
  const yh = r*(Math.sin(NR)*Math.cos(vwR) + Math.cos(NR)*Math.sin(vwR)*Math.cos(iR));
  const zh = r*(Math.sin(vwR)*Math.sin(iR));
  const sunXY = kwSunXY(dOrbit);
  const xg = xh + sunXY.x, yg = yh + sunXY.y, zg = zh;
  const eps = kwToRad(23.439 - 0.0000004*d);
  const xe = xg, ye = yg*Math.cos(eps) - zg*Math.sin(eps), ze = yg*Math.sin(eps) + zg*Math.cos(eps);
  const RA = kwNorm360(kwToDeg(Math.atan2(ye, xe)));
  const dec = kwToDeg(Math.atan2(ze, Math.sqrt(xe*xe+ye*ye)));
  const dist = Math.sqrt(xg*xg + yg*yg + zg*zg); // Erdabstand in AE
  const GMST = kwNorm360(280.46061837 + 360.98564736629*d);
  const LST = kwNorm360(GMST + lonDeg);
  let H = kwNorm360(LST - RA); if (H > 180) H -= 360;
  const latR = kwToRad(latDeg), decR = kwToRad(dec), HR = kwToRad(H);
  const alt = kwToDeg(Math.asin(Math.sin(decR)*Math.sin(latR) + Math.cos(decR)*Math.cos(latR)*Math.cos(HR)));
  const az = kwNorm360(kwToDeg(Math.atan2(-Math.sin(HR), Math.tan(decR)*Math.cos(latR) - Math.sin(latR)*Math.cos(HR))));
  return { alt, az, dist };
}

/* Polarstern: nahezu fixe Himmelsposition (J2000-Koordinaten), Eigenbewegung/Präzession
   über die Nutzungsdauer der App vernachlässigbar bei dieser Genauigkeitsklasse. */
function kwPolarisPosition(date, latDeg, lonDeg){
  const d = kwJulianDay(date) - 2451545.0;
  const RA = 37.9546, dec = 89.2641;
  const GMST = kwNorm360(280.46061837 + 360.98564736629*d);
  const LST = kwNorm360(GMST + lonDeg);
  let H = kwNorm360(LST - RA); if (H > 180) H -= 360;
  const latR = kwToRad(latDeg), decR = kwToRad(dec), HR = kwToRad(H);
  const alt = kwToDeg(Math.asin(Math.sin(decR)*Math.sin(latR) + Math.cos(decR)*Math.cos(latR)*Math.cos(HR)));
  const az = kwNorm360(kwToDeg(Math.atan2(-Math.sin(HR), Math.tan(decR)*Math.cos(latR) - Math.sin(latR)*Math.cos(HR))));
  return { alt, az };
}

const KW_SKY_OBJECTS = [
  { key: "venus",   label: "Venus",   icon: "⚪" },
  { key: "mars",    label: "Mars",    icon: "🔴" },
  { key: "jupiter", label: "Jupiter", icon: "🟠" },
  { key: "saturn",  label: "Saturn",  icon: "🪐" },
];

/* ===================== Zustand ===================== */
const kwState = {
  lat: null, lon: null, locationName: "Standort wird ermittelt …", locationMode: "auto",
  heading: null, headingMagnetic: null, headingAvailable: false, pitch: 0,
  declination: null,
  camOn: false, camStream: null,
  page: "kompass",
  pois: [], poisAll: [], poiTypesSelected: new Set(),
  poiRadius: 1500,
  waypoints: [],
  hud: null, hudFetchedAt: 0,
  clusteredPoiKeys: new Set(),
};

const KW_POI_RADII = [500, 1000, 1500, 3000, 5000];

const KW_POI_TYPES = [
  { id: "viewpoint", label: "🌄 Aussichtspunkt", query: 'node["tourism"="viewpoint"]', group: "Natur & Ruhe" },
  { id: "park", label: "🌳 Park", query: 'way["leisure"="park"]["access"!="private"]', group: "Natur & Ruhe" },
  { id: "beach", label: "🏖️ Strand/Seeufer", query: ['node["natural"="beach"]', 'way["natural"="beach"]'], group: "Natur & Ruhe" },
  { id: "naturereserve", label: "🌲 Naturschutzgebiet", query: 'way["leisure"="nature_reserve"]', group: "Natur & Ruhe" },
  { id: "orchard", label: "🌾 Streuobstwiese", query: 'way["landuse"="orchard"]', group: "Natur & Ruhe" },
  { id: "cafe", label: "☕ Café", query: 'node["amenity"="cafe"]', group: "Essen & Trinken" },
  { id: "icecream", label: "🍦 Eisdiele", query: 'node["amenity"="ice_cream"]', group: "Essen & Trinken" },
  { id: "restaurant", label: "🍽️ Restaurant", query: 'node["amenity"="restaurant"]', group: "Essen & Trinken" },
  { id: "bakery", label: "🥐 Bäckerei", query: 'node["shop"="bakery"]', group: "Essen & Trinken" },
  { id: "supermarket", label: "🛒 Supermarkt", query: 'node["shop"="supermarket"]', group: "Einkaufen" },
  { id: "pharmacy", label: "💊 Apotheke", query: 'node["amenity"="pharmacy"]', group: "Einkaufen" },
  { id: "bank", label: "🏦 Bank", query: 'node["amenity"="bank"]', group: "Einkaufen" },
  { id: "marketplace", label: "🧺 Wochenmarkt", query: 'node["amenity"="marketplace"]', group: "Einkaufen" },
  { id: "farmshop", label: "🌻 Hofladen", query: 'node["shop"="farm"]', group: "Einkaufen" },
  { id: "fuel", label: "⛽ Tankstelle", query: 'node["amenity"="fuel"]', group: "Mobilität" },
  { id: "parking", label: "🅿️ Parkplatz", query: 'node["amenity"="parking"]', group: "Mobilität" },
  { id: "station", label: "🚆 Bahnhof", query: 'node["railway"="station"]', group: "Mobilität" },
  { id: "transit", label: "🚏 Haltestelle", query: 'node["highway"="bus_stop"]', group: "Mobilität" },
  { id: "hospital", label: "🏥 Krankenhaus", query: 'node["amenity"="hospital"]', group: "Gesundheit" },
  { id: "attraction", label: "🎡 Sehenswürdigkeit", query: 'node["tourism"="attraction"]', group: "Freizeit & Kultur" },
  { id: "worship", label: "⛪ Kirche", query: 'node["amenity"="place_of_worship"]', group: "Freizeit & Kultur" },
  { id: "theatre", label: "🎭 Theater", query: 'node["amenity"="theatre"]', group: "Freizeit & Kultur" },
  { id: "museum", label: "🏛️ Museum", query: 'node["tourism"="museum"]', group: "Freizeit & Kultur" },
  { id: "zoo", label: "🦁 Tierpark", query: 'way["tourism"="zoo"]', group: "Freizeit & Kultur" },
  { id: "themepark", label: "🎢 Freizeitpark", query: 'way["tourism"="theme_park"]', group: "Freizeit & Kultur" },
  { id: "hotel", label: "🏨 Hotel", query: 'node["tourism"="hotel"]', group: "Übernachtung" },
];
const KW_POI_GROUPS = ["Natur & Ruhe", "Essen & Trinken", "Einkaufen", "Mobilität", "Gesundheit", "Freizeit & Kultur", "Übernachtung"];
const KW_POI_TYPE_IDS = new Set(KW_POI_TYPES.map(t => t.id));
// Ortstyp-Auswahl wird jetzt lokal gemerkt (siehe kwLoadPoiTypes/kwSavePoiTypes) – beim allerersten
// App-Start (noch kein gespeicherter Wert) sind alle Themengebiete zunächst abgewählt.

/* ===================== Initialisierung ===================== */
document.addEventListener("DOMContentLoaded", () => {
  kwApplyTheme();
  document.getElementById("kw-theme-btn").addEventListener("click", kwToggleTheme);

  kwLoadDeclination();
  kwSetupDeclinationInput();

  kwLoadWaypoints();
  kwRenderWaypoints();
  kwLoadPoiTypes();
  kwRenderPoiFilters();
  const savedRadius = parseInt(localStorage.getItem("kw-poi-radius"), 10);
  if (KW_POI_RADII.includes(savedRadius)) kwState.poiRadius = savedRadius;
  kwRenderPoiRadius();

  kwSetupNav();
  kwSetupOnboarding();
  kwSetupLocationOverlay();
  kwSetupCompass();
  kwSetupCamera();
  kwSetupAR();

  document.getElementById("kw-poi-search").addEventListener("click", kwSearchPOIs);
  document.getElementById("kw-poi-reset").addEventListener("click", kwResetPoiFilters);
  document.getElementById("kw-wp-add").addEventListener("click", kwAddWaypoint);

  kwInitLocation();

  if (navigator.serviceWorker) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
});

/* ===================== Theme ===================== */
function kwApplyTheme(){
  document.documentElement.setAttribute("data-theme", "light");
}
function kwToggleTheme(){
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
}

/* ===================== Onboarding ===================== */
function kwSetupOnboarding(){
  const seen = localStorage.getItem("kw-onboarding-seen");
  const overlay = document.getElementById("kw-onboarding");
  if (seen) { overlay.classList.add("kw-hidden"); return; }

  const slides = Array.from(document.querySelectorAll(".kw-onb-slide"));
  const dotsWrap = document.getElementById("kw-onb-dots");
  slides.forEach((_, i) => {
    const dot = document.createElement("span");
    if (i === 0) dot.classList.add("kw-dot-active");
    dotsWrap.appendChild(dot);
  });
  let idx = 0;
  function show(i){
    slides.forEach((s, j) => s.classList.toggle("kw-onb-active", j === i));
    Array.from(dotsWrap.children).forEach((d, j) => d.classList.toggle("kw-dot-active", j === i));
    document.getElementById("kw-onb-next").textContent = (i === slides.length - 1) ? "Los geht's" : "Weiter";
  }
  document.getElementById("kw-onb-next").addEventListener("click", () => {
    if (idx < slides.length - 1) { idx++; show(idx); }
    else { overlay.classList.add("kw-hidden"); localStorage.setItem("kw-onboarding-seen", "1"); }
  });
  document.getElementById("kw-onb-skip").addEventListener("click", () => {
    overlay.classList.add("kw-hidden");
    localStorage.setItem("kw-onboarding-seen", "1");
  });
}

/* ===================== Navigation ===================== */
function kwSetupNav(){
  document.querySelectorAll(".kw-pill").forEach(btn => {
    btn.addEventListener("click", () => kwShowPage(btn.dataset.page));
  });
  document.querySelectorAll(".kw-start-tile").forEach(btn => {
    btn.addEventListener("click", () => kwShowPage(btn.dataset.page));
  });
}
function kwShowPage(name){
  kwState.page = name;
  document.querySelectorAll(".kw-page").forEach(p => p.classList.remove("kw-page-active"));
  document.getElementById("kw-page-" + name).classList.add("kw-page-active");
  document.querySelectorAll(".kw-pill").forEach(p => p.classList.toggle("kw-pill-active", p.dataset.page === name));
  document.body.classList.toggle("kw-fullpage", name === "kompass");
  if (name === "umfeld") kwLoadUmfeld();
}

/* ===================== Standort ===================== */
function kwInitLocation(){
  const mode = localStorage.getItem("kw-location-mode") || "auto";
  kwState.locationMode = mode;
  if (mode === "manual") {
    try {
      const saved = JSON.parse(localStorage.getItem("kw-manual-location"));
      if (saved) { kwSetLocation(saved.lat, saved.lon, saved.name); return; }
    } catch (e) {}
  }
  kwRequestGPSLocation();
}
function kwRequestGPSLocation(attempt){
  attempt = attempt || 1;
  if (!navigator.geolocation) { kwSetLocationName("Standort nicht verfügbar"); return; }
  if (attempt === 1) kwSetLocationName("Standort wird ermittelt …");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      kwState.locationMode = "auto";
      localStorage.setItem("kw-location-mode", "auto");
      const status = document.getElementById("kw-compass-status");
      if (status) status.innerHTML = "";
      kwSetLocation(pos.coords.latitude, pos.coords.longitude, null);
      kwReverseGeocode(pos.coords.latitude, pos.coords.longitude);
    },
    () => {
      // Die Ortung schlägt gelegentlich beim ersten Versuch fehl (z. B. GPS noch nicht
      // "warm") – bis zu zwei automatische Wiederholungen, dann Hinweis mit Retry-Button
      if (attempt < 3) {
        setTimeout(() => kwRequestGPSLocation(attempt + 1), 1200);
      } else {
        kwSetLocationName("Standort nicht verfügbar – bitte Zugriff erlauben");
        const status = document.getElementById("kw-compass-status");
        if (status) {
          status.innerHTML = "";
          const retryBtn = document.createElement("button");
          retryBtn.className = "kw-btn kw-btn-ghost";
          retryBtn.textContent = "📍 Standort erneut versuchen";
          retryBtn.addEventListener("click", () => kwRequestGPSLocation(1));
          status.appendChild(retryBtn);
        }
      }
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}
function kwSetLocation(lat, lon, name){
  kwState.lat = lat; kwState.lon = lon;
  if (name) kwState.locationName = name;
  kwSetLocationName(kwState.locationName);
  if (kwState.page === "umfeld") kwLoadUmfeld();
  kwUpdateHudBottom();
}
function kwSetLocationName(name){
  kwState.locationName = name;
  document.getElementById("kw-location-name").textContent = name;
  kwRenderHudBottom();
}
async function kwReverseGeocode(lat, lon){
  if (!kwAskOnce("kw-consent-nominatim-reverse", "Automatische Ortsnamen-Ermittlung via OpenStreetMap Nominatim nutzen? Dein aktueller Standort (Koordinaten) wird dafür bei jeder Standortbestimmung an nominatim.openstreetmap.org gesendet, damit statt Koordinaten ein lesbarer Ortsname angezeigt werden kann.")) {
    kwSetLocationName("Standort ermittelt");
    return;
  }
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14`);
    const data = await res.json();
    const a = data.address || {};
    const ort = a.village || a.town || a.city || a.municipality || a.county || "";
    const teil = a.suburb || a.city_district || a.neighbourhood || "";
    const name = [teil, ort].filter(Boolean).join(", ") || data.display_name || "Standort";
    kwSetLocationName(name);
  } catch (e) {
    kwSetLocationName("Standort ermittelt");
  }
}

function kwSetupLocationOverlay(){
  const overlay = document.getElementById("kw-location-overlay");
  document.getElementById("kw-location-btn").addEventListener("click", () => overlay.classList.remove("kw-hidden"));
  document.getElementById("kw-location-close").addEventListener("click", () => overlay.classList.add("kw-hidden"));
  document.getElementById("kw-location-auto").addEventListener("click", () => {
    localStorage.removeItem("kw-manual-location");
    localStorage.setItem("kw-location-mode", "auto");
    kwSetLocationName("Standort wird ermittelt …");
    kwRequestGPSLocation();
    overlay.classList.add("kw-hidden");
  });

  function triggerSearch(){
    const q = document.getElementById("kw-location-search").value.trim();
    if (q.length < 3) { document.getElementById("kw-location-results").innerHTML = '<div class="kw-hint">Bitte mindestens 3 Zeichen eingeben</div>'; return; }
    kwSearchLocationText(q);
  }
  document.getElementById("kw-location-search-btn").addEventListener("click", triggerSearch);
  document.getElementById("kw-location-search").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); triggerSearch(); }
  });
}
async function kwSearchLocationText(q){
  const wrap = document.getElementById("kw-location-results");
  if (!kwAskOnce("kw-consent-nominatim", "Externe Ortssuche via OpenStreetMap Nominatim nutzen? Der eingegebene Text wird dafür an nominatim.openstreetmap.org gesendet.")) return;
  wrap.innerHTML = '<div class="kw-hint">Suche …</div>';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=6&accept-language=de`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const list = await res.json();
    wrap.innerHTML = "";
    if (!list.length) { wrap.innerHTML = '<div class="kw-hint">Keine Treffer</div>'; return; }
    list.forEach(item => {
      const div = document.createElement("div");
      div.className = "kw-location-result";
      div.textContent = item.display_name;
      div.addEventListener("click", () => {
        const lat = parseFloat(item.lat), lon = parseFloat(item.lon);
        kwState.locationMode = "manual";
        localStorage.setItem("kw-location-mode", "manual");
        localStorage.setItem("kw-manual-location", JSON.stringify({ lat, lon, name: item.display_name.split(",").slice(0,2).join(",") }));
        kwSetLocation(lat, lon, item.display_name.split(",").slice(0,2).join(","));
        document.getElementById("kw-location-overlay").classList.add("kw-hidden");
      });
      wrap.appendChild(div);
    });
  } catch (e) {
    wrap.innerHTML = e.name === "AbortError" ? '<div class="kw-hint">Suche hat zu lange gedauert (Timeout) – bitte nochmal versuchen</div>' : '<div class="kw-hint">Suche nicht möglich</div>';
  }
}

/* ===================== Missweisung (Deklination) =====================
   Der Kompass des Handys liefert eine auf das Magnetfeld bezogene Richtung
   ("magnetisch Nord"), während Sonne/Mond/Orte hier astronomisch/geografisch
   berechnet werden ("geografisch Nord"). Der Unterschied (Missweisung) liegt
   in Deutschland aktuell bei wenigen Grad, ändert sich aber je nach Ort und
   über die Jahre langsam. Statt hier einen festen Wert zu raten, kann er
   einmalig eingetragen werden (z. B. über die NOAA-Seite nachgeschlagen) und
   wird danach lokal gespeichert und automatisch auf die Kompassanzeige
   angewendet. Ohne Eingabe bleibt die Anzeige unverändert (Missweisung 0°). */
function kwLoadDeclination(){
  const raw = localStorage.getItem("kw-declination");
  const val = raw !== null ? parseFloat(raw) : NaN;
  kwState.declination = isNaN(val) ? null : val;
  const input = document.getElementById("kw-decl-input");
  const status = document.getElementById("kw-decl-status");
  if (kwState.declination !== null) {
    if (input) input.value = kwState.declination;
    if (status) status.textContent = `Aktiv: ${kwState.declination > 0 ? "+" : ""}${kwState.declination}° werden auf die Kompassrichtung angerechnet.`;
  }
}
function kwSetupDeclinationInput(){
  const input = document.getElementById("kw-decl-input");
  const status = document.getElementById("kw-decl-status");
  document.getElementById("kw-decl-save").addEventListener("click", () => {
    const raw = input.value.trim();
    if (raw === "") {
      kwState.declination = null;
      localStorage.removeItem("kw-declination");
      status.textContent = "Zurückgesetzt – keine Korrektur.";
      return;
    }
    const val = parseFloat(raw.replace(",", "."));
    if (isNaN(val) || val < -30 || val > 30) {
      status.textContent = "Bitte eine Zahl zwischen -30 und 30 eingeben.";
      return;
    }
    kwState.declination = val;
    localStorage.setItem("kw-declination", String(val));
    status.textContent = `Gespeichert: ${val > 0 ? "+" : ""}${val}° werden ab jetzt angerechnet.`;
  });
}

/* ===================== Kompass ===================== */
function kwSetupCompass(){
  const enableBtn = document.getElementById("kw-compass-enable");
  const status = document.getElementById("kw-compass-status");

  function start(){
    const handler = (e) => kwHandleOrientation(e);
    window.addEventListener("deviceorientationabsolute", handler, true);
    // Fallback nur verwenden, wenn nach kurzer Wartezeit kein absolutes Signal ankam
    let gotAbsolute = false;
    const markAbsolute = () => { gotAbsolute = true; };
    window.addEventListener("deviceorientationabsolute", markAbsolute, { once: true });
    setTimeout(() => {
      if (!gotAbsolute) window.addEventListener("deviceorientation", handler, true);
    }, 800);
    status.textContent = "";
  }

  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
    // iOS: Berechtigung nötig, per Button anstoßen
    enableBtn.classList.remove("kw-hidden");
    status.textContent = "Kompass benötigt deine Erlaubnis";
    enableBtn.addEventListener("click", () => {
      DeviceOrientationEvent.requestPermission().then(res => {
        if (res === "granted") { enableBtn.classList.add("kw-hidden"); start(); }
        else { status.textContent = "Kompasszugriff wurde nicht erlaubt"; }
      }).catch(() => { status.textContent = "Kompasszugriff nicht möglich"; });
    });
  } else if (window.DeviceOrientationEvent) {
    start();
  } else {
    status.textContent = "Dieses Gerät unterstützt keinen Kompass";
  }
}

function kwHandleOrientation(e){
  let heading = null;
  if (typeof e.webkitCompassHeading === "number") {
    heading = e.webkitCompassHeading; // iOS: bereits 0=Nord, im Uhrzeigersinn, kalibriert
  } else if (typeof e.alpha === "number" && (e.absolute === true || e.type === "deviceorientationabsolute")) {
    heading = kwNorm360(360 - e.alpha); // echte, nordbezogene Ausrichtung
  } else if (typeof e.alpha === "number") {
    heading = kwNorm360(360 - e.alpha); // Notlösung ohne garantierten Nordbezug
    document.getElementById("kw-compass-status").textContent = "Kompass evtl. ungenau (Gerät liefert keine kalibrierte Nordrichtung)";
  }
  // Vor-/Rückneigung (Pitch) des Geräts: beta ≈ 90° wenn das Handy senkrecht/aufrecht
  // gehalten wird (Kamera zeigt zum Horizont). Abweichung davon = Blickwinkel nach oben/unten.
  if (typeof e.beta === "number") {
    kwState.pitch = e.beta - 90;
  }
  if (heading === null || isNaN(heading)) return;
  kwState.headingMagnetic = heading;
  // Missweisung: dreht magnetisch Nord auf geografisch Nord, damit die
  // astronomisch berechneten Sonne-/Mond-/Ortsrichtungen zur Kompassnadel passen.
  heading = kwNorm360(heading + (kwState.declination || 0));
  kwState.heading = heading;
  kwState.headingAvailable = true;

  document.getElementById("kw-heading-deg").textContent = Math.round(heading) + "°";
  document.getElementById("kw-heading-card").textContent = kwCompassLabel(heading);

  kwUpdateHeadingTape(heading);
  // AR-Overlay bewusst gedrosselt neu aufbauen (statt bei jedem Sensor-Update,
  // das auf manchen Geräten 30-60×/s feuert) – reduziert unnötiges DOM-Rebuilding
  // und damit auch das Risiko, dass ein Tap genau in einen Neuaufbau fällt.
  const nowMs = performance.now();
  if (!kwState.lastARUpdate || nowMs - kwState.lastARUpdate > 100) {
    kwState.lastARUpdate = nowMs;
    kwUpdateAR(heading);
  }
}


/* ===================== Kamera ===================== */
function kwSetupCamera(){
  document.getElementById("kw-cam-enable").addEventListener("click", kwEnableCamera);
}
async function kwEnableCamera(){
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    kwState.camStream = stream;
    kwState.camOn = true;
    const video = document.getElementById("kw-cam-video");
    video.srcObject = stream;
    document.getElementById("kw-cam-off").classList.add("kw-hidden");
  } catch (e) {
    document.getElementById("kw-cam-off").querySelector("p").textContent = "Kamera nicht verfügbar oder Zugriff verweigert.";
  }
}
function kwDisableCamera(){
  if (kwState.camStream) kwState.camStream.getTracks().forEach(t => t.stop());
  kwState.camStream = null;
  kwState.camOn = false;
  document.getElementById("kw-cam-off").classList.remove("kw-hidden");
}

/* ===================== AR-Overlay ===================== */
const KW_AR_FOV = 70;   // angenommenes horizontales Sichtfeld in Grad für Ziel-Pins
const KW_AR_VFOV = 85;  // angenommenes vertikales Sichtfeld in Grad (Hochformat)
const KW_TAPE_FOV = 100; // Sichtfeld des oberen Peilstreifens in Grad

function kwUpdateHeadingTape(heading){
  const tape = document.getElementById("kw-heading-tape");
  tape.innerHTML = "";
  const cardinals = { 0: "N", 45: "NO", 90: "O", 135: "SO", 180: "S", 225: "SW", 270: "W", 315: "NW" };
  for (let deg = 0; deg < 360; deg += 15) {
    let rel = deg - heading;
    rel = ((rel + 180) % 360 + 360) % 360 - 180;
    if (Math.abs(rel) > KW_TAPE_FOV/2) continue;
    const leftPct = 50 + (rel / KW_TAPE_FOV) * 100;
    const el = document.createElement("div");
    const isCardinal = cardinals[deg] !== undefined;
    el.className = "kw-heading-tick" + (deg % 45 === 0 ? " kw-heading-tick-major" : "") + (isCardinal ? " kw-heading-tick-cardinal" : "");
    el.style.left = leftPct + "%";
    el.textContent = isCardinal ? cardinals[deg] : (deg % 45 === 0 ? String(deg) : "");
    tape.appendChild(el);
  }
}

/* Ein einziger, dauerhafter Klick-Listener auf dem AR-Layer selbst (per Event-
   Delegation): kwUpdateAR() leert und befüllt den Layer bei jedem Sensor-Update
   neu, ein Listener direkt an einer Sammel-Marke würde also sofort wieder
   verschwinden, bevor ein Tap überhaupt ankommt. */
function kwSetupAR(){
  const layer = document.getElementById("kw-ar-layer");
  if (!layer) return;
  // pointerup statt click: reagiert direkt auf den Touch und ist robuster,
  // wenn das Element unter dem Finger durch ein Sensor-Update kurz zuvor
  // neu aufgebaut wurde (das kann den synthetischen "click" auf iOS kosten).
  layer.addEventListener("pointerup", (e) => {
    const cluster = e.target.closest(".kw-ar-mark-cluster");
    if (cluster && cluster.dataset.jump) kwShowPage(cluster.dataset.jump);
  });
}

function kwUpdateAR(heading){
  const layer = document.getElementById("kw-ar-layer");
  layer.innerHTML = "";
  const marks = [];

  if (kwState.lat !== null) {
    const now = new Date();
    const sun = kwSunPosition(now, kwState.lat, kwState.lon);
    if (sun.alt > -6) marks.push({ az: sun.az, alt: sun.alt, label: "Sonne", icon: "☀️", kind: "kw-ar-sky" });
    const moon = kwMoonPosition(now, kwState.lat, kwState.lon);
    if (moon.alt > -6) marks.push({ az: moon.az, alt: moon.alt, label: "Mond", icon: "🌙", kind: "kw-ar-sky" });
    KW_SKY_OBJECTS.forEach(obj => {
      const p = kwPlanetPosition(obj.key, now, kwState.lat, kwState.lon);
      if (p.alt > 0) marks.push({ az: p.az, alt: p.alt, label: obj.label, icon: obj.icon, kind: "kw-ar-sky" });
    });
    const polaris = kwPolarisPosition(now, kwState.lat, kwState.lon);
    if (polaris.alt > 0) marks.push({ az: polaris.az, alt: polaris.alt, label: "Polarstern", icon: "⭐", kind: "kw-ar-sky" });

    // Wegpunkte und Orte liegen auf Bodenhöhe (keine Höhendaten verfügbar). Eine physikalisch
    // exakte Herleitung aus Augenhöhe/Entfernung ergäbe bei üblichen Distanzen (50–1500 m) nur
    // Bruchteile eines Grades – bei ~85° Sichtfeld optisch nicht wahrnehmbar. Stattdessen eine
    // bewusst verstärkte, nicht-physikalische Staffelung: nahe Marken unten im Bild, weit
    // entfernte nahe der Horizontlinie – Wurzelkurve, damit sich auch nahe Orte untereinander
    // noch sichtbar unterscheiden statt nur ganz am Bildrand.
    const KW_GROUND_ALT_NEAR = -34; // Grad, direkt am Nutzer (unterer Bildbereich)
    const KW_GROUND_ALT_FAR = -3;   // Grad, am Rand des Suchradius (nah der Horizontlinie)
    const kwGroundAlt = (dist) => {
      const maxDist = kwState.poiRadius || 1500;
      const t = Math.sqrt(Math.min(1, dist / maxDist));
      return KW_GROUND_ALT_NEAR + t * (KW_GROUND_ALT_FAR - KW_GROUND_ALT_NEAR);
    };

    kwState.waypoints.forEach(wp => {
      const az = kwBearing(kwState.lat, kwState.lon, wp.lat, wp.lon);
      const dist = kwHaversine(kwState.lat, kwState.lon, wp.lat, wp.lon);
      marks.push({ az, alt: kwGroundAlt(dist), dist, label: `${wp.name} · ${kwFormatDist(dist)}`, name: wp.name, icon: "📌", kind: "kw-ar-waypoint" });
    });

    // Nur die nächsten 10 Orte ins Bild projizieren – mehr wäre im Kamerabild ohnehin
    // nicht mehr sinnvoll lesbar, kwState.pois ist bereits nach Distanz sortiert.
    kwState.pois.slice(0, 10).forEach(p => {
      marks.push({ az: p.az, alt: kwGroundAlt(p.dist), dist: p.dist, label: `${p.name} · ${kwFormatDist(p.dist)}`, name: p.name, icon: "📍", kind: "kw-ar-poi", lat: p.lat, lon: p.lon });
    });
  }

  // Mini-Radar (360°-Übersicht, unabhängig vom aktuell sichtbaren Kamera-Ausschnitt)
  // separat aktualisieren – nutzt dieselben Boden-Marken, aber ungefiltert nach Sichtfeld.
  kwUpdateMiniRadar(heading, marks.filter(m => m.kind !== "kw-ar-sky"));

  const pitch = kwState.pitch || 0;
  const maxDist = kwState.poiRadius || 1500;

  // Schritt 1: alle Marken, die im Sichtfeld liegen, auf Bildschirmposition projizieren
  const projected = [];
  marks.forEach(m => {
    let relH = m.az - heading;
    relH = ((relH + 180) % 360 + 360) % 360 - 180;
    if (Math.abs(relH) > KW_AR_FOV/2) return;
    const relV = m.alt - pitch;
    if (Math.abs(relV) > KW_AR_VFOV/2) return;
    const leftPct = 50 + (relH / KW_AR_FOV) * 100;
    const topPct = 50 - (relV / KW_AR_VFOV) * 100;
    projected.push({ ...m, leftPct, topPct });
  });

  // Schritt 2: nahe beieinanderliegende Marken der gleichen Art (Himmel/Wegpunkt/Ort)
  // zu einer Sammel-Marke gruppieren, statt sie unlesbar übereinanderzulegen.
  // Sortierung nach Entfernung (bzw. Himmelsobjekte zuerst), damit die jeweils
  // nächstgelegene Marke die "Ankerposition" der Gruppe bestimmt.
  projected.sort((a, b) => (a.dist ?? -1) - (b.dist ?? -1));
  // Schwellwert für die Gruppierung: getrennt für horizontal/vertikal, da die
  // Marken als Textpille breit, aber flach sind – zwei Mittelpunkte können sich
  // schon deutlich mehr als eine kleine, kreisförmige Distanz unterscheiden und
  // trotzdem als Pillen sichtbar überlappen (Namenslänge variiert stark).
  const KW_CLUSTER_H_PCT = 17; // horizontal, in % der Bildbreite
  const KW_CLUSTER_V_PCT = 7;  // vertikal, in % der Bildhöhe
  const groups = [];
  projected.forEach(m => {
    const group = groups.find(g =>
      g.kind === m.kind &&
      Math.abs(g.leftPct - m.leftPct) < KW_CLUSTER_H_PCT &&
      Math.abs(g.topPct - m.topPct) < KW_CLUSTER_V_PCT
    );
    if (group) group.items.push(m);
    else groups.push({ kind: m.kind, leftPct: m.leftPct, topPct: m.topPct, items: [m] });
  });

  groups.forEach(g => {
    const anchor = g.items[0];
    const el = document.createElement("div");
    el.style.left = g.leftPct + "%";
    el.style.top = g.topPct + "%";

    if (g.items.length === 1) {
      el.className = "kw-ar-mark " + (g.kind || "");
      if (typeof anchor.dist === "number") {
        const t = Math.min(1, anchor.dist / maxDist);
        el.style.transform = `translate(-50%, -50%) scale(${(1.1 - t*0.4).toFixed(2)})`;
        el.style.opacity = (1 - t*0.5).toFixed(2);
      }
      el.innerHTML = `<span class="kw-ar-dot">${anchor.icon}</span>${kwEsc(anchor.label)}`;
    } else {
      // Sammel-Marke: zeigt Anzahl + die nächsten zwei Namen. Tap-Ziel wird nur als
      // data-Attribut hinterlegt – der eigentliche Klick wird zentral per Event-Delegation
      // auf dem (nie neu erzeugten) Layer-Element abgefangen, siehe kwSetupAR().
      el.className = "kw-ar-mark kw-ar-mark-cluster " + (g.kind || "");
      const names = g.items.slice(0, 2).map(m => m.name || m.label.split(" · ")[0]).join(", ");
      const more = g.items.length > 2 ? ` +${g.items.length - 2}` : "";
      el.innerHTML = `<span class="kw-ar-dot">${anchor.icon}</span>${g.items.length} Ziele: ${kwEsc(names)}${kwEsc(more)}`;
      el.dataset.jump = g.kind === "kw-ar-waypoint" ? "wegpunkte" : "orte";
    }
    layer.appendChild(el);
  });

  // Merken, welche Orte gerade Teil einer Sammel-Marke sind, damit die
  // Orte-Übersicht sie farblich kennzeichnen kann.
  kwState.clusteredPoiKeys = new Set();
  groups.forEach(g => {
    if (g.kind === "kw-ar-poi" && g.items.length > 1) {
      g.items.forEach(m => {
        if (typeof m.lat === "number") kwState.clusteredPoiKeys.add(m.lat.toFixed(5) + "," + m.lon.toFixed(5));
      });
    }
  });
  kwHighlightClusteredPois();
}

/* Kleines, "nordoben" ausgerichtetes Mini-Radar am Bildrand: zeigt Wegpunkte und Orte
   über den vollen 360°-Kreis (nicht nur den schmalen Kamera-Ausschnitt), damit auch
   erkennbar ist, was gerade außerhalb des Blickfelds bzw. hinter einem liegt. Die rote
   Nadel dreht sich mit der aktuellen Blickrichtung, Norden bleibt dabei immer oben fix. */
function kwUpdateMiniRadar(heading, groundMarks){
  const needle = document.getElementById("kw-mini-radar-needle");
  if (needle) needle.style.transform = `translate(-50%, -100%) rotate(${heading}deg)`;

  const dotsWrap = document.getElementById("kw-mini-radar-dots");
  if (!dotsWrap) return;
  dotsWrap.innerHTML = "";
  if (kwState.lat === null) return;

  const maxDist = kwState.poiRadius || 1500;
  const KW_RADAR_MIN_PCT = 14, KW_RADAR_MAX_PCT = 40;
  groundMarks.forEach(m => {
    const t = Math.min(1, (m.dist || 0) / maxDist);
    const r = KW_RADAR_MIN_PCT + t * (KW_RADAR_MAX_PCT - KW_RADAR_MIN_PCT);
    const angleRad = kwToRad(m.az);
    const dot = document.createElement("div");
    dot.className = "kw-mini-radar-dot " + (m.kind === "kw-ar-waypoint" ? "kw-mini-radar-dot-wp" : "kw-mini-radar-dot-poi");
    dot.style.left = (50 + r * Math.sin(angleRad)) + "%";
    dot.style.top = (50 - r * Math.cos(angleRad)) + "%";
    dotsWrap.appendChild(dot);
  });
}

/* Markiert in der bereits gerenderten Orte-Liste jene Einträge farblich, die
   aktuell (laut letztem AR-Update) Teil einer Sammel-Marke sind. Baut die
   Liste dafür nicht neu auf, sondern schaltet nur die CSS-Klasse um. */
function kwHighlightClusteredPois(){
  const listEl = document.getElementById("kw-poi-list");
  if (!listEl) return;
  const keys = kwState.clusteredPoiKeys || new Set();
  listEl.querySelectorAll(".kw-poi-item").forEach(el => {
    const key = el.dataset.lat + "," + el.dataset.lon;
    el.classList.toggle("kw-poi-item-clustered", keys.has(key));
  });
}

/* ===================== Info-Leiste im Kamerabild (HUD) ===================== */
async function kwUpdateHudBottom(){
  if (kwState.lat === null) return;
  const lat = kwState.lat, lon = kwState.lon;
  const [wetter, luft, hoehe] = await Promise.allSettled([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&daily=sunset&timezone=auto`).then(r => r.json()),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi`).then(r => r.json()),
    fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`).then(r => r.json()),
  ]);

  kwState.hud = {
    tempC: (wetter.status === "fulfilled" && wetter.value.current) ? Math.round(wetter.value.current.temperature_2m) : null,
    sunsetIso: (wetter.status === "fulfilled" && wetter.value.daily) ? wetter.value.daily.sunset[0] : null,
    aqi: (luft.status === "fulfilled" && luft.value.current) ? luft.value.current.european_aqi : null,
    elevation: (hoehe.status === "fulfilled" && hoehe.value.elevation) ? Math.round(hoehe.value.elevation[0]) : null,
  };
  kwRenderHudBottom();
}

function kwRenderHudBottom(){
  const wrap = document.getElementById("kw-hud-bottom");
  if (!wrap) return;
  if (kwState.lat === null) { wrap.innerHTML = ""; return; }

  const chips = [];
  chips.push({ label: "Ort", value: kwState.locationName.split(",")[0] });

  // Sonnenstand ist eine reine Rechnung (keine API nötig) und daher immer sofort verfügbar
  const sunNow = kwSunPosition(new Date(), kwState.lat, kwState.lon);
  if (sunNow.alt > 0) chips.push({ label: "Sonnenstand", value: `${Math.round(sunNow.alt)}° ${kwCompassLabel(sunNow.az)}` });

  const h = kwState.hud;
  if (h) {
    if (h.sunsetIso) {
      const sunset = new Date(h.sunsetIso);
      const diffMin = Math.round((sunset - new Date()) / 60000);
      if (diffMin > 0 && diffMin < 24*60) {
        const hh = Math.floor(diffMin/60), mm = diffMin % 60;
        chips.push({ label: "Sonnenuntergang in", value: (hh > 0 ? hh + " Std " : "") + mm + " Min" });
      } else if (diffMin <= 0 && diffMin > -12*60) {
        // Sonnenuntergang liegt bereits hinter uns (z. B. abends) – Chip bleibt sichtbar
        // statt kommentarlos zu verschwinden, damit es nicht wie ein Fehler wirkt.
        chips.push({ label: "Sonne", value: "bereits untergegangen" });
      }
    }
    if (h.tempC !== null) chips.push({ label: "Temperatur", value: h.tempC + "°C" });
    if (h.aqi !== null) {
      let label = "gut";
      if (h.aqi > 80) label = "sehr schlecht"; else if (h.aqi > 40) label = "mäßig";
      chips.push({ label: "Luftqualität", value: label });
    }
    if (h.elevation !== null) chips.push({ label: "Höhe ü. NN", value: h.elevation + " m" });
  }

  chips.push({ label: "Koordinaten", value: `${kwState.lat.toFixed(3)}, ${kwState.lon.toFixed(3)}` });

  if (kwState.waypoints.length) {
    let nearest = null, nearestDist = Infinity;
    kwState.waypoints.forEach(wp => {
      const d = kwHaversine(kwState.lat, kwState.lon, wp.lat, wp.lon);
      if (d < nearestDist) { nearestDist = d; nearest = wp; }
    });
    if (nearest) chips.push({ label: "Nächster Wegpunkt", value: `${kwEsc(nearest.name)} · ${kwFormatDist(nearestDist)}` });
  }

  wrap.innerHTML = chips.slice(0, 6).map(c => `
    <div class="kw-hud-chip">
      <span class="kw-hud-chip-label">${kwEsc(c.label)}</span>
      <span class="kw-hud-chip-value">${c.value}</span>
    </div>`).join("");
}

/* ===================== Umfeld ===================== */
async function kwLoadUmfeld(){
  const content = document.getElementById("kw-umfeld-content");
  if (kwState.lat === null) {
    content.innerHTML = '<div class="kw-hint">Standort wird benötigt – bitte oben erlauben oder auswählen.</div>';
    return;
  }
  content.innerHTML = '<div class="kw-card kw-skeleton"><div class="kw-shimmer"></div></div><div class="kw-card kw-skeleton"><div class="kw-shimmer"></div></div>';

  const lat = kwState.lat, lon = kwState.lon;
  const now = new Date();

  const [wetter, luft, hoehe] = await Promise.allSettled([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=sunrise,sunset&timezone=auto`).then(r => r.json()),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm2_5,pm10,uv_index`).then(r => r.json()),
    fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`).then(r => r.json()),
  ]);

  const sun = kwSunPosition(now, lat, lon);
  const moon = kwMoonPosition(now, lat, lon);
  const phase = kwMoonPhaseInfo(now);

  let html = "";

  html += `<div class="kw-card">
    <h3>📍 Standort</h3>
    <div class="kw-row"><span class="kw-row-label">Ort</span><span class="kw-row-value">${kwState.locationName}</span></div>
    <div class="kw-row"><span class="kw-row-label">Koordinaten</span><span class="kw-row-value">${lat.toFixed(4)}, ${lon.toFixed(4)}</span></div>
    ${hoehe.status === "fulfilled" && hoehe.value.elevation ? `<div class="kw-row"><span class="kw-row-label">Höhe über NN</span><span class="kw-row-value">${Math.round(hoehe.value.elevation[0])} m</span></div>` : ""}
  </div>`;

  if (wetter.status === "fulfilled" && wetter.value.current) {
    const c = wetter.value.current;
    html += `<div class="kw-card">
      <h3>🌤️ Wetter</h3>
      <div class="kw-tile-grid">
        <div class="kw-tile"><span class="kw-tile-label">Temperatur</span><span class="kw-tile-value">${Math.round(c.temperature_2m)}°C</span></div>
        <div class="kw-tile"><span class="kw-tile-label">Gefühlt</span><span class="kw-tile-value">${Math.round(c.apparent_temperature)}°C</span></div>
        <div class="kw-tile"><span class="kw-tile-label">Luftfeuchte</span><span class="kw-tile-value">${Math.round(c.relative_humidity_2m)}%</span></div>
        <div class="kw-tile"><span class="kw-tile-label">Wind</span><span class="kw-tile-value">${Math.round(c.wind_speed_10m)} km/h</span></div>
      </div>
    </div>`;
  }

  if (luft.status === "fulfilled" && luft.value.current) {
    const c = luft.value.current;
    const aqi = c.european_aqi;
    let dot = "kw-dot-gruen", txt = "gut";
    if (aqi > 80) { dot = "kw-dot-rot"; txt = "sehr schlecht"; }
    else if (aqi > 40) { dot = "kw-dot-gelb"; txt = "mäßig"; }
    html += `<div class="kw-card">
      <h3>🌬️ Luftqualität</h3>
      <div class="kw-ampel"><span class="kw-dot ${dot}"></span> ${txt} (EAQI ${Math.round(aqi)})</div>
      <div class="kw-tile-grid" style="margin-top:10px">
        <div class="kw-tile"><span class="kw-tile-label">PM2,5</span><span class="kw-tile-value">${c.pm2_5?.toFixed(1) ?? "–"} µg/m³</span></div>
        <div class="kw-tile"><span class="kw-tile-label">PM10</span><span class="kw-tile-value">${c.pm10?.toFixed(1) ?? "–"} µg/m³</span></div>
        <div class="kw-tile"><span class="kw-tile-label">UV-Index</span><span class="kw-tile-value">${c.uv_index?.toFixed(1) ?? "–"}</span></div>
      </div>
    </div>`;
  }

  const sunriseSet = (wetter.status === "fulfilled" && wetter.value.daily)
    ? `<div class="kw-row"><span class="kw-row-label">Sonnenaufgang</span><span class="kw-row-value">${wetter.value.daily.sunrise[0].slice(11,16)}</span></div>
       <div class="kw-row"><span class="kw-row-label">Sonnenuntergang</span><span class="kw-row-value">${wetter.value.daily.sunset[0].slice(11,16)}</span></div>`
    : "";

  html += `<div class="kw-card">
    <h3>☀️ Sonne & 🌙 Mond</h3>
    ${sunriseSet}
    <div class="kw-row"><span class="kw-row-label">Sonnenrichtung</span><span class="kw-row-value">${sun.alt > 0 ? Math.round(sun.az) + "° (" + kwCompassLabel(sun.az) + ")" : "unter dem Horizont"}</span></div>
    <div class="kw-row"><span class="kw-row-label">Mondrichtung</span><span class="kw-row-value">${moon.alt > 0 ? Math.round(moon.az) + "° (" + kwCompassLabel(moon.az) + ")" : "unter dem Horizont"}</span></div>
    <div class="kw-row"><span class="kw-row-label">Mondphase</span><span class="kw-row-value">${phase.name} (${Math.round(phase.illum*100)}%)</span></div>
    <p class="kw-attribution">Richtungen sind eine astronomische Näherung, keine amtliche Angabe.</p>
  </div>`;

  const planetRows = KW_SKY_OBJECTS.map(obj => {
    const p = kwPlanetPosition(obj.key, now, kwState.lat, kwState.lon);
    const dir = p.alt > 0 ? Math.round(p.az) + "° (" + kwCompassLabel(p.az) + ")" : "unter dem Horizont";
    return `<div class="kw-row"><span class="kw-row-label">${obj.icon} ${obj.label}</span><span class="kw-row-value">${dir}</span></div>`;
  }).join("");
  const polaris = kwPolarisPosition(now, kwState.lat, kwState.lon);
  const polarisDir = polaris.alt > 0 ? Math.round(polaris.az) + "° (" + kwCompassLabel(polaris.az) + ")" : "unter dem Horizont";
  html += `<div class="kw-card">
    <h3>🪐 Planeten &amp; ⭐ Polarstern</h3>
    ${planetRows}
    <div class="kw-row"><span class="kw-row-label">⭐ Polarstern</span><span class="kw-row-value">${polarisDir}</span></div>
    <p class="kw-attribution">Nur mit bloßem Auge sichtbar bei klarem Himmel und ausreichender Dunkelheit; Richtungen sind eine astronomische Näherung, keine amtliche Angabe.</p>
  </div>`;

  html += `<p class="kw-attribution">Wetter- &amp; Luftdaten: <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a> (CC BY 4.0) · Ortsname: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-Mitwirkende (ODbL)</p>`;

  content.innerHTML = html;
}

/* ===================== Orte (Overpass) ===================== */
function kwRenderPoiFilters(){
  const wrap = document.getElementById("kw-poi-filters");
  wrap.innerHTML = "";
  KW_POI_GROUPS.forEach(group => {
    const types = KW_POI_TYPES.filter(t => t.group === group);
    if (!types.length) return;
    const section = document.createElement("div");
    section.className = "kw-poi-group";
    const heading = document.createElement("div");
    heading.className = "kw-poi-group-title";
    heading.textContent = group;
    section.appendChild(heading);
    const row = document.createElement("div");
    row.className = "kw-poi-filters-row";
    types.forEach(t => {
      const btn = document.createElement("button");
      btn.className = "kw-poi-filter" + (kwState.poiTypesSelected.has(t.id) ? " kw-poi-filter-active" : "");
      btn.textContent = t.label;
      btn.addEventListener("click", () => {
        if (kwState.poiTypesSelected.has(t.id)) kwState.poiTypesSelected.delete(t.id);
        else kwState.poiTypesSelected.add(t.id);
        kwSavePoiTypes();
        kwRenderPoiFilters();
        kwApplyPoiFilter();
      });
      row.appendChild(btn);
    });
    section.appendChild(row);
    wrap.appendChild(section);
  });
}

/* Ortstyp-Auswahl wird lokal gemerkt und beim nächsten App-Start wiederhergestellt (nur gültige
   IDs übernehmen, falls sich die Kategorienliste seither geändert hat). */
function kwSavePoiTypes(){
  localStorage.setItem("kw-poitypes", JSON.stringify([...kwState.poiTypesSelected]));
}
function kwLoadPoiTypes(){
  try {
    const saved = JSON.parse(localStorage.getItem("kw-poitypes")) || [];
    saved.filter(id => KW_POI_TYPE_IDS.has(id)).forEach(id => kwState.poiTypesSelected.add(id));
  } catch (e) { /* ignorieren, Auswahl bleibt leer */ }
}

function kwResetPoiFilters(){
  kwState.poiTypesSelected.clear();
  kwSavePoiTypes();
  kwRenderPoiFilters();
  kwApplyPoiFilter();
}

/* Filtert die bereits geladenen Orte (poisAll) nach aktueller Auswahl,
   ohne neue Overpass-Anfrage – wirkt sofort auf Liste, HUD und Livebild */
function kwApplyPoiFilter(){
  kwState.pois = kwState.poisAll.filter(p => kwState.poiTypesSelected.has(p.type));
  const statusEl = document.getElementById("kw-poi-status");
  const listEl = document.getElementById("kw-poi-list");
  if (listEl) {
    listEl.innerHTML = "";
    kwState.pois.forEach(p => {
      const div = document.createElement("div");
      div.className = "kw-poi-item";
      div.dataset.lat = p.lat.toFixed(5);
      div.dataset.lon = p.lon.toFixed(5);
      div.innerHTML = `
        <div>
          <div class="kw-poi-item-name">${kwEsc(p.name)}</div>
          <div class="kw-poi-item-meta">${kwFormatDist(p.dist)} · ${kwCompassLabel(p.az)}</div>
        </div>
        <div class="kw-poi-item-actions">
          <a class="kw-maps-link" href="${kwMapsUrl(p.lat, p.lon, p.name)}" target="_blank" rel="noopener" aria-label="In Karten-App öffnen">🗺️</a>
          <div class="kw-poi-item-dir" style="transform:rotate(${p.az}deg)">↑</div>
        </div>
      `;
      listEl.appendChild(div);
    });
    kwHighlightClusteredPois();
  }
  if (statusEl && kwState.poisAll.length) {
    statusEl.textContent = kwState.pois.length ? `${kwState.pois.length} von ${kwState.poisAll.length} Orten sichtbar` : "Keine Orte für die aktuelle Auswahl";
  }
  kwRenderHudBottom();
}

function kwRenderPoiRadius(){
  const wrap = document.getElementById("kw-poi-radius");
  wrap.innerHTML = "";
  KW_POI_RADII.forEach(r => {
    const btn = document.createElement("button");
    btn.className = "kw-poi-filter" + (kwState.poiRadius === r ? " kw-poi-filter-active" : "");
    btn.textContent = r < 1000 ? `${r} m` : `${r/1000} km`;
    btn.addEventListener("click", () => {
      kwState.poiRadius = r;
      localStorage.setItem("kw-poi-radius", String(r));
      kwRenderPoiRadius();
    });
    wrap.appendChild(btn);
  });
}

async function kwSearchPOIs(){
  const statusEl = document.getElementById("kw-poi-status");
  const listEl = document.getElementById("kw-poi-list");
  if (kwState.lat === null) { statusEl.textContent = "Standort wird benötigt."; return; }
  if (!kwState.poiTypesSelected.size) { statusEl.textContent = "Bitte zuerst mindestens einen Ortstyp oben auswählen."; return; }
  if (!kwAskOnce("kw-consent-overpass", "Orte in der Nähe suchen? Dein Standort + Radius wird dafür an einen von mehreren Overpass-Servern gesendet (overpass-api.de oder Spiegelserver, OSM Community). Daten: © OpenStreetMap ODbL.")) return;

  statusEl.textContent = "Suche läuft … (kann bis zu 30 Sek dauern)";
  listEl.innerHTML = "";
  const radius = kwState.poiRadius;
  const lat = kwState.lat, lon = kwState.lon;
  const queryTypes = KW_POI_TYPES.filter(t => kwState.poiTypesSelected.has(t.id));
  // Jede Kategorie bekommt ihre eigene Overpass-Ausgabe mit eigenem Limit (statt eines
  // gemeinsamen Topfs für alle Kategorien). Sonst können häufige Kategorien wie
  // Haltestellen oder Parkplätze bei größerem Radius den gemeinsamen Deckel allein
  // füllen, bevor seltenere/weiter entfernte Kategorien überhaupt in der Antwort
  // landen – das Ergebnis wäre nicht "nichts gefunden", sondern von anderen Treffern
  // verdrängt, noch bevor die Entfernungssortierung im Code greift.
  // Es werden nur die aktuell ausgewählten Ortstypen abgefragt (kleinere, stabilere
  // Overpass-Anfrage statt immer aller 18 Kategorien).
  const query = `[out:json][timeout:25];`
    + queryTypes.map(t => {
        const parts = Array.isArray(t.query) ? t.query : [t.query];
        return parts.map(q => `${q}(around:${radius},${lat},${lon});out center 15;`).join("");
      }).join("");
  const mirrors = ["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter","https://overpass.osm.ch/api/interpreter","https://overpass.private.coffee/api/interpreter"];

  try {
    let data = null, lastErr = null;
    for (const mirror of mirrors) {
      // Pro Server 2 Versuche (kurzer erneuter Versuch bei Timeout/Fehler), bevor der nächste Server drankommt
      for (let attempt = 0; attempt < 2 && !data; attempt++) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 14000);
          const res = await fetch(mirror, {
            method: "POST",
            body: "data=" + encodeURIComponent(query),
            signal: ctrl.signal,
          });
          clearTimeout(timer);
          if (!res.ok) throw new Error("HTTP " + res.status);
          const j = await res.json();
          if (!j || !Array.isArray(j.elements)) throw new Error("Unerwartete Antwort");
          data = j;
        } catch (e) { lastErr = e; if (attempt === 0) await new Promise(r => setTimeout(r, 800)); }
      }
      if (data) break;
    }
    if (!data) throw lastErr || new Error("Alle Overpass-Server nicht erreichbar");
    const typeById = {};
    KW_POI_TYPES.forEach(t => { typeById[t.id] = t; });
    const rawItems = (data.elements || []).map(el => {
      const plat = el.lat ?? el.center?.lat;
      const plon = el.lon ?? el.center?.lon;
      const dist = kwHaversine(lat, lon, plat, plon);
      const az = kwBearing(lat, lon, plat, plon);
      const type = kwGuessPoiType(el);
      const hasName = !!el.tags?.name;
      return {
        name: el.tags?.name || (typeById[type]?.label.replace(/^\S+\s/, "") || "Ohne Namen"),
        hasName, lat: plat, lon: plon, dist, az, type,
      };
    }).sort((a,b) => a.dist - b.dist);

    const items = kwDedupePois(rawItems).slice(0, 40);

    kwState.poisAll = items;
    kwApplyPoiFilter();
  } catch (e) {
    statusEl.textContent = "Suche derzeit nicht möglich (alle Server überlastet oder ohne Antwort), bitte in 1-2 Minuten erneut versuchen.";
  }
}

/* Manche Orte (v.a. Haltestellen) liegen in OSM als mehrere Nodes vor
   (z. B. je eine pro Fahrtrichtung/Bahnsteig an derselben Haltestelle).
   Hier wird pro Kategorie zusammengefasst: gleicher Name → nur der nächstgelegene
   Treffer bleibt; namenlose Orte werden zusätzlich zusammengefasst, wenn sie
   näher als 40 m an einem bereits übernommenen Treffer derselben Kategorie liegen. */
function kwDedupePois(items){
  const kept = [];
  const seenNamed = new Set(); // "type|name"
  items.forEach(p => {
    if (p.hasName) {
      const key = p.type + "|" + p.name.trim().toLowerCase();
      if (seenNamed.has(key)) return;
      seenNamed.add(key);
      kept.push(p);
      return;
    }
    const tooClose = kept.some(k => k.type === p.type && !k.hasName && kwHaversine(k.lat, k.lon, p.lat, p.lon) < 40);
    if (tooClose) return;
    kept.push(p);
  });
  return kept;
}

/* Ordnet ein Overpass-Element anhand seiner Tags einer unserer Kategorien zu */
function kwGuessPoiType(el){
  const tags = el.tags || {};
  for (const t of KW_POI_TYPES) {
    const qStr = Array.isArray(t.query) ? t.query[0] : t.query;
    const m = qStr.match(/\["(\w+)"="([^"]+)"\]/);
    if (m && tags[m[1]] === m[2]) return t.id;
  }
  return "other";
}

/* ===================== Wegpunkte ===================== */
function kwLoadWaypoints(){
  try {
    kwState.waypoints = JSON.parse(localStorage.getItem("kw-waypoints")) || [];
  } catch (e) { kwState.waypoints = []; }
}
function kwSaveWaypoints(){
  localStorage.setItem("kw-waypoints", JSON.stringify(kwState.waypoints));
}
function kwAddWaypoint(){
  const nameInput = document.getElementById("kw-wp-name");
  const name = nameInput.value.trim() || "Wegpunkt";
  if (kwState.lat === null) { alert("Standort wird benötigt."); return; }
  kwState.waypoints.push({ id: Date.now(), name, lat: kwState.lat, lon: kwState.lon, ts: new Date().toISOString() });
  kwSaveWaypoints();
  nameInput.value = "";
  kwRenderWaypoints();
  kwRenderHudBottom();
}
function kwRenderWaypoints(){
  const wrap = document.getElementById("kw-wp-list");
  wrap.innerHTML = "";
  if (!kwState.waypoints.length) {
    wrap.innerHTML = '<div class="kw-hint">Noch keine Wegpunkte gemerkt.</div>';
    return;
  }
  kwState.waypoints.forEach(wp => {
    const div = document.createElement("div");
    div.className = "kw-wp-item";
    let meta = "gemerkt";
    if (kwState.lat !== null) {
      const dist = kwHaversine(kwState.lat, kwState.lon, wp.lat, wp.lon);
      const az = kwBearing(kwState.lat, kwState.lon, wp.lat, wp.lon);
      meta = `${kwFormatDist(dist)} · ${kwCompassLabel(az)}`;
    }
    div.innerHTML = `
      <div>
        <div class="kw-wp-item-name">📌 ${kwEsc(wp.name)}</div>
        <div class="kw-wp-item-meta">${meta}</div>
      </div>
      <a class="kw-maps-link" href="${kwMapsUrl(wp.lat, wp.lon, wp.name)}" target="_blank" rel="noopener" aria-label="In Karten-App öffnen">🗺️</a>
      <button class="kw-wp-del" data-id="${wp.id}" aria-label="Wegpunkt löschen">🗑️</button>
    `;
    div.querySelector(".kw-wp-del").addEventListener("click", () => {
      kwState.waypoints = kwState.waypoints.filter(w => w.id !== wp.id);
      kwSaveWaypoints();
      kwRenderWaypoints();
      kwRenderHudBottom();
    });
    wrap.appendChild(div);
  });
}
