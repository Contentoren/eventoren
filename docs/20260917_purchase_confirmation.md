# Purchase confirmation with mode-specific PDF attachments

Status: the live-mode four-PDF path and the test-mode three-PDF path are implemented and covered by rendered-PDF tests. Test confirmations intentionally omit the invoice because Lexware is the fiscal invoice source: test mode renders ticket, terms, and privacy only and makes no Lexware calls. The live production Billing organization `org_8a374e4c864f49cc92d9c0020babacdc` is independently verified on the fulfillment allowlist, and fresh checkouts use `gross_inclusive` with `taxRateBasisPoints` `1900`. Production auth-email delivery is verified through the internal-gateway SMTP route and IMAP. The remaining gap is one paid production purchase with end-to-end live four-PDF confirmation delivery; it is not a missing allowlist or fresh-checkout tax configuration.

Last updated: 2026-09-23.

User implementation authorization is complete. No overall implementation permission is pending. Production Billing
migrations/backend and the approved configured VAT policy are deployed. Production Convex functions and frontend are
deployed. Fulfillment is enabled for the independently verified live production Billing organization allowlist entry;
the actual paid production purchase and four-PDF confirmation remain unverified. Auth SMTP production routing is fixed
through the private internal host-gateway route on TCP 587, with STARTTLS certificate verification using
`email.contentoren.de` as the TLS server name; action delivery and IMAP receipt are verified. The route and credentials
remain in private deployment configuration.

## Goal

Every live Eventoren order-confirmation email must contain exactly four PDFs, in this order: ticket, invoice, terms, privacy. Live-mode purchases obtain the invoice PDF from Lexware. Test confirmations are the explicit Lexware-driven exception: they contain exactly three actually rendered PDFs, in this order: ticket, terms, privacy. They omit the invoice rather than replacing it with a local non-fiscal document and make no Lexware calls.

After a successful purchase and ticket issuance, send one order-confirmation email using email-generator for branded HTML and plain text. Attach the mode-specific PDFs in this MIME attachment order. Select the filenames from the confirmation/order language:

**English live:**

1. `tickets.pdf`
2. `invoice.pdf`
3. `terms.pdf`
4. `privacy.pdf`

**German live:**

1. `Tickets.pdf`
2. `Rechnung.pdf`
3. `AGB.pdf`
4. `Datenschutzerklaerung.pdf`

Language-appropriate filenames do not change the required attachment order or mode-specific file count. Test mode uses only `tickets.pdf`, `terms.pdf`, and `privacy.pdf` (or `Tickets.pdf`, `AGB.pdf`, and `Datenschutzerklaerung.pdf` in German); there is no `invoice.pdf`/`Rechnung.pdf` test attachment.

Include a prominent **Open your tickets** link and a plain-text equivalent. Customers must be able to open it on a different phone/browser without the original checkout session and show their ticket QR codes without opening a PDF.

## Current context

- Eventoren creates ticket orders through Billing. Its paid-state mutation issues tickets atomically and schedules idempotent fulfillment work only for newly created orders whose persisted `fulfillmentEligible` value is true. Convex runs payment reconciliation and fulfillment preparation on scheduled five-minute paths.
- Eventoren now issues/reuses an opaque, revocable, order-scoped access capability and passes a stable `/checkout#ticketAccess=...` URL to Billing. The public access query resolves the hashed token without checkout localStorage or login.
- Billing's existing accepted-order email path generates legal PDFs, renders email-generator Markdown into branded HTML/text, and sends via organization-configured Resend or SMTP. The Eventoren confirmation path prepares the ticket PDF, accepted legal PDFs, and one email; live mode adds the Lexware invoice as the second attachment for exactly four PDFs, while test mode intentionally sends exactly three PDFs and makes no Lexware call. It retries durable work and records ambiguous send outcomes for manual reconciliation.
- In the correct sibling repository `/home/leo/projects/billing` (not `invoicegen`), the implemented files are
  `src/checkout/server/eventorenTicketConfirmationProcess.ts`, `src/checkout/server/eventorenTicketConfirmationWorker.ts`,
  `src/checkout/server/eventorenTicketInvoiceEnsure.ts`, and `src/checkout/server/eventorenTicketPdfEnsure.ts`.
  `appBootstrap` installs the worker and starts recovery.
