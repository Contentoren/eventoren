# Veranstalter-Dashboard: Live-Implementierung und Abnahme

## Auftrag und Grenzen

Die bestätigte Aufgabe ist die Überführung von
`docs/20261018_veranstalter-dashboard-demo.md` in die echte Plattform. Die
bisherige localStorage-Beschränkung gilt nicht für `/veranstalter`; `/demo/...`
behält seine getrennte lokale Datenquelle. **Die Gesamtaufgabe ist nicht fertig.**

- Eigenes Worktree, Branch `feature/veranstalter-dashboard`; Änderungen noch nicht committed.
- Fortsetzung am 21.10.2026: Subagenten übernehmen den Großteil der Arbeit;
  auf Nutzerwunsch bevorzugt MiniMax m3. Der Hauptagent integriert und prüft die
  tatsächlichen Änderungen. Der native m3-Zugang war nicht verfügbar; m3 läuft
  über den im Katalog angebotenen separaten OpenCode-Provider.
- Kein Produktions-Deploy, keine Produktionsmutation, kein Produktions-E2E.
- Produktion wurde ausschließlich lesend exportiert. Import, Migration und
  schreibende Tests sind auf eine isolierte lokale Instanz beschränkt.
- Fremde Änderungen im Haupt-Checkout werden nicht übernommen oder verändert.

## Verbindliche Architektur

1. Bestehende Authentifizierung, `orgs`/Mitgliedschaften, Katalog, Bestellungen,
   Tickets, Billing-Korrelation und Scanner bleiben kanonisch. Kein Demo-State-
   Blob und keine vom Checkout getrennte Live-Ticketdatenbank.
2. Live-UI über Convex-Subscriptions; indexierte, begrenzte/paginierte Listen.
   Rechte werden in jeder Backend-Funktion geprüft, nicht nur durch versteckte Buttons.
3. Gemeinsame Valibot-Schemas und dünne `convex/`-Wrapper. Neue öffentliche
   Operationen auch über Hono, CLI und TS-Client; MCP nur bei vorhandener Integration.
4. `#ui/...` wiederverwenden; TS/TSX gemäß `code-style`, TSX ansichtsorientiert.
5. UTC speichern, Anzeige und Eingaben ausdrücklich `Europe/Berlin`;
   Datumswerte ohne Uhrzeit bleiben Kalendertage. Convex bleibt UTC.
6. Cent und Basispunkte ganzzahlig. Keine simulierten Zahlungen, Erstattungen,
   Rechnungen, Zustimmungen, E-Mails oder Auszahlungen als echte Funktion ausgeben.

## Implementierter erster vertikaler Ausschnitt

- Additive `catalogEvents.orgId` mit Org-/Status-/Zeitindizes und stabilem
  Org-Index für Hintergrundläufe. Bestehende IDs und Zähler bleiben kanonisch.
- Separates optionales `orgMembers.organizerRole` mit `inhaber`, `admin`,
  `eventmanager`, `finanzen`, `einlass`; `member`/`guest` bleibt unverändert.
  Fehlende Rolle ist keine Veranstalterberechtigung; doppelte Mitgliedschaften
  werden verweigert, nicht willkürlich ausgewählt.
- Organisationskontext, Profil, technische Erstellung, Admin-Konfiguration,
  Freigabe/Sperre und Audit. Bank-/Finanzdaten werden nach Rolle gefiltert.
- Live-Routen: Übersicht, Eventliste, Assistent, Details, Einstellungen,
  technisches Onboarding und separate Admin-Org-Verwaltung.
- Event-Entwurf, Bearbeiten, Veröffentlichen, sicheres Archivieren vergangener
  Events, Ticketarten anlegen/bearbeiten/archivieren. Kommende/laufende publizierte
  Events dürfen nicht an einem noch fehlenden Absage-/Erstattungsweg vorbei archiviert werden.
- URL-gesteuerte Org-/Entwurfs-/Schritt-/Ticketart-Auswahl, Wiederaufnahme,
  Schreibrechte, Bestätigungen und Berliner Darstellung sind implementiert;
  authentifizierte Browser-Abnahme ist noch offen.
- 21 öffentliche Operationen über dieselben Convex-Funktionen, TS-Client,
  CLI und Hono POST `/api/veranstalter`. Bounded UTF-8-Request-/stdin-Verarbeitung,
  gemeinsame Eingabeschemas und Credential-sichere Transportfehler.
  Unkodierte Backend-Result-Fehler fallen noch auf `platform.internal`/500 zurück;
  vollständige typisierte fachliche Fehlercodes sind offen. Abweichung vom
  Web-Default: Migrationsoperationen haben bisher CLI/API/TS-, aber keine Web-
  Manifest-Freigabeoberfläche; die explizite Prüfung riskanter Besitz-/Rollen-
  Zuordnungen darf nicht durch automatische UI-Zuordnung ersetzt werden. Eine
  solche Admin-Oberfläche bleibt offen. MCP existiert im Bestand nicht.
- Explizites Admin-Migrationsmanifest: Org-Initialisierung, Event-Zuordnung,
  Veranstalterrollen und Scanner-Freigaben; maximal 25 Operationen, Vorprüfung
  vor Schreibzugriffen, wiederholbar, paginierter Bestell-Org-Backfill.
  Keine Zuordnung nach Anzeigename und keine automatische Rechteerhöhung.
