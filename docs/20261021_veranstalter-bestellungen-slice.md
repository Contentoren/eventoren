# Veranstalter-Bestellungen: implementierter, begrenzter Live-Ausschnitt

Stand 21.10.2026. Direkt im bestehenden schmutzigen Worktree
`/home/leo/.t3code-david/worktrees/eventoren/feature-veranstalter-dashboard` implementiert.
Keine Unteragenten, Git-Schreiboperationen, Serverstarts, Deploys, Remote-Codegen oder Live-/Produktionsdatenzugriffe.
**Integration und Browser-Abnahme sind noch offen; nicht als vollständige Dashboard-Fertigstellung lesen.**

## Tatsächlich implementiert

- Kanonische Org-/Event-Bestellliste, Bestelldetail, interne Notizen anlegen/löschen,
  operativer Käuferkontakt und Teilnehmerbeschriftung auf ausgestellten Tickets.
- Event-Teilnehmerliste für `bestellungen.sehen` **oder** `einlass.nutzen`.
  Für Einlass werden ausschließlich Ticket-ID, Sequenznummer, Ticketart, Teilnehmername/-E-Mail,
  kanonischer Check-in-/Sperrstatus und Ausstellungszeit projiziert. Keine Bestellung, Käufer,
  Beträge, Capability-Codes oder historischen Kontakt-/Billing-Snapshots.
- Jede öffentliche Funktion verwendet Session-Auflösung und `organizerDashboardAuthorize`.
  Bestelllesen: `bestellungen.sehen`; alle vier Mutationen: `bestellungen.verwalten`.
  Kein globaler Admin-Bypass.
- Bestell-Snapshot `order.orgId`, kanonisches `catalogEvents.orgId` und angeforderte Org müssen
  übereinstimmen. Fehlende Zuordnung/Konflikte werden abgewiesen; in Listen werden widersprüchliche
  Zeilen ausgelassen. Event-Key des Tickets muss mit seiner Bestellung übereinstimmen.
- Explizite DTO-Allowlist: kein Spread kanonischer Dokumente. Keine Checkout-/Zugangs-Token,
  Digests, Stripe-/Billing-Korrelations-IDs, URLs, Roh-JSON oder kommerziellen Snapshots.
- Live-Web-State mit echten `queryCreate`-Subscriptions, während Setup gebundenen `mutationCreate`-
  Funktionen und zur Laufzeit gelesener Session. URL: `org`, `q`, `status`, `cursor`, `order`, `sheet=order`.
  Suche wird ausdrücklich abgesendet (keine URL-Schreiboperation pro Tastendruck).
  Sheet verwendet `#ui/interactive/sheet/Sheet`; alle Eingaben/Aktionen verwenden `#ui`.
- Org-/Bestellwechsel invalidiert Kontakt-/Notizentwürfe; verspätete Subscription-Ergebnisse werden
  ignoriert. Gleiche Bestellung + Live-Update überschreibt einen begonnenen Kontaktentwurf nicht.
  Event-Detailansicht verweigert einen Order-URL-Parameter eines anderen Events auch im UI.
- Berlin-Zeitzone für alle dargestellten Instants; Speicherung UTC. Historische Preise/Status unverändert.

## Grenzen und bewusste Nicht-Implementierung

- **Kein neuer Check-in-/Reset-Endpunkt.** Nicht existierende Wrapper-/Mutationsreferenzen des vorherigen
  Versuchs entfernt. Die Teilnehmerliste zeigt den kanonischen Istzustand; UI verweist auf den bestehenden
  Scanner. Keine nachgebaute oder simulierte Scanneraktion.
- **Keine Erstattung, Rechnung, Resend oder behauptete E-Mail.** Keine entsprechenden Fake-Buttons.
- Operative Kontaktänderung schreibt nur `ticketOrders.operationalContact`, inklusive UTC-Akteursbeleg.
  `customer*`, `contactSnapshotJson`, `billingDetailsJson`, Status, Preis, Zeitfelder der historischen
  Bestellung und Owner-/Zugriffsrechte bleiben unverändert. Nicht übergebene Felder bleiben erhalten;
  `""` löscht nur den jeweiligen Override (Fallback auf historisches Feld).
