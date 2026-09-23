# Ticketprodukt-Zeiten

## Ziel
In der Ticketprodukt-Bearbeitung Beginn, Einlass und Ende des jeweiligen Events separat pro Ticketprodukt festlegen und dauerhaft speichern. Beginn und Ende sind Pflichtfelder (mit `*` gekennzeichnet); bei leerem Einlass gilt Beginn. Fehlende Pflichtwerte beim Speichern verständlich melden.

## Entscheidungen
- Zeiten beschreiben das Event für dieses Ticketprodukt, nicht den Verkaufszeitraum.
- Neue Ticketprodukte und bestehende Produkte ohne eigene Zeiten übernehmen zunächst Beginn/Ende aus dem Event, sofern vorhanden. Danach bleiben produktbezogene Zeiten unabhängig von späteren Event-Änderungen.
- Für vorhandene Daten optionale Speicherfelder verwenden; beim Bearbeiten fehlende Werte aus den Event-Zeiten vorbelegen. Beim Speichern müssen Beginn und Ende gesetzt sein.
- Die Änderung betrifft Formular, Persistenz und benötigte Admin-Datenübertragung; keine neue Darstellung im Checkout, auf PDFs oder im Billing-Sync ohne ausdrückliche Anforderung.

## Aufgaben
1. [x] Tier-Schema, Upsert-Argumente/Validierung/Persistenz, Client-Typ und Event-Tier-Projektion um Beginn, Einlass, Ende ergänzen. Serverseitig Pflichtwerte und Einlass-Fallback beim Speichern sicherstellen. Fokussierte Convex-Tests.
2. [x] Admin-Tier-Draft und Formularzustand erweitern: bei neuem/älterem Tier Event-Zeiten vorbelegen, vorhandene Tier-Zeiten erhalten, Datetime-Local-Werte konvertieren, Pflichtfeldfehler und Einlass-Fallback beim Speichern. Fokussierte State-Tests.
3. [x] Formular um drei `datetime-local`-Inputs analog zum Event-Formular ergänzen, Beginn/Ende mit `*` und passende Fehlermeldung; fokussierte Prüfung inkl. Typecheck und Browser-Verifikation der UI.

## Kontext
- Vorhandenes Formular: `src/admin/AdminTicketProductsForm.tsx`; Referenz: `src/admin/AdminEventDetailsForm.tsx`.
- State: `src/admin/adminCatalogPageStateCreate.ts`, `src/admin/adminTicketProductsFormStateCreate.ts`.
- Convex: `src/catalog/convex/catalogTables.ts`, `src/catalog/convex/catalogTicketTierUpsertMutation.ts`, `src/catalog/convex/catalogEventToEventItem.ts`.
- Bestehende Date-Time-Konverter unter `src/admin/adminDateTime*.ts`; UI-Komponenten aus `#ui/...` nutzen.
- Fehlende ältere Tier-Zeiten werden in der Event-Tier-Projektion aus Event-Zeiten abgeleitet. Admin-State übergibt Beginn/Ende und Einlass-Fallback; der Server prüft ISO-Datumswerte. Das eigenständige Demo-Admin-Formular gehört nicht zum betroffenen Live-Formular.
