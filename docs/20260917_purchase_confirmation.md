# Purchase confirmation with four PDF attachments

Status: test-mode invoice exception implemented, deployed to preview, and verified through actual sandbox purchase, delivered three-PDF confirmation, and clean-mobile emailed-link access. Live purchases retain the four-PDF contract; production activation remains disabled.

Last updated: 2026-09-18.

User implementation authorization is complete. No overall implementation permission is pending. Production Billing
migrations/backend and the approved configured VAT policy are deployed. Production Convex functions and frontend are
deployed. Production activation remains disabled for new orders until real-provider and delivery verification is complete.

## Goal

Mode-specific requirement: the persisted checkout `stripeMode` determines invoice behavior. Test-mode purchases skip invoice generation entirely, including all Lexware contact/invoice/PDF calls, and send exactly three PDFs: tickets, terms, privacy, in that order. No placeholder invoice is generated or attached, and the email must not claim an invoice is attached. Live-mode purchases retain the four-PDF requirement below. References to four PDFs throughout this document apply to live mode; test mode uses this explicit exception.

After a successful purchase and ticket issuance, send one order-confirmation email using email-generator for branded HTML and plain text. Attach exactly four PDFs, in this MIME attachment order. Select the filenames from the confirmation/order language:

**English:**

1. `tickets.pdf`
2. `invoice.pdf`
3. `terms.pdf`
4. `privacy.pdf`

**German:**

1. `Tickets.pdf`
2. `Rechnung.pdf`
3. `AGB.pdf`
4. `Datenschutzerklaerung.pdf`

Language-appropriate filenames do not change the required attachment order or four-file count.

Include a prominent **Open your tickets** link and a plain-text equivalent. Customers must be able to open it on a different phone/browser without the original checkout session and show their ticket QR codes without opening a PDF.

## Current context

- Eventoren creates ticket orders through Billing. Its paid-state mutation issues tickets atomically and schedules idempotent fulfillment work only for newly created orders whose persisted `fulfillmentEligible` value is true. Convex runs payment reconciliation and fulfillment preparation on scheduled five-minute paths.
- Eventoren now issues/reuses an opaque, revocable, order-scoped access capability and passes a stable `/checkout#ticketAccess=...` URL to Billing. The public access query resolves the hashed token without checkout localStorage or login.
- Billing's existing accepted-order email path generates legal PDFs, renders email-generator Markdown into branded HTML/text, and sends via organization-configured Resend or SMTP. The Eventoren confirmation path now prepares the ticket PDF, Lexware invoice/PDF, accepted legal PDFs, and one email with exactly four attachments, in the required order; it retries durable work and records ambiguous send outcomes for manual reconciliation.
- In the correct sibling repository `/home/leo/projects/billing` (not `invoicegen`), the implemented files are
  `src/checkout/server/eventorenTicketConfirmationProcess.ts`, `src/checkout/server/eventorenTicketConfirmationWorker.ts`,
  `src/checkout/server/eventorenTicketInvoiceEnsure.ts`, and `src/checkout/server/eventorenTicketPdfEnsure.ts`.
  `appBootstrap` installs the worker and starts recovery.
- Billing creates Eventoren invoices through Lexware and renders the combined ticket PDF with its existing isolated Chromium infrastructure. The renderer supports four tickets per A4 page with overflow pages as needed.
- The user chose Billing's existing rendering pipeline for ticket PDF rendering. Lexware remains the invoice source.
- Eventoren's installed email-generator package has authentication templates, not Billing's Markdown-generation API. Reuse Billing's existing rendering integration rather than adding a separate Eventoren mail pipeline.
- Eventoren ticket checkout remains a separate Billing path. Its implemented invoice ensure reuses the stable Stripe session/order identity and existing purchase records where possible; retries must not create another invoice.
- Eventoren passes legal acceptance/revision evidence to Billing, and the implemented confirmation process renders the persisted accepted terms/privacy bodies rather than mutable latest text.
- New Eventoren checkouts load the tax policy from Billing's organization presentation configuration and persist it in the immutable commercial snapshot. The confirmation process uses that snapshot for the invoice and refuses to send an incomplete email when the invoice artifact is missing. Legacy paid snapshots without a tax policy remain blocked; they are not retroactively reinterpreted.
- The only activation switch is Eventoren's Convex runtime environment variable `EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST`, captured as `fulfillmentEligible` at order creation. Setting a frontend `.env.production` value alone does not activate fulfillment. The production allowlist remains empty/disabled for new orders and there is no backfill.
- Preview uses persisted `gross_inclusive` / `1900` organization tax configuration, organization SMTP settings, and a dedicated Stripe test webhook targeting preview Billing. Preview checkout bypasses are disabled. Public catalog projections use the synchronized catalog version.

