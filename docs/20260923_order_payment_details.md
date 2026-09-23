# Bestellungen: Rechnungsadresse und Zahlungsdetails

## Ziel
Für neue Eventoren-Ticket-Checkouts in Stripe ist die Rechnungsadresse verpflichtend. Unter `/admin/bestellungen` sind vorhandene Bestellkontakte und die bei Stripe tatsächlich verfügbaren sicheren Zahlungsdetails einsehbar, auch für alte Bestellungen.

## Entscheidungen und Umfang
- Bestehende Änderungen in Eventoren und `/home/leo/projects/billing` erhalten.
- Adresspflicht nur für Eventoren-Ticket-Checkout; andere Billing-Kunden unverändert.
- Detailansicht je Bestellung statt Stripe-Aufrufen für jede Listenzeile.
- Die Detailansicht enthält genau zwei Hauptsektionen: „Bestellungsinfo von unserer Webseite“ (alle lokalen Bestell-, Kontakt-, Veranstaltungs- und Positionsdaten) und „Von Stripe empfangene Daten“ (Stripe-Daten oder Abrufstatus). Untergruppen innerhalb der beiden Sektionen sind erlaubt.
- Vorhandene lokale Namen, E-Mail, Adresse, Telefon sowie Bestell-/Zahlungsdaten anzeigen. Stripe-Kontakt/Rechnungsadresse separat kennzeichnen; verfügbare Zahlungsart, Kartenmarke/letzte vier Ziffern/Ablaufdatum, Betrag/Währung, Status und Beleglink anzeigen. Keine vollständigen Kartennummern/CVC, keine erfundenen oder nachträglich zwingend erwarteten Daten.
- Stripe-Details über authentifizierten, organisationsgebundenen Billing-Zugriff; Eventoren-Zugriff ausschließlich für berechtigte Admins. Öffentliche Bestellstatusantworten nicht um personenbezogene Zahlungsdetails erweitern.
- Bestehende Libraries und `#ui/...`-Komponenten nutzen. Keine neuen Fremdbibliotheken erforderlich.
- Fehlende Stripe-Daten oder Abruffehler dürfen lokale Bestelldetails nicht verbergen.

## Vorgehen und Aufgaben
1. Billing: Eventoren-spezifische verpflichtende Rechnungsadresse implementieren und gezielt testen.
2. Billing: sicheren Zahlungsdetailabruf anhand bestehender Bestell-/Zahlungsreferenzen implementieren, bestehende Autorisierungs-/Modusbindung nutzen; Paketvertrag und nötige Dokumentation aktualisieren, gezielt testen und Paket bereitstellen.
3. Eventoren: Paket integrieren, admin-geschützten Detailzugriff und Bestelldetailansicht implementieren; vorhandene lokale Daten und Stripe-Daten anzeigen; gezielte Tests und Typprüfung.
4. Integration: relevante Prüfungen und Browserprüfung für Admin-Bestellungen einschließlich fehlender Daten, Zugangsschutz und erreichbarem Checkout durchführen. Keine echten Zahlungen auslösen.

## Status und aktueller Kontext
- Recherche abgeschlossen; beide Projekte haben bestehende Änderungen.
- Aufgaben 1–4 abgeschlossen.
- Billing nutzt einen optionalen `requireBillingAddress`-Parameter, der nur im Eventoren-Ticketpfad gesetzt wird.
- Eventoren-Devserver laut Recherche unter http://localhost:3057.
- Billing-Paket bisher `vendor/billing-0.1.2.tgz`; Artefaktworkflow im Billing-Projekt vorhanden.
- Neues Billing-Artefakt: `/home/leo/projects/billing/build/billing-package/artifacts/billing-0.1.3.tgz`. Client: `eventorenTicketPaymentDetailsGet({ paymentReference, orderReference, organizationId? })`, Result mit `session`, `charge` und `stripeMode`. Privater Endpoint prüft Organisation und Referenzen; Eventoren muss Admin-Zugriff prüfen.
- Eventoren hat eine admin-geschützte Detailansicht und lokale Daten bleiben bei Stripe-Abruffehlern sichtbar. Billing-Preview enthält den neuen Endpoint; Produktivdeployment ist nicht Teil dieser Umsetzung.
- Browserzugriff für SSO über https://eventoren.leonardomora.de statt localhost. Die Detailansicht enthält die beiden geforderten Hauptsektionen.
- Der hostseitige Detailabruf löst ausschließlich im Development/Testbetrieb die dokumentierte Billing-Container-Gatewayadresse auf den lokalen Previewdienst auf; Live- und Produktionsrouting bleiben unverändert.
- Historische Stripe-Sessions können Kontakt und Sitzungsdaten enthalten, ohne Rechnungsadresse oder Kartendetails zu besitzen. Fehlende Angaben bleiben ausdrücklich als nicht verfügbar gekennzeichnet.
