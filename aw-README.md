# AlltagWahr

Behalte wiederkehrende Ausgaben – Abos, Versicherungen, Miete, Mitgliedschaften – im Blick. Als installierbare Web-App (PWA) fürs iPhone, komplett lokal, ohne Server, ohne Tracking. Teil der WahrZentrale-App-Sammlung (Einstieg über `index.html`).

## Funktionen

- Monatliche Gesamtbelastung + Jahreshochrechnung
- Kategorien-Übersicht als Donut-Chart (eigenes SVG, keine externe Bibliothek)
- „Kündigungs-Radar": warnt rechtzeitig vor auslaufenden Kündigungsfristen
- Einträge mit einem Tipp als „bezahlt" markieren → nächste Fälligkeit wird automatisch gesetzt
- Backup als JSON exportieren/importieren
- Optionale lokale Erinnerungen (Browser-Benachrichtigung beim Öffnen der App)
- Hell-/Dunkelmodus, einheitliches WahrZentrale-Farbschema (Violett/Navy, "Nachthimmel"-Look)
- Offline nutzbar dank Service Worker
- Alle Daten bleiben ausschließlich auf dem Gerät (`localStorage`) – keine Cloud, kein Backend, kein Tracking, keine externen Schriftarten/Skripte

## Struktur (innerhalb der WahrZentrale)

```
aw-index.html              App-Oberfläche
aw-style.css                Design (an WahrZentrale-Farbschema angepasst)
aw-app.js                   Gesamte App-Logik
aw-manifest.json            PWA-Manifest
aw-icon-192.png, aw-icon-512.png, aw-icon-512-dark.png,
aw-icon-180.png, aw-icon-1024.png, aw-apple-touch-icon.png,
aw-maskable-icon-512.png    App-Icons (im WahrZentrale-Look)
aw-logo-hub.png             Icon für die Kachel auf der WahrZentrale-Startseite
aw-impressum.html           Impressum
aw-datenschutz.html         Datenschutzerklärung
aw-LICENSE.txt              Lizenz für den eigenen Code (alle Rechte vorbehalten)
```

Die Einbindung in die Kachel-Übersicht erfolgt in der zentralen `index.html`
(Kachel „AlltagWahr") sowie im gemeinsamen `sw.js` der WahrZentrale (Precache-Liste).

## Installation auf dem iPhone

1. Die WahrZentrale-URL in **Safari** öffnen (wichtig: Safari, nicht Chrome – nur Safari kann PWAs auf dem iPhone installieren).
2. Über die WahrZentrale-Startseite die Kachel „AlltagWahr" öffnen, oder direkt `aw-index.html` aufrufen.
3. Auf das Teilen-Symbol tippen, **„Zum Home-Bildschirm"** wählen.
4. Die App erscheint danach wie eine normale App auf dem Homescreen, startet im Standalone-Modus (ohne Browserleiste) und funktioniert auch offline.

## Wichtiger Hinweis zu den Erinnerungen

Echte, vom Betriebssystem im Hintergrund zugestellte Push-Benachrichtigungen (auch wenn die App geschlossen ist) benötigen technisch einen Server, der die Push-Nachricht zum richtigen Zeitpunkt auslöst – das ist mit einer kostenlosen, rein statischen GitHub-Pages-Seite nicht umsetzbar. Die in dieser App eingebaute Erinnerungsfunktion zeigt Hinweise deshalb **beim Öffnen der App** an, wenn eine Zahlung oder Kündigungsfrist ansteht, nicht als Hintergrund-Push.

## Lizenz

Alle Rechte vorbehalten (siehe `aw-LICENSE.txt`). Es werden keine externen Bibliotheken oder Schriftarten eingebunden – keine zusätzlichen Lizenzbedingungen Dritter zu beachten.
