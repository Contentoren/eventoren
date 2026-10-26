# Veranstalter-Dashboard: Team-Verwaltung (Handoff)

Stand: 2026-10-21, Branch `feature/veranstalter-dashboard`, Worktree
`/home/leo/.t3code-david/worktrees/eventoren/feature-veranstalter-dashboard`.

Dieser Schnitt implementiert die echte Team-Verwaltung des Veranstalter-Dashboards
auf dem kanonischen `orgMembers.organizerRole`: bounded Team-Liste, offene
Einladungen, Einladen, Rollenwechsel, Team-Entfernung, Einladung widerrufen,
erneut senden, authentifizierter Einladungs-Posteingang und Annahme.

## 1. Parent-Integration (Stand)

`convex/schema.ts` registriert die Team-Tabelle inzwischen:

```ts
import { organizerDashboardTeamTables } from "#src/organizer/dashboard/team/organizerDashboardTeamTables.ts"
// in defineSchema({ ... }):
...organizerDashboardTeamTables,
```

Damit sieht das generierte DataModel die Tabelle sofort
(`DataModelFromSchemaDefinition<typeof schema>`); es werden kanonische
`Id<"organizerDashboardTeamInvitations">`/`Doc<...>`-Typen und das normale
`ctx.db` benutzt, ohne lokale Schema-Definition und ohne `unknown`-Casts.

Offen bleibt nur das Generieren des `api`-Moduls: `convex codegen` ergänzt
`api.organizerDashboardTeam` in `convex/_generated/api.d.ts` (Deploy-Schritt).
Bis dahin referenziert der Client die Team-Funktionen über den typisierten
Helfer `organizerDashboardTeamFunctionReference` (siehe Abschnitt 6); nach dem
Codegen kann jeder Aufruf durch `api.organizerDashboardTeam.<funktion>`
ersetzt werden.

## 2. Neue Tabelle

`src/organizer/dashboard/team/organizerDashboardTeamTables.ts`

- Export: `organizerDashboardTeamTables`
- Tabelle: `organizerDashboardTeamInvitations`
- Felder: `orgId`, `invitedEmail`, `organizerRole` (5er-Rolle), `status`
  (`pending|accepted|revoked|expired`), `invitedByUserId`, `expiresAt`,
  `acceptedAt?`, `acceptedByUserId?`, `revokedAt?`, `deliveryState`
  (`queued|sending|sent|failed|skipped`), `deliveryAttempts`,
  `deliveryLastAttemptAt?`, `deliveryReason?`, `createdAt`, `updatedAt`
- Indexe: `orgId`, `orgIdAndStatus`, `orgIdAndInvitedEmail`, `invitedEmail`
  (der letzte Index ist der Zugriffspunkt des authentifizierten Posteingangs)

## 3. Operationen (Convex-Modul `organizerDashboardTeam`)

Dünner Wrapper: `convex/organizerDashboardTeam.ts`. Alle Funktionen sind
token-geschützt (Session-Token wie im übrigen Dashboard) und liefern ein
`Result` (`{success:true,data}` / `{success:false,op,errorMessage}`).

| Operation                                                | Art              | Args (ohne `token`)                                   | Ergebnis                                                     |
| -------------------------------------------------------- | ---------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| `organizerDashboardTeamMemberListQuery`                  | query            | `orgId`, `paginationOpts`                             | `{page: Member[], isDone, continueCursor}`                   |
| `organizerDashboardTeamInvitationListQuery`              | query            | `orgId`, `paginationOpts`                             | `{page: Invitation[], isDone, continueCursor}`               |
| `organizerDashboardTeamInviteMutation`                   | mutation         | `orgId`, `emails: string[]` (max. 5), `organizerRole` | `{invitations: Invitation[]}`                                |
| `organizerDashboardTeamRoleUpdateMutation`               | mutation         | `orgId`, `memberId`, `organizerRole: Role \| null`    | `Member`                                                     |
| `organizerDashboardTeamMemberRemoveMutation`             | mutation         | `orgId`, `memberId`                                   | `Member`                                                     |
| `organizerDashboardTeamInvitationRevokeMutation`         | mutation         | `orgId`, `invitationId`                               | `Invitation`                                                 |
| `organizerDashboardTeamInvitationResendMutation`         | mutation         | `orgId`, `invitationId`                               | `Invitation`                                                 |
| `organizerDashboardTeamInvitationInboxQuery`             | query            | `paginationOpts`                                      | `{page: Invitation[], isDone, continueCursor, accountEmail}` |
| `organizerDashboardTeamInvitationAcceptMutation`         | mutation         | `invitationId`                                        | `{memberId, orgId, organizerRole}`                           |
| `organizerDashboardTeamInvitationDeliveryClaimMutation`  | internalMutation | `invitationId`                                        | Claim-Ergebnis                                               |
| `organizerDashboardTeamInvitationDeliveryRecordMutation` | internalMutation | `invitationId`, `attempt`, `state`, `reason?`         | `{recorded}`                                                 |
| `organizerDashboardTeamInvitationDeliverAction`          | internalAction   | `invitationId`                                        | `null`                                                       |

