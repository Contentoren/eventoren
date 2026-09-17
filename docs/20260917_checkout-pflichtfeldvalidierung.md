# Checkout-Pflichtfeldvalidierung

## Goal

Beim fehlgeschlagenen Ticket-Checkout wegen fehlender oder ungültiger Pflichtangaben wird eine globale Meldung mit dem exakten deutschen Text **„Fülle alle Pflichtfelder aus“** angezeigt. Nach dem Sendeversuch werden ausschließlich die jeweils unvollständigen oder ungültigen Pflichtfelder rot markiert. Sobald ein einzelnes markiertes Feld gültig korrigiert wurde, verschwindet dessen Markierung unabhängig vom Zustand der übrigen Felder.

## Decisions

- Die Validierung bleibt im Checkout-State zentralisiert; die UI leitet daraus nur Darstellung und Accessibility-Attribute ab.
- Als Pflichtfelder gelten im normalen Checkout Vorname, Nachname, E-Mail-Adresse und jeder Teilnehmername eines Tickets. Das optionale Telefonfeld wird nie als fehlerhaft markiert.
- Die rechtliche Zustimmung bleibt die separate bestehende State-Prüfung mit ihrer bestehenden Meldung; sie wird nicht als Kontakt-/Teilnehmerfeld in die Pflichtfeldfehler aufgenommen.
- Die bestehende Validierungslogik bleibt maßgeblich: getrimmte Namen mit mindestens zwei Zeichen, E-Mail-RegEx und ein nichtleerer getrimmter Teilnehmername pro aktivem Ticket. Die erfolgreiche Normalisierung für den Checkout bleibt erhalten.
- Vor dem ersten Sendeversuch gibt es keine rote Pflichtfeldmarkierung. Nach dem ersten Versuch wird das geänderte Feld weiter mit denselben Regeln geprüft: gültig entfernt seinen eigenen Fehler, ungültig erhält beziehungsweise behält ihn.
- Die Fehlermenge wird für alle betroffenen Pflichtfelder aufgebaut, nicht nur für den ersten gefundenen Fehler. So werden bei einem gemeinsamen Versuch alle unvollständigen/ungültigen Felder markiert und keine gültigen Felder.
- Für nicht validierungsbedingte Fehler (leerer Warenkorb, rechtliche Zustimmung, App-Origin, API, Storage und Checkout) bleiben die bestehenden Meldungen und Kontrollflüsse erhalten.
- Es werden `Input` aus `#ui/input/input/Input.jsx`, bestehende Danger-Design-Tokens und native `aria-invalid`-Attribute wiederverwendet. `Input` wird nicht global verändert; es gibt keine neue Library und keine neue parallele UI-Komponente.
- Die deutsche Pflichtfeldmeldung wird als eigener Checkout-Text fest definiert und nicht aus den bisherigen feldspezifischen Validator-Meldungen zusammengesetzt. Die bestehende englische Lokalisierung erhält eine passende Übersetzung, ohne den exakten deutschen Text zu verändern.

## Approach