- Bestehender `/organizer`-Bereich bleibt kompatibel; besessene Events prüfen
  zusätzlich kanonische Organisation/Rechte. Globaler Admin-Bypass ist absichtlich
  beibehalten, unzugeordnete Legacy-Events behalten die alte Einladungslogik.

## Datenkopie, Isolation und tatsächlicher Rollback

- Backend `http://127.0.0.1:13470`, HTTP-Site `:13471`; separates Frontend `:13557`.
  Der bestehende Entwicklungsserver `:3057` bleibt unangetastet.
- Gepinntes Backend-Image, einziges Container-Netz intern, ausschließlich
  Loopback-Bindings, geprüfte Deployment-Identität und echter lokaler Admin-Key.
- Keine Produktions-Provider-Credentials; UDF-Umgebung auf lokale Werte begrenzt.
  Private Staging-Funktionen mit leerer Cron-Registrierung. Interne Repricing-
  Jobs sind erlaubt; externe Seiteneffekte bleiben durch Umgebung und Netzwerk gesperrt.
- Private Snapshots/Tokens/Logs außerhalb von Git, restriktive Dateirechte.
  Keine Schlüssel oder personenbezogenen Einzelwerte in Ergebnisprotokollen.
- Original: `~/.local/state/eventoren/local-rehearsal/snapshots/prod-20261020.zip`.
  **33 Daten-Tabellen, 1.250 Dokumente**; `_tables` ist zusätzliche Metadaten,
  nicht die 34. Daten-Tabelle. Kein File-Storage-Blob-Backup.
- Original und erster lokaler Re-Export wurden unabhängig auf identische IDs geprüft.
- Ein **tatsächlicher Rollback** importierte das unveränderte Original.
  `verify/reexport-20261020T123355Z.zip` bewahrt alle ursprünglichen IDs und
  vollständigen kanonischen Felder. Ein `--help`-Aufruf gilt nicht als Restore-Test.
- Zwei deklarierte leere neue Tabellen samt Metadaten führten anfangs zu einem
  falschen Vergleichsfehler. Der korrigierte Comparator erlaubt nur explizit
  deklarierte **leere** Zusatztabellen; geänderte/fehlende Originale, fremde oder
  nichtleere Zusatztabellen und geänderte Original-Tabellen-IDs bleiben Fehler.
  Acht positive/negative Prüfungen einschließlich Dateirechten sind grün.
  Er wurde gegen bestehende private Artefakte geprüft; danach kein neuer Restore.
- Der korrigierte Harness lief anschließend tatsächlich auf der wiederhergestellten
  Kopie: zwei Event-Zuordnungen, 64 Bestellungen, davon nur eine bezahlt.
  Wiederholung schreibt nichts. Zusätzliche reale Rollenprobe auf synthetischen
  Legacy-Mitgliedschaften bewahrt `member`/`guest`, ergänzt nur die ausdrücklich
  zugewiesene Rolle und verweigert die Entfernung des letzten Inhabers.
- Private Belege im lokalen State: `rehearsal/migration-report-20261020T123638.json`,
  `rehearsal/migration-role-coverage-20261020T123725.json` und Restore-Protokoll.
  Diese Datenprobe deckt spätere Scanner-/Repricing-Änderungen nicht automatisch ab.

## Sicherheitsnachprüfung

Zwei unabhängige Muse-Reviewrunden prüften den implementierten Ausschnitt, nicht
alle offenen Funktionen. Die sechs ursprünglichen Befunde wurden nach Quellcode-
und Integrationstestprüfung als behoben bewertet:

- Neue/unbezahlte Checkouts prüfen die kanonische Event-Organisation bei Prepare,
  Replay, Claim und vor URL-Ausgabe. Snapshot-Konflikte werden verweigert.
- Eine weitere URL-Leckage über Käufer-Abfragen wurde danach korrigiert:
  blockierte neue Mark-Antworten speichern Billing-Korrelation, aber keine neue
  Bezahl-URL in Bestellung oder Versuch. Die gemeinsame Käufer-Projektion blendet
  unbezahlte URLs bei verweigertem Verkauf aus, auch wenn externer Ablauf scheitert.
  Zehn Race- und acht Verkaufs-Tests sind grün.
- Bereits bezahlte Abwicklung bleibt gültig. Zuvor extern ausgegebene URLs lassen
  sich nicht atomar zurückrufen; das ist eine dokumentierte Restgrenze.
- Gebührenänderungen setzen eine revisionsgebundene Verkaufsbarriere und begrenzte
  interne Jobs: native Tier-Cursor, stabiler Event-Index, ein `paginate` pro Schritt,
  Event-Revisionssprung in jedem geänderten Batch. Alte Bestellpreise bleiben erhalten.
  13 Tests einschließlich 201 Tiers, Datumsänderung während des Laufs, erstmaliger
  Konfiguration und Legacy-Zuordnung sind grün.
- Event-Zuordnung verlangt Konfiguration und effektiven Inhaber vor Schreibzugriffen.
  Scanner-Link **und** Eltern-Link müssen für übernommene Events dieselbe kanonische
  Organisation binden. Freigaben sind explizit; IDs/Codes bleiben erhalten und
  Capability-Codes erscheinen nicht im Audit. Still unzugeordnete Events bleiben kompatibel.