- Billing creates live Eventoren invoices through Lexware and renders the combined ticket PDF with its existing isolated Chromium infrastructure. Test Eventoren confirmations do not create a local invoice artifact. The ticket renderer supports four tickets per A4 page with overflow pages as needed.
- The user chose Billing's existing rendering pipeline for ticket PDF rendering. Lexware remains the invoice source.
- Eventoren's installed email-generator package has authentication templates, not Billing's Markdown-generation API. Reuse Billing's existing rendering integration rather than adding a separate Eventoren mail pipeline.
- Eventoren ticket checkout remains a separate Billing path. Its implemented invoice ensure reuses the stable Stripe session/order identity and existing purchase records where possible; retries must not create another invoice.
- Eventoren passes legal acceptance/revision evidence to Billing, and the implemented confirmation process renders the persisted accepted terms/privacy bodies rather than mutable latest text.
- New Eventoren checkouts load the tax policy from Billing's organization presentation configuration and persist it in the immutable commercial snapshot. Live invoicing uses that persisted policy and refuses to send when the invoice artifact is missing. Test confirmations do not render or infer an invoice and do not call Lexware. Legacy paid snapshots without a tax policy remain blocked for live invoicing; they are not retroactively reinterpreted.
- The only activation switch is Eventoren's Convex runtime environment variable `EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST`, captured as `fulfillmentEligible` at order creation. The design is disabled by default: setting a frontend `.env.production` value alone does not activate fulfillment, and an empty allowlist leaves the ordinary checkout behavior unchanged. The live production Billing organization `org_8a374e4c864f49cc92d9c0020babacdc` is independently verified as enabled on the runtime allowlist; this task did not change or apply that value, and there is no backfill.
- Production auth-email delivery is verified through `authEmail:sendAuthEmailInternalAction`, the fixed internal-gateway TCP 587 route with TLS verification for `email.contentoren.de`, and an IMAP receipt. Current browser SSO is Zitadel via `/sign-in` → `/login/zitadel`; `/sign-up` has no intended active UI. The retained custom signup backend-action test proves transport only, not a browser signup page or paid-order confirmation delivery; do not add or recommend a new signup route.
- Preview uses persisted `gross_inclusive` / `1900` organization tax configuration, organization SMTP settings, and a dedicated Stripe test webhook targeting preview Billing. Preview checkout bypasses are disabled. Public catalog projections use the synchronized catalog version.

## Decisions

- **Mode-specific PDF contract:** live persisted checkouts require ticket, Lexware invoice, terms, and privacy attachments in that order. Test persisted checkouts require only ticket, terms, and privacy attachments in that order; they omit the invoice and make no Lexware calls. Other Billing invoice flows are unchanged.
- **Eventoren owns fulfillment:** ticket issuance, inventory, ticket QR identity, customer ticket access, and the ticket PDF request data.
- **Billing owns invoices and delivery:** reuse its Lexware integration, organization sender configuration, existing Chromium-based PDF infrastructure, legal PDF generation, email-generator integration, and delivery tracking. Billing validates Eventoren's authoritative ticket data, renders/stores the actual ticket PDF, and attaches it first.
- **Lexware supplies the live invoice PDF:** Billing creates the live invoice and downloads its PDF through the existing Lexware integration. Test mode has no invoice attachment and never calls Lexware; generic generated-offer test-invoice workflows are separate.
- **Eventoren tax policy:** For a new Eventoren checkout, Billing loads `taxBasis` and `taxRateBasisPoints` with `organizationPresentationConfigLoad`; the current organization configuration is `gross_inclusive` and `1900` basis points (19%). The resolved policy is persisted with the checkout commercial snapshot. Ticket and fee gross amounts are unchanged and no additional VAT charge is added. Live replays use the persisted snapshot even if current configuration is changed or missing; legacy snapshots without a policy remain unchanged and blocked for live invoicing. Test confirmations do not render an invoice or apply a fiscal policy.
- **Billing renders the ticket PDF:** use the implemented dedicated ticket HTML template in Billing's existing Chromium-based PDF infrastructure, using authoritative issued-ticket data from Eventoren. Billing stores/reuses the generated PDF.
- **One combined ticket PDF per order:** Billing produces one combined PDF with up to four tickets per A4 page and overflow pages as needed, preserving the live four-attachment or test three-attachment contract even when several tickets are purchased. Each ticket has its own unique, scan-readable admission QR.
- **One confirmation per Eventoren order:** checkout currently creates an order per event. Cross-event/cart-wide invoice and email consolidation is not included.
- **Mobile access lasts through the event:** use an opaque, revocable, order-scoped read-only link usable without login. Do not use a short-lived login link that expires before admission. Do not grant refund, transfer, or administrative permissions through this link.
- Preserve the requested attachment order in the send payload. Mail clients may choose their own display ordering.
- **Language-appropriate attachment filenames:** select filenames from the confirmation/order language. Live English uses `tickets.pdf`, `invoice.pdf`, `terms.pdf`, and `privacy.pdf`; live German uses `Tickets.pdf`, `Rechnung.pdf`, `AGB.pdf`, and `Datenschutzerklaerung.pdf`. Test mode omits the invoice filename and keeps ticket, terms, privacy order in both languages.

