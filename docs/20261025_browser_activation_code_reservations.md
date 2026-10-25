# Browsergebundene Freischaltcode-Reservierung

## Ziel

Den bestehenden sichtbaren Kaufablauf unverändert lassen. Ein gültiger Freischaltcode wird ab Eingabe serverseitig exklusiv für denselben Browser reserviert. Zurückgehen, Neuladen und erneute Eingabe sind innerhalb von 15 Minuten möglich. Nach vertrauenswürdig bestätigtem Stripe-Checkout-Abschluss bleibt der Code unabhängig vom Browser bis zum endgültigen Zahlungsergebnis reserviert. Erst endgültig bezahlte Bestellungen verbrauchen den Code; endgültig unbezahlte fehlgeschlagene/abgelaufene Zahlungen geben ihn frei.

## Grenzen

- Keine neuen Ansichten, Buttons, Texte oder Komponenten. Interne Browser-Speicher-/Prüflogik darf angepasst werden.
- Keine Testkäufe, manuellen Produktionsdatenänderungen, Datenmigrationen oder Änderungen im benachbarten Billing-Projekt. Vom Nutzer beauftragtes Produktions-Deployment ausschließlich nach vollständiger Abschlussprüfung; nachfolgend nur lesende Funktions-/Erreichbarkeitsprüfung.
- Keine Änderungen an Stripe-Anbindung, Zahlungsmethoden, Preisen, Ticketmengen, Bestandsberechnung, Einlass, Erstattungen oder bezahlten Stornos. Bestehende SEPA-Frühausstellung von Tickets bleibt erhalten; deren Code darf dabei noch nicht verbraucht werden.
- Historisch bezahlte/verbrauchte Codes bleiben gesperrt. Bereits früh ausgestellte, aber noch unbezahlte Altbestellungen dürfen bei eindeutigem Fehlschlag nur nach belegtem eigenen Besitz freigegeben werden; keine pauschale Bereinigung.
- Bestehende uncommittete Änderungen in anderen Dokumenten weder verändern noch committen. Nur die geprüfte Feature-Änderung in konventionelle Commits aufteilen, auf den konfigurierten Remote pushen und anschließend gezielt ausrollen.

## Verbindlicher Ablauf

1. Erste gültige Codeeingabe: atomare Reservierung mit einem nicht erratbaren Browser-Bearer-Credential. Der Server speichert nur dessen Digest und `browserHoldExpiresAt = serverNow + 15 Minuten`. Wiederholte Eingabe verlängert diese Frist nicht.
2. Derselbe Browser kann den Code mit diesem Credential erneut validieren. Andere Browser und falsche Credentials erhalten weiterhin nur eine generische ungültige Antwort. Normalisierung und Event-/Produktbindung bleiben erhalten.
3. Ohne Bestellung: nach Ablauf sichere Freigabe, auch bei nicht mehr geöffnetem Browser. Scheduler und opportunistische Ablaufprüfung dürfen nur genau die noch aktuelle Reservierung freigeben.
4. Beim Checkout wird ausschließlich die eigene Reservierung atomar der Bestellung zugeordnet; pro Code weiterhin höchstens eine aktive Bestellung. Die bisherige Order-/Code-Historie wird erst bei Zuordnung angelegt. Code-gebundene Bestellungen übernehmen die früheste zugehörige Hold-Frist statt erneut 15 Minuten zu erhalten. Bestellungen ohne Codes bleiben unverändert.
5. Zurück/Abbruch und erneutes Absenden derselben Buchung müssen denselben Checkout-Key und dieselben Gäste-Credentials wiederverwenden. Keine zweite Stripe-Session, kein zweiter aktiver Code-Besitzer. Die bestehende Prüfung des kanonischen Buchungskontexts bleibt strikt; geänderte Buchungen dürfen nicht stillschweigend als alte Buchung bezahlt werden.
6. Nur serverseitig belegtes `checkoutCompletedAt` mit dem passenden Billing-/Stripe-Status bindet die Reservierung an den laufenden Zahlungsvorgang. Eine angelegte Checkout-URL, ein Browser-Redirect oder Client-Zeitstempel reichen nicht. Ab dann bewirken Ablauf des Browser-Speichers und Löschen des Caches keine Freigabe.
7. Bei SEPA `pending + checkoutCompletedAt + sepa_debit + processing` bleibt der Code reserviert, auch wenn bestehende Logik Tickets früh ausstellt. Wiederholte Statusmeldungen sind idempotent.
8. Endgültiges `paid` verbraucht den Code auch dann, wenn die Tickets schon vorher ausgestellt wurden. Die spätere Auszahlung aufs Bankkonto ist irrelevant.
9. Definitiver unbezahlter Fehlschlag/Abbruch/Ablauf gibt den eigenen Code frei. Bestehende Ticketstorno-/Bestandsroutinen weiterverwenden; bei fehlgeschlagener Frühausstellung keine gültigen Tickets hinterlassen. Einmal tatsächlich bezahlte Codes, Erstattungen/Disputes und fremde neuere Reservierungen werden dadurch nicht freigegeben.
10. Unklarer Zahlungsstatus oder Providerfehler ist kein Nachweis eines unbezahlten Endstatus. Vorhandene Billing-Ablauf-/Reconcile-Absicherung beibehalten. Ablauf einer offenen Stripe-Session erfolgt ausschließlich über den bestehenden sicheren Expire-Pfad.

