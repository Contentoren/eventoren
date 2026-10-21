# Team safety and review fixes

Team mutations only change the optional five-role `organizerRole`; canonical `member` / `guest`, `invitedBy` and membership rows are retained. Acceptance creates a canonical `member` only when no membership exists. No role ranking implies capability containment: self-changes compare permission sets, and accepting an invitation with a different existing organizer role fails without changing either the role or invitation. A matching existing role can accept without rewriting membership metadata.

Acceptance reauthorizes the stored inviter inside the same grant transaction: the user must still exist and not be soft-deleted, have exactly one canonical membership, and have `team.verwalten`. `RoleGuard` additionally requires a current owner for owner grants. Invitation creation is not permanent delegated authority. No blanket `emailVerifiedAt` requirement is added (Zitadel-backed accounts can lack that field).

## Explicit bounded checks

- Last-owner changes query the existing `(orgId, organizerRole)` index and inspect at most **100 owner candidates plus one sentinel**, excluding the target. Only nondeleted users with exactly one canonical membership count. If another usable owner cannot be proved within the budget, the mutation fails closed with an explicit budget error; stale rows must be resolved. Reads participate in Convex transaction conflict detection. This does not alter or guarantee the separately owned account deletion workflow.
- Legacy mixed-case emails: before invite creation, read at most **200 organization membership rows plus one sentinel** and fetch their canonical users. Compare normalized email addresses. Larger rosters fail closed with an explicit migration-required error, rather than guessing or scanning all users. Normalized/input-spelling indexed account lookups still detect duplicate accounts where those spellings are indexed. This is targeted compatibility, not a global auth/email migration or a guarantee of case-insensitive uniqueness across all legacy accounts.
- New index on the existing canonical invitation table: `orgIdAndInvitedEmailAndStatusAndExpiresAt` = `[orgId, invitedEmail, status, expiresAt]`. The live pending range probes at most **two rows per address**, independent of all closed history. On a successful invite batch, at most **two expired pending rows per address** are explicitly marked expired; older stale pending rows stay audit-visible and cannot block the live range. Existing accepted/revoked/expired rows are never deleted. The complete batch is validated before any writes.

## Delivery policy

`queued` resend requests are coalesced by rejection; `sending` requests are rejected, never reset. This includes abandoned claims with unknown provider outcomes: **manual reconciliation is required**; there is no timeout-based automatic resend. Recorded completed attempts can be explicitly retried. Attempt fencing protects durable result recording, not the external SMTP side effect. `sent` means the configured provider accepted a request, not recipient delivery or SMTP exactly-once guarantees. Development has no sender and honestly reports `skipped` (or configuration failure), never actual delivery.

## UI and integration

Role URL dialogs seed only once their matching paginated member arrives and preserve same-identity user edits. Save/remove require a loaded target. A member beyond the loaded prefix displays unavailable feedback and manual bounded-page load-more; no all-pages query or new direct-member operation was added. Organization/permission transitions clear drafts, feedback and pending flags, and close URL dialogs (the initial deep link is preserved). Scope generations protect all asynchronous mutation results and finally blocks, including A → B → A. Dialog generations additionally prevent an old mutation closing a replacement dialog.

**No new public operations or API/client/CLI/shell edits.** Existing nine team operations retain their request/response contracts. The canonical parent schema is reused; no local `defineSchema`, generated API edits or unknown data-model bridge. The index needs normal parent deployment/codegen integration, which this implementation did not run. Invitation history is preserved; a separate team role-change audit table/stream was not added in this review-fix pass.

## Local regression coverage

- `convex-tests/organizerDashboardTeam.test.ts`: canonical-schema Convex tests, including live inviter authorization, live usable owner protection/concurrent self-demotions and budget failure, claim/resend/claim fencing, incomparable-role conflicts, legacy mixed-case membership detection/roster budget, and closed-history/expiry handling. Role acceptance fixtures use actual invitation creation before membership changes.
- `test/organizerDashboardTeamRoleGuard.test.ts`, `test/organizerDashboardTeamDeliveryResolve.test.ts`: pure decisions.
- `pages/team/veranstalterDashboardTeamStateCreate.test.ts` runs its sibling `.case.ts` in an isolated real Solid/provider runtime, without replacing the mutation/query adapters. Covers URL reload, delayed target loading, edit retention, explicit load-more, organization transitions, matching-target guards and stale success/error/finally behavior for all five team UI mutations.