- Teilnehmeränderung schreibt ausschließlich `ticketIssued.participantName` / `participantEmail`;
  kein Identitäts-/Eigentums-/Entitlement-Transfer, keine neue Zugriffsberechtigung, kein Versand.
- Notes/Audit sind eigene typisierte Tabellen. Audit enthält nur Aktion, Scope, Akteur und UTC-Instant,
  keine Freitexte, Kontakte oder Ticketcodes. Notizautor kommt aus der Session; Löschung bleibt als
  `note_deleted` im Audit erhalten. DTO zeigt Notiztext/Zeit/ID, nicht interne Autoridentität.
- Listen: bestehende Org-/Event-Indizes, eine native Pagination je Anfrage, 1..50 Zeilen (UI 25),
  maximal 512 KiB Quellseite. Suche/Status sind **Postfilter des begrenzten Fensters**, keine globale
  Volltextsuche. Leere Seite mit `isDone=false` bietet weiterhin „Nächstes Fenster“.
  Cursor/End-Cursor/Split-Cursor binden Query-Art, Nutzer, Org, Event und normalisierte Filter;
  fehlerhafte native Cursor liefern bereinigten Result-Fehler statt roher Datenbankdiagnose.
- Detail liest pro Kind höchstens 51 Zeilen, liefert höchstens 50 Positionen/Tickets/neuste Notizen und
  explizite `truncated`-Flags. UI meldet die Begrenzung. Weitere Tickets über Event-Teilnehmerliste;
  ältere Notizen/weitere Positionen haben in diesem minimalen Ausschnitt noch keinen eigenen Pager.
- Keine Speicherung von Käufer-/Teilnehmer-/Notizformularen in localStorage: bewusste Abweichung von
  der generellen Formularpersistenz, damit sensible Daten nicht im gemeinsamen Browser verbleiben.
- Kein Browser-/E2E-Erfolg behauptet; keine Server dafür gestartet.

## Vom Parent zwingend zu integrieren (nicht von diesem Ausschnitt editiert)

### Root-Schema (vom Parent bereits integriert)

Import aus `src/organizer/dashboard/orders/convex/organizerDashboardOrderTables.ts`:

```ts
import { organizerDashboardOrderTables } from "#src/organizer/dashboard/orders/convex/organizerDashboardOrderTables.ts"
// im vorhandenen defineSchema-Objekt:
...organizerDashboardOrderTables,
```

Exportierte Tabellen: `organizerDashboardOrderNotes` (Index `orderIdAndCreatedAt`) und
`organizerDashboardOrderAudit` (Index `orderIdAndAt`).
Der Parent hat Import/Spread im kanonischen Root-Schema ergänzt. Der temporäre lokale
`defineSchema`-/`unknown`-DB-Adapter wurde daraufhin vollständig entfernt. Alle Operationen
verwenden direkt `QueryCtx`-/`MutationCtx`-Datenbankzugriffe und generierte `Doc`/`Id`-Typen;
Notiz-IDs sind ebenfalls kanonische `Id<"organizerDashboardOrderNotes">`.
Die Integrationstests verwenden jetzt unverändert das kanonische `convex/schema.ts`, kein Test-Sonderschema.
Keine Remote-Codegenerierung erforderlich (DataModel wird aus dem Root-Schema abgeleitet).

`src/ticketing/convex/ticketTables.ts` wurde nur gezielt additiv ergänzt:
`ticketOrders.operationalContact?: { givenName?, familyName?, email?, phone?, updatedAt, updatedByUserId }`
und `ticketIssued.participantEmail?: string`. Vorhandene Org-Felder und Indizes wurden bewahrt.
Keine Änderung von Statusmodellen, Indizes oder historischen Feldern durch diesen Ausschnitt.

### Öffentliche Backend-Funktionen

Dünner Wrapper `convex/organizerDashboardOrders.ts` exportiert genau:

| vorgeschlagene Surface-Operation | Funktion | Art |
| --- | --- | --- |
| `order-list` | `organizerDashboardOrderListQuery` | query |
| `order-get` | `organizerDashboardOrderGetQuery` | query |
| `order-note-create` | `organizerDashboardOrderNoteCreateMutation` | mutation |
| `order-note-delete` | `organizerDashboardOrderNoteDeleteMutation` | mutation |
| `order-buyer-contact-update` | `organizerDashboardOrderBuyerContactUpdateMutation` | mutation |
| `order-participant-update` | `organizerDashboardOrderParticipantUpdateMutation` | mutation |
| `order-participant-list` | `organizerDashboardOrderParticipantListQuery` | query |

Alle Argumente: `orgId`, `token`. Liste zusätzlich optionale `eventKey`, `status`, `search` und
`paginationOpts`; Detail `orderId`; Note-create `orderId,text`; Note-delete `orderId,noteId`;
Kontakt `orderId,givenName?,familyName?,email?,phone?`;
Teilnehmeränderung `orderId,ticketId,participantName?,participantEmail?`;
Teilnehmerliste `eventKey,search?,paginationOpts`.

Gemeinsame Valibot-Exports unter `src/organizer/dashboard/orders/model/`:

- `organizerDashboardOrderListFilterSchema` — optionale kanonische Status-/Event-/Suchfilter.
- `organizerDashboardOrderParticipantListFilterSchema` — dünne Ableitung: Event erforderlich, Suchschema identisch.
- `organizerDashboardOrderBuyerContactSchema` (+ abgeleiteter `OrganizerDashboardOrderBuyerContactInput`).
- `organizerDashboardOrderParticipantUpdateSchema` (+ abgeleiteter `OrganizerDashboardOrderParticipantUpdate`).
- `organizerDashboardOrderNoteTextSchema` — trim, 1..1000 Zeichen.

Typisierte DTOs: `OrganizerDashboardOrderSummary`, `OrganizerDashboardOrderDetail`,
`OrganizerDashboardOrderParticipant`. **Nachtrag API-Parität:** Die sieben Operationen sind inzwischen
im gemeinsamen Register (38 Operationen), Request-Parser, geteilten HTTP-/CLI-Dispatch und TS-Client
integriert. Client-Erfolgstypen stammen direkt aus `typeof api.organizerDashboardOrders` und dessen
kanonischen `_returnType`-Referenzen; keine manuell nachgebauten DTOs/Generated-Dateien.
Ein strikter transportneutraler Schema-Wrapper `api/organizerDashboardOrderInputSchemas.ts` verwendet
unverändert die gemeinsamen Domain-Felder für Filter, Kontakt, Teilnehmer und Notiz. HTTP/CLI/Client
weisen unbekannte Felder und Body-Credentials ab; Teilnehmerlesen verlangt im Transport weder
Bestell-ID noch behauptete Rolle (Backend-Autorität bleibt unverändert).
Die fünf gemeinsamen Domain-Input-Schemas samt Typen sind über `src/index.ts` exportiert;
vorhandene FAQ-/Schedule-Exports wurden bewahrt. CLI-Hilfeliste und Anzahl werden aus dem Register
erzeugt; die gemeinsame 512-KiB-Grenze bleibt unverändert.
Es existiert kein MCP-Surface im Bestand. Fachliche Fehlercodes bleiben beim bisherigen Result-Standard;
HTTP/CLI verwenden denselben bestehenden Katalog/Fallback. Client-SDK-Throws werden konstant bereinigt;
kein separater vollständiger Domain-Fehlerkatalog wird hier als fertig behauptet.

### Routen / Navigation / generierte Dateien

Angelegt:

- `src/routes/veranstalter_.bestellungen.tsx` → `/veranstalter/bestellungen`
- `src/routes/veranstalter_.events_.$eventKey_.bestellungen.tsx` → `/veranstalter/events/$eventKey/bestellungen`
- `src/routes/veranstalter_.events_.$eventKey_.teilnehmer.tsx` → `/veranstalter/events/$eventKey/teilnehmer`