`Member` = `{id, userId, name, email|null, role:"member"|"guest",
organizerRole: Role|null, invitedBy, createdAt}`.
`Invitation` = `{id, orgId, orgName, invitedEmail, organizerRole, status,
deliveryState, deliveryAttempts, deliveryReason|null, expiresAt, createdAt}`.

Geteilte Schemas (alle in `src/organizer/dashboard/team/`, Valibot, DRY
wiederverwendbar): `organizerDashboardTeamMemberSchema`,
`organizerDashboardTeamInvitationSchema`, `organizerDashboardTeamInviteSchema`,
`organizerDashboardTeamRoleUpdateSchema`,
`organizerDashboardTeamMemberRemoveSchema`,
`organizerDashboardTeamInvitationActionSchema`,
`organizerDashboardTeamInvitationStatusSchema`,
`organizerDashboardTeamDeliveryStateSchema`.

## 4. Rechte- und Schutzregeln (serverseitig)

- Jede Manager-Operation verlangt `team.verwalten`
  (`src/organizer/dashboard/convex/organizerDashboardAuthorize.ts`).
  `inhaber` und `admin` haben die Berechtigung, `eventmanager`, `finanzen` und
  `einlass` nicht.
- `inhaber` darf nur vom aktuellen `inhaber` vergeben, geändert oder entfernt
  werden; ein `admin` kann weder den Inhaber ändern noch sich selbst
  hochstufen.
- Der letzte Inhaber kann nicht demotiert oder entfernt werden. Der Test läuft
  über den Index `orgIdAndOrganizerRole` mit `.take(2)` (Owner-Probe).
- Eine Team-Entfernung patcht `organizerRole: undefined`. Die kanonische
  Mitgliedschaft (`role` member/guest, `invitedBy`) bleibt unverändert.
- Doppelte Mitgliedschaften und mehrdeutige Mitgliedschaften werden abgelehnt,
  nicht geraten.
- Doppelte offene Einladungen je `(orgId, invitedEmail)` werden abgelehnt; ein
  abgelehnter Batch legt keine halben Einladungen an (Validierung vor dem
  ersten Schreibzugriff).
- Eine Einladung an eine Adresse, die bereits Mitglied der Organisation ist,
  wird abgelehnt (Doppelmitgliedschaft).
- Nur der aktuelle Inhaber darf die Rolle `inhaber` einladen.
- Die Annahme prüft die kanonische Konto-E-Mail (`users.email`) gegen die
  eingeladene Adresse, den Status, die Ablaufzeit und den Organisationsstatus.
  Rolle und Organisation kommen ausschliesslich aus der gespeicherten
  Einladung, nie aus dem Request. Eine bestehende Mitgliedschaft behält ihre
  `member`/`guest`-Rolle und erhält nur die Teamrolle. Ein Rollenabstieg wird
  nicht durchgeführt; die Annahme ist einmalig (Replay wird abgelehnt).
- Ein Aufruf der Annahme-URL allein gewährt nichts: es gibt keine Mutation,
  die beim Öffnen auslöst.

## 5. Zustellung (ehrlicher Zustand)

Der Versand läuft über eine interne Action, die die Einladung zuerst _claimt_
(`sending`, `deliveryAttempts + 1`). Dadurch wird dieselbe Mail nie doppelt
versendet; ein späteres Ergebnis einer älteren Versuchsnummer wird verworfen.

- `sent` nur, wenn der Mail-Provider die Mail angenommen hat.
- `failed` mit Provider-Meldung.
- `skipped`, wenn kein Provider verfügbar ist (ausserhalb der Produktion oder
  fehlende Umgebungskonfiguration). Ausserhalb der Produktion wird **kein**
  Provider aufgerufen, es wird nichts behauptet, was nicht zugestellt wurde.