- Archivierte Ticketarten bleiben intern mit verkauften Mengen sichtbar, öffentlich
  aber unverkäuflich. Kommende Events werden nicht stillschweigend abgesagt.

## Teststand und noch nicht bestandene Browser-Abnahme

Baseline auf unverändertem Worktree mit kopierten Dependencies, ohne private Env:

- `env -i PATH="$PATH" HOME="$HOME" bun run test`: **1.236 pass / 47 fail / 2 Ladefehler**.
- `env -i PATH="$PATH" HOME="$HOME" bunx vitest run --config vitest.convex.config.ts`:
  **373 pass / 13 fail**, vier fehlschlagende Dateien.

Aktueller kanonischer Unit-Gesamtlauf: **1.419 pass / 46 fail / 2 Ladefehler**,
keine neuen fehlschlagenden Namen gegenüber der Baseline (`unit-entry-fixed.log`).
Zwei zwischenzeitlich fehlschlagende Projektions-Mocks boten keinen kanonischen
Event-Read an; der gültige Legacy-Mock und die Vermeidung unnötiger Abfragen ohne
URL sind korrigiert und im Gesamtlauf geprüft. Ein versehentlich unbeschränkter
`bun test`-Lauf schloss Vitest-/E2E-Verzeichnisse ein und ist nicht vergleichbar.
Aktueller vollständiger Convex-Lauf: **470 pass / dieselben 13 fail**, keine neuen
fehlschlagenden Namen (`convex-final-slice.log`). Logs:
`/tmp/eventoren-dashboard-verification/`.

Erneuter optimierter Build auf dem stabilisierten Quellstand ist grün:
Client/Server-Bundles, Boundary-Checks, Cloudflare-Worker und SSR,
**kein Deploy oder Asset-Publish** (`build-final-slice.log`). Convex-Typprüfung,
Boundary- und gezielte Feature-Formatprüfung sind grün. Globale Typprüfung hat
71 Diagnosezeilen in bestehenden API-Key-/Demo-Bereichen, keine in Dashboard,
neuen Routen, Client/CLI, Rehearsal oder neuen E2E-Treibern. Shared-UI-Prüfung
meldet ausschließlich den bestehenden rohen Button in `AdminTicketOrdersPage.tsx`.
Die separate E2E-Typprüfung meldet ebenfalls nur noch bestehende Fehler außerhalb
der neuen Dashboard-Treiber; deren sechs strikten Indexfehler wurden korrigiert.
Alle neuen Dashboard-/Client-/CLI-/Rehearsal-/E2E-Dateien bestehen die gezielte
Formatprüfung. Globale Prüfungen sind damit weiterhin nicht insgesamt grün.
Die letzte rein strukturelle Pricing-Wrapper-Verschiebung nach `src/` wurde mit
Convex-Typprüfung und allen 13 Pricing-Tests geprüft; `convex/` re-exportiert nur.
Einige andere fachliche Hilfen benötigen noch die Ein-Export-Aufteilung.

Die erste anonyme Browserprobe blieb im Skeleton. Eine frische Probe gegen
stabilen Quellcode zeigte tatsächlich „Anmeldung erforderlich“ und „Zur Anmeldung“,
ohne gemeldete Browserfehler oder fehlgeschlagene Requests. Das alte Skeleton
reproduzierte nicht; ein Root-Cause-Fix wird nicht erfunden. Screenshot:
`/tmp/opencode/dash-hydration-followup-veranstalter-ready.png`.

Die ersten authentifizierten Versuche sind **nicht bestanden**: Admin-Konfiguration
warf einen realen Serverfehler; danach waren beide Backend-Host-Ports trotz gesundem
Container nicht erreichbar. Lokaler Neustart unter Erhalt des privaten Datenvolumens
stellte Loopback-Ports und `bootstrap.bash verify` wieder her. Ursache des verlorenen
Forwarders unbelegt. Der Konfigurationsfehler wurde als **falsche Modulreferenz
im E2E-Treiber** belegt: Admin-Funktionen liegen unter `organizerDashboardAdmin`,
nicht `organizerDashboard`. Mit korrekter Referenz bestehen echte lokale SDK-
Aufrufe Erstellen → Detail → Konfiguration → Freigabe; keine App-Korrektur nötig.
Die POSIX-Re-Exec-Sicherung behebt zusätzlich `sh`-Fehler im Bootstrap-Status.
Neu deployter stabiler Stand, frische Fixtures und Convex-Typprüfung sind grün.
Weitere Auth-Proben belegten einen separaten Rehearsal-Fehler: der Deploy rotierte
nur das UDF-`AUTH_SECRET`; `runtime.env` behielt einen statischen Platzhalter.
Ein Frontend-Neustart allein konnte das nicht lösen. Der sichere atomare Sync-
Helper mit fünf positiven/negativen Tests ist nun in den Deploy eingebunden;
`auth-sync-only` repariert ohne Rotation. Tatsächlich wurden das vorhandene lokale
UDF-Secret privat synchronisiert und nur das eigene Frontend neu gestartet.
Beide Fixture-Rollen bestehen jetzt Backend- und Frontend-Session-Identitätsprobe.
Kein Redeploy, keine Token-Rotation oder Backend-Neustart für diese Reparatur.
Der authentifizierte Event-Browserlauf erreichte danach tatsächlich Formular und
Datumsvalidierung, scheiterte aber beim Erstellen des Entwurfs: `mutationCreate`
wurde innerhalb von Submit-Callbacks statt während Solid-Setup aufgerufen;
Provider-Kontext ging verloren (`No Convex client`, serverseitig null neue Events).
Dasselbe Muster betraf Detail-Mutationen. Ein gemeinsamer Setup-Adapter bindet
jetzt alle sechs Mutatoren vor Callback-Aufrufen und liest den Token zur Laufzeit.
Drei Regressionen mit echten Providern und echter `mutationCreate` prüfen auch den
Default-State; wegen globaler Solid-Mocks laufen sie in einem isolierten Prozess.
Die bisherigen Sources-Mocks hatten den Fehler nicht abgedeckt.

