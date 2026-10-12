# Einstellbares Ticketlimit je Produkt und Bestellung

## Ziel und Entscheidungen
- Im Admin-Produktformular ein Feld für die maximale Ticketmenge je Produkt und Bestellung ergänzen.
- Nutzerentscheidung: pro Bestellung, nicht kumuliert über Kundenkäufe.
- Nutzerentscheidung: das bisherige feste Gesamtlimit von 10 Tickets ersetzen, nicht zusätzlich behalten.
- Default ist 10, auch für Bestandsprodukte ohne gespeicherten Wert.
- Zulässig sind positive ganze Zahlen; Werte über 10 müssen tatsächlich nutzbar sein.
- Keine kundenübergreifende Kaufhistorie oder neue Identitätsprüfung.

## Ansatz
- Optionales Produktfeld in `catalogTicketTiers` für kompatible Bestandsdaten; Admin-Upsert speichert den konfigurierten Wert.
- Das Limit durch Admin-Drafts, Formzustand und öffentliche `EventTicketTier`-Daten führen.
- Produktmengen in Auswahl, Warenkorb und Checkout je Produkt begrenzen; Backend ist maßgeblich.
- Das feste Gesamtbestelllimit in allen relevanten Verbrauchern entfernen. URL-Mengen weiterhin als positive sichere Ganzzahlen behandeln, aber nicht pauschal auf 10 begrenzen.
- Bestehende Bibliotheken und `#ui/...`-Komponenten verwenden. Keine neuen Dependencies.
- Vorhandene Änderungen im Arbeitsbaum erhalten; nur eng umrissene Änderungen vornehmen.

## Aufgaben und Status
1. [x] Datenmodell und Admin-Feld: Schema, Upsert-Input/Mutation, Draft/Formzustand, UI, öffentliche Produktdaten. Gezielte Tests für Default, Persistenz und Validierung.
2. [x] Mengenbegrenzung: Produktrichtwert in Auswahl/Warenkorb/Checkout umsetzen, feste Gesamtschranke ersetzen. Gezielte Tests für niedriges Limit, Default 10, Werte über 10 und gemischte Produkte.
3. [x] Unabhängige Codeprüfung und gezielte integrierte Tests. Keine vollständige Testsuite oder pauschalen E2E-Läufe.
4. [x] Browserprüfung des Admin-Feldes und gemischter Produktmengen über 10 abgeschlossen; einzelne Produktgrenzen sind durch gezielte Tests abgedeckt.

## Relevante Bereiche
- `src/admin/AdminTicketProductsForm.tsx`, `adminTicketProductsFormStateCreate.ts`, `adminCatalogPageStateCreate.ts`.
- `src/catalog/client/CatalogTicketTierUpsertInput.ts`, `src/catalog/convex/catalogTables.ts`, `catalogTicketTierUpsertMutation.ts`, `catalogEventToEventItem.ts`.
- `src/events/EventTicketTier.ts`.
- `src/ticketing/convex/ticketCheckoutPrepareMutation.ts`, `ticketMaxPerOrder.ts`, `ticketTierSelectorStateCreate.ts`, `ticketBagPageStateCreate.ts`, `ticketCartSearchParse.ts`.
- `test/adminTicketProductsFormStateCreate.test.ts`, `convex-tests/ticketing.test.ts` und zugehörige gezielte Tests.

## Aktueller Kontext
- Umsetzung, unabhängige Codeprüfung und Browserprüfung abgeschlossen. Produktlimits gelten auch für initiale Event-/Warenkorbdaten; Bestelldetails und Folgeprozesse unterstützen Mengen über 10.
- Feldname `maxPerOrder`, optional gespeichert; `eventTicketTierMaxPerOrderGet` liefert für Bestandsdaten den Default 10. Das Feld bleibt auf Eventoren beschränkt und wird nicht im externen Billing-Snapshot übertragen.
- Vorhandene Änderungen im Arbeitsbaum erhalten; keine fremden Änderungen zurücksetzen.
- Weitere Arbeit an der Eventveröffentlichung läuft im selben Arbeitsbaum. Änderungen dieser Arbeit nicht anfassen. Diese Ticketlimit-Änderung wird nicht automatisch veröffentlicht.
