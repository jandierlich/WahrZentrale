# ProduktWahr

Ein Scan für alles: Zusatzstoffe (E-Nummern), Kosmetik-Inhaltsstoffe (INCI)
und Produktbewertungen per Barcode – in einer App, im WahrZentrale-Design.

Löst die bisherigen Einzel-Apps E-NummernWahr, KosmetikWahr und BlickWahr
ab; LautstärkeWahr bleibt unverändert eine eigene App im Hub.

## Funktionen
- Ein Foto-/Etikett-Scanner (OCR, 100% lokal, Tesseract.js)
- Live-Text-Scan: fortlaufende Erkennung ohne Auslöser, analog zum Barcode-Live-Scan – Ergebnis erscheint automatisch als Ampel-Overlay im Kamerabild
- Ein Bild-/Datei-Upload (gleiche OCR-Engine)
- Ein manuelles Eingabefeld
- Ein Barcode-Live-Scanner (ZXing) mit automatischer Abfrage bei Open Food
  Facts, mit Fallback auf Open Beauty Facts und weiterem Fallback auf Open
  Products Facts (sonstige Produkte: Haushalt, Elektronik, Spielzeug u. a.)
- Umschalter "Automatisch / Lebensmittel / Kosmetik": prüft je nach Wahl
  gegen beide Datenbanken oder gezielt nur eine – vermeidet Fehltreffer durch
  Namensüberschneidungen zwischen Zusatzstoffen und INCI-Stoffen
- Prüft jeden Text automatisch gegen die E-Nummern-Datenbank UND die
  INCI-Datenbank gleichzeitig, Ergebnis in getrennten Abschnitten je Quelle
  ("🍎 Zusatzstoffe" / "💄 Kosmetik-Inhaltsstoffe") statt Mischliste
- Beim Barcode-Live-Scan wird automatisch nur die zur erkannten Produktquelle
  (Open Food Facts bzw. Open Beauty Facts) passende Datenbank geprüft; die
  erkannten Stoffe lassen sich in der Detailansicht wie beim Foto-/Textscan
  einzeln aufklappen (Detailtext, Hinweis, Favorit, Teilen)
- Direkter Button zur vollständigen Produktseite bei der jeweiligen
  Datenquelle (Open Food/Beauty/Products Facts), gut sichtbar unter dem
  Produkttitel in der Detailansicht
- Eigenes App-Icon (Barcode + Lupe/Haken), passend zur WahrZentrale-Bildsprache
- Erkennt zusätzlich die 14 EU-Pflichtallergene
- Persönliches Allergie-/Unverträglichkeitsprofil mit automatischer Warnung
- Warenkorb-Modus beim Barcode-Live-Scan mit Gesamtübersicht
- Favoriten: immer aktiv, kein Opt-in nötig – ein Tipp auf den Stern speichert
  lokal, jederzeit über den Stern oder "Leeren" wieder entfernbar
- Nachschlagen ohne Scan: direkte Volltextsuche über Zusatzstoff- und INCI-Datenbank
- Sichern/Wiederherstellen: Favoriten als Datei exportieren/importieren
  (z. B. für ein neues iPhone), rein lokal
- Bei Barcode-Produkten (Lebensmittel): zusätzliche Anzeige von Nährwerten
  (Energie, Fett, Zucker, Ballaststoffe, Eiweiß, Salz – umschaltbar zwischen
  pro 100 g und pro Portion), Nutri-Score, NOVA-Gruppe und Öko-Score, sofern
  von Open Food Facts geliefert – kein zusätzlicher API-Aufruf, da aus
  derselben Produktabfrage
- Beim Live-Scannen bleibt das Detail-Popup zuverlässig sichtbar, bis der
  Detail-Button gedrückt, ein neuer Barcode erkannt oder das Fenster
  geschlossen wird
- Hell-/Dunkelmodus, Onboarding

## Technische Basis
- E-Nummern-Engine (additive-engine.js): 1:1 aus E-NummernWahr portiert
  (Namen, Kategorien, Ampel-Logik, Beschreibungstexte, Allergenliste)
- INCI-Datenbank (inci-database.js): aus KosmetikWahr übernommen
- Barcode-Live-Scan: Architektur aus BlickWahr übernommen
- Kein Server, keine Registrierung, keine Cloud – alles läuft lokal im
  Browser (PWA)

## Rechtsgrundlagen
Verordnung (EG) Nr. 1333/2008 (Zusatzstoffe), Verordnung (EU) Nr. 1169/2011
Anhang II (Allergene), Verordnung (EG) Nr. 1223/2009 (Kosmetik), REACH-VO
(EG) Nr. 1907/2006 Anhang XVII Nr. 78 (Mikroplastik). Details siehe
pw-impressum.html und pw-datenschutz.html.

## Datenstand
08/2026