Danach bestanden tatsächlich **17 Event-UI-Schritte**: Entwurf, Rückwärtsbearbeitung,
Ticketart ohne Duplikat, Reload mit gleichen IDs, Veröffentlichung, öffentliche
Seite und Detail-Sheet. Der abschließende verstärkte Lauf (`e2e-events-driver-final/`)
prüft zusätzlich echte nichtleere Tarifbeschreibung → Speichern → Wiederöffnen →
Leeren → Speichern mit serverseitigem Inhalts-/ID-Vergleich. Nicht getestete
Readonly-Rollen stehen außerhalb der PASS-Zählung. Der Lauf ist mit 17 tatsächlichen
Prüfschritten und separater Read-Verifikation grün; Artefakte enthalten den
Laufbericht, UI-Aufnahmen und bereinigte Konsolenprotokolle.
20:05 Berlin wurde als 18:05Z gespeichert; die mobile
öffentliche Seite zeigt Datum/Uhrzeit sowie 22,50 € Grundpreis und 23,78 € inklusive
Gebühren korrekt. Desktop 1440×900 und Mobil 390×844 wurden aufgezeichnet; kein
Kauf/Zahlversuch. Belege: `e2e-events-r2-wiz3/` im privaten Prüfverzeichnis.

**15 Onboarding-/Admin-UI-Schritte** bestanden ebenfalls: reale Formulare,
Ausstehend → Admin-Konfiguration/Freigabe → Aktiv live ohne Navigation,
Profil/Bank speichern und Reload, mobiler Drawer/Escape. Belege:
`e2e-onboarding-20261020t140039/`. Das verwendete Org-URL-Workaround zählt aber
nicht als normale Einstiegstauglichkeit: Frame-Gating blockiert Onboarding mit
null bzw. mehreren ungewählten Organisationen; außerdem fehlt dem Erfolgs-Link
die neu erzeugte Org-ID. Die Korrektur ist nun implementiert: nur Onboarding darf
bei `empty`/`select` Inhalt anzeigen, die irreführenden Ersatzpanels werden dort
unterdrückt; Loading/Login/Error bleiben gesperrt. Der Erfolgs-Link verwendet die
serverseitig erzeugte Org-ID. Fünf reine Tests schützen Standard-/Opt-out-/Auth-
Verhalten. Die normale Navigation bestand danach **18 echte Prüfungen** auf
frischem null-Org-Konto: Empty-CTA → erstes Formular → erste Erfolgs-Verknüpfung,
zweite Org über Sidebar → zweite Erfolgs-Verknüpfung, Wechsel zur ungewählten
Multi-Org-Auswahl → neues Formular. Kein positiver Pfad benötigt eine manuell
eingefügte Org-ID. Anonyme Aufrufe zeigen nur Anmeldung; echte fremde Org-ID zeigt
Fehler ohne Formular oder Auswahl-Fallback. Belege: `e2e-purenav-20261020t141925/`.
Hell/Dunkel ist nicht vollständig abgenommen;
im Event-Bereich wurde kein Theme-Umschalter gefunden.
Die neuen lokalen E2E-Treiber sind Prüfwerkzeuge, kein Testerfolg. Auth ist Fixture-seeded, nicht SSO;
Test-Zustimmung hat keine rechtliche Bedeutung. Echte Zahlung wurde nicht getestet.

Zusätzlicher tatsächlicher Read-only-Smoke auf der lokalen Instanz:
TS-Bibliotheksexport (Kontext/Eventliste), echte CLI-Prozesse (einschließlich
`--org-id`) sowie gemountetes Hono-HTTP für Kontext, Profil, Event- und Adminliste
bestehen. Fehlende HTTP-Anmeldung liefert 401. Keine Datenmutation, kein
Produktionszugriff; Tokenwerte erscheinen nicht in stdout/stderr.
Beleg: `surfaces-live-smoke.log` im privaten Prüfverzeichnis.

## Offene Funktions- und Abnahmematrix

Die vollständige Demo-Spezifikation bleibt maßgeblich. Ein Haken bedeutet geprüft,
nicht nur als Demo vorhanden. Breite, erst teilweise erfüllte Punkte bleiben offen.