## Approach and tasks

### 1. Define the cross-service contracts

Status: implemented.

The implemented contract is an authenticated, idempotent fulfillment-ready request from Eventoren to Billing, keyed by the stable Billing/Eventoren order mapping. It contains immutable authoritative issued-ticket data or references, the online-ticket URL, and legal revision reference. Billing validates ownership and authoritative payment state, then renders/stores the ticket PDF from that validated data with its dedicated ticket HTML template; it does not accept customer-supplied fulfillment claims or arbitrary fetch URLs.

Current task-1 contract decision: the standalone Billing package exports
`eventorenTicketFulfillmentPrepareRequestSchema`,
`eventorenTicketFulfillmentPrepareResponseSchema`, and `eventorenTicketFulfillmentPrepare`. The request is an authenticated
POST to `/api/checkout/organizations/eventoren/ticket-fulfillment`, scoped by the bearer credential (an optional
`organizationId` is only a cross-check), and is keyed by the immutable `orderReference` plus `paymentReference`.
It carries an Eventoren-issued `event` snapshot (`eventKey`, title, dates, doors time, venue, city, address), `tickets`
with opaque `ticketId`, admission QR `admissionCode`, sequence, tier key/label, and optional participant name,
`onlineTicketUrl`, locale, and accepted legal context. The legal context carries the exact accepted `termsMarkdown` and
`privacyMarkdown` bodies, acceptance flags/CTA, and their revision. Billing must never fetch the online ticket URL or
any arbitrary URL from this request. The response is `{ orderReference, paymentReference, fulfillmentReference,
status: "accepted" | "prepared", replayed }` inside the standard success envelope. Billing authenticates the
organization credential, validates the paid Eventoren checkout and immutable evidence, and persists this request
idempotently. The preparation route itself performs no PDF, invoice, email, or provider side effect; the installed Eventoren
confirmation worker consumes the accepted fulfillment and performs those durable downstream steps. The route is included in
Billing OpenAPI.

Checkout activation decision: Eventoren uses the disabled-by-default explicit allowlist environment variable
`EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST`, containing comma-separated exact Billing organization IDs.
Only a newly inserted Eventoren checkout evaluates this switch. Its `fulfillmentEligible` boolean is persisted on the
order; replay returns the stored value, or `false` for legacy orders without the field, regardless of later switch
changes. The ordinary checkout request and Billing/provider behavior are unchanged while the allowlist is empty.

Legal snapshot decision: the current checkout legal sources are `src/legal/agb.md` and `src/legal/datenschutz.md` (their
YAML front matter is not part of the accepted body). The deterministic revision is the SHA-256 of the UTF-8 bytes of
`JSON.stringify({ termsMarkdown, privacyMarkdown })` after each body is trimmed, prefixed with `sha256:`. The current
source-derived revision is `sha256:cde3b9ff38ba7e012154d8b642ff52b98d9d725d99e1a3d5704d52e1566db31f`; the generated
constant must be refreshed with `bun run legal:checkout-revision` whenever either source changes. New enabled orders
require that exact revision and exact Markdown bodies; the accepted revision and bodies are persisted on new orders.
Replayed orders are not revalidated against current sources, including legacy orders with the previous checkout context shape.

The implemented invoice path maps Eventoren's checkout snapshot to Lexware invoice identity, customer data, and accepted legal
document content. It reuses existing Billing invoice records where present; retries must not create another invoice. New
Eventoren checkouts source tax policy from `organizationPresentationConfigLoad`, converting the configured
`taxRateBasisPoints` into the persisted commercial snapshot; invoice creation reads that immutable snapshot rather than current
configuration. Existing non-Eventoren invoice emails remain unchanged.

Relevant files:
- Eventoren: `src/ticketing/convex/billingEventorenClient.ts`, `src/ticketing/convex/ticketTables.ts`.
- Billing: `src/checkout/server/eventorenTicketCheckoutHandlerCreate.ts`, `src/invoicing/invoicePurchaseProcess.ts`, `src/invoicing/invoiceEmailSend.ts`.

