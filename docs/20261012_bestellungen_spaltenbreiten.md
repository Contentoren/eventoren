# Einstellbare Spaltenbreiten für Bestellungen

## Ziel
In der Listenansicht von `/admin/bestellungen` lassen sich die sieben Spalten Event, Kunde, Bestellnummer, Bestellt, Eventdatum, Betrag und Status an ihren Überschriften durch Ziehen einstellen. Ganz rechts in derselben Überschriftenzeile sitzt ein sehr kleines Reset-Icon, das alle Spalten auf die bisherigen Standardbreiten zurücksetzt.

## Entscheidungen und Umfang
- Die vorhandene responsive Darstellung und Kachelansicht bleiben unverändert. Spaltensteuerung gilt für die Desktop-Liste (bisher ab `xl`).
- Titel-only Darstellung der Event-Spalte und sämtliche fremden Änderungen erhalten.
- Standardlayout aus den bestehenden sieben Grid-Fraktionen ableiten; Header und sämtliche Bestellzeilen müssen immer dasselbe Spaltenraster verwenden.
- Breiten lokal im Browser unter einem eigenen versionierten Storage-Key speichern. Reset entfernt die gespeicherte Einstellung und stellt das bisherige Standardraster wieder her.
- Kleine sichtbare/auffindbare Resize-Griffe an den rechten Headergrenzen; ausreichend nutzbare Trefferfläche, horizontales Resize-Cursor und Pointer-Unterstützung. Tastaturbedienung der fokussierbaren Griffe über Pfeiltasten; zugängliche Namen. Vernünftige Mindestbreiten gegen kollabierte Spalten.
- Reset als sehr kleiner vorhandener `#ui/...` Button mit bestehendem `@adaptive-ds/mdi` Icon, Tooltip/title und zugänglichem Namen „Spaltenbreiten zurücksetzen“. Rechts außen ohne zusätzliche Daten-Spalte/Fehlausrichtung; Platz im Header und den Zeilen berücksichtigen.
- Kein neues Paket, keine generische Tabellenbibliothek, keine Änderungen an Routing, Bestelllogik oder vorhandener Listen-/Kachelpräferenz.
- TSX bleibt Darstellung; Resize-/Storage-Logik in kleinen TS-Modulen nach code-style. Vorhandene Bibliotheken aus package.json und UI-Komponenten verwenden.

## Umsetzung
1. `src/admin/AdminTicketOrdersPage.tsx` und vorhandene UI-/Storage-Muster lesen; kleine eigenständige Spaltenbreiten-State-/Storage-Module hinzufügen und fokussierte Unit-Tests für Standardbreiten, ungültige gespeicherte Werte, Resize/Mindestbreiten, Persistenz und Reset erstellen. Listener sauber bereinigen, Storage-Ausfälle tolerieren. Nicht die gesamte Testsuite starten.
2. State in die Bestellungenansicht integrieren. Gemeinsames Desktop-Grid mittels CSS-Variable/Style für Header und Zeilen; mobile Grid-Darstellung unangetastet. Resize-Griffe und Reset-Icon ergänzen. Möglichst kleinen Diff und Titel-only Änderung erhalten. Fokussierte Tests und Typecheck ausführen, keine E2E-Suite.
3. Browserprüfung lokal auf Demo-Bestellungen und nach Möglichkeit Admin-Seite: Ziehen ändert alle Zeilen synchron, Reset stellt Standard wieder her, Reload erhält Breiten, Tastatur/kleines Icon verwendbar, mobile und Kachelansicht nicht beschädigt. Unabhängigen finalen Diff prüfen.

## Status und aktueller Kontext
- Exploration abgeschlossen; keine bestehende Resize-Komponente gefunden.
- Aufgabe 1: abgeschlossen; getestete Breiten-/Storage-/Resize-Helfer unter `src/admin/adminTicketOrdersColumnWidths*.ts` vorhanden.
- Aufgabe 2: abgeschlossen; gemeinsames Desktop-Raster, Resize-Griffe und Reset-Icon integriert.
- Aufgabe 3: abgeschlossen; Spaltensteuerung in Desktop-/Mobildarstellung und Detailabfrage mit gezieltem Wiederöffnungs-Regressionsfall unabhängig geprüft.
- Hauptansicht: `src/admin/AdminTicketOrdersPage.tsx`, Grid-Header und Grid-Zeilen derzeit fest definiert.
- Lokale Demo: `/demo/admin/orders` bzw. `/demo/admin/bestellungen`; laufenden Server vor Prüfung ermitteln.
- Bestehende Arbeitskopie enthält weitere fremde Änderungen; nicht zurücksetzen oder verändern.
- Die native Detailabfrage liest ihren bisherigen Detailzustand ohne reaktive Abhängigkeit (`untrack`), damit das anschließende Schreiben keine Rückkopplung auslöst. Spaltensteuerung bleibt von der Detail-/Abfragelogik getrennt.
