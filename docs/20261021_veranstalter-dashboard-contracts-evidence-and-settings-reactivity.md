# Veranstalter-Dashboard: Vertrags-Revisionen, Zustimmungs-Nachweise, Settings-Reaktivität

## Goal

Bestätigte Review-Fixes im Contract-/Settings-Bereich des Veranstalter-Dashboards umsetzen,
ohne die von anderen Agenten verantworteten Bereiche (events, orders, team, Billing) anzufassen.

## Decisions

- **D1** Contract-Revisionen bekommen einen neuen, datierten Stand: `2026-10-21-v1`.
  `organizerContractDocuments` bleibt die einzige Quelle; alle Aufrufer leiten sich daraus ab.
- **D2** "Aktuelle Zustimmung" (`organizerContractsCurrentCheck`) verlangt künftig
  * beide exakten aktuellen Revisionen,
  * einen akzeptierenden Akteur (`consentedByUserId`),
  * syntaktisch gültige UTC-ISO-Zeitstempel für `termsConsentedAt`/`dpaConsentedAt`.
  Zeitstempel-only-Legacy-Datensätze qualifizieren sich weiterhin **nicht**.
- **D3** Zustimmung wird append-only in einer eigenen Tabelle
  `organizerDashboardContractConsents` belegt (Organisation, beide Dokument-IDs + Revisionen,
  SHA-256-Digest **und** eingefrorener Text-Snapshot, `acceptedAt` UTC, `acceptedByUserId`).
  Der bestehende `contracts`-Block auf `organizerDashboardOrganizations` bleibt der
  "aktueller Stand"-Zeiger; ältere Nachweiszeilen bleiben unverändert erhalten.
- **D4** Die Text-Snapshots sind eingefroren: bei einer späteren Dokument-Revision bleiben
  frühere Nachweiszeilen mit ihrem alten Text und Digest gültig.
- **D5** Settings-State-Factory: Formularwerte, Status-Flags und Zustimmungs-Checkboxen sind
  strikt an die aktuell geladene Organisation gebunden. Ein Org-Wechsel leert sofort;
  ein Live-Update derselben Organisation überschreibt keine ungespeicherten Nutzeränderungen.
- **D6** Auditing der Zustimmung läuft über `organizerDashboardAuditWrite` mit
  area `contracts`, action `accepted`. Die Audit-Notiz enthält ausschließlich
  Revisions-IDs, niemals Text-Snapshots oder Bank-/Personendaten.
- **D7** Kein Live-Betrieb, kein Deploy, kein Codegen gegen Remote, keine Git-Schreiboperationen.

## Approach

### Task 1 — Contract-Revision + Current-Check (M2, S2)

Files:
- `src/organizer/dashboard/contracts/organizerContractDocuments.ts` — Revisionen auf `2026-10-21-v1`.
- `src/organizer/dashboard/contracts/organizerContractConsentInstantSchema.ts` (neu) — Valibot-Schema
  für einen gültigen UTC-ISO-Instant (`...Z`).
- `src/organizer/dashboard/contracts/organizerContractsCurrentCheck.ts` — Actor + Zeitstempel-Prüfung.
- `src/organizer/dashboard/api/organizerDashboardContractsAcceptParity.test.ts` — `staleRevision`
  wird aus der aktuellen Revision abgeleitet, nicht mehr hart verdrahtet.
- `convex-tests/*.test.ts` — die derzeit fabrizierten "aktuellen" Belege bekommen expliziten
  Actor + gültige UTC-Instants; Negativfälle (Legacy) bleiben unverändert negativ.
- Fokussierter Unit-Test für `organizerContractsCurrentCheck` (neu).

### Task 2 — Settings-State-Factory (M1, Date-Label)

Files:
- `src/organizer/dashboard/pages/organization/ui/veranstalterEinstellungenPageStateCreate.ts`
- `src/organizer/dashboard/pages/organization/ui/VeranstalterEinstellungenPage.tsx` (nur minimal)
- `src/organizer/dashboard/pages/organization/ui/veranstalterEinstellungenPageStateCreate.case.ts` (neu)
- `src/organizer/dashboard/pages/organization/ui/veranstalterEinstellungenPageStateCreate.test.ts` (neu)

