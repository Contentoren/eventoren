# Veranstalter-Admission: Einlass, Abendkasse, Kundenkonto + Reaktivitätsfixes

Stand 21.10.2026, Branch `feature/veranstalter-admission`, Basis `502e931`.
Direkt im Worktree `/home/leo/.t3code-david/worktrees/eventoren/feature-veranstalter-admission` implementiert.
Kein Push, kein Deploy, keine Produktionsmutation, kein Produktions-E2E.

## Tatsächlich implementiert

### 1. Live-Einlass (`src/organizer/dashboard/admission/`, `convex/organizerDashboardAdmission.ts`)

- Neue Tabellen `organizerDashboardAdmissionScans` (jeder Scanversuch mit Eingang,
  Aktion checkin/reset, Ergebnis ok/doppelt/falsches-event/unbekannt/storniert/unbezahlt,
  Backend-Code als reason, UTC-Instant).
- `admission-stats` (Query, `einlass.nutzen` ODER `bestellungen.sehen`): je Ticketart
  verkauft/eingecheckt/storniert/Kapazität, je Eingang Einlass/Ablehnungen, abgelehnte
  Scans nach Grund. Begrenzte `take()`-Reads (Convex erlaubt nur ein `paginate()` pro
  Funktion — ein doppeltes `paginate()` wurde im Testlauf als echter Fehler belegt und
  auf `take()` umgestellt).
- `admission-checkin` / `admission-checkin-revoke` (Mutationen, `einlass.nutzen`):
  delegieren an die kanonischen `organizerTicketCheckInTargetResolve`/`Apply`-Helfer
  (kein eigener Check-in-Pfad) und protokollieren jeden Versuch im Scan-Log.
- `admission-scanner-link-list` (`einlass.nutzen`), `-create`/`-revoke`
  (`tickets.bearbeiten`): Helper-Links für Aushilfen mit optionalem Eingang.
  Capability-Codes werden nie projiziert. Additiv: `scannerLinks.entrance?`.
- UI: `/veranstalter/events/$eventKey/einlass` (Live-Statistiken, manueller
  Check-in/Revoke, Scanner-Link-Verwaltung), Event-Detail-Links für Einlass und
  Abendkasse (Berechtigungs-gated).

### 2. Abendkasse (`src/organizer/dashboard/boxoffice/`, `convex/organizerDashboardBoxOffice.ts`)

- Neue Tabelle `organizerDashboardBoxOfficeSales` (wartet/bezahlt/abgebrochen,
  `testHarness`-Flag, optionale `orderId`).
- `boxoffice-sale-create` (`abendkasse.preise`): Preis/Kontingent setzt der
  Veranstalter; Tier-Kontingent wird nie überschritten; Preis-Default aus dem Tarif.
- `boxoffice-sale-get`/`-list` (`abendkasse.nutzen`), `-cancel` (`abendkasse.preise`,
  nur wartend; bezahlt ist unveränderlich).
- Echter Pfad `boxoffice-sale-complete` (`abendkasse.preise`): verlangt eine bereits
  **bezahlte** kanonische Bestellung (`status` + `paymentStatus` paid, gleicher Event),
  markiert den Vorgang und checkt die Tickets **atomar** am Eingang „Abendkasse“ ein.
  Ohne bezahlte Bestellung Fehlschlag — keine simulierten Paid-Zustände.
- Demo-Harness `boxoffice-sale-test-pay` (authed, `abendkasse.nutzen`) UND
  `boxoffice-sale-test-device-pay` (public, fürs Gast-Handy): beide verlangen
  `testHarness:true` UND einen als Test markierten Vorgang; echte Vorgänge lehnen ab.
  Jede Projektion behält `testHarness:true`, `orderId` bleibt null — nie Umsatz.
- Public Gast-Abfrage `boxoffice-sale-public-get` (tokenlos, nur öffentliche Felder,
  nie Käuferdaten; abgebrochene Vorgänge versteckt).
- UI: `/veranstalter/events/$eventKey/abendkasse` (Kassenmodus: Vorgänge anlegen,
  Gast-Seite verlinken, abbrechen, mit bezahlter Bestellung abschließen) und mobile
  Gast-Seite `/abendkasse/$saleId` (anonym, live, nur TEST-Simulation explizit als
  „TEST-Harness“ gelabelt).

### 3. Kundenkonto (`src/customer/account/`, `convex/customerAccount.ts`)