## Technischer Ansatz

- Additive optionale Browser-Hold-Felder auf `ticketActivationCodes`: `browserHoldDigest` und `browserHoldExpiresAt`. Bestehende Statuswerte `available|reserved|consumed` behalten. Ein Vorab-Hold hat noch keine `orderId`/Order-Historie; nach Zuordnung gelten die bestehenden Order-Invarianten.
- Neue atomare Convex-Reservierungsmutation mit normalisiertem Code, Event-/Produktkontext und optionalem Credential. Ergebnis nur Validität sowie eigenes Credential/Ablaufzeit; keine fremden Bestell-/Kundendaten. Vorhandene Kryptografie-/Tokenmuster wiederverwenden.
- Bestehende reine Validate-Query für Kompatibilität erhalten. Neue Browserlogik verwendet die Reservierungsmutation über den bestehenden TS-Validierungswrapper. Öffentliche Queries dürfen keine Reservierungen erzeugen.
- Neue interne Ablauf-Funktion: vor Zuordnung nur noch passenden, abgelaufenen Hold freigeben; nach Zuordnung den bestehenden Order-Expire-/Billing-Pfad verwenden. Keine blinde Freigabe angehängter oder zahlungsgebundener Codes.
- Optionales `activationCodeHoldToken` pro Checkout-Ticketzeile bis Prepare durchreichen. Bestehende Aufrufer ohne Token bleiben für verfügbare Codes kompatibel; ein bestehender fremder Hold darf niemals umgangen werden.
- Browser-Credentials separat vom 24-Stunden-Warenkorb speichern, mit festem serverseitigem Ablauf. Sichere Storage-Helfer und gemeinsame Valibot-Schemas/abgeleitete Typen gemäß vorhandenen Mustern verwenden. Keine Credentials in Admin-Listen/Exporten/Logs.
- Für Code-Buchungen vor dem ersten Netzwerk-Submit einen lokal wiederverwendbaren Retry-Datensatz speichern. Exakt gleiche Buchungsdaten verwenden denselben Checkout-Key, denselben Gästezugang und unveränderte ursprüngliche Checkout-Evidenz. Material geänderte Daten nicht stillschweigend wiedergeben; bestehende Kontext-/Ownership-Prüfungen nicht abschwächen. Code-freie Buchungen unverändert lassen.
- Code-Lifecycle von Ticket-Ausstellung entkoppeln: frühe Ausgabe prüft/bindet, verbraucht aber nicht; finaler Paid-Pfad verbraucht explizit auch bei vorhandenen Tickets. Freigabe historischer früher Consumption nur eng auf die eigene definitiv unbezahlte Bestellung begrenzen.
- Vor allen Schreiboperationen alle nötigen Invarianten prüfen: Result-Fehler rollen Convex-Schreiboperationen nicht automatisch zurück. UTC im Convex-Runtime beibehalten.

## Oberflächen / bewusste Abweichung

Die Änderung betrifft die bestehende öffentliche Code-Prüfung/Kaufstrecke, keine neue Veranstalter-Funktion. Exposition über Convex-Mutation, vorhandenen TS-Client und generische Convex-CLI; bestehende Admin-Live-Query zeigt `Reserviert` ohne UI-Erweiterung. Kein neuer Hono-Endpunkt, keine neuen fachlichen CLI-Kommandos/MCP-Tools: dafür müsste eine zusätzliche anonyme Browser-Credential-Oberfläche geschaffen werden, die für diesen gezielt begrenzten Kauf-Fix nicht erforderlich ist. Bestehende Server-/Client-Checkout-Aufrufer erhalten ausschließlich optionale Felder. Gemeinsame Valibot-Schemas für neue öffentliche Eingaben und Storage verwenden, Convex-Validatoren als dünne Wrapper im vorhandenen Muster.

