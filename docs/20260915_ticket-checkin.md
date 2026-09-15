# Ticket-Check-in für Veranstalter

## Goal

Eine deutsch- und englischsprachige Veranstalteroberfläche für Ticketlisten, manuellen Check-in und Kamera-QR-Check-in auf dem bestehenden Convex-Backend. Zusätzlich vollständig klickbare, backendunabhängige visuelle Demos und durch Admins verwaltbare Zitadel-Rollen.

## Decisions

- `/organizer` verlangt Anmeldung und Organizer- oder bestehenden Admin-Zugriff. Alle Nutzer mit `/admin`-Zugriff erhalten sämtliche Organizer-Funktionen.
- Organizer sehen sämtliche Events mit Veranstaltungsbeginn ab ihrem Einladungszeitpunkt; keine Event-Zuweisungen. Admins sehen Events ohne Datumsbeschränkung. Vergangene Events bleiben entsprechend dieser Regel zugänglich.
- Der Einladungszeitpunkt wird serverseitig gespeichert. Bei direkter Organizer-Zuweisung an ein bestehendes Mitglied gilt der Zuweisungszeitpunkt als Einladung; vorhandene tatsächliche Einladungszeitpunkte werden verwendet. Wiederholtes Speichern einer aktiven Zuweisung verändert den Zeitpunkt nicht. Eine erneute Einladung nach Entzug beginnt einen neuen Zugriffszeitraum.
- Fachliche Rollen: `customer`, `organizer`, `admin`, verwaltet in Zitadel. Bestehende `user` werden auf `customer` abgebildet; bestehender `admin`-/`dev`-Zugriff bleibt erhalten. Keine separate Event-Berechtigungsverwaltung.
- `/organizer`: alle berechtigten Events, chronologisch aufsteigend nach Beginn, gruppiert unter lokalisierten Datumsüberschriften; Einträge mit Bild, Name und Uhrzeit.
- `/organizer/event/$eventId`: alle Tickets aller Kunden des Events, Suche nach Teilnehmer- und Käufername, auswählbare Ticketdetails mit Ticketnummer, eigenem Teilnehmernamen, Käufer-E-Mail und EUR-Preis.
- Jedes Ticket erhält einen eigenen, beim Kauf erfassten Teilnehmernamen. Käuferkontakt bleibt separat. Alttickets bleiben nutzbar und zeigen bei fehlendem Teilnehmernamen ausdrücklich den Käufer als Ersatz an; keine erfundenen Teilnehmerdaten.
- „Bezahlt“ und „Storniert“ sind reine Anzeigen. „Eingecheckt“ wird als primärer Zustand hervorgehoben; der Check-in ist die primäre Aktion. „Nicht eingecheckt“ wird angezeigt und ist nach Check-in als Rücksetzen-Aktion verfügbar, ausdrücklich auch zum Testen.
- Check-in erfolgt pro ausgestelltem Ticket, ausschließlich bei bezahltem und nicht storniertem Ticket. Keine zusätzliche zeitliche Einlasssperre.
- Parallele oder wiederholte Check-in-Versuche werden atomar abgelehnt. Die Meldung nennt vorherigen Check-in-Zeitpunkt, vergangene Zeit, Teilnehmer/Käufer und Ticketnummer sowie den ausführenden Organizer, soweit vorhanden.
- Rücksetzen entfernt den aktiven Check-in, bewahrt aber die Historie. Danach ist erneuter Check-in möglich.
- QR-Scan prüft das ausgewählte Event und checkt gültige Tickets automatisch ein. Erfolg und Ablehnung erhalten unterschiedliche Töne und sichtbare Rückmeldung. Kamera-Berechtigungsfehler erhalten verständliche Hinweise; manueller Check-in bleibt verfügbar.
- `/demo/organizer` und `/demo/organizer/event/xyz` spiegeln sämtliche Organizer-Seiten einschließlich Ticketdetails und Scannerzuständen ohne Authentifizierung oder Backend. `/demo` listet alle vorhandenen und neuen Demos. Demo-Navigation bleibt im Demo-Bereich; Zustände lassen sich mit reduzierter Validierung durchspielen.
- Sämtliche neuen Seiten, Aktionen, Statusanzeigen, Fehler und Demo-Inhalte unterstützen DE/EN mit vorhandener i18n-Infrastruktur.

