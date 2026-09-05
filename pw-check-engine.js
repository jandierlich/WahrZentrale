// sw-check-engine.js — ProduktWahr
// Verbindet die E-Nummern-Engine (additive-engine.js) und die INCI-Datenbank
// (inci-database.js) zu einer gemeinsamen Prüfung. Jeder Treffer wird mit
// seiner Quelle/Themengebiet markiert ("zusatzstoff" oder "kosmetik"), damit
// im Ergebnis sichtbar ist, woher die Einstufung stammt.

var SW_CAT_LABELS_INCI = {
  hormone: "Hormonell wirksam", mikroplastik: "Mikroplastik", allergen: "Duftstoff-Allergen",
  konservierung: "Konservierungsstoff", tierisch: "Tierisch/nicht vegan", silikon: "Silikon/Mineralöl"
};

var SW_ADDITIV_DB = (typeof ENW_baueDatenbank === "function") ? ENW_baueDatenbank() : [];

function SW_normalize(s) {
  return (s || "").toLowerCase()
    .replace(/[äàáâ]/g, "a").replace(/ö/g, "o").replace(/[üùúû]/g, "u")
    .replace(/ß/g, "ss").replace(/[^a-z0-9]/g, "");
}

function SW_buildInciLookup() {
  var map = {};
  (typeof INCI_DB !== "undefined" ? INCI_DB : []).forEach(function(entry) {
    var names = [entry.n].concat(entry.a || []);
    names.forEach(function(nm) { map[SW_normalize(nm)] = entry; });
  });
  return map;
}
var SW_INCI_LOOKUP = SW_buildInciLookup();

function SW_findeInciTreffer(text) {
  var found = {}, order = [];
  var parts = (text || "").split(/[,;\n]+/).map(function(p) { return SW_normalize(p); }).filter(Boolean);
  parts.forEach(function(p) {
    if (SW_INCI_LOOKUP[p] && !found[SW_INCI_LOOKUP[p].n]) {
      found[SW_INCI_LOOKUP[p].n] = SW_INCI_LOOKUP[p];
      order.push(SW_INCI_LOOKUP[p].n);
    }
  });
  var norm = SW_normalize(text);
  (typeof INCI_DB !== "undefined" ? INCI_DB : []).forEach(function(entry) {
    if (found[entry.n]) return;
    var names = [entry.n].concat(entry.a || []);
    for (var i = 0; i < names.length; i++) {
      var needle = SW_normalize(names[i]);
      if (!needle) continue;
      var re = new RegExp("(^|[^a-z0-9])" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^a-z0-9])");
      if (re.test(" " + norm + " ")) { found[entry.n] = entry; order.push(entry.n); break; }
    }
  });
  return order.map(function(n) { return found[n]; });
}

// Führt Text gegen die Datenbank(en) sowie die Allergenliste.
// modus: "auto" (Standard, beide DBs) | "lebensmittel" (nur E-Nummern) | "kosmetik" (nur INCI)
// Der explizite Modus verhindert Fehltreffer durch Namensüberschneidungen
// zwischen beiden Welten (z.B. Zitronensäure = E330 UND INCI-Stoff).
function SW_pruefeText(text, modus) {
  var m = modus || "auto";
  var ergebnisse = [];
  var allergene = [];

  if (m === "auto" || m === "lebensmittel") {
    var enw = ENW_scanneText(text, SW_ADDITIV_DB);
    allergene = enw.allergene;
    enw.treffer.forEach(function(e) {
      ergebnisse.push({
        id: "e_" + e.code, name: e.name + " (" + e.code + ")", g: e.ampel,
        quelle: "zusatzstoff", quelleLabel: "Zusatzstoff", kategorie: e.klasse,
        kurztext: e.kurztext, detailtext: e.details, hinweis: e.hinweisGruppen,
        quellennote: e.quellennote
      });
    });
  }
  if (m === "auto" || m === "kosmetik") {
    var inci = SW_findeInciTreffer(text);
    if (m === "kosmetik") {
      // Im reinen Kosmetik-Modus zusätzlich lokal auf Allergene prüfen
      // (die Allergenliste selbst ist lebensmittelneutral formuliert).
      var zl = SW_normalize ? text.toLowerCase() : text.toLowerCase();
      allergene = ENW_ALLERGENE.filter(function(a) {
        return a.terms.some(function(t) { return ENW_wortAbgleich(zl, t); });
      }).map(function(a) { return a.name; });
    }
    inci.forEach(function(e) {
      ergebnisse.push({
        id: "i_" + e.n, name: e.n, g: e.g,
        quelle: "kosmetik", quelleLabel: "Kosmetik-Inhaltsstoff",
        kategorie: SW_CAT_LABELS_INCI[e.k] || e.k, kurztext: e.t, detailtext: e.t,
        hinweis: null, quellennote: "Quelle: eigene INCI-Einstufung auf Basis öffentlich zugänglicher Datenbanken (z. B. CosIng)."
      });
    });
  }

  return { treffer: ergebnisse, allergene: allergene, modus: m };
}