### 2. Make fulfillment browser-independent

Status: implemented.

Eventoren has server-scheduled reconciliation and fulfillment preparation using the existing scoped Billing status API. The
Convex cron invokes `ticketFulfillmentWorkScheduledAction` every five minutes; it reads due work and invokes
`ticketFulfillmentPrepareAction`. Work is created idempotently by `ticketFulfillmentWorkEnsure` only for paid,
`fulfillmentEligible` orders, preserves the request snapshot, ensures access, and records the prepared Billing fulfillment.
The flow does not rely solely on browser polling or redirect success.

When the existing paid mutation successfully issues tickets, it schedules pending fulfillment work. A retryable server action
prepares fulfillment and notifies Billing using the stable order key. It does not queue normal confirmation work for
`paid_inventory_conflict`, non-paid orders, or orders without the expected issued tickets. Retrying reconciliation or
fulfillment does not reissue tickets.

Relevant files: `convex/crons.ts`, `src/ticketing/convex/ticketFulfillmentWorkScheduledAction.ts`,
`src/ticketing/convex/ticketFulfillmentPrepareAction.ts`, `src/ticketing/convex/ticketFulfillmentWorkEnsure.ts`,
`src/ticketing/convex/ticketPaymentReconcileAction.ts`, and `src/ticketing/convex/ticketPaymentStatusApplyMutation.ts`.

### 3. Enable the emailed mobile ticket link

Status: implemented.

The existing order/ticket access flow now has a server-issued, read-only bearer link. The internal capability mutation
creates/reuses the capability and returns `/checkout#ticketAccess=<token>`. The public access query hashes/resolves the
guest token, rejects missing or revoked access, and returns the ticket-order projection without depending on checkout
localStorage. The current ticket view and `#ui/...` components remain the display path, and the same link is used in the
confirmation email.

Relevant files: `src/routes/checkout.tsx`, `src/ticketing/convex/ticketOrderAccessCapabilityEnsureMutation.ts`,
`src/ticketing/convex/ticketOrderAccessCapabilityEnsure.ts`, `src/ticketing/convex/ticketOrderByAccessTokenQuery.ts`,
`src/ticketing/ticketOrderByAccessTokenGet.ts`, and `src/ticketing/ticketOrderEmailAccessPageStateCreate.ts`.

### 4. Add ticket PDF rendering in Billing

Status: implemented.

Billing has a dedicated Eventoren ticket HTML template and uses its existing isolated Chromium-based PDF infrastructure with
validated Eventoren input. It produces one combined PDF with up to four tickets per A4 page and overflow pages as needed,
including event/location data, ticket identity, attendee data where available, and each ticket's unique admission QR. The
online-order link is not substituted for the admission QR.

Eventoren supplies authoritative issued-ticket data through the authenticated fulfillment contract. Billing renders and
stores/reuses the generated PDF through its private artifact infrastructure. The exact implementation is in
`src/checkout/server/eventorenTicketPdfEnsure.ts` and the related Eventoren ticket HTML/QR modules; there is no
`invoicegen` integration or generic invoicegen ticket-PDF API. Ticket templates remain separate from legal document templates.

The renderer layout contract supports 4 tickets → 1 A4 page and 5 tickets → 2 A4 pages.

Relevant Billing files: `src/checkout/server/eventorenTicketPdfEnsure.ts`,
`src/checkout/server/eventorenTicketHtmlCreate.ts`, `src/checkout/server/eventorenTicketPdfEnsure.test.ts`, and the
Chromium-based infrastructure shared with `src/legal/acceptedOrderLegalPdfEnsure.ts`.

### 5. Compose and send the mode-specific confirmation in Billing

Status: implemented and unit-tested with three test-mode attachments (ticket and legal PDFs) without Lexware, plus four live-mode attachments with actual ticket/legal rendering and a mocked Lexware PDF. Worker retry and activation semantics are unchanged. The paid production purchase and live four-PDF confirmation remain unverified.

The Eventoren-specific Billing path creates/retrieves its idempotent Lexware invoice in live mode and obtains the actual stored ticket PDF. In test mode it does not create an invoice artifact or call Lexware.
It generates terms and privacy PDFs from the legal documents accepted for that order, not mutable latest text and not
Contentoren's documents, and preserves the accepted language/revision. The process must ensure, in order, ticket, invoice,
terms, and privacy PDFs before sending in live mode. In test mode it ensures only ticket, terms, and privacy PDFs and sends
without an invoice attachment or Lexware call.

