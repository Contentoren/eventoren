# Eventoren-Checkout: Rechnungsadresse und Rechtliches

## Ziel

Im Eventoren-Checkout dieselben Rechnungsangaben wie in `../checkout` erfassen: Privatperson/Unternehmen, Vorname, Nachname, Rechnungs-E-Mail, Firma, optionaler Firmenzusatz und EU-USt-ID (nur Unternehmen), Straße/Hausnummer, optionaler Adresszusatz, Postleitzahl, Ort und Land. Die bisherige Kontaktperson ist zugleich Rechnungsempfänger; Telefon bleibt optional. Zwei getrennte Pflicht-Checkboxen für AGB und Datenschutz mit Links in einem neuen Tab ersetzen die gemeinsame Checkbox. Die eingegebenen Rechnungsdaten sollen auch auf der tatsächlichen Rechnung verwendet werden.

## Entscheidungen und Grenzen

- Struktur und Sichtbarkeit der Felder orientieren sich an `../checkout/src/checkout/ui/BillingDetailsForm.tsx`; vorhandene Eventoren-UI-Komponenten (`#ui/...`) und bestehende Ticket-/Bestellabläufe bleiben erhalten.
- Rechnungsdaten im Eventoren-Entwurf und in der Bestellung strukturiert speichern; bereits gespeicherte Entwürfe/Bestellungen ohne neue Felder robust behandeln. Die beiden Zustimmungen unabhängig erfassen und im bestehenden Legal-Kontext korrekt abbilden; bisherige Zustimmungen nicht ungeprüft für neue Checkboxen übernehmen.
- `../billing` nimmt aktuell nur die E-Mail an und bezieht Rechnungsanschriften aus Stripe. Den Eventoren-Ticket-Checkout-Vertrag um strukturierte Rechnungsdaten erweitern, im vorhandenen Customer-Snapshot speichern, bei Rechnungserstellung diese Daten bevorzugen und für historische Checkouts ohne Rechnungsdaten die verifizierten Stripe-Daten weiter nutzen. Keine Adressdaten in Stripe-Metadaten und keine unnötige Datenbankmigration.
- Eventoren verwendet ein lokal gepacktes Billing-Paket (`vendor/billing-0.1.5.tgz`); nach Vertragsänderung nur dieses Paket passend neu bauen/packen, einbinden und Lockfile aktualisieren. Bestehende Bibliotheken verwenden, keine fremden Abhängigkeiten hinzufügen.

## Aufgaben

1. **Billing-Vertrag und Rechnung** — `../billing`: Ticket-Checkout-Request/Customer-Snapshot um optionale strukturierte Rechnungsdaten für Legacy-Kompatibilität erweitern; bei neuen Daten Person/Firma und vollständige Anschrift auf der Rechnung nutzen, ansonsten Stripe-Fallback. Gezielte Contract-, Handler- und Invoice-Tests.
2. **Eventoren Formular und Zustand** — Rechnungsdatenfelder, Typen, Validierung, Entwurf-Migration, getrennte AGB-/Datenschutz-Checkboxen und bestehende Kontakt-/Teilnehmerlogik anpassen. Gezielte Unit-Tests für Pflichtfelder, Unternehmensmodus, Entwürfe und Zustimmung.
3. **Übermittlung und Integration** — Eventoren-Checkout-Eingabe, Convex-Validierung und Bestellung um Rechnungsdaten erweitern; an Billing übermitteln. Billing-Paket bauen/packen und genau dieses lokale Paket in Eventoren aktualisieren. Gezielte Forwarding-/Backend-Tests.
4. **Abschlussprüfung** — Typechecks und relevante Tests in beiden Projekten; Checkout im Browser einschließlich Person/Firma, Land und getrennter Zustimmungen prüfen. E2E erst hier, nur soweit zur Verifikation nötig.

## Status / aktueller Kontext

- Aufgabe 1: umgesetzt; gezielte Tests und Typecheck bestanden. Formatprüfung der Billing-Dateien noch offen.
- Aufgabe 2: umgesetzt; gezielte Tests und Typecheck bestanden.
- Aufgabe 3: umgesetzt; Rechnungsdaten werden an Billing übermittelt, lokal gepacktes Paket aktualisiert; gezielte Convex-Tests und Typecheck bestanden.
- Aufgabe 4: abgeschlossen; Formular im Demo-Checkout im Browser geprüft, Integrationspfad und Paket abgeglichen. Der produktive Checkout war ohne gültigen Warenkorb nicht direkt prüfbar.
- Der Nutzer hat bestätigt: Rechnungsanschrift auch auf der tatsächlichen Rechnung verwenden; vorhandene Kontaktperson und Rechnungsdaten gemeinsam erfassen.