## Arbeitspakete und Status

- [x] 1. Server-Hold-Grundlage: additive Felder, Reservierungsmutation, sichere Ablaufbehandlung, Exporte/Katalog und fokussierte Tests. Noch keine Browser-/Zahlungsänderungen.
- [x] 2. Checkout und Zahlung: eigenes Hold adoptieren, feste Frist, Replay-Invarianten, Code-Lifecycle von Frühausstellung trennen, endgültiges Paid/Failed korrekt behandeln; fokussierte Convex-Tests.
- [x] 3. Interne Browserlogik: 15-Minuten-Credential-Storage, Wrapper-/Checkout-Durchreichung und gleicher Checkout-Retry ohne sichtbare Änderungen; fokussierte Unit-/Solid-State-Tests.
- [ ] 4. Integration und unabhängige Prüfung: gezielte Regressionstests, negative Parallelitäts-/Zahlungsfälle, lokale Browserprüfung ohne Produktionsdaten; erforderliche kleine Korrekturen.
- [ ] 5. Abschließende Scope-/Diff-Prüfung und Freigabe der geprüften Änderung zum Rollout.
- [ ] 6. Nach vollständiger Prüfung: Feature-Commits, Push und beauftragtes Produktions-Rollout, Backend vor Frontend; danach nur lesende Erreichbarkeits-/Versionsprüfung, keine Käufe oder Code-Reservierungen zur Verifikation.

## Prüfstrategie

- Nur betroffene Tests ausführen, niemals pauschal alle Tests oder Produktions-E2E. Convex: `bunx vitest run --config vitest.convex.config.ts <explizite Dateien>`. Browser-Solid-Fixtures: `bun --conditions=browser test <explizite fixture>`; übrige Units `bun test <explizite Datei>`.
- Mindestens abdecken: Erstreservierung, gleiches Credential wiederholt ohne Verlängerung, fremdes Credential abgewiesen, parallele Erwerbsversuche, Ablauf ohne Browser, veralteter Timer, Event-/Produktbindung, Hold-Adoption und gleicher Checkout-Replay, keine zweite Billing-Session, keine Rücknahme fremder/bezahlt verbrauchter Codes.
- Zahlungsfälle: offener Checkout läuft sicher ab; Checkout completed/SEPA processing bleibt reserviert über Browserablauf hinaus; Paid nach früher Ticketausgabe verbraucht; definitiver Failed gibt frei und erhält bestehende Ticketstorno-Semantik; Providerfehler/unknown gibt nicht frei; doppelte/vertauschte Meldungen und Spätzahlung stehlen keine neuere Reservierung.
- Regressionen für code-freien Kauf, vorhandene verfügbare/verbrauchte Codes, historische pending-Frühausstellung, bestehende Paid/Refund/Dispute-Verarbeitung und Admin-Code-Liste/Export.
- Generierte lokale Typen nur ohne Remote-Deployment aktualisieren; keine Convex-Codegen-Variante verwenden, die Funktionen nach Produktion/Remote pusht. Browserprüfung ausschließlich lokal mit isoliertem Mock/Fixture bzw. bereits bestehender sicherer Entwicklungsumgebung.

## Aktueller Kontext

Server-Hold-Grundlage (1), Checkout-/Zahlungs-Lifecycle (2) und interne Browserlogik (3) sind implementiert. Backend-Regression, isolierte Browserprüfung und gemeinsame Prüfung der stabilen Client-/Solid-Pfade sind abgeschlossen. In (4) verbleiben feste Retry-Cache-Frist und abschließende Formular-/Typprüfung mit vollständigen Rechts-Snapshots; das Storage-Schema muss diese Evidenzdaten vollständig erhalten. Anschließend (5) und das nun ausdrücklich beauftragte Rollout (6). Bereits vorhandene Produktion gezielt aktualisieren, keine ungefragte Infrastruktur-Neuprovisionierung; additives Backend vor neuem Browser-Bundle bereitstellen. Andere Arbeitskopie-Änderungen bleiben unangetastet und uncommittet.