## Approach

- Bestehende Solid-/TanStack-Routen, Convex-Module, Testwerkzeuge und Bibliotheken verwenden. UI-Komponenten aus `#ui/...` wiederverwenden. Bei TS/TSX den `code-style`-Skill beachten.
- Zitadel bleibt die maßgebliche Quelle für die neuen Rollen. Vorhandene lokale CLI-/Library-Möglichkeiten prüfen, insbesondere `@adaptive-ds/zitadel-cli`; serverseitige Rollenverwaltung auf deren unterstützter Schnittstelle aufbauen. Keine CLI-Prozesse im Browser oder Convex-Mutationspfad.
- Rollen und Einladungskontext für Convex-Autorisierung synchronisieren. Admin-Zuweisung und -Entzug erst als erfolgreich melden, wenn Provider und lokale Autorisierung konsistent sind. Geschützte Queries und Mutationen lesen aktuelle Berechtigungen statt sich auf alte Browserprofile zu verlassen. Auch außerhalb der App geänderte Zitadel-Rollen müssen über einen unterstützten Synchronisationsmechanismus berücksichtigt werden.
- Zentrale Convex-Organizer-Autorisierung für Eventliste, Ticketliste, QR-Auflösung, Check-in und Rücksetzen; Datum anhand tatsächlicher Zeitwerte vergleichen. Bestehende Formatierungs-/Zeitzonenkonventionen für die Anzeige beibehalten.
- Teilnehmerdaten durch Checkout, Reservierung/Bestellung und Ticketausstellung bis Wallet und Organizerliste führen; stabile Zuordnung bei mehreren Positionen und Stückzahlen erhalten.
- Ticketcode-Index für eindeutige Auflösung verwenden; Convex-Indizes erzwingen keine Eindeutigkeit, daher diese in Erstellung/Lookup prüfen. Bestehende individuelle Ticket-QR-Codes weiterverwenden; Bestellcodes dürfen nicht mehrere Tickets gleichzeitig einchecken.
- Zahlung und Ticketgültigkeit serverseitig prüfen. Da bisher kein ausdrücklicher Stornierungszustand besteht, ein minimales Ticket-Stornierungsmerkmal mit sicherem Standard ergänzen und in Anzeige/Einlassprüfung berücksichtigen; keine Storno-, Erstattungs- oder Zahlungsbearbeitungsfunktion hinzufügen.
- Check-in-Zustand und Historie in Convex speichern. Validierung, Duplikatprüfung und Zustandsänderung erfolgen in einer Transaktion; strukturierte Ergebnisse für Erfolg, bereits eingecheckt, falsches Event, unbekanntes Ticket, unbezahlt, storniert und fehlende Berechtigung.
- Kamera-Decoder zuerst anhand bestehender Bibliotheken auswählen; falls nötig eine geeignete Scanner-Abhängigkeit ergänzen. Wiederholte Kameraframes entprellen, ohne die atomare Backend-Prüfung zu ersetzen. Töne erst nach bestätigtem Serverergebnis; Kamera beim Verlassen stoppen.
- Gemeinsame Organizer-Ansichten mit Live- und lokalen Demo-Daten betreiben. Demo-Fälle: leer/befüllt, Namenssuche, bezahlt, storniert, erfolgreicher Check-in, Duplikat mit Zeitangabe, falsches Event, unbekannter QR-Code, Rücksetzen, Kamerafehler.

## Tasks

Aufgaben 1–8 und 10 sind abgeschlossen. Aufgabe 9 ist implementiert; echte Gerätekamera bleibt separat abzunehmen. Aufgabe 11 ist für die Entwicklungsinstanz durchgeführt; produktive Konfiguration und Migrationsabnahme bleiben offen. Die Entwicklungsinstanz verwendet den vorhandenen gespeicherten Zitadel-CLI-Bearer-Zugang; Convex-Funktionen und Entwicklungsumgebung sind synchronisiert. Projektrollen `customer`, `organizer` und `admin` sind vorhanden; bestehende zusätzliche Rollen bleiben erhalten. Scanner dekodiert bestehende Wallet-QR-Codes mit ZXing. Neue Käufe erfordern serverseitig Teilnehmernamen; Alttickets bleiben lesbar. Externe Rollenanpassungen werden alle fünf Minuten synchronisiert.

