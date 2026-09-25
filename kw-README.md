# KompassWahr

Kompass mit Kamera-Übersicht und Informationen zu deinem Umfeld – als
installierbare Web-App (PWA) fürs iPhone, komplett lokal, ohne Server,
ohne Tracking. Teil der WahrZentrale-App-Sammlung (Einstieg über
`index.html`).

## Funktionen
- Kompass mit Live-Kamerabild als Hintergrund und Peilstreifen (Grad-Skala)
  oben im Bild; funktioniert auch ohne Kamera-Freigabe (dann ohne Kamerabild)
- Ziel-Pins direkt im Kamerabild für Sonne, Mond, sichtbare Planeten,
  Polarstern, gespeicherte Orte und Wegpunkte, inkl. automatischer
  Clusterbildung bei mehreren nahen Zielen
- Mini-Radar: 360°-Übersicht über Orte/Wegpunkte unabhängig vom
  Kamera-Ausschnitt
- Sonnen-/Mondrichtung, Mondphase und Planetenpositionen werden mit
  eigenen, lokal ausgeführten astronomischen Näherungsformeln berechnet
  (keine externe Quelle)
- "Umfeld": Standort, Sonnenauf-/-untergang, Wetter, Luftqualität und
  Höhe über NN auf einen Blick (Open-Meteo)
- "Orte": Umkreissuche nach Themen (Natur, Essen & Trinken, Einkaufen,
  Mobilität, Gesundheit, Freizeit & Kultur, Übernachtung u. a.) über die
  Overpass API, mit automatischem Fallback auf mehrere OSM-Community-Server
- "Wegpunkte": eigene Orte wie "Auto" oder "Zeltplatz" merken – der
  Kompass zeigt jederzeit Richtung und Entfernung dorthin, komplett offline
- Standort automatisch per GPS oder manuell per Ortssuche wählbar
  (Nominatim/OpenStreetMap)
- Optionale Missweisung (Deklination) einstellbar, um magnetisch Nord
  (Kompass) und geografisch Nord (Sonne/Mond/Orte) in Deckung zu bringen
- Hell-/Dunkelmodus, Onboarding (4 Folien)

## Technische Basis
- Kein Server, keine Registrierung, keine Cloud – alles läuft lokal im
  Browser (PWA)
- Externe Datenquellen: Open-Meteo (Wetter/Luftqualität/Höhe), Nominatim
  und Overpass API (beide OpenStreetMap) – Details und Lizenzen siehe
  `kw-LICENSE.txt`

## Rechtsgrundlage
Details zu Standortverarbeitung, Kamera-Nutzung und den eingebundenen
Drittdiensten siehe `kw-impressum.html` und `kw-datenschutz.html`.
