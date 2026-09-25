# LautstärkeWahr – Der Lautstärke-Check

Progressive Web App (PWA) zum Live-Messen und Verstehen der aktuellen
Lautstärke über das Mikrofon. Läuft direkt im Browser, kann auf dem
iPhone-Homescreen installiert werden ("Zum Home-Bildschirm hinzufügen") und
funktioniert danach vollständig offline – es werden keinerlei externe
Ressourcen nachgeladen.

## Funktionen

- Live-Lautstärkemessung über das Mikrofon (Web Audio API), rein lokal im
  Browser berechnet – es wird nie Ton aufgenommen, gespeichert oder übertragen
- Große dB-Anzeige, farbiger Pegelbalken und Ampel-Einordnung
  (grün/gelb/rot: leise / moderat / laut)
- Scrollender Verlaufsgraph der letzten 60 Sekunden (Canvas)
- Spitzenwert-Anzeige (mit Reset), laufender Durchschnitt, Sitzungsdauer
- Expositions-Hinweis bei länger anhaltend lauten Pegeln (&gt; 85 dB) –
  allgemeine Orientierung, keine medizinische Beratung
- **Schwellenwert-Alarm**: frei einstellbare dB-Warnschwelle mit Ton- und
  Vibrationshinweis, sobald der Pegel überschritten wird
- Sitzungen mit **Orts-Tag** (Zuhause/Büro/Draußen/Verkehrsmittel/Sonstiges),
  optionaler Notiz und Favoriten-Markierung im Verlauf speicherbar
- Verlauf nach Ort/Favoriten filterbar über Filter-Chips
- **Export/Import**: Verlauf als Datei sichern (z. B. für ein neues iPhone) und
  wieder einlesen, inkl. Duplikat-Erkennung beim Zusammenführen
- **Wochen-Statistik**: Durchschnittspegel der aktuellen Woche im Vergleich
  zur Vorwoche, direkt aus dem Verlauf berechnet
- Referenztabelle typischer Lautstärken sowie ausführliche Ampel-Erklärung
- Onboarding beim allerersten Start, jederzeit über den Footer erneut abrufbar
- Normal- und Dunkelmodus (manuell umschaltbar)
- Impressum & Datenschutzerklärung als eigene Unterseiten

## Hosting auf GitHub Pages

1. Repo-Inhalt (dieser Ordner) 1:1 in ein GitHub-Repository pushen.
2. In den Repo-Einstellungen unter **Pages** den Branch (z. B. `main`) und den
   Ordner `/ (root)` als Quelle wählen.
3. Die App ist danach unter `https://<username>.github.io/<repo-name>/lw-index.html`
   erreichbar (bzw. über die Karte in der WahrZentrale-Startseite).

Alle Pfade in `lw-index.html` und `lw-manifest.json` sind bewusst relativ
(`./…`) gehalten, damit die App auch in einem Unterordner (z. B. bei GitHub
Pages) korrekt lädt.

## Hinweis zum Mikrofon-Zugriff

Der Mikrofon-Zugriff erfordert HTTPS (bei GitHub Pages automatisch gegeben)
und wird erst nach Tippen auf "Messung starten" angefragt, damit die
Berechtigungsanfrage direkt aus der Nutzer-Geste ausgelöst wird und iOS
Safari sie zuverlässig anzeigt. Details siehe `lw-datenschutz.html`.

## Rechtliches / Lizenz

Dieses Repository ist **kein Open-Source-Projekt**. Sofern nicht anders
vermerkt, liegen alle Rechte am Quellcode beim Autor (siehe
`lw-impressum.html`). Details siehe `lw-LICENSE.txt`.

LautstärkeWahr bindet bewusst keine Drittkomponenten oder CDN-Ressourcen ein
– dadurch entfällt jede Lizenzabhängigkeit von Drittanbietern.

**Wichtig, falls die App an Kunden verkauft/vertrieben werden soll:** Ein
öffentliches GitHub-Repository ist für jede/n einsehbar. Für den
kommerziellen Vertrieb empfiehlt sich entweder ein privates Repository
(GitHub Pro/Team, private Pages) oder ein separates Hosting (eigener
Webspace, Netlify/Vercel mit Zugriffsschutz o. ä.), damit der Quelltext nicht
frei kopierbar ist.