1. [x] **Rollenintegration festlegen und vorbereiten.** Unterstützte Zitadel-CLI-/Library-Schnittstelle, Projektrollen, Identitätszuordnung und Synchronisationsweg konkret prüfen; Rollen-/Einladungsdatenmodell und kompatible Migration vorbereiten. Bestehende Admin-Berechtigungen testen.
2. [x] **Organizer-Autorisierung implementieren.** Globale Rollenprüfung und Event-Datumsgrenze in Convex; aktuelle Berechtigungen einschließlich Entzug durchsetzen. Tests für Kunden, Organizer, Admins, bestehende Dev-Admins und exakte Datumsgrenze.
3. [x] **Admin-Rollenverwaltung anbinden.** Mitglieder suchen/anzeigen und Organizer-Rolle über Zitadel zuweisen/entziehen, Einladungskontext speichern, DE/EN ergänzen. Provider-/Convex-Konsistenz und bestehende Sitzungen testen; Admin-UI im Browser prüfen.
4. [x] **Teilnehmerdaten im Backend ergänzen.** Checkout-Verträge, Bestell-/Ticketdaten, Ausstellung und Altticket-Kompatibilität anpassen. Mehrere Tickets, Positionen, Events und wiederholte Zahlungsbenachrichtigungen testen.
5. [x] **Teilnehmernamen im Kaufprozess erfassen.** Pro Ticket eigenes Pflichtfeld, stabile Zuordnung und Anzeige im Wallet; vorhandene UI-Komponenten und DE/EN verwenden. Kaufablauf mit mehreren Tickets im Browser prüfen.
6. [x] **Organizer-Lesezugriffe implementieren.** Autorisierte Eventliste mit Bildern/Zeiten sowie Ticketliste, Namenssuche und Detaildaten, einschließlich Zahlung und minimalem Stornierungsmerkmal. Grenzfälle und unberechtigte Direktzugriffe testen.
7. [x] **Atomaren Check-in und Rücksetzen implementieren.** Ticketcode-Auflösung, Event-/Zahlungs-/Stornierungsprüfung, Historie und strukturierte Fehlermeldungen. Gleichzeitige doppelte Anfragen, falsche Events, ungültige Codes, Rücksetzen und erneuten Check-in in Convex testen.
8. [x] **Organizer-Oberfläche implementieren.** Geschützte Routen, datumsgruppierte Eventliste, durchsuchbare Ticketliste, Details, Status und manuelle Aktionen, DE/EN sowie Navigation für berechtigte Nutzer. Mobile und Desktop im Browser prüfen.
9. [ ] **Kamera-Scan und Rückmeldungen ergänzen.** QR-Decodierung, automatischen Check-in, unterscheidbare Töne, sichtbare Ergebnisse und Kameralebenszyklus integrieren. Erfolg, Duplikat und Ablehnungen per Browser mit kontrollierten Kamera-/QR-Eingaben prüfen; echte Gerätekamera separat abnehmen.
10. [x] **Visuelle Demos ergänzen.** Alle Organizer-Seiten mit lokalen Fixtures, Scanner-Simulation, Rücksetzen und klickbarer Navigation unter `/demo/organizer/*`; sämtliche Demos in `/demo` auflisten. Backendunabhängigkeit und DE/EN im Browser prüfen.
11. [ ] **Gesamtabnahme durchführen.** `bun run convex:codegen`, `bun run typecheck`, `bun run test`, `bun run test:convex` und `bun run check` ausführen. Browserprüfung von Rollenverwaltung, Datumssichtbarkeit, Teilnehmernamen, manuellem/QR-Check-in, Duplikatmeldung, Rücksetzen und Demos in beiden Sprachen. Abhängigkeiten zur produktiven Zitadel-Konfiguration und Datenmigration vor Freigabe anwenden.
