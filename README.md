# WahrZentrale

Sammlung eigenständiger Web-Apps (Progressive Web Apps) fürs iPhone – alle
im selben ruhigen "Nachthimmel"-Design, komplett lokal, ohne Konto, ohne
Werbung und ohne Tracking. `index.html` ist der gemeinsame Einstieg, von
dem aus jede App einzeln geöffnet oder auf den Homescreen installiert
werden kann.

## Apps

| App | Beschreibung |
|---|---|
| [ProduktWahr](pw-index.html) | Zusatzstoffe (E-Nummern), Kosmetik-Inhaltsstoffe (INCI) und Produktbewertungen per Barcode |
| [VorratsWahr](vw-index.html) | Foto-basiertes Vorrats-Inventar für Gläser und Behälter |
| [QRWahr](qr-index.html) | Unabhängiger QR-Code-Scanner |
| [KompassWahr](kw-index.html) | Kompass mit Kamera-Übersicht, Sonne/Mond/Sterne und Orten in der Umgebung |
| [LautstärkeWahr](lw-index.html) | Live-Lautstärke-Messung über das Mikrofon |
| [AlltagWahr](aw-index.html) | Wiederkehrende Ausgaben (Abos, Miete, Versicherungen) im Blick |

Zusätzlich enthält der Hub eine Seite [Hinweise](hinweise.html), die
erklärt, was die Ampel-Bewertung (rot/gelb/grün) in den Apps bedeutet.

## Prinzipien

- **Rein clientseitig:** Jede App läuft vollständig im Browser. Es gibt
  keinen eigenen Server, kein Konto und keine Datenübertragung an den
  Betreiber – alle Eingaben bleiben auf dem Gerät (`localStorage`).
- **Keine Werbung, kein Tracking:** Keine Analyse- oder Trackingdienste,
  keine Werbenetzwerke, keine Cookies.
- **Keine Google Fonts, keine externen Schriftarten:** Systemschriften
  überall.
- Wo eine App auf externe, quelloffene Bibliotheken (z. B. zur
  Texterkennung oder QR-/Barcode-Erkennung) oder offene Datenquellen
  (z. B. OpenStreetMap, Open-Meteo, Open Food Facts) zugreift, ist das in
  der jeweiligen `*-datenschutz.html` und `*-LICENSE.txt` einzeln
  aufgeführt.

## Struktur

Jede App ist ein eigenständiges Paket aus `<kürzel>-index.html`,
`<kürzel>-style.css`, `<kürzel>-app.js`, `<kürzel>-manifest.json`, Icons,
`<kürzel>-impressum.html` und `<kürzel>-datenschutz.html` (Kürzel: `pw`
ProduktWahr, `vw` VorratsWahr, `qr` QRWahr, `kw` KompassWahr, `lw`
LautstärkeWahr, `aw` AlltagWahr). Alle Apps sowie der Hub teilen sich
einen gemeinsamen Service Worker (`sw.js`) für die Offline-Nutzung, da
alle Dateien im selben Verzeichnis liegen.

## Installation auf dem iPhone

1. Die WahrZentrale-URL in **Safari** öffnen (wichtig: Safari, nicht
   Chrome – nur Safari kann PWAs auf dem iPhone installieren).
2. Über die Startseite die gewünschte App-Kachel öffnen, oder direkt die
   jeweilige `*-index.html` aufrufen.
3. Auf das Teilen-Symbol tippen, **„Zum Home-Bildschirm"** wählen.
4. Die App erscheint danach wie eine normale App auf dem Homescreen und
   funktioniert auch offline.

## Lizenz

Alle Rechte vorbehalten, siehe [`LICENSE.txt`](LICENSE.txt). Jede App hat
zusätzlich eine eigene, ausführlichere Lizenzdatei mit app-spezifischen
Details (u. a. eingebundene Drittkomponenten).