Der Provider wird injiziert (`organizerDashboardTeamDeliveryResolve` /
`organizerDashboardTeamEmailSenderCreate`), Tests nutzen einen Fake-Provider.
In der Produktion wird der bestehende Mailweg
(`internal.authEmail.sendAuthEmailInternalAction`, kind `orgInvitation`)
verwendet.

## 6. Client-Referenzen (vor Codegen)

`api.organizerDashboardTeam.*` existiert erst nach dem Codegen. Der Client
nutzt deshalb den typisierten Helfer:

```ts
import { organizerDashboardTeamFunctionReference } from "#src/organizer/dashboard/team/organizerDashboardTeamFunctionReference.ts"
import type { organizerDashboardTeamMemberListQuery } from "#src/organizer/dashboard/team/organizerDashboardTeamMemberListQuery.ts"
const reference = organizerDashboardTeamFunctionReference<typeof organizerDashboardTeamMemberListQuery>(
  "organizerDashboardTeam:organizerDashboardTeamMemberListQuery",
)
```

Der Import des Backend-Moduls muss `import type` sein, damit kein
Convex-Servercode in den Browser-Bundle wandert.

## 7. UI

- `/veranstalter/team` (`src/routes/veranstalter_.team.tsx`): Teammitglieder,
  offene Einladungen, Dialoge für Einladen/Rolle/Entfernen. Alle Dialogzustände
  liegen in der URL (`dialog`, `mitglied`).
- `/veranstalter-einladungen` (`src/routes/veranstalter-einladungen.tsx`):
  authentifizierter Posteingang und Annahme, ausserhalb der Dashboard-Shell
  (die eingeladene Person hat nicht zwingend eine Organisation). Parameter
  `einladung` markiert die Einladung aus dem Mail-Link.

## 7a. Noch offene Parent-Oberflächen (bewusst nicht angefasst)

Die Repo-Regel verlangt zusätzlich CLI, Hono-HTTP-API und TS-Client-Export.
Diese Oberflächen gehören dem Parent (`src/organizer/dashboard/api/**`,
`src/client/**`, `src/cli.ts`), deshalb wurden sie hier nicht angefasst.
Für die Verdrahtung:

- neue Operationen in `src/organizer/dashboard/api/organizerDashboardOperations.ts`:
  `team-list`, `team-invitations`, `team-invite`, `team-role`, `team-remove`,
  `team-invitation-revoke`, `team-invitation-resend`, `team-invitation-inbox`,
  `team-invitation-accept`
- wiederverwendbare Eingabeschemas (Valibot, thin derived wrappers für
  Oberflächen-Coercion): `organizerDashboardTeamInviteSchema`,
  `organizerDashboardTeamRoleUpdateSchema`,
  `organizerDashboardTeamMemberRemoveSchema`,
  `organizerDashboardTeamInvitationActionSchema`
- Ausgabeschemas: `organizerDashboardTeamMemberSchema`,
  `organizerDashboardTeamInvitationSchema`
- Abweichung: MCP existiert im Bestand nicht, daher keine MCP-Oberfläche.

## 8. Tests

- `convex-tests/organizerDashboardTeam.test.ts` (15 Tests, grün): fünf
  Rollen erlauben/verweigern, Cross-Org-IDs, Inhaberschutz (letzter Inhaber,
  Admin-Eskalation, Inhaber-Einladung), doppelte und mehrdeutige
  Mitgliedschaften, Ablauf, Widerruf, fremde E-Mail, atomare Annahme, Replay,
  Erhalt der member/guest-Rolle, ehrlicher Zustellungszustand, Resend ohne
  zweite Einladung, abgelehnter Batch ohne Teilstand.
- `test/organizerDashboardTeamDeliveryResolve.test.ts` (3 Tests, grün):
  gesendet/übersprungen/fehlgeschlagen mit injiziertem Provider.
- `test/organizerDashboardTeamRoleGuard.test.ts` (2 Tests, grün):
  Inhaberregel und Selbsteskalation.
- Vollständiger Convex-Lauf: 488 pass / 13 fail – dieselben 13 vorbestehenden
  Fehler wie im Baseline-Protokoll, keine neuen.
- `bunx tsc --noEmit -p tsconfig.json` und `-p convex/tsconfig.json`: keine
  Diagnosen in den Team-Dateien, den Team-Seiten oder den Team-Routen.
- `bun run src/sharedUiCheck.ts`: nur der vorbestehende Treffer
  `src/admin/AdminTicketOrdersPage.tsx`; `bun run src/webappBoundaryCheck.ts`
  ist grün.