- [x] Basisshell, Org-Wechsel, Null-/Multi-Org-Einstieg und mobiler Drawer im echten Browser.
- [ ] Sämtliche Overlay-/Fokus-/Tastatur- und Hell-/Dunkel-Szenarien vollständig.
- [x] Fünf Veranstalterrollen serverseitig und rückwärtskompatible Rollen-Migration.
- [ ] Vollständiges Onboarding einschließlich freigegebener Verträge, Admin-Freigabe live.
- [ ] Profil, Team, Einladungen, letzter Inhaber, Einstellungen und Audit vollständig.
- [ ] Echte aggregierte Kennzahlen und Berliner Tages-Buckets.
- [x] Technische Entwurf-/Ticket-/Reload-/Publish-Kette und öffentliche Eventansicht lokal abgenommen.
- [ ] Vollständiger Event-Assistent einschließlich Ablauf, FAQ und übriger Spezifikation.
- [ ] Pausieren, sichere Absage, Duplizieren und eigene Vorlagen.
- [ ] Online-/Abendkasse-Ticketarten mit Steuern und Verkaufszeiträumen vollständig.
- [ ] Automatische Preisphasen nach Zeit oder verkauftem Kontingent.
- [ ] Rabatt-/Zugangscodes, versteckte Arten, Limits und Massenbearbeitung.
- [ ] Organisationsgutscheine mit Laufzeit und atomarer Einlösung.
- [ ] Öffentliche Eventseite und Veranstalterprofil mit gleichen Live-Daten abgenommen.
- [ ] Org-/Event-Bestellungen und Teilnehmer mit Suche, Filtern, Pagination.
- [ ] Bestellansicht, echte Rechnungen/Versand, Käufer-/Inhaberänderung, Notizen.
- [ ] Echte idempotente Teil-/Vollerstattung und Storno.
- [ ] Gästeliste, Begleitpersonen, Freikarten und Kontingente.
- [ ] Live-Einlass, abgelehnte Scan-Gründe, manuelle Checks/Rücknahme/Links abgenommen.
- [ ] Kassenmodus, mobiler Kauf, echte Zahlung und atomarer anschließender Check-in.
- [ ] Kundenkonto mit Tickets, Bestellungen, Rechnungen und Profil vollständig.
- [ ] Echter Nachrichtenversand, Empfängerfilter, Planung, 24-h-Erinnerung und ICS.
- [ ] Event-Abrechnung einschließlich Gebühren, Steuer und Erstattungen.
- [ ] Org-Finanzen, Auszahlungsvorbereitung und Admin-Auszahlungsstatus.
- [ ] Berechtigte/filtergebundene CSV-/XLSX-/PDF-/ICS-Exporte.
- [ ] Lexware ausdrücklich als nicht integriert gekennzeichnet.
- [x] Neue `convex/`-Dateien bleiben dünne fachliche Verdrahtung.
- [ ] Gemeinsame Schemas und vollständige fachliche Fehlerparität aller Oberflächen.
- [ ] Checkout-/Scanner-/Admin- sowie Demo-Browser-Regression vollständig abgenommen.
- [ ] Zwei-Org-/Owner-/Finanzen-/Einlass-Negativtests und Desktop/Mobil/Hell/Dunkel vollständig.

## Freigaben und Fortsetzung am 21.10.2026

Der Nutzer hat Änderungen am separaten Billing-Dienst ausdrücklich genehmigt und
Muster-/Beispieltexte für Veranstalter-AGB und AVV beauftragt; spätere Ersetzung
ist vorgesehen. Käufer-AGB werden nicht umetikettiert, Zustimmung wird nicht
unterstellt. Kein Produktionsdeploy ist beauftragt.

- Eventoren bleibt im bestehenden separaten Worktree.
- Billing erhält ein eigenes Worktree:
  `/home/leo/.t3code-david/worktrees/billing/feature-eventoren-organizer-billing`,
  Branch `feature/eventoren-organizer-billing`, Ausgangscommit `93ad574`.
- Erneute Baseline vor der Fortsetzung: Unit **1.419 pass / 46 fail / 2 errors**,
  Convex **470 pass / 13 fail**. Logs privat unter
  `/tmp/eventoren-dashboard-continuation/`.
- Die lokale Convex-Instanz war vorhanden, ihre Loopback-Ports aber nicht
  erreichbar. Neuaufbau ausschließlich des Rehearsal-Containers mit demselben
  Datenvolume und frische Isolationsprüfung bestanden. Keine Ursachenbehauptung.
- Unveränderte Produktionskopie weiterhin privat: **33 Datentabellen / 1.250
  Dokumente**. Zusätzlich frischer lokaler Rückfallpunkt:
  `~/.local/state/eventoren/local-rehearsal/snapshots/local-before-continuation-20261021T073934Z.zip`.
- Billing-Produktions-SQLite ausschließlich mit `mode=ro` geöffnet und über die
  SQLite-Backup-API konsistent privat kopiert:
  `~/.local/state/eventoren/billing-rehearsal/production-readonly-copy-20261021T074453Z.sqlite`;
  Integrität `ok`, **64 Tabellen / 172.669 Zeilen**. Keine Provider-Credentials
  oder `.env` übernommen. Migration dieser Kopie noch offen.