- `account-ticket-list` / `account-order-list` / `account-order-get`:
  strikt inhabergebunden (`ownerUserId`), ohne Digests/URLs/Secrets.
- Rechnung: reine Lese-Projektion aus kanonischen Paid-Snapshots, nur für bezahlte
  Bestellungen; offene Bestellungen liefern `invoice: null`.
- `account-profile-get` / `-update`: Anzeigename änderbar, E-Mail read-only.
- UI: `/konto` mit Tabs Tickets/Bestellungen/Profil, Bestelldetail mit Rechnung.

### 4. Reaktivitätsfixes (vier Befunde)

- **Tarif-Drafts nach Eventscope** (Preise-Seite hatte gar keine Bindung):
  alle Phase-/Code-/Bulk-Drafts + Meldungen werden bei Org-/Event-Wechsel
  zurückgesetzt; Submits frieren `orgId`/`eventKey` ein; späte Antworten werden per
  Generation verworfen.
- **A-B-A**, **Bank-Redaction**, **FAQ-Fehler**: in Einstellungen/Event-Detail
  bereits vorhanden und hier per Test belegt (keine Codeänderung nötig dort).
- Provider-basierte Regressionen (echte Solid-Provider + SDK-Adapter, isolierter
  Prozess): `veranstalterReactivityFixes.case.ts`, **8 Fälle grün**.

### Surfaces

- 17 neue Operationen im gemeinsamen Register (54→70, Zählkommentar angepasst):
  admission ×6, boxoffice ×6, account ×5 — mit Hono-/CLI-/TS-Client-Parität über
  dieselben Valibot-Schemas (thin Transport-Wrapper).
- Öffentliche TS-Schemaexports in `src/index.ts` ergänzt.
- Abweichung: die public Gast-Abfrage und die public TEST-Gerätezahlung sind
  bewusst **nur Web** (tokenlos, kein Hono/CLI/Client-Eintrag) — Kauf-Flow-Analogie;
  die authed TEST-Zahlung (`boxoffice-sale-test-pay`) ist im Register.
- Additiv: `ticketIssued`-Index `eventKey`, `scannerLinks.entrance?`.

## Tatsächlich ausgeführte Prüfungen (alle `env -i`, keine privaten Env-Dateien)

- Neue Convex-Suites: Admission **9**, BoxOffice **5**, Account **3** — alle grün.
- Dashboard-Slice-Suites (Admission/BoxOffice/Account/Orders/Pricing/PricingSlice/
  Finance/Foundation/AuthorizationEdge/Team/Events): **120 pass / 0 fail**.
- Unit (organizer/customer/client/cli/index + pages): **515 pass / 0 fail**;
  nach Biome-Format Re-Lauf der Kernbereiche: **424 pass / 0 fail**.
- Transport-Parität neu: **68 pass / 0 fail**; gesamtes `api/`-Verzeichnis:
  **379 pass / 0 fail**.
- Provider-Reaktivität: **8 pass / 0 fail** (isoliert).
- `tsc -p convex/tsconfig.json`: grün. App-`tsc`: keine Diagnose in eigenen Dateien.
- `bun run build`: grün (Bundles, Boundary, Worker, SSR). `boundary:check`: grün.
  `shared-ui:check`: nur der vorbestehende `AdminTicketOrdersPage`-Treffer.
- Voller Convex-Lauf: **562 pass / 14 gezählt, 13 eindeutige Namen** — per
  Stash-Vergleich auf pristine Basis exakt die 13 vorbestehenden Fehler in
  `scannerLinks`, `scannerLinkTickets`, `catalogImageUpload`,
  `catalogPilatesImageBackfill` (unberührte Bereiche). Kein neuer Fail.

## Offene Punkte / Grenzen

- Keine Browser-Abnahme (weder authentifiziert noch mobil); keine E2E-Fahrer.
- Lexware/Rechnungen als PDF, E-Mail-Versand, Gästeliste, Nachrichten, Exporte,
  Kennzahlen, Auszahlungen: unberührt/offen wie bisher.
- Codegen (`convex codegen`) lud Funktionsmetadaten auf die geteilte lokale
  Rehearsal-Instanz (additiv: 2 neue leere Tabellen + 1 Index + 1 optionales Feld);
  keine Dokumente geschrieben/gelesen außer isolierten Test-Seeds.
- Fachliche Fehlercodes bleiben beim Result-Standard; kein neuer Fehlerkatalog.