Alle verwenden `VeranstalterDashboardOrdersPage` und denselben State unter `pages/orders/`.
**Nachtrag Navigation:** Gemeinsame Desktop-/Mobile-Sidebar zeigt „Bestellungen“ ausschließlich bei
exaktem `bestellungen.sehen`; Org-Suchparameter und bestehende Einladungs-Inboxlinks bleiben erhalten.
Bestellzeilen verlinken die eventgefilterten Bestellungen und Teilnehmer; die eventgebundene
Bestellungen-/Teilnehmerseite bietet dieselben Links gemäß Lese-/Einlassberechtigung an.
Event-Detail-State/View bleiben wegen paralleler Zuständigkeit unangetastet. Parent muss dort noch
die Auffindbarkeit für reine Einlassnutzer ergänzen (die Sidebar bleibt ihnen bewusst verborgen):

1. Reaktive Props/Accessors aus der aktiven Org: `canReadOrders = permissions.includes("bestellungen.sehen")`, `canReadParticipants = canReadOrders || permissions.includes("einlass.nutzen")`.
2. Bei `canReadOrders`: Link „Bestellungen“ nach `/veranstalter/events/$eventKey/bestellungen`, `params={{ eventKey: event().eventKey }}`, `search={{ org: p.orgParam }}`.
3. Bei `canReadParticipants`: Link „Teilnehmer“ nach `/veranstalter/events/$eventKey/teilnehmer`, dieselben Params/Org-Suche; **nicht** an Event-Bearbeiten oder Bestell-Lesen allein koppeln.

Keine Root-/Ticket-Schema-, Order-Backend-, Team-Domain-, Event-Detail-/Settings-, `package.json`-
oder Generated-Dateien durch den API-/Navigations-Nachtrag verändert. Route-/Convex-Typgenerierung
und Browser-/Integrationsabnahme bleiben Parent-Aufgabe (kein Build/Codegen dieses Nachtrags).

## Tatsächlich ausgeführte Prüfungen

Mit `env -i PATH="$PATH" HOME="$HOME"` (keine privaten Env-Dateien):

- Direkter Vitest-Aufruf ohne Codegen: `organizerDashboardOrders.test.ts` **13 bestanden**.
  Plus Foundation/AuthorizationEdge: zusammen **24 bestanden / 0 fehlgeschlagen**.
  Fünf Rollen inkl. Notiz-Löschen; kein globaler Admin-Bypass; fremde Org-/Order-/Ticket-/Note-IDs;
  Event-/Order-Konflikte und fehlende Snapshots; Secret-/PII-Allowlist; additive Kontaktänderung;
  Historie/Owner/Access/Preis/Check-in unverändert; Notizvalidierung/Actor/Audit;
  Cursor-/Endcursor-Filterbindung, verfälschter nativer Cursor, 56 Bestellungen/56 Tickets ohne
  Duplikate, leere gefilterte Seiten, Kindbegrenzungen/Trunkierung.
- Bun-Eingabe-/Zeit-/URL-Tests plus isolierter echter Solid-Provider-State-Test:
  **4 äußere Tests bestanden**; der isolierte Test enthält **4 weitere Fälle**
  (Setup-Kontext aller Mutatoren + Live-Token/Logout, Paging/URL-Subscriptions,
  Org-/Order-Draft-Invalidierung und verspätete Daten, reine Einlassprojektion).
  Kein Browser-/DOM-Test; Subscription-Transport wird kontrolliert simuliert.
- `tsc -p convex/tsconfig.json --noEmit`: grün.
- Separate strikte Typprüfung der Convex-Testdatei ohne Codegen: grün.
- Globale `tsc --noEmit`: nicht insgesamt grün; Diagnosen in API-Key-/Demo-Bereichen und einer
  parallel bearbeiteten Settings-Testfixture außerhalb dieses Ausschnitts. Keine Diagnose in `orders/`,
  diesem Wrapper oder den drei neuen Routen.
- Gezielte Biome-Formatierung/Prüfung der eigenen Dateien; keine globale Formatierung.

Prüflogs des ursprünglichen Backend-/UI-Ausschnitts: `/tmp/eventoren-orders-convex.log`,
`/tmp/eventoren-orders-ui-unit.log`, `/tmp/eventoren-orders-convex-typecheck.log`,
`/tmp/eventoren-orders-typecheck.log`.