1. Einen typisierten Pflichtfeld-Schlüssel mit Kontaktfeldern und stabiler Teilnehmer-Identität `(eventId, tierId, ticketIndex)` einführen. Für Teilnehmer darf die Identität nicht von der sichtbaren Position allein abhängen.
2. Die vorhandenen Kontakt- und Teilnehmerprüfungen so ergänzen oder auf einen gemeinsamen feldweisen Prüfschritt aufteilen, dass sie weiterhin dieselben Regeln und normalisierten Erfolgsdaten liefern, zusätzlich aber alle ungültigen Pflichtfeld-Schlüssel melden können. Die bestehende `Result`-Semantik und die Nutzung in `ticketOrderCreate` bleiben kompatibel.
3. Im `ticketCheckoutFormStateCreate` einen reaktiven Fehlerzustand einführen, der anfangs leer ist und erst in `confirmPayment` nach einem zulässigen Sendeversuch gesetzt wird. Kontakt- und Teilnehmerprüfung werden für die Darstellung gesammelt; bei mindestens einem Pflichtfeldfehler wird die globale Meldung exakt auf den neuen Pflichtfeldtext gesetzt und kein Checkout-Request begonnen.
4. Die vorhandene Reihenfolge der separaten Geschäftsgates beibehalten: Submit-Sperre und Warenkorb zuerst, rechtliche Zustimmung als eigener Gate, danach feldweise Kontakt-/Teilnehmervalidierung und anschließend App-Origin/API. Die Feldfehler werden bereits beim Versuch vollständig berechnet, ohne den bestehenden Abbruch bei einem fehlerhaften Gate zu entfernen.
5. In den Änderungs-Handlern nach dem ersten Versuch nur den Schlüssel des geänderten Felds neu prüfen und entsprechend entfernen oder setzen. Beim Ausrichten der Teilnehmernamen nach Warenkorbänderungen veraltete Teilnehmerfehler entfernen; neue Ticketfelder bleiben bis zu einem Sendeversuch unmarkiert.
6. Den State-Vertrag um einen lesbaren `isFieldInvalid`-Zugriff (inklusive Teilnehmer-Schlüssel) erweitern und die Demo-State-Implementierung an den gemeinsamen `TicketCheckoutForm`-Vertrag anpassen. `relaxedValidation` darf weiterhin die Kontakt-Pflichtigkeit der Demo unterdrücken; Teilnehmerfelder bleiben dort Pflichtfelder.
7. Im gemeinsamen `TicketCheckoutForm` für jedes Kontakt- und Teilnehmer-`Input` die State-Abfrage auf `class`, `aria-invalid` und gegebenenfalls den Fokus-/Randzustand anwenden. Die Pflichtfeldmarkierung wird nur am betroffenen Input ergänzt; Labels, gültige Felder, optionales Telefon und der übrige Zahlungsbereich behalten ihre normale Darstellung. Die globale Meldung bleibt genau eine `role="alert"`-Anzeige.

## Tasks

1. Pflichtfeld-Schlüssel und Teilnehmer-Schlüsselbildung in einem kleinen Ticketing-Modul definieren.
2. Kontaktvalidierung um eine vollständige feldweise Fehlerausgabe erweitern und die bestehenden Regeln/Erfolgsdaten bewahren.
3. Teilnehmervalidierung um alle ungültigen aktiven Ticketpositionen erweitern und Mengen-/Trim-Handling unverändert lassen.
4. `TicketCheckoutFormState` um den reaktiven Zugriff auf Pflichtfeldfehler ergänzen.
5. `ticketCheckoutFormStateCreate` um Submit-Tracking, Fehleraggregation und die exakte Pflichtfeldmeldung erweitern.
6. Kontakt- und Teilnehmer-Änderungshandler auf feldweises Hinzufügen/Entfernen von Fehlern nach dem Submit umstellen.
7. Teilnehmerfehler bei Warenkorb-/Mengenänderungen mit `ticketParticipantNamesAlign` synchronisieren.
8. `TicketCheckoutForm` mit bedingtem Danger-Styling und `aria-invalid` für ausschließlich fehlerhafte Pflichtfelder ausstatten.
9. Demo-State und `relaxedValidation` auf den erweiterten State-Vertrag abstimmen, ohne das Demo-Verhalten für optionale Kontaktdaten zu ändern.
10. Fokus-Unit-Tests für Mehrfachfehler, exakten Alert-Text, feldweises Korrigieren und optionale Felder ergänzen.
11. Checkout im bestehenden Preview-/Systemdienst im Browser gegen die beschriebenen Submit- und Korrekturpfade prüfen.
12. Format-, Typ- und Testprüfung ausführen und ausschließlich durch diese Änderung verursachte Regressionen beheben.

## Verification