- Versionierte, deutlich als **MUSTER / keine Rechtsberatung** gekennzeichnete
  Veranstalter-AGB/AVV sind implementiert, öffentlich lesbar unter
  `/veranstalter-vertraege`. Normales Onboarding verlangt ausdrückliche
  Zustimmung und exakte Revisionen; UTC-Zeit und zustimmender Nutzer sind
  serverseitig. Bestehende historische Zeitfelder bleiben erhalten; keine
  fingierte Zustimmung durch Migration. Aktivierung/Reaktivierung verlangt
  aktuelle Revisionen; bereits aktive Legacy-Organisationen werden nicht
  automatisch abgeschaltet. Vertragsannahme bestehender Organisationen nur
  durch Inhaber in Einstellungen. API-/CLI-/Client-Parität ist implementiert:
  `contracts-accept` als 22. freigegebene Operation, keine stillen
  Zustimmungs-/Revisionsdefaults. Unabhängiger Lauf aller Interface-Tests:
  **90 pass / 0 fail**. Read-only-Browserprobe bestanden: volle Vertragstexte
  ohne Anmeldung, beide Fragment-Links, anonyme Dashboard-/Onboarding-Sperre,
  Desktop 1440×900 und Mobil 390×844, keine Page-Errors. Rohes HTTP-HTML wurde
  zusätzlich geparst: beide Artikel sowie letzte AGB-/AVV-Abschnitte liegen
  außerhalb von Skripten vor (echte SSR-Ausgabe). Kein authentifizierter
  Zustimmungs-/Onboarding-Erfolg in dieser Probe. Dark-Mode-Abnahme offen:
  Dark-Präferenz führte noch nicht zu dunkler Oberfläche. Automatische Requests
  für öffentliche Logo-/Favicon-Assets sind dokumentiert; keine Provider- oder
  Produktionsmutation. Belege: `browser-contract-readonly/` und
  `contracts-ssr-response.html` im privaten Fortsetzungs-Prüfverzeichnis.
- Unabhängige Vertragsnachprüfung fand einen echten orgübergreifenden
  Form-State-Fehler: Einstellungen wurden nur einmal vorbelegt; nach Org-Wechsel
  konnten alte Profil-/Bankwerte in die neue Org geschrieben werden. Behoben:
  sofortiges Leeren beim Wechsel, nur passende geladene Org darf vorbelegen und
  speichern; Ziel-ID wird vor Mutation eingefroren, verspätete Antworten dürfen
  neue Org-Zustände nicht ändern. Acht reaktive State-Fälle mit echten Providern
  und SDK-Adaptern laufen in einem isolierten Testprozess.
- Muster-Revisionen auf tatsächlichen Erstellungsstand `2026-10-21-v1`
  korrigiert. Aktuelle Zustimmung verlangt Actor und gültige UTC-Zeitpunkte.
  Append-only `organizerDashboardContractConsents` bewahrt beide Texte,
  Dokument-IDs/Revisionen, SHA-256, Actor und Zeitpunkt; Annahme und Audit sind
  atomar, Wiederholung erzeugt keinen neuen Beleg. Alte historische Zeitfelder
  und frühere Belege bleiben erhalten; keine Legacy-Zustimmung erfunden.
- Eigene Nachprüfung der Fixes: **101 Unit-/Interface-Tests und 17
  Convex-Tests** bestanden. Vollständiger Convex-Zwischenlauf: **494 pass / 13
  fail**, exakt dieselben Fehlertest-Überschriften wie vor der Fortsetzung.
  Weitere Module sind in Arbeit; dies ist keine Endabnahme.
- Modelltransparenz: Die angeforderten m3-Subagenten konnten sich teilweise
  nicht authentifizieren. Ein Teil der OpenCode-Aufgaben delegierte deshalb an
  `sol-medium`; Event-Content und Bestellungen wurden nach ausbleibender
  Lieferung gestoppt und mit zuverlässigem Pi/Sol-Fallback neu gestartet.
  Angefordertes Modell wird nicht als tatsächlich erfolgreicher m3-Lauf gezählt.
- Unabhängige Nachprüfung der Vertragsänderungen: **12 Unit-Tests und 20
  Convex-Tests** (Verträge, Foundation, Admin) bestanden. Nicht als umfassende
  Dashboard-Abnahme zu lesen.

### FAQ/Ablauf und Billing-Rehearsal (Zwischenstand)

- FAQ-/Ablauf-Slice implementiert: gemeinsame begrenzte Schemas, optionale
  kanonische Felder, Create/Patch/Detail, Live-Editor und öffentliche
  Projektion. `[]` leert explizit; fehlende Legacy-Felder behalten den alten
  Fallback. Ablaufzeiten sind Berliner `HH:mm`-Werte, keine UTC-Instants.
  Eigener Nachlauf: **25 Unit- und 25 Convex-Tests bestanden**. API-/CLI-/Client-
  Weiterleitung und öffentliche TS-Schemaexports sind implementiert;
  gemeinsames UTF-8-Limit beträgt begrenzte 512 KiB. API-Zwischenlauf mit Team,
  Verträgen und Content: **191 pass / 0 fail**. Browserabnahme noch offen. Details:
  `docs/veranstalter-dashboard-faq-schedule-slice.md`.
