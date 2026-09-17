---
title: Datenschutzerklärung
---

# Datenschutzerklärung

Diese Datenschutzerklärung informiert darüber, welche personenbezogenen Daten im Zusammenhang mit der öffentlichen Eventoren-Webanwendung verarbeitet werden. Eventoren ist ein Projekt von Semesterkur.

## 1. Verantwortlicher

Verantwortlicher für die Verarbeitung personenbezogener Daten ist:

Semesterkur UG (haftungsbeschränkt)<br>
Ernst-Weyden-Straße 15<br>
51105 Köln<br>
E-Mail: [kontakt@semesterkur.de](mailto:kontakt@semesterkur.de)

## 2. Nutzung der Website

Bei der Nutzung der Website werden die Daten verarbeitet, die für die Auslieferung der angeforderten Seiten, die technische Sicherheit und die Bearbeitung deiner Eingaben erforderlich sind. Dazu können insbesondere die von dir übermittelten Inhalte sowie technische Informationen zur Verbindung gehören.

Die konkrete Protokollierung und Speicherdauer der technischen Zugriffsdaten ist in der vorliegenden Repository-Konfiguration nicht festgelegt. Eine weitergehende Aussage zu einzelnen Server-Log-Feldern oder festen Löschfristen wird deshalb nicht getroffen.

Die Verarbeitung erfolgt zur Bereitstellung der Website und, soweit du Funktionen nutzt, zur Durchführung der von dir angeforderten vorvertraglichen oder vertraglichen Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO). Für die technische Sicherheit und den stabilen Betrieb besteht ein berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO).

## 3. Speicherung im Browser

Die Anwendung speichert bestimmte Funktionsdaten lokal in deinem Browser. Dazu gehören:

- `eventoren.ticketCartDraft.v1` für den Warenkorb,
- `eventoren.ticketContactDraft.v1` für den Checkout-Entwurf der Kontaktdaten,
- `eventoren.ticketOrderAccess.v1` für den lokalen Zugriff auf Bestellungen,
- `eventoren.ticketOrders.v1` für den lokalen Ticket- und Bestellstatus,
- `eventoren.themeMode.v1` für die gewählte Darstellung sowie
- `userSessions` und `userSession` für lokal beziehungsweise sitzungsbezogen gespeicherte Anmeldedaten.

Diese Daten werden nicht allein durch ihre Speicherung im Browser an uns übermittelt. Du kannst lokale Speicher- und Sitzungsdaten über die Einstellungen deines Browsers löschen. Für die genannten lokalen Speicherungen ist in der Anwendung keine einheitliche automatische Löschfrist hinterlegt.

Für Anmeldung und Sitzung verwendet die Anwendung außerdem folgende technisch erforderliche Cookies:

- `eventoren-session` ist ein HttpOnly-Cookie mit `SameSite=Lax` und einer maximalen Laufzeit von 30 Tagen.
- `eventoren-zitadel-login` unterstützt den Anmeldevorgang und läuft nach 10 Minuten ab.
- `eventoren-logout` markiert einen Logout kurzzeitig und läuft nach 10 Sekunden ab.

Die Cookies werden auf HTTPS-Verbindungen zusätzlich mit `Secure` gesetzt. Sie dienen ausschließlich dem Anmelde-, Sitzungs- und Logout-Ablauf; eine Einwilligung ist für diese technisch erforderlichen Funktionen nicht erforderlich.

## 4. Benutzerkonto und Anmeldung

Die Anmeldung kann über die in der Anwendung angebotenen Anmeldeverfahren erfolgen. Für den OpenID-Connect-Anmeldevorgang ist in der Konfiguration der Dienst `https://auth.contentoren.de` als Aussteller hinterlegt. Dabei werden die für die Authentifizierung erforderlichen Identitäts- und Kontaktdaten verarbeitet, insbesondere die E-Mail-Adresse sowie die vom Identitätsanbieter übermittelten Benutzerinformationen.

Der Betreiber, der Speicherort, die konkreten Löschfristen und die datenschutzrechtliche Rolle des Betreibers von `auth.contentoren.de` sind im Repository nicht dokumentiert. Diese Angaben müssen vor einer rechtlich abschließenden Veröffentlichung ergänzt und geprüft werden.

## 5. Ticketkauf und Bestellungen

Ein Ticketkauf ist als Gast möglich. Für einen Checkout verarbeitet die Anwendung die von dir eingegebenen Kontaktdaten:

- Vorname und Nachname,
- E-Mail-Adresse,
- optional eine Telefonnummer,
- den Namen der teilnehmenden Person für jedes Ticket sowie
- die ausgewählten Veranstaltungen, Ticketstufen, Mengen und Bestellinformationen.

Die Daten werden zur Reservierung und Abwicklung der Bestellung, zur Zahlungszuordnung, zur Bereitstellung des digitalen Tickets und zur Beantwortung von Bestellfragen verarbeitet. Die Ticketbestätigung wird an die angegebene E-Mail-Adresse versendet. Für angebotene Veranstaltungen kann ein Eventoren-Ticket außerdem als Apple- oder Google-Wallet-Pass bereitgestellt werden.

Die Verarbeitung erfolgt zur Durchführung vorvertraglicher Maßnahmen und des Ticketkaufvertrags (Art. 6 Abs. 1 lit. b DSGVO). Die Aufbewahrung kann außerdem erforderlich sein, um gesetzliche Pflichten zu erfüllen oder Ansprüche zu prüfen.

### Weitergabe an Veranstalter

Für die Durchführung einer Veranstaltung werden die hierfür erforderlichen Daten an den jeweils zuständigen Veranstalter übermittelt. Dazu können insbesondere Name, E-Mail-Adresse, Telefonnummer, Teilnehmername sowie Ticket- und Buchungsdaten gehören. Der jeweilige Veranstalter verarbeitet diese Daten als eigener Verantwortlicher. Für dessen Datenverarbeitung gelten die Datenschutzhinweise des jeweiligen Veranstalters.

### Zahlungsabwicklung

Für die Erstellung und Abwicklung einer Zahlung übermittelt die Anwendung Bestell- und Kontaktdaten an den konfigurierten Eventoren-Billing-Dienst. In der Produktionsbeispielkonfiguration dieses Repositorys ist der Stripe-Modus `live` hinterlegt. Der konkrete Zahlungsdienstleister, die verantwortliche beziehungsweise auftragsverarbeitende Rolle, die verarbeiteten Zahlungsdaten, die Speicherfristen und die Übermittlung in Drittstaaten sind im Repository nicht vollständig dokumentiert. Diese Angaben sind vor einer rechtlich abschließenden Veröffentlichung zu ergänzen und zu prüfen.

## 6. Eingesetzte Dienste und nicht belegte Analysewerkzeuge

Das Repository belegt den Betrieb der Webanwendung, eines Convex-Backends, des konfigurierten OpenID-Connect-Dienstes und des Billing-Dienstes. Das Frontend wird mit Cloudflare Pages ausgeliefert; als öffentliche Backend- und Authentifizierungsadressen sind unter anderem `eventoren-convex.contentoren.de`, `eventoren-api.contentoren.de` und `auth.contentoren.de` konfiguriert.

Die konkrete Betreiber- und Auftragsverarbeiterstruktur, die Serverstandorte, die Auftragsverarbeitungsverträge und die Drittlandübermittlungen dieser Dienste sind im Repository nicht vollständig angegeben. Sie dürfen daher nicht als abschließend geklärt vorausgesetzt werden.

Im aktuellen Anwendungscode sind keine Funktionen für Google Analytics, Meta Pixel, Newsletter, soziale Plugins, Google Maps, YouTube oder vergleichbare Marketing- und Analysewerkzeuge belegt. Die frühere generische Beschreibung solcher Werkzeuge wird nicht Bestandteil dieser Datenschutzerklärung.

## 7. Speicherdauer

Personenbezogene Daten werden gelöscht, sobald der Zweck der Verarbeitung entfällt und keine gesetzlichen Aufbewahrungspflichten oder die Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen entgegenstehen. Konkrete Aufbewahrungsfristen für Konten, Bestellungen, Zahlungsdaten und technische Protokolle sind in der vorliegenden Repository-Konfiguration nicht festgelegt. Eine verbindliche Frist kann deshalb an dieser Stelle nicht genannt werden.

## 8. Deine Rechte

Du hast nach Maßgabe der gesetzlichen Voraussetzungen das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit. Einer Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. e oder f DSGVO kannst du aus Gründen widersprechen, die sich aus deiner besonderen Situation ergeben. Soweit eine Verarbeitung auf einer Einwilligung beruht, kannst du diese mit Wirkung für die Zukunft widerrufen.

Zur Ausübung deiner Rechte genügt eine Nachricht an [kontakt@semesterkur.de](mailto:kontakt@semesterkur.de). Außerdem hast du das Recht, dich bei einer Datenschutzaufsichtsbehörde zu beschweren.
