# Ticketprodukt-Freischaltungscodes

## Ziel und verbindliche Entscheidungen
- Pro Ticketprodukt schaltbare Pflicht für automatisch generierte, global eindeutige achtstellige Codes aus Großbuchstaben und Ziffern. Bestehende Produkte bleiben ohne Codepflicht, bis ein Administrator diese aktiviert.
- Öffentliche Eventseite: Codefeld unmittelbar neben dem Minus-Button; bei aktivierter Pflicht ist Erhöhen erst nach serverseitiger Validierung erlaubt. Ohne Pflicht verschwindet das Feld. Backend-Prüfung bleibt unabhängig davon zwingend.
- Ein Code erlaubt mehrere Tickets seines einen Produkts innerhalb genau einer Bestellung. Ausschließlich die vorhandene Einstellung `maxPerOrder` begrenzt die Menge zusätzlich zum Bestand. Keine zusätzliche Code-Mengenbegrenzung und keine Produktumbenennung.
- Neuer Tab `Freischaltungscode` bei bestehenden Admin-Events: Produkte, gewünschte Generierungsanzahl je Produkt, Codes mit stabiler fortlaufender Nummerierung und Status, Bestell-/Kundenzuordnung soweit vorhanden.
- CSV und echtes PDF je Produkt: Event- und Produktname jeweils einmal oben, danach genau zwei Spalten `Nummer` und `Code`. Keine Wiederholung der Metadaten pro Code. Wiederholte Generierung ergänzt den Bestand und setzt die Nummerierung fort.
- Verfügbar → atomar für Bestellung reserviert → nach bestätigter Zahlung dauerhaft verbraucht (auch bei bezahltem Bestandskonflikt). Keine Freigabe bei Erstattung. Freigabe nur bei definitiv unbezahltem Abbruch/Fehlschlag/Ablauf, nicht bei bloßem Timeout oder unbekanntem Zahlungsstatus. Prüfung auf der Produktseite reserviert noch nicht; ein zwischenzeitlich beanspruchter Code führt zu verständlichem Bestellfehler.
- Code bleibt mit der Bestellung nachvollziehbar, einschließlich Gastkäufen. Idempotenz berücksichtigt normalisierte Codes; parallele Käufe dürfen einen Code nicht mehrfach beanspruchen.

## Umsetzung
Vorhandene Convex-Transaktionen, Session-/Admin-Autorisierung und `#ui/...`-Komponenten verwenden. Bestehende Bibliotheken bevorzugen, keine unnötigen Abhängigkeiten. TS/TSX-Code-Style-Skill beachten. Keine geheimen Codes in öffentlicher Katalogprojektion, URLs oder Logs. Generierte Downloads sind dynamische Geschäftsdaten, keine dauerhaft gespeicherten Projektassets.

1. Produktkonfiguration: optionales `activationCodeRequired`, Admin-Schalter, Drafts/Adapter/Projektionen; Legacy-Verhalten erhalten.
2. Codebestand und Admin-Verwaltung: Schema, autorisierte Generierung/Listung, öffentliche minimale Validierungsantwort, Tab und Verwaltung. Global eindeutige Codes und transaktionale Nummerierung.
3. Bestellung und Zahlungslebenszyklus: Code-Input/Idempotenz, atomare Reservierung, Verbrauch/Freigabe einschließlich Spätzahlung und Fehlerpfaden. Gezielte Convex-Tests für parallele Verwendung und Zahlung.
4. Öffentliche Eventseite: Codefeld und Validierungszustand direkt an Menge, Weitergabe an Checkout ohne URL-Leak, verständliche Fehler, bestehende Mengenlimits. Zustands-/Komponententests.
5. Downloads: authentifizierte CSV-/PDF-Ausgabe und Buttons, Inhaltsprüfungen. Vorhandenen PDF-Dienst auf geeignete generische Ausgabe prüfen, nicht ohne Not anderes Projekt ändern.
6. Abschlussprüfung: fokussierte Regressionen, Type-/Build-Prüfung nach vorhandenen Scripts, echte Browserprüfung Admin und öffentlich einschließlich Mobilansicht. Keine echten Zahlungen oder Änderungen am genannten Live-Event zu Testzwecken ohne ausdrücklichen Auftrag.

## Prüfstrategie
- Enge Unit-/Convex-Testauswahl je Schritt; nicht bei jedem Schritt komplette Tests oder E2E ausführen.
- Belegen: Toggle an/aus; gültig/ungültig/falsches Produkt; mehrere Tickets pro Code; unverändertes `maxPerOrder`; gleichzeitige Reservierungen; Idempotenz; bezahlt/verbraucht; endgültiger Fehler/Freigabe; unbekannte Zahlung/keine Freigabe; Erstattung/keine Wiederverwendung; Exporte mit korrekten Spalten und Headern.
- Browserprüfung ausschließlich durch Browser-Subagent, abschließend auf isolierten Testdaten. Produktionsbereitstellung nur anhand bestehender Projektkonventionen, keine destruktiven Datenänderungen.