- Neues Billing-Migrationswerkzeug unter dem Billing-Worktree:
  `scripts/eventorenRehearsal/`; eigene Wiederholung **19 pass / 0 fail**.
  Prüft private Pfade/Rechte, ursprüngliche Werte/IDs/Constraints, explizite
  Schema-Erweiterungen, echte frische Baseline-Wiederherstellung und unveränderte
  Quelle. Unabhängiger read-only Fingerprint der bestehenden Kopie bestätigt
  **64 Tabellen / 172.669 Zeilen**. Anschließend tatsächlicher Roh-SQL-Lauf
  `0074` bestanden: neun Statements, zwei neue leere Tabellen und sieben
  explizit erlaubte Indizes, keine Originaländerung, Integrität/FK und frische
  Baseline-Wiederherstellung grün, Quelle unverändert. Migration-SHA-256:
  `c38eefbdc24f517b4ecd976de626db72a460c4c6e6aa3da51790d6d091338add`.
  Privater Beleg: `billing-rehearsal/reviewed-sql-20261021T085417Z/report.json`.
  Der zusätzliche Test des echten `databaseMigrate` samt Journal und
  Bootstraps ist noch in Arbeit.

### Bestellungen/Teilnehmer (noch ohne Billing-Aktionen)

- Begrenzter kanonischer Slice implementiert: Org-/Event-Bestelllisten,
  Details, interne Notizen, operative Kontakt-Overrides und Ticketinhaber-
  Beschriftung, rollenreduzierte Teilnehmerliste. Historische Checkout-/Billing-
  Snapshots, Preise, Eigentümer und Capability-Zugriff bleiben unverändert.
  Keine simulierten Erstattungs-/Rechnungs-/Resend-/Check-in-Aktionen.
- Root-Schema registriert Notiz-/Audit-Tabellen. Unabhängiger Nachlauf Orders,
  Foundation und AuthorizationEdge: **24 pass / 0 fail**. Kanonische
  Convex-Typprüfung grün. API-/CLI-/Client-Parität, Navigation, unabhängige
  Detailprüfung und Browserabnahme laufen noch. Bewusste Grenzen: Filter auf
  begrenztem Backend-Fenster; Detail-Kindlisten maximal 50 mit sichtbarer
  Trunkierung. Handoff: `docs/20261021_veranstalter-bestellungen-slice.md`.

### Noch offene Sicherheits-/Reaktivitätsbefunde aus den Nachprüfungen

- **Billing-Integration bleibt gesperrt.** Review bestätigt acht Befunde:
  finaler 0039-Rebuild beschädigt den neuen Resend-FK; abgelaufene Invoice-
  Claims können Lexware doppelt aufrufen; gleichorgige falsche Purchase-/Mode-
  Verknüpfung wird zu schwach geprüft; fehlgeschlagene/unklare Resends replayen
  als Erfolg; stale SMTP-Claims können doppelt senden; Resend umgeht PDF-Pfad-
  Validierung; fehlendes Live-PDF wird als Draft-Nachricht versendet; Download-
  Dateiname enthält Provider-ID. Gezielte Fixes und Regressionen beauftragt.
  Accounting-Credit-Notes bleiben ausdrücklich nicht implementiert.
- **Team bleibt vor Browserabnahme zu korrigieren.** Review bestätigt:
  veraltete Owner-Einladung nach Rechteentzug des Einladers; gelöschte Owner
  zählen zur letzten-Inhaber-Prüfung; URL-Rollendialog startet ohne korrekte
  Vorbelegung; Invite-Drafts/Feedback überleben Org-Wechsel; Resend während
  `sending` erlaubt zweiten Claim; totale Rollenrangfolge ersetzt fachlich
  unvergleichbare Rollen; E-Mail-Großschreibung verfehlt bestehende Mitglieder;
  elf geschlossene Einladungen sperren weitere dauerhaft. Fixes beauftragt.
- Zweite UI-Nachprüfung: gewöhnlicher Org-Wechsel ist repariert, aber
  A→B→A akzeptiert noch alte Antworten; Bank-Redaktion löscht bestehende
  Eingabewerte noch nicht; Tarif-Drafts sind nur nach Tier-Key statt Eventscope
  gebunden; alte FAQ-Savefehler können auf neuem Event erscheinen. Fixes mit
  Provider-basierten Regressionen in Arbeit. Ein Unit-Zwischenlauf erfasste
  absichtlich bereits neue rote Regressionen vor dem Fix und ist deshalb
  **kein bestandener Abschlusslauf**.

## Weitere externe Abhängigkeiten

Der vendorte Client `billing-0.1.9` bietet Eventoren-Checkout, Status, Ablauf,
Zahlungsdetails und Fulfillment, aber **keine Eventoren-Methoden für Erstattung,
Rechnung oder erneuten Versand**. Gleichnamige `semesterkurBooking*`-Methoden
gehören zu einem anderen Produkt und werden nicht missbraucht. Ob der separate
Billing-Dienst bereits weitere Fähigkeiten hat, muss dort geprüft werden;
seine Erweiterung in einem eigenen Worktree ist vom Nutzer genehmigt und in Arbeit.
Rabatt-/Gutschein-Preise brauchen ebenfalls abgestimmte echte Billing-Quotes,
keine ausschließlich lokale Betragsrechnung. Fehlende Funktionen bleiben offen,
statt als Simulation oder vermeintlich fertige Live-Plattform ausgeliefert zu werden.

## Fortsetzung 21.10.2026 (nachmittags): Worktree-Split, Merges, Build grün

Vom Nutzer ausdrücklich freigegeben: getrennte Feature-Worktrees, Merges und
— wenn abnahmereif — Merge nach `main`. Kein Push, kein Deploy, keine
Produktionsmutation.

