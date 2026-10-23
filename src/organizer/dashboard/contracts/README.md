# Organizer contract templates and legacy policy

These are organizer-specific **Vertragsdokumente** (Veranstalter-AGB and AVV), not buyer terms. No deployment or production enablement is part of this change. Complete the parties, pricing, TOM and subprocessor annexes.

## Version identity

`organizerContractDocuments.ts` is the immutable source of the example texts and static IDs. `termsRevision` / `dpaRevision` are globally unique document-version IDs (they include the document identity). The currently published stand is `2026-10-23-v1` for both documents (`eventoren-veranstalter-agb-2026-10-23-v1`, `eventoren-veranstalter-avv-2026-10-23-v1`); every caller derives its revision from that constant, and the parity suite derives its stale revision from the current one instead of a hardcoded date. Published revisions must never be edited in place. A text change requires new IDs/revisions and retaining prior text for old evidence. The static, unauthenticated SSR route `/veranstalter-vertraege` exposes both full texts; fragment URLs address each document. Both are linked before onboarding checkboxes and from settings. Do not relabel or reuse checkout/buyer terms.

## Evidence

Create and `organizerContractsAcceptMutation` require both literal `true` values and both exact current revisions. There are no normal-mode or fixture exemptions, no transport defaults, and no client-provided timestamps. The backend records UTC ISO `termsConsentedAt`, `dpaConsentedAt`, the revisions and `consentedByUserId`. Existing `termsAcceptedAt` / `dpaAcceptedAt` remain additive historical fields and are never rewritten by later acceptance. An idempotent retry of current acceptance preserves its time and actor. Settings displays UTC evidence in Europe/Berlin. No acceptance is implied by viewing documents or opening settings. Only the `inhaber` may accept for an existing organization; missing membership, blocked organizations and other roles fail authorization.

Consent evidence is immutable and append-only in `organizerDashboardContractConsents`: each explicit acceptance stores both document IDs/revisions, frozen exact heading/body text snapshots, SHA-256 digests, the UTC ISO instant and the accepting actor. Digests use UTF-8 fixed-key JSON containing `documentId`, `revision` and ordered `sections` objects (`heading`, `body`); no whitespace or text normalization occurs. Earlier evidence rows remain unchanged when the organization's current-revision pointer moves. Current acceptance requires `consentedByUserId` and valid UTC ISO consent instants, not just matching revisions.

Creation and real acceptance write a `contracts` / `accepted` audit entry in the same transaction. Its note contains revision IDs only (`terms=…; dpa=…`), never document text, snapshots, bank data or other PII. Idempotent retries append neither evidence nor audit rows. The evidence table is internal persistence for existing create/accept operations; no new public evidence-reading endpoint or separate CLI/API operation is exposed.

## Explicit legacy activation policy

**No grandfathering for activation or reactivation.** Timestamp-only records, migrated records with empty contracts and obsolete revisions do not satisfy the current-contract check. Neither migration nor an administrator may manufacture acceptance. Both approve and unblock-to-active use `organizerDashboardAdminActivationCheck` and require current revisioned evidence, in addition to bank/configuration/pricing readiness.

This does not retroactively deactivate already-active legacy organizations or add a new sales-stop policy. Any such rollout is a separate explicit decision. Their owners can record real acceptance in settings; until then a future activation/reactivation fails closed. Public projections must not include bank or consent records; the member settings query and authorized administrator detail remain private.

## Interface handoff

Do not default revision fields in compatibility adapters. Old create calls without them must fail. Existing create transport needs required `termsRevision` and `dpaRevision` alongside the explicit true flags. The request parser, dispatcher and Convex backend forwarding were updated, and the TS client's create request schema now carries both entries from `organizerDashboardOrganizationCreateSchema`.

HTTP/CLI/client parity for existing-org acceptance is implemented as the allowlisted `contracts-accept` operation. Request: `{ operation: "contracts-accept", orgId, termsAccepted: true, dpaAccepted: true, termsRevision, dpaRevision }`, using `organizerContractConsentSchema` entries; a missing or stale revision and a false flag are rejected locally per surface (400 / CLI exit 2) and never reach the backend. It maps to `api.organizerDashboard.organizerContractsAcceptMutation` with the server authentication token; result is `Result<{ orgId }>`. The operation registry, strict request parser, dispatch, Convex adapter, Hono/CLI/client plumbing and interface parity tests were updated together. Dashboard settings already calls this Convex mutation directly. Organization-get returns additive `contracts.current`, optional revision and `*ConsentedAt` fields; any strict client response schema must allow them. Historical flags remain but do not imply current acceptance.