- Initialer Formularzustand: kein Pflichtfeld ist rot und kein Pflichtfeld-Alert ist sichtbar.
- Submit mit leerem Vor-/Nachnamen, ungültiger E-Mail und mehreren leeren Teilnehmernamen: genau `Fülle alle Pflichtfelder aus` erscheint in der bestehenden `role="alert"`-Anzeige; alle genannten Felder sind rot beziehungsweise `aria-invalid="true"`.
- Ein gültiger Kontaktwert, das optionale Telefonfeld und alle gültigen Teilnehmerwerte bleiben bei demselben Versuch unmarkiert.
- Mehrere gleichzeitige Fehler werden vollständig dargestellt; ein Fehler in einem Teilnehmerfeld markiert weder andere Teilnehmerfelder noch Kontaktfelder.
- Ein markiertes Feld wird nach einer gültigen Korrektur sofort entmarkiert; andere Fehler bleiben bestehen. Wird ein Feld nach dem ersten Versuch wieder ungültig, wird nur dieses Feld markiert.
- Leerräume werden wie in den bestehenden Validatoren behandelt; Namen unter zwei Zeichen und formal ungültige E-Mail-Adressen bleiben rot, ein getrimmter gültiger Wert wird akzeptiert.
- Telefon bleibt trotz beliebigem Inhalt unmarkiert. Die fehlende rechtliche Zustimmung zeigt weiterhin ihre separate bestehende Meldung und erhält keine Kontakt-/Teilnehmermarkierung.
- Erfolgreiche Validierung setzt die normalisierten Werte wie bisher fort und sendet keinen Request, solange ein Pflichtfeldfehler besteht; API-/Storage-Fehler behalten ihre bisherigen globalen Texte.
- Die Demo mit `relaxedValidation` bleibt funktionsfähig und markiert dort keine optional behandelten Kontaktfelder als Pflichtfelder.
- Ausführen: fokussierte `bun test`-Tests, anschließend `bun run format:check`, `bun run typecheck` und `bun run test`; Browserprüfung über den vorhandenen Systemdienst/Preview, ohne einen neuen Dev-Server zu starten.

## Status

Task 3 abgeschlossen: Die Teilnehmervalidierung liefert alle ungültigen aktiven Ticketpositionen und behält Mengen- und Trim-Handling unverändert bei. `TicketCheckoutForm` rendert Danger-Styling und `aria-invalid` nur für vom State als ungültig gemeldete Kontakt- und Teilnehmerfelder nach einem Sendeversuch. Typecheck, Tests, `format:check` und eine begrenzte Browserprüfung der Demo sind bestanden. Die Browserprüfung des normalen Checkouts steht noch aus, sofern sie in den verbleibenden Planaufgaben enthalten ist.

## Current Context

- Die Grundlage aus Task 1 liegt in `src/ticketing/TicketRequiredFieldKey.ts` und `src/ticketing/ticketParticipantFieldKeyCreate.ts`: Kontaktfelder und die stabile Teilnehmeridentität `(eventId, tierId, ticketIndex)` können als `TicketRequiredFieldKey` abgebildet werden.
- `src/ticketing/ticketCheckoutFormStateCreate.ts` hält Kontakt, Teilnehmernamen, Zustimmung, `errorMessage` sowie den reaktiven Submit-/Pflichtfeldfehlerzustand; `isFieldInvalid` aggregiert Kontakt- und Teilnehmerfehler und aktualisiert den jeweils geänderten Schlüssel nach einer Korrektur.
- `src/ticketing/ticketContactValidate.ts` prüft getrimmte Namen und E-Mail und liefert die vollständige feldweise Fehlerausgabe unter Beibehaltung der bestehenden Regeln und normalisierten Erfolgsdaten.
- `src/ticketing/ticketParticipantNamesValidate.ts` prüft aktive Ticketmengen und liefert alle ungültigen Teilnehmerfelder zurück; Mengen- und Trim-Handling bleiben unverändert.
- `src/ticketing/TicketCheckoutForm.tsx` setzt `noValidate`, nutzt `Input` aus `#ui/input/input/Input.jsx`, zeigt `state.errorMessage()` als globale `role="alert"` und rendert Danger-Styling sowie `aria-invalid` nur für vom State als ungültig gemeldete Kontakt- und Teilnehmerfelder nach einem Sendeversuch.
- Die bestehenden Änderungs-Handler löschen derzeit bei jeder Eingabe die gesamte globale Meldung. Diese UX bleibt für die globale Meldung erhalten, während der neue Pflichtfeldzustand nur den jeweils geänderten Schlüssel aktualisiert.
- `TicketCheckoutForm` wird sowohl von `/checkout` als auch von `src/demo/ui/DemoCheckout.tsx` verwendet. Eine Erweiterung des State-Vertrags muss daher beide State-Fabriken berücksichtigen; die Demo übergibt weiterhin `relaxedValidation`.
- Es existiert derzeit kein dedizierter UI-Test für `TicketCheckoutForm` oder `aria-invalid`; die neue Regressionabdeckung muss deshalb auf pure State-/Validator-Tests und eine gezielte Browserprüfung mit vorhandenen Testwerkzeugen setzen.
- Typecheck, Tests, `format:check` und die begrenzte Browserprüfung der Demo sind bestanden. Die Browserprüfung des normalen Checkouts steht noch aus, sofern sie in den verbleibenden Planaufgaben enthalten ist.
