# OrteWahr – Deutschlandweit stille Plätze finden

**OrteWahr** ist eine 100% kostenlose, anonyme PWA zum Finden ruhiger und interessanter Plätze in Deutschland – ohne Tracking, ohne Backend, ohne Cookies. Seit dieser Version ist OrteWahr als eigenständige Kachel in die **WahrZentrale** integriert (Design an die übrigen Wahr-Apps angepasst), technisch und rechtlich bleibt die App vollständig autark.

## ✨ Features

- **📍 Standort:** GPS nur im Browser, Ort eingeben (Nominatim nur nach Klick, opt-in)
- **📏 Radius:** 1–20 km frei wählbar
- **🎯 Ortstyp-Filter:** Gruppierte Buttons nach Themen (Natur & Ruhe, Essen & Trinken, Einkaufen, Mobilität, Gesundheit, Freizeit & Kultur, Übernachtung)
- **📍 Details je Ort:** Entfernung, Stimmungs-Hinweis, Barrierefreiheit laut OSM (wenn hinterlegt)
- **🕐 Beste Zeit:** Matrix morgens/mittags/abends/Wochenende grün/gelb/rot
- **❤️ Favoriten + Notizen:** Nur localStorage
- **🔇 Ruhe-Check, 🌅 Goldene Stunde, 🌦️ Wetter (optional), 📷 Fotos, ⬇️⬆️ Backup, 🖨️🔗 Druck & Teilen**
- **📡 Teiloffline:** Service Worker cached die App-Shell
- **🌓 Hell/Dunkel:** startet immer hell, Umschalten nur für die aktuelle Sitzung

## 🔍 Ausschließlich Live-Ergebnisse (OSM)

Diese App hat keine feste, vorgefertigte Orte-Liste. Alle Orte kommen live von der Overpass API (OpenStreetMap) im eingestellten km-Radius um deinen Standort. Nutzer können einzelne Treffer per „⭐ Merken" dauerhaft lokal speichern; diese bleiben dann auch offline sichtbar.

## Einbindung in die WahrZentrale

OrteWahr wird als Kachel `ow-index.html` in der WahrZentrale (`index.html`) verlinkt. Alle Dateien liegen mit dem Präfix `ow-` flach im selben Verzeichnis wie die übrigen Wahr-Apps. Impressum (`ow-impressum.html`) und Datenschutz (`ow-datenschutz.html`) sind eigenständig für OrteWahr.
