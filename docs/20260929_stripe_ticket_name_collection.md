# Stripe-Namensabfrage für Ticket-Checkout

## Ziel
Künftige Eventoren-Ticketkäufe sollen den individuellen Namen im Stripe Checkout ausdrücklich abfragen, damit der Stripe-Kontakt in den Bestelldetails möglichst vollständig ist. Die bereits verpflichtende Rechnungsadresse bleibt aktiviert. Eine Telefonnummer wird nicht zur Pflicht.

## Entscheidungen und Grenzen
- Umsetzung ausschließlich im Billing-Checkout für Eventoren-Tickets, einschließlich neu angelegter Sessions bei Wiederholung; andere Checkout-Flows bleiben unverändert.
- Stripe Checkout `name_collection.individual` aktivieren und nicht optional machen. Bestehende Customer-Wiederverwendung und `customer_update` beibehalten.
- Die Anzeige der Rechnungsdaten liest Stripe Charge `billing_details`. Diese Angaben können unabhängig von Checkout Session `customer_details` leer bleiben; keine künstliche Umdeutung oder Vermischung der Daten.
- Vergangene Bestellungen werden nicht rückwirkend ergänzt. Die Stripe-Adresse wird für Ticketkäufe bereits mit `billing_address_collection: "required"` angefragt.

## Aufgaben
1. [done] In `../billing` die ticket-spezifische Namensabfrage durch den dynamischen Checkout bis zur Stripe-Session-Erstellung weiterreichen; keine Änderung an anderen Flows.
2. [done] Fokus-Tests für Ticket-Checkout und Session-Builder ergänzen und gezielt ausführen; passenden Typecheck durchführen.

## Aktueller Kontext
Namensabfrage für neue und wiederholte Ticket-Sessions implementiert und geprüft. `individual.optional` ist laut installiertem Stripe-SDK standardmäßig `false`. Kein historischer Auftrag zu untersuchen.
