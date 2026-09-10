# Multi-Event Warenkorb & Checkout

## Goal
Ermögliche das gleichzeitige Hinzufügen von Tickets mehrerer unterschiedlicher Events in den Warenkorb ohne Fehlermeldung oder Konflikt-Dialog, zeige alle Events und Tickets im Warenkorb an und ermögliche den gemeinsamen Checkout.

## Decisions
- **Multi-Event Cart Draft**: Warenkorb-Draft speichert Tickets gruppiert nach `eventId` als `TicketCartDraft` (`readonly TicketCart[]`). Rückwärtskompatibilität für bestehende Ein-Event-Drafts im `localStorage` bleibt gewährleistet.
- **Entfernung des Ein-Event-Limits im Event-Detail**: `checkConflictingCart` und die Meldung „Pro Buchung kann jeweils ein Event gebucht werden“ werden entfernt. Beim Klick auf „In den Warenkorb“ werden die gewählten Tickets des Events in den bestehenden Warenkorb-Draft gemergt.
- **Warenkorb-Übersicht (`/warenkorb`)**: Darstellung aller Events mit ihren jeweiligen Tickets in Gruppen (`TicketBagGroup`), mit aggregierten Gesamtsummen (Zwischensumme, Gebühren, Endbetrag) und event-spezifischer Mengenänderung / Entfernung.
- **Checkout (`/checkout`)**: Unterstützt sowohl den direkten Ein-Event-Checkout (`?event=...&tickets=...`) als auch den Multi-Event-Checkout aus dem Warenkorb-Draft. Beim Abschluss wird für jedes Event eine Buchung via `ticketOrderCreate` und `ticketStorageAppend` erstellt und der Warenkorb geleert.
- **Header-Warenkorb-Badge**: Zählt die Gesamtzahl aller Tickets über alle Events hinweg.

## Approach
1. Multi-Event Cart Draft Model & Speicherfunktionen implementieren (`TicketCartDraft.ts`, `ticketCartDraftLoad.ts`, `ticketCartDraftSave.ts`, Hilfsfunktionen zum Hinzufügen, Entfernen und Summieren).
2. Event-Detailseite anpassen (`eventDetailPageStateCreate.ts`): Konflikt-Prüfung entfernen, stattdessen Tickets des Events in den Warenkorb-Draft integrieren.
3. Warenkorb-Seite anpassen (`ticketBagPageStateCreate.ts`, `TicketBagGroup.ts`, `warenkorb.tsx`): Mehrere Events anzeigen, verwalten und Gesamtsummen berechnen.
4. Header-Status anpassen (`siteHeaderStateCreate.ts`): Ticket-Gesamtanzahl über alle Events synchronisieren.
5. Checkout erweitern (`checkoutPageStateCreate.ts`, `TicketCheckoutForm.tsx`, `ticketCheckoutFormStateCreate.ts`): Multi-Event-Warenkorb unterstützen und Bestellungen anlegen.
6. Verifizierung mit Build, Typecheck und Browser-Tests.

## Tasks
- [x] Task 1: Cart-Draft-Modell und -Funktionen für Multi-Event-Unterstützung erstellen/anpassen
- [x] Task 2: Event-Detailseite (`eventDetailPageStateCreate.ts`) anpassen: Ein-Event-Restriktion entfernen und Multi-Event-Hinzufügen ermöglichen
- [x] Task 3: Warenkorb-Seite (`ticketBagPageStateCreate.ts`, `warenkorb.tsx`) auf Multi-Event-Gruppen und -Summen umstellen
- [x] Task 4: Header (`siteHeaderStateCreate.ts`) auf Multi-Event-Ticketanzahl anpassen
- [x] Task 5: Checkout (`checkoutPageStateCreate.ts`, `TicketCheckoutForm.tsx`, `ticketCheckoutFormStateCreate.ts`) für Multi-Event-Bestellungen ausstatten
- [x] Task 6: Typecheck, Build und Browser-Verifikation durchführen
