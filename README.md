# WahrZentrale

Alle Wahr-Apps in **einer** Web-App (PWA) fürs iPhone – ein Design, ein
Standort, eine Sicherung, ein Impressum. Komplett lokal, ohne Konto, ohne
Werbung, ohne Tracking.

## Bereiche und Apps

| Bereich | Apps |
|---|---|
| Himmel | HimmelsWahr (`hw-`), Sternenhimmel (ZeitHimmel; `sternewahr-`, Symbol `zh-`), AstroWahr (`as-`), KompassWahr (`kw-`) |
| Unterwegs | NaviWahr (`wk-`), Keysglade (`kg-`), WowarWahr (`wow-`), BelegParkWahr (`bp-`) |
| Alltag | AlltagWahr (`aw-`), ProduktWahr (`pw-`), VorratsWahr (`vw-`), LosDenkWahr (`ld-`), QRWahr (`qr-`), LautstärkeWahr (`lw-`) |
| Spiel & Klang | ZahlenturmWahr (`zw-`), Korvanthiel (`kv-`), HerzKaroDrei (`hk-`), PartikelWahr (`pk-`), StrömungsWahr (`st-`), BeatWahr (`bw-`) |

`index.html` ist die Startseite mit „Heute“, Suche über alle Apps und
Einträge sowie den vier Bereichen.

## Gemeinsamer Kern

| Datei | Zweck |
|---|---|
| `wz-theme.js` | ein Hell-/Dunkel-Schalter für alles (Start immer hell), kein Zwei-Finger-Zoom |
| `wz-core.js` | ein Standort, eine Karten-Einwilligung, Heimknopf, Hinweis auf neue Version |
| `wz-unify.css` | ein Erscheinungsbild („Nachthimmel“-Palette) für alle Apps |
| `wz-common.css`, `wz-ui.js`, `wz-onboarding.js`, `wz-shared.js` | gemeinsame Bausteine |
| `wz-apps.js`, `wz-hub.js` | Verzeichnis der Apps, Startseite, Suche |
| `wz-sichern.html`, `wz-backup.js` | eine Sicherung aller Daten (ZIP) und Wiederherstellen |
| `wz-einstellungen.html` | Darstellung, Standort, Karten, Speicher, alles löschen |
| `wz-xlsx.js` | eigener Excel-Export (ersetzt SheetJS vom CDN) |
| `sw.js` | **ein** Service Worker für alles (offline); angemeldet nur in `wz-core.js` |
| `wz-onboarding.js` | eine einheitliche Einführung für alle Apps |
| `404.html` | Hinweisseite für unbekannte Adressen (GitHub Pages) |
| Sperre für fremde Server | Jede Seite trägt im Kopf dieselbe `Content-Security-Policy`: Der Browser lässt nur die eigene Adresse und die in `datenschutz.html` genannten Dienste zu. Kommt ein neuer Dienst hinzu, muss er in dieser Zeile **aller** HTML-Seiten ergänzt werden – sonst blockt der Browser ihn. |
| `impressum.html`, `datenschutz.html`, `lizenzen.html` | Rechtliches für alle Apps |

Alle Bibliotheken liegen lokal bei (`lib-*`): Leaflet, jsPDF, die Texterkennung
(Tesseract-Kern mit deutschen und englischen Sprachdaten) und die Barcode-Erkennung
(ZXing). Die großen Scan-Dateien werden erst beim ersten Scannen geladen – von
derselben Adresse, nicht von fremden Servern.

## Installation auf dem iPhone

1. Die Adresse der WahrZentrale in **Safari** öffnen.
2. Teilen-Symbol → **„Zum Home-Bildschirm“**.
3. Nur dieses eine Symbol verwenden – alle Apps teilen sich dann Speicher,
   Standort, Design und Sicherung.

## Gestaltung

- Kopf der Startseite zeigt den Himmel der Tageszeit (Tag, Abendrot, Dämmerung,
  Nacht mit Sternen), Sonne bzw. Mond in der echten Phase und die nächste Sonnenzeit –
  alles lokal berechnet, ohne Netz. Das Wetter erscheint dort nur nach Freigabe.
- „Weitermachen“ (zuletzt geöffnete App, `wz_recent`) und eine Favoriten-Leiste mit
  bis zu fünf Apps (`wz_home_favs`, Stern unter „Anordnen“).
- Themenbereiche als elegante Karten: Emblem, Titel, Kurzbeschreibung und ein zartes
  Ornament je Bereich (nur Systemschrift, keine Serifen).
- App-Kacheln mit feinen, detaillierten Symbolen (`FINE` in `wz-apps.js`, eigene
  Zeichnungen), Name und Beschreibung; jeder Bereich hat eine eigene Abstufung derselben
  Palette (Himmel nachtblau, Unterwegs violett, Alltag lavendel, Spiel & Klang tiefe Nacht).
- Die App-Bilder (`*-icon-192/512.png`) zeigen dieselben feinen Symbole in der Abstufung
  ihres Bereichs; sie erscheinen in den App-Köpfen, auf den Startbildschirmen der Spiele und
  in der Begrüßung der Einführung („Willkommen bei …“, `wz-onboarding.js`).
- Die Startseite öffnet immer oben (auch beim Zurückkehren aus einer App mit Sprungmarke).
- Hauptknöpfe in allen Apps kräftig violett mit weißer Schrift (`--wz-primary-bg`
  in `wz-unify.css`), Nebenknöpfe bleiben blass.
- Startseite anpassbar: Schriftgröße, Schriftfarbe, Farbstärke und Symbolfarbe
  (Paletten-Knopf neben „Anordnen“, `wz_home_style`); unter „Anordnen“ eigene Gruppen, Gruppe und
  Symbolfarbe je App (`wz_home_layout`). Alles lokal und in der Sicherung enthalten.

- Alle App-Symbole (`*-icon-192.png`, `*-icon-512.png`) sind aus denselben Liniengrafiken
  wie die Startseite erzeugt: weiße Linie auf dem Nachthimmel-Verlauf.
- Nur Systemschriften, keine Web-Schriften.
- Volle Bildschirmhöhe über `--wz-vh` (gemessen in `wz-theme.js`) statt `100vh`,
  damit auf dem iPhone unten keine Balken bleiben.

## Lizenz

Alle Rechte vorbehalten, siehe `LICENSE.txt` und `lizenzen.html`.
