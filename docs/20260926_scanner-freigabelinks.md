# Freigabelinks für Ticket-Scanner

## Ziel

Administratoren erstellen personenbezogen benannte Veranstalterlinks ohne Zitadel-Anmeldung. Über einen Link sind Ticketliste und Suche sowie Scanner und Check-in für die ausdrücklich ausgewählten Events ohne SSO verfügbar. Veranstalter und Administratoren erstellen, sehen und widerrufen beliebig viele benannte Helferlinks; Helfer dürfen Tickets suchen und einchecken, aber keine Links verwalten. Alle Links haben ein obligatorisches Ablaufdatum und sind bis zum Widerruf/Ablauf erneut kopier-, öffnungs- und teilbar. Check-ins sind dem jeweiligen Link/Namen zuordenbar. Internetverbindung ist erforderlich; keine Offline-Funktion.

## Entscheidungen und Grenzen

- Ein Link kann mehrere explizit ausgewählte Events abdecken. Helferlinks dürfen nur Events aus dem Veranstalterlink übernehmen; ihre Gültigkeit darf dessen Ablauf nicht überschreiten. Widerruf/Ablauf des Veranstalterlinks entzieht auch seinen Helferlinks den Zugriff.
- Administratoren verwalten Veranstalter- und Helferlinks zentral; Veranstalter verwalten nur die aus ihrem Link erzeugten Helferlinks. Helferlinks können selbst keine Links erstellen. Öffentliche Scanner- und Ticketseiten funktionieren ohne SSO; die bestehenden Zitadel-geschützten Organizer-/Admin-Routen und deren Berechtigungen bleiben unverändert.
- Ein Link ist ein Bearer-Geheimnis wie bei `../assets-service` (authentifizierte Ausgabe, öffentliche zeitlich begrenzte Verwendung). Für die verlangte erneute Anzeige muss der Linkcode für autorisierte Verwalter abrufbar bleiben. Kryptografisch zufälligen Code verwenden, in Logs nicht ausgeben; serverseitig bei jedem Aufruf Status, Ablauf, Eventumfang und Elternlink prüfen. Keine persönlichen Daten im öffentlichen Link-Metadaten-Endpunkt über die notwendigen Event-/Linknamen hinaus.
- Ticketdaten/Check-in-Regeln (falsches Event, unbezahlt, storniert, bereits eingecheckt) müssen serverseitig unverändert gelten. Audit-Historie speichert Namen und Linkidentität; bestehende Benutzer-Historie bleibt kompatibel. Reset/Reversal ist über Freigabelinks nicht notwendig.
- Vorhandene `#ui/...`-Komponenten und installierte Bibliotheken aus `package.json` verwenden; keine neue Authentifizierungs- oder Scanner-Bibliothek.

## Umsetzung

1. **Backend-Daten und Rechte:** Convex-Tabelle für Veranstalter-/Helferlinks mit Code, Name, Eventkeys, Rolle, Ersteller/Elternlink, Ablauf und Widerruf ergänzen. Admin-Erstellung/-Liste/-Widerruf für Veranstalter- und Helferlinks sowie Veranstalter-Helfer-Erstellung/-Liste/-Widerruf mit strikten Rollen-, Scope- und Ablaufprüfungen implementieren. Öffentlichen Linkkontext bereitstellen; Events beim Erstellen validieren. Fokussierte Convex-Tests.
2. **Öffentliche Ticketfunktionen:** Eigenständige linkbasierte Event-/Ticketlisten-, Detail-/Historie- und Check-in-Endpunkte ergänzen, ohne Sessionauth optional zu machen. Bestehende Sicherheits-/Ticketvalidierung teilen, Eventzugriff serverseitig pro Anfrage prüfen, Link-/Namen-Audit ergänzen. Fokussierte Convex-Tests für Ablauf/Widerruf/Elternlink, fremde Events, ungültige Tickets, Doppel-Check-in und Attribution.
3. **Client-Anbindung:** Öffentliche Serverfunktionen/Datenschnittstelle für vorhandene Organizer-Listen-, Detail- und Scannerzustände einführen. Neue öffentliche Link-Routen mit Eventauswahl und Eventdetail bereitstellen; Token nicht über die Zitadel-Routen leiten. Linkrollen steuern Helferverwaltung. Fokussierte State-/Adapter-Tests.
4. **Linkverwaltung und Teilen:** Admin-Oberfläche zum Anlegen, Anzeigen und Widerrufen von Veranstalter- und Helferlinks mit Name, Event-Mehrfachauswahl und Pflicht-Ablaufdatum. Auf öffentlicher Veranstalterseite gleiche Verwaltung für Helferlinks innerhalb der erlaubten Events. Pro Link Kopieren, Öffnen und natives Teilen (mit funktionalem Fallback) anbieten, Shared-UI-Komponenten nutzen.
5. **Abschlussprüfung:** Betroffene Typechecks und gezielte Unit-/Convex-Tests; danach Browserprüfung durch Browser-Subagent der Admin- und öffentlichen Strecken, sofern lokale Umgebung verfügbar. Keine vollständigen E2E-Suiten bei einzelnen Implementierungsschritten.

## Status

- [x] 1. Backend-Daten und Rechte
- [x] 2. Öffentliche Ticketfunktionen
- [x] 3. Client-Anbindung
- [x] 4. Linkverwaltung und Teilen
- [x] 5. Abschlussprüfung

Die Scannerlink-Funktionen sind in der Entwicklungsinstanz bereitgestellt. Admin- und öffentliche Veranstalter-/Helferstrecken einschließlich Check-in, Audit-Zuordnung, Widerruf und Teilen sind geprüft. Ein QR-Scan mit einer echten Gerätekamera bleibt geräteabhängig; manueller Ticketcode und die Scannerlogik sind abgedeckt.