## Aktueller Kontext
- Öffentliche Menge: `TicketTierSelector.tsx`, `ticketTierSelectorStateCreate.ts`.
- Admin: `AdminTicketProductsForm.tsx`, `AdminEventTabs.tsx`, `AdminEventDetailPage.tsx` und zugehörige State-/Search-Adapter.
- Backend: `catalogTables.ts`, `ticketTables.ts`, `ticketCheckoutPrepareMutation.ts`, `ticketPaymentStatusApplyMutation.ts`, Reservation-/Reconcile-Funktionen.
- Zahlungsabgleich derzeit regelmäßig alle fünf Minuten; Inventarreservierungen werden nach 15 Minuten zur Ablaufprüfung vorgemerkt. Der bestehende Ablauf fragt Billing `ticketCheckoutExpire` ab und verschiebt bei `pending`, unbekanntem Status oder aktiver Checkout-Lease. Diese Logik erhalten; Codes nur an definitive Terminalpfade anbinden. Historische Code-/Bestellzuordnung nach Freigabe behalten; Spätzahlung nach erneuter Vergabe darf keine fremde Reservierung überschreiben.
- Vorbestehende fremde Änderungen nicht überschreiben: `docs/20261012_bestellungen_spaltenbreiten.md`, `test/adminTicketOrdersPageStateCreate.test.ts`, `.vitest/json/output.json`, `docs/20261012_event_payment_methods.md`.

## Status
- Erkundung abgeschlossen; fachliche Anforderungen geklärt.
- Schritte 1 und 2 abgeschlossen. Schritt 3 und öffentliche Eingabe aus Schritt 4 in Umsetzung; Warenkorb-/Request-Weitergabe bereits abgeschlossen. Schritt 6 ausstehend.
- CSV-/PDF-Formatter aus Schritt 5 abgeschlossen; Downloadintegration in Umsetzung.
- Vorbereitung Downloads/Testumgebung einschließlich Testzugang abgeschlossen. Browserprüfung soll eine isolierte Preview-Testveranstaltung verwenden; lokales Eventoren läuft auf `http://[::1]:5174/` mit Preview-Backend. Authentifizierte Vorschau unter `https://eventoren.leonardomora.de` verwenden.
- Zahlungslebenszyklus für Schritt 3 geprüft; bestehende autoritative Ablaufprüfung kann wiederverwendet werden.
- Spätzahlungsregel: Nach Freigabe und neuer Reservierung bleibt die neue Reservierung unverändert; die alte bezahlte Bestellung erhält einen Konflikt ohne Tickets. Historisch bezahlte Zuordnungen verhindern jede spätere Freigabe in `available`, auch falls die neuere Bestellung scheitert. Sämtliche fehlschlagenden Prüfungen vor Schreiboperationen ausführen, da zurückgegebene Result-Fehler keine Convex-Transaktion zurückrollen.
- Codeverwaltung verwendet eigene Ticketing-Endpunkte und eine separate historische Code-/Bestellzuordnung. Öffentliche Validierung liefert nur ein minimales Gültigkeitsergebnis für Event/Produkt/Code.
- Verwaltungs-Tab: `?tab=codes`. Code-Tabellen heißen `ticketActivationCodes` und `ticketActivationCodeReservations`; Codezustände `available|reserved|consumed`, historische Zuordnungen `reserved|released|consumed`. Öffentlicher Client `ticketActivationCodeValidate({eventKey,tierKey,code})` liefert Result mit `{valid:boolean}`. Generierung derzeit 1–500 Codes pro Durchgang mit fortlaufender Nummerierung.
- Neue Codes beginnen mit einem Buchstaben und enthalten mindestens eine Ziffer. Dadurch bleiben die acht Zeichen in Excel unverändert, ohne führende Nullen oder wissenschaftliche Schreibweise als Zahlen auszulegen. Validierung bleibt kompatibel mit beliebigen acht alphanumerischen Zeichen.
- Gemeinsamer Checkout-Vertrag: `TicketCartLine.activationCode?: string` und `TicketCheckoutCreateInput.tickets[].activationCode?: string`, normalisiert mit `trim().toUpperCase()`.
- Testzugang: bei Zitadel-CLI den geerbten `XDG_CONFIG_HOME`-Override entfernen (`env -u XDG_CONFIG_HOME zitadel-cli credentials get testadmin --profile contentoren --field ...`); keine Zugangsdaten protokollieren.
- Öffentliche Weitergabe: Codes ausschließlich im lokalen Warenkorb-Draft und Checkout-Request, nicht im `tickets`-URL-Parameter. Mengenänderungen und Draft-Auflösung müssen optionale Codes erhalten; URL-Mengen werden mit passenden Draft-Codes zusammengeführt. Warenkorb-Mengensteuerung ebenfalls absichern.
- Produktkonfiguration bleibt bewusst außerhalb der ausschließlich ausgehenden Billing-Snapshots (wie `maxPerOrder`); der strikte Billing-Vertrag akzeptiert dieses Feld nicht. Kein Snapshot-Import überschreibt die lokale Einstellung.
- PDF-Entscheidung: vorhandener PDF-Dienst bietet kein geeignetes Listenformat; Typst-Integration wäre unverhältnismäßig. Für den Admin-Download eine gezielte, dynamisch geladene `jspdf`-Abhängigkeit verwenden, keine Änderungen am separaten PDF-Dienst. Authentifizierte Listendaten lokal rendern, Metadaten nur auf erster Seite, echte PDF-Datei mit Seitenumbrüchen. Deutsche Umlaute korrekt darstellen; bestehende Fontassets bevorzugen, falls zusätzliche Schrift nötig ist.
- Abschlusskommandos: gezielte Bun-/Vitest-Tests, `bunx tsc --noEmit -p tsconfig.json`, `bun run lint:convex`, `bun run frontend:build:development`. `bun run typecheck` ist kein vollständiger TS-Check. Preview-Backend ist getrennt von Produktion; vor einer für Browsertests nötigen Aktualisierung Zieltrennung prüfen, keine Produktionsbereitstellung.