## Decisions

- **Test-mode invoice exception:** skip the Eventoren invoice ensure path entirely when the persisted checkout mode is `test`. Use the existing confirmation worker, rendering, transport, and idempotency. Other Billing invoice flows are unchanged. Tests must prove zero invoice-provider calls and three attachments in both languages while retaining live-mode four-attachment coverage.
- **Eventoren owns fulfillment:** ticket issuance, inventory, ticket QR identity, customer ticket access, and the ticket PDF request data.
- **Billing owns invoices and delivery:** reuse its Lexware integration, organization sender configuration, existing Chromium-based PDF infrastructure, legal PDF generation, email-generator integration, and delivery tracking. Billing validates Eventoren's authoritative ticket data, renders/stores the actual ticket PDF, and attaches it first.
- **Lexware supplies the invoice PDF:** Billing creates the invoice and downloads its PDF through the existing Lexware integration. Do not locally render a replacement invoice.
- **Eventoren tax policy:** For a new Eventoren checkout, Billing loads `taxBasis` and `taxRateBasisPoints` with `organizationPresentationConfigLoad`; the current organization configuration is `gross_inclusive` and `1900` basis points (19%). The resolved policy is persisted with the checkout commercial snapshot. Ticket and fee gross amounts are unchanged and no additional VAT charge is added. Replays use the persisted snapshot even if current configuration is changed or missing; legacy snapshots without a policy remain unchanged and blocked for invoicing.
- **Billing renders the ticket PDF:** use the implemented dedicated ticket HTML template in Billing's existing Chromium-based PDF infrastructure, using authoritative issued-ticket data from Eventoren. Billing stores/reuses the generated PDF.
- **One combined ticket PDF per order:** Billing produces one combined PDF with up to four tickets per A4 page and overflow pages as needed, preserving exactly four attachments even when several tickets are purchased. Each ticket has its own unique, scan-readable admission QR.
- **One confirmation per Eventoren order:** checkout currently creates an order per event. Cross-event/cart-wide invoice and email consolidation is not included.
- **Mobile access lasts through the event:** use an opaque, revocable, order-scoped read-only link usable without login. Do not use a short-lived login link that expires before admission. Do not grant refund, transfer, or administrative permissions through this link.
- Preserve the requested attachment order in the send payload. Mail clients may choose their own display ordering.
- **Language-appropriate attachment filenames:** select filenames from the confirmation/order language. For English use `tickets.pdf`, `invoice.pdf`, `terms.pdf`, and `privacy.pdf`; for German use `Tickets.pdf`, `Rechnung.pdf`, `AGB.pdf`, and `Datenschutzerklaerung.pdf`. Keep the same ticket/invoice/terms/privacy order and exactly four attachments in both languages.

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

### 5. Compose and send the four-attachment confirmation in Billing

Status: live-mode path and test-mode three-attachment exception implemented and unit-tested. Test mode bypasses invoice ensure and purchase creation; both languages are covered. Worker retry and activation semantics are unchanged. Preview deployment and actual test-mode delivered-email verification are complete.

The Eventoren-specific Billing path creates/retrieves its idempotent Lexware invoice and obtains the actual stored ticket PDF.
It generates terms and privacy PDFs from the legal documents accepted for that order, not mutable latest text and not
Contentoren's documents, and preserves the accepted language/revision. The implemented process ensures, in order, ticket,
invoice, terms, and privacy PDFs before sending.

The confirmation uses Billing's existing email-generator integration for the purchase summary, event information, prominent
mobile ticket CTA, and plain-text URL. It sends only after all four PDF artifacts are available; it never sends an
invoice-only or otherwise incomplete email. Attachment filenames, PDF content types, and array order are explicit: select
`tickets.pdf`, `invoice.pdf`, `terms.pdf`, and `privacy.pdf` for English confirmation/order language, or `Tickets.pdf`,
`Rechnung.pdf`, `AGB.pdf`, and `Datenschutzerklaerung.pdf` for German confirmation/order language. The selected names
preserve the ticket/invoice/terms/privacy order and exactly four attachments.