- Checkpoint `8c00c49` (`wip(veranstalter-dashboard): checkpoint live slice
  before per-feature worktree split`) sichert den gesamten WIP-Stand; danach
  drei Feature-Worktrees/Branches ab derselben Basis:
  `feature/veranstalter-team`, `feature/veranstalter-orders`,
  `feature/veranstalter-pricing-finance`. Vorheriger Secret-Scan der neuen
  Dateien ohne Treffer. `.env.local` und Rehearsal-Artefakte bleiben privat
  außerhalb von Git.
- Ein früherer geteilter Workflow ohne Isolation wurde gestoppt, bevor er
  schreiben konnte; ein Neustart mit Isolation scheiterte an fehlender
  Worktree-Isolation. Deshalb jetzt echte Git-Worktrees statt Isolation.
- Worker-Ergebnisse (jeweils eigener Worktree, eigene Branch, kein Push):
  - **Billing** (`billing/feature-eventoren-organizer-billing`,
    Commit `a6959c7`, 68 Dateien): echte Rechnungs-/Erstattungs-/Resend-
    Fähigkeiten mit 8 gezielten Fixes + Regressionstests (0039-Resend-FK,
    abgelaufene Invoice-Claims, Purchase-/Mode-Verknüpfung, Resend-Replay,
    stale SMTP-Claims, PDF-Pfadvalidierung, fehlendes Live-PDF,
    Download-Dateiname). Bleibt im Billing-Repo, wird nie nach Eventoren
    gemergt. Uncommitted Rehearsal-Harness-Dreck wurde nicht angefasst.
  - **Team** (`feature/veranstalter-team`): alle 8 Befunde bereits an der
    Basis `8c00c49` mit providerbasierten Regressionstests belegt; keine
    Änderung nötig, keine Commits. Kein Merge erforderlich.
  - **Orders** (`feature/veranstalter-orders`, Commit `731981b`): Slice an
    der Basis vollständig verifiziert; nur Repo-`format`-Drift auf 3 Dateien
    korrigiert (reine Reflow, keine Logik).
  - **Pricing/Finance** (`feature/veranstalter-pricing-finance`, Commits
    `160490c`, `dce899d`, `6560987`, `564ad06`): Preisphasen (Zeit/Kontingent-
    Auto-Wechsel), Rabatt-/Zugangscodes (einzeln + bulk, versteckte Arten),
    Gutscheine (Ausgabe, atomare Einlösung, Deaktivierung, Berlin-
    Laufzeitenden), Auszahlung `vorgemerkt→ausgezahlt`, 12 neue
    allowlistete Operationen (42→54) mit Hono-/CLI-/TS-Client-Parität, Live-
    UI `/veranstalter/events/$eventKey/preise` und `/veranstalter/gutscheine`,
    Finanzseite mit Mark-as-paid und Settlement-CSV-Zeilenfix. Keine
    simulierten Zahlungen (Ledgers; Geld bewegt sich außerhalb).
- Merges nach `feature/veranstalter-dashboard`: `fbcb298` (orders),
  `6fe8c87` (pricing) — beide sauber, keine Konflikte, keine Marker.
  Fix `39154fc`: `VeranstalterDashboardFinanzenPage` nutzt jetzt den
  geteilten `Button` (ghost) statt rohem `<button>`; `shared-ui:check`
  meldet nur noch den vorbestehenden `AdminTicketOrdersPage`-Treffer.
- Verifikation auf dem gemergten Stand (alle mit sauberer Umgebung):
  Convex-`tsc` grün; 8 Convex-Suites **103 pass / 0 fail** (Pricing-Slice,
  Pricing, Finance, Orders, Foundation, AuthorizationEdge, Team, Events);
  15 Unit-Dateien **334 pass / 0 fail**; App-`tsc` ohne Diagnose in allen
  gemergten Dashboard-/Routen-Dateien; `webappBoundaryCheck` grün; Biome
  ohne Befund in den angefassten Dateien.
- **Build grün**: `bun run build` läuft vollständig durch (Client/Server-
  Bundles, Boundary, Cloudflare-Worker, SSR). Eine Störung wurde als
  Fremdartefakt belegt und entfernt: eine ungetrackte, gitignorierte
  `vite.config.js` (heute 14:20 von Tooling erzeugt) beschattete
  `vite.config.ts` und zog `import.meta.env`-Zugriffe in das
  Config-Bundle; nach dem Löschen baut derselbe Stand. Main-Kontrollbuild
  (`b89bd04`) war parallel grün; Bundle-Vergleich beider Config-Bundles
  als Beleg gesichert (`/tmp/vc-captured.mjs` vs. `/tmp/vc-main.mjs`).
- Aus dem gemergten Stand folgt **kein Main-Merge**: Die Matrix bleibt
  offen (nächste Runde läuft in eigenen Worktrees): Gästelisten,
  Nachrichten/Versand/Erinnerung, aggregierte Kennzahlen/Exporte,
  öffentliche Eventseite + Veranstalterprofil aus Live-Daten,
  Veranstalter-seitige Erstattungs-/Rechnungs-/Resend-Verdrahtung
  (Billing-Seite fertig, Dashboard-Seite offen), Reaktivitätsfixes,
  Live-Einlass, Kasse, Kundenkonto, Onboarding-/Vertrags-Browserabnahme
  und vollständiges E2E. Bis dahin bleibt alles auf
  `feature/veranstalter-dashboard`.