## API-/Navigations-Nachtrag: tatsächlich ausgeführte Prüfungen

Direkte Umsetzung im selben Worktree, ohne Delegation, Git, Server, Build, Codegen, Deployment
oder Live-Datenbank. Alle Befehle mit `env -i PATH="$PATH" HOME="$HOME"`; Bun zusätzlich `--no-env-file`.

- Gesamtes `src/organizer/dashboard/api/`: **242 Tests bestanden, 0 fehlgeschlagen** (6 Dateien).
  Enthält die sieben neuen Operationen auf HTTP/CLI/TS-Client, exakte Query-/Mutation-Referenzen,
  Token-Weitergabe, Strict-Unknown-/Body-Auth-Abweisung, fehlende Auth, bereinigte SDK-Throws,
  unveränderten Katalog-Fallback, Cursor-/Endcursor-Weitergabe, 1..50 Pagination und gemeinsame
  Status-/Längenregeln. Explizite Leere bleibt Leere; Auslassungen werden nicht zu Clears/defaults.
  Das sind Transporttests, **kein** Mock-Beweis für fremde IDs, DB-Berechtigung oder Secret-Datenschutz.
- Mit Shell-State-Tests zusammen: **255 bestanden, 0 fehlgeschlagen** (7 Dateien).
  Neue Navigationstests prüfen exakte `bestellungen.sehen` statt Rollenlabel, Einlass-/Verwalten-
  Alleinberechtigung sowie reaktiven Org-/Fehler-/Kontextwechsel.
- Existierende echte Backend-Suite `convex-tests/organizerDashboardOrders.test.ts` ohne Codegen
  nochmals ausgeführt: **13 bestanden**. Dort liegen die Prüfungen für fremde Org-/Order-/Ticket-/
  Note-IDs, reine Einlassprojektion, Secret-Allowlist und filtergebundene Cursor, nicht im SDK-Mock.
- Strikte gezielte `tsc --ignoreConfig --noEmit` mit den Projektoptionen für alle API-Dateien,
  Client, CLI, Public-Index, Shell/Sidebar/Shell-State-Test und Orders-Seite: **grün**.
- `src/webappBoundaryCheck.ts`: **grün**. Gezieltes Biome-Format aller 18 eigenen TS/TSX-Dateien: **grün**.
- Globale `tsc --noEmit` ist weiterhin **nicht grün** wegen bestehender API-Key-/Demo-Dateien.
  Keine globale Typprüfungs-/Browser-/Gesamtspezifikations-Fertigstellung behauptet.

Nachtragsdateien (Pfade relativ zum Projekt):

- `src/organizer/dashboard/api/`: `organizerDashboardOperations.ts`,
  `organizerDashboardOrderInputSchemas.ts` (neu), `organizerDashboardRequestParse.ts`,
  `organizerDashboardBackendDispatchRequest.ts`, `organizerDashboardConvexBackendCreate.ts`,
  `organizerDashboardMockBackend.fixture.ts`, `organizerDashboardHonoCreate.ts` (nur Kommentar),
  `organizerDashboardRequestLimit.test.ts`, `organizerDashboardInterfaceParity.test.ts`,
  `organizerDashboardOrderParity.test.ts` (neu).
- `src/client/organizerDashboardClientCreate.ts`, `src/cli/organizerDashboardCliRun.ts`, `src/index.ts`.
- `src/organizer/dashboard/ui/`: `VeranstalterDashboardSidebar.tsx`, `VeranstalterDashboardShell.tsx`,
  `veranstalterDashboardShellStateCreate.ts`, `veranstalterDashboardShellStateCreate.test.ts`.
- `src/organizer/dashboard/pages/orders/VeranstalterDashboardOrdersPage.tsx` (nur Navigationslinks).
- Dieses Handoff-Dokument.

Nachtragslogs: `/tmp/eventoren-order-api-tests.log`, `/tmp/eventoren-order-api-final-tests.log`,
`/tmp/eventoren-order-api-backend-tests.log`, `/tmp/eventoren-order-api-targeted-tsc.log`,
`/tmp/eventoren-order-api-tsc.log`, `/tmp/eventoren-order-api-boundary.log`.
