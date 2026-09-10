# VorratsWahr

Foto-basiertes Vorrats-Inventar für Gläser und Behälter mit eigenem,
gedrucktem/getipptem Klebelabel — als eigenständige PWA für GitHub Pages,
technisch auf Basis von ProduktWahr (gleiche Texterkennungs-Technik),
aber ohne dessen Zusatzstoff-/Kosmetik-/Barcode-Funktionen.

## Funktionen
- Live-Scan (wie bei ProduktWahr): Kamera einfach auf das Label halten,
  Texterkennung läuft automatisch alle paar Sekunden im Hintergrund ohne
  Auslöser, Ergebnis-Pille am unteren Bildrand mit "Übernehmen ▸"
- Alternativ Einzelfoto-Scan (ein Auslöser) oder manuelle Eingabe ohne Foto
- Fotos dienen ausschließlich der Texterkennung im Moment des Scans und
  werden danach nicht gespeichert
- Überblick: durchsuchbare, nach Kategorie filterbare, alphabetisch
  sortierte und platzsparend dargestellte Liste aller Einträge, inkl.
  laufend aktualisierter Gesamtzahl im Abschnittstitel; ab 8 Einträgen
  zunächst eingeklappt mit "Alle anzeigen"
- Editierbare Anzahl je Eintrag (Stepper −/+ im Formular), in Übersicht
  und PDF-Export als "N×" vor dem Namen sichtbar (nur wenn N > 1)
- "Formular leeren"-Button setzt alle Felder eines noch nicht
  gespeicherten Eintrags zurück (z. B. bei missglücktem OCR-Ergebnis)
- Kategorien sind frei vom Nutzer wählbar (kein Vorgabe-Set) – einmal
  verwendete Kategorien werden lokal gemerkt und bei künftigen Einträgen
  als antippbare Vorschlags-Chips angeboten (kein natives Dropdown, da
  auf iOS unzuverlässig) sowie automatisch als Filter-Pille ergänzt
- PDF-Export: alphabetisch sortierte, platzoptimierte Liste der aktuell
  angezeigten (gefilterten/gesuchten) Einträge, mit Vorschau in einem
  bildschirmfüllenden, aber nie über den Bildschirm hinausgehenden
  Fenster vor dem Speichern/Teilen; Kopfzeile zeigt Gesamtzahl der
  Artikel (Summe der Anzahl-Werte, nicht nur Zeilenzahl)
- Optionales Haltbarkeitsdatum, mit farbiger Markierung (gelb: läuft
  innerhalb von 7 Tagen ab, rot: bereits abgelaufen) und automatischer
  Vorsortierung dieser Einträge an den Anfang der Liste/des PDF-Exports
- Bearbeiten/Löschen jedes Eintrags
- Sichern/Wiederherstellen als Datei (Einträge + eigene Kategorien), rein lokal
- Hell-/Dunkelmodus, einmalige Einführung (3 Folien)
- Eigenes App-Icon (Glas + Lupe/Haken), im Familienstil zu den anderen
  Wahr-Apps abgestimmt (Größe/Randabstand mit ProduktWahr/LautstärkeWahr
  visuell abgeglichen)

## Bewusst NICHT enthalten (Abgrenzung zu ProduktWahr)
- Keine Zusatzstoff- oder INCI-Prüfung
- Kein Barcode-Scanner, keine Anbindung an Open Food/Beauty/Products Facts
- Keine Nährwerte, kein Nutri-Score/NOVA/Öko-Score
- Kein Allergie-/Unverträglichkeitsprofil

Für den Zusatzstoff-/Kosmetik-/Barcode-Check gibt es weiterhin ProduktWahr.

## Rechtsgrundlage
Rein privates Inventar-Werkzeug ohne externe Datenquellen. Details siehe
vw-impressum.html und vw-datenschutz.html.