Verhalten:
- `storedProfile()` liefert nur ein Profil, dessen `data.orgId` dem aktuellen `inputs.orgId()` entspricht.
- Org-Wechsel (inkl. `undefined`) leert sofort Felder, `saved`, `serverError` und beide
  Zustimmungs-Checkboxen.
- Prefill nur für die *neu geladene, passende* Organisation; ein Live-Update derselben Org
  überschreibt keine ungespeicherten Änderungen.
- `canSubmit` und derdirekte `submit()`-Guard verlangen die aktuell passende, geladene Organisation.
- `submit()` / `submitContracts()` frieren die Ziel-`orgId` beim Aufruf ein und zeigen kein
  Ergebnis einer anderen Organisation an.
- `contractDateLabel` toleriert ungültige Zeitstempel (kein `RangeError`, kein `Invalid Date`).

### Task 3 — Zustimmungs-Nachweis-Tabelle (S1)

Files:
- `src/organizer/dashboard/contracts/organizerContractTables.ts` (neu) — `organizerContractTables`.
- `src/organizer/dashboard/contracts/organizerContractTextSnapshotSchema.ts` (neu)
- `src/organizer/dashboard/contracts/organizerContractTextDigestCreate.ts` (neu)
- `src/organizer/dashboard/contracts/organizerContractConsentEvidenceCreate.ts` (neu)
- `convex/schema.ts` — `...organizerContractTables` ergänzen.
- `src/organizer/dashboard/contracts/organizerContractsAcceptMutation.ts` — Evidence + Audit.
- `src/organizer/dashboard/convex/organizerDashboardOrganizationCreateMutation.ts` — Evidence + Audit.
- `src/organizer/dashboard/admin/organizerDashboardAdminAuditAreaSchema.ts` / `...ActionSchema.ts`
- `convex-tests/organizerContractConsents.test.ts` (neu)

Verhalten:
- Create und echtes Accept schreiben in derselben Transaktion je eine Evidence-Zeile.
- Idempotentes Accept (aktueller Stand vorhanden) schreibt **keine** zusätzliche Zeile.
- Legacy-Organisationen erhalten nie automatisch Consent.
- Audit: area `contracts`, action `accepted`, Notiz nur Revisions-IDs.

### Task 4 — Doku

- `src/organizer/dashboard/contracts/README.md` — tatsächliche Policy: eingefrorene Text-Snapshots,
  Aufbewahrung früherer Nachweise, Actor-Pflicht, Revision-IDs.

## Status

- Task 1 (M2, S2) — umgesetzt: Revisionen `2026-10-21-v1`, `organizerContractConsentInstantSchema` +
  `organizerContractConsentInstantIsValid`, Actor- und UTC-Instanz-Pflicht im Current-Check,
  abgeleitete Stale-Revision im Parity-Test, korrigierte Fixtures.
- Task 2 (M1, Date-Label) — umgesetzt: org-gebundenes `storedProfile()`, deterministischer
  Reset/Prefill in einem Effect, Guards für `canSubmit`/`submit`/`submitContracts`,
  Ziel-`orgId` eingefroren, `contractDateLabel` ohne `RangeError`.
- Task 3 (S1) — umgesetzt: Tabelle `organizerDashboardContractConsents` (append-only) mit
  Dokument-IDs/Revisionen, eingefrorenen Text-Snapshots, SHA-256-Digests, `acceptedAt` (UTC) und
  `acceptedByUserId`; Evidence + Audit in Create und Accept; Audit-Enums um `contracts`/`accepted`.
- Task 4 (Doku) — umgesetzt in `src/organizer/dashboard/contracts/README.md`.

## Verification

- `bun test <gezielte Dateien>` (kein Full-Suite-Lauf).
- `bunx vitest run --config vitest.convex.config.ts <gezielte convex-test-Dateien>`
  (kein `bun run test:convex`, das Codegen gegen Remote ausführt).
- `bun run boundary:check`
- `bunx biome format <geänderte Dateien>` / `biome check`
- `bunx tsc --noEmit -p tsconfig.json` (targeted: nur die geänderten Pfade prüfen)