The confirmation worker persists retryable state and a stable provider idempotency key. It runs from Billing `appBootstrap`
on a one-minute interval, recovers stale claims, retries up to five times with bounded delays, and distinguishes failed sends
from unknown outcomes requiring manual reconciliation. SMTP deterministic Message-ID does not guarantee exactly-once delivery
after ambiguous failures; automatic retries and manual resend remain distinct operations.

Relevant Billing files: `src/checkout/server/eventorenTicketConfirmationProcess.ts`,
`src/checkout/server/eventorenTicketConfirmationWorker.ts`, `src/checkout/server/eventorenTicketInvoiceEnsure.ts`,
`src/checkout/server/eventorenTicketPdfEnsure.ts`, `src/invoicing/orderConfirmationEmailRender.ts`,
`src/legal/acceptedOrderLegalPdfEnsure.ts`, and `src/platform/email/organizationEmailSend.ts`.

### 6. Verify the complete purchase flow

Status: sandbox verification complete for the test-mode exception, including actual three-PDF email delivery and clean-mobile access from its link. Live-provider four-PDF delivery remains unverified. Preview allowlist is restored to unset; production activation remains disabled.

- A real Stripe sandbox purchase has completed and issued five tickets through server reconciliation. That order retains `fulfillmentEligible: false`; it does not verify enabled-order confirmation scheduling or delivery.
- Local isolated integration covers actual ticket and accepted-legal PDFs plus real email-transport serialization, using a FAKE Lexware provider with a watermarked test invoice PDF; it does not verify a live provider.
- Implemented send contract: the received message has exactly four PDF attachments in ticket/invoice/terms/privacy payload order, with `tickets.pdf`, `invoice.pdf`, `terms.pdf`, and `privacy.pdf` for English confirmation/order language, and `Tickets.pdf`, `Rechnung.pdf`, `AGB.pdf`, and `Datenschutzerklaerung.pdf` for German confirmation/order language.
- Implemented PDF contract: multiple purchased tickets produce one combined PDF with up to four tickets per A4 page and overflow pages as needed; every ticket has a unique, scan-readable admission QR matching its issued online ticket.
- The implemented path validates invoice totals/identity and legal revisions against the purchase.
- Invalid and empty/64-character token routes show the intended exclusive error states and clear the URL hash. Valid capability access is verified in a clean mobile browser without login or original checkout storage, including all five rendered QR codes and refresh. Actual browser QR payload decoding remains unverified.
- Repeated payment events, reconciliation, and job retries do not create duplicate tickets/invoices or normal duplicate confirmation jobs.
- PDF or provider failure retries without sending an incomplete email; a missing test invoice PDF therefore produces no confirmation email.
- Inventory-conflict purchases do not send a normal ticket confirmation.
- Existing Contentoren and other Billing invoice-email flows remain unchanged.

Current sandbox coverage includes a newly eligible paid purchase, one actual delivered German confirmation with ordered
`Tickets.pdf`, `AGB.pdf`, and `Datenschutzerklaerung.pdf`, five tickets across two PDF pages, accepted legal snapshot content,
HTML/text ticket links, and clean-mobile access to all five rendered QR codes before and after refresh. Test mode creates
no purchase/invoice record. Replay checks preserve the issued tickets and sent confirmation. Automatic machine decoding
of rendered QR images remains unverified. SMTP ambiguous outcomes retain manual-reconciliation semantics rather than
automatic resend guarantees. Preview allowlist is unset; existing ineligible orders are not backfilled.
Live-mode four-PDF behavior retains automated coverage; sandbox verification does not establish live-provider delivery.

## Review decisions

The up-to-four-tickets-per-A4-page layout is approved, including overflow pages and a unique, scan-readable admission QR per ticket. The plan uses Billing's existing Chromium-based PDF infrastructure with a new dedicated ticket HTML template: Eventoren sends authoritative issued-ticket data to Billing, which renders/stores the combined PDF and attaches it first; Lexware remains the invoice PDF source and Billing/Lexware ownership is unchanged. The combined PDF and exactly four attachments (ticket, invoice, terms, privacy) remain in scope. Attachment filenames follow the confirmation/order language: English uses `tickets.pdf`, `invoice.pdf`, `terms.pdf`, and `privacy.pdf`; German uses `Tickets.pdf`, `Rechnung.pdf`, `AGB.pdf`, and `Datenschutzerklaerung.pdf`, without changing the order or count.

Invoicegen integration, changes, and contract work are out of scope. Billing Chromium remains the PDF renderer; the contract
is exactly four attachments, with up to four tickets per A4 page and overflow pages as needed.