The confirmation uses Billing's existing email-generator integration for the purchase summary, event information, prominent
mobile ticket CTA, and plain-text URL. It sends only after all mode-specific PDF artifacts are available; it never sends an
invoice-only or otherwise incomplete email. Attachment filenames, PDF content types, and array order are explicit: select
`tickets.pdf`, `invoice.pdf`, `terms.pdf`, and `privacy.pdf` for English confirmation/order language, or `Tickets.pdf`,
`Rechnung.pdf`, `AGB.pdf`, and `Datenschutzerklaerung.pdf` for German live confirmation/order language. Test mode omits the
invoice filename and preserves ticket/terms/privacy order with exactly three attachments.

The confirmation worker persists retryable state and a stable provider idempotency key. It runs from Billing `appBootstrap`
on a one-minute interval, recovers stale claims, retries up to five times with bounded delays, and distinguishes failed sends
from unknown outcomes requiring manual reconciliation. SMTP deterministic Message-ID does not guarantee exactly-once delivery
after ambiguous failures; automatic retries and manual resend remain distinct operations.

Relevant Billing files: `src/checkout/server/eventorenTicketConfirmationProcess.ts`,
`src/checkout/server/eventorenTicketConfirmationWorker.ts`, `src/checkout/server/eventorenTicketInvoiceEnsure.ts`,
`src/checkout/server/eventorenTicketPdfEnsure.ts`, `src/checkout/server/eventorenTicketTestInvoicePdfEnsure.ts`,
`src/invoicing/orderConfirmationEmailRender.ts`,
`src/legal/acceptedOrderLegalPdfEnsure.ts`, and `src/platform/email/organizationEmailSend.ts`.

### 6. Verify the complete purchase flow

Status: automated coverage verifies three ordered test-mode PDFs and four ordered live-mode PDFs in both persisted checkout
modes. Production activation and
real-provider confirmation delivery remain outside this task.

- Test-mode Billing coverage checks exactly ticket, terms, and privacy attachments, sends no Lexware request, and checks the
  localized attachment order and PDF bytes.
- Live-mode Billing coverage renders the ticket and accepted legal PDFs, uses a mocked Lexware PDF source, and checks the
  localized attachment order, email link, and serialized PDF bytes.
- The implemented PDF contract produces one combined ticket PDF with up to four tickets per A4 page and overflow pages
  as needed; every ticket has a unique, scan-readable admission QR matching its issued online ticket.
- The implemented path validates invoice totals/identity and legal revisions against the purchase.
- Invalid and empty/64-character token routes show the intended exclusive error states and clear the URL hash. Valid
  capability access works in a clean mobile browser without login or original checkout storage.
- Repeated payment events, reconciliation, and job retries do not create duplicate tickets/invoices or normal duplicate
  confirmation jobs.
- PDF or provider failure retries without sending an incomplete email.
- Inventory-conflict purchases do not send a normal ticket confirmation.
- Existing Contentoren and other Billing invoice-email flows remain unchanged.

## Review decisions

The up-to-four-tickets-per-A4-page layout is approved, including overflow pages and a unique, scan-readable admission QR per ticket. The plan uses Billing's existing Chromium-based PDF infrastructure with a new dedicated ticket HTML template: Eventoren sends authoritative issued-ticket data to Billing, which renders/stores the combined PDF and attaches it first; Lexware remains the live invoice PDF source and Billing/Lexware ownership is unchanged. Live confirmations have exactly four attachments (ticket, invoice, terms, privacy); test confirmations have exactly three (ticket, terms, privacy) and no Lexware call. Live attachment filenames follow the confirmation/order language: English uses `tickets.pdf`, `invoice.pdf`, `terms.pdf`, and `privacy.pdf`; German uses `Tickets.pdf`, `Rechnung.pdf`, `AGB.pdf`, and `Datenschutzerklaerung.pdf`.

Invoicegen integration, changes, and contract work are out of scope. Billing Chromium remains the PDF renderer; the contract
is mode-specific: four live attachments or three test attachments, with up to four tickets per A4 page and overflow pages as needed.

Current verification status: the live production Billing allowlist entry for `org_8a374e4c864f49cc92d9c0020babacdc`,
fresh-checkout `gross_inclusive` / `1900` tax configuration, and production auth SMTP delivery are independently
verified. The only remaining confirmation gap is an actual paid production purchase through the complete live four-PDF
path. Browser authentication remains Zitadel SSO; `/sign-up` is not an intended active UI.
