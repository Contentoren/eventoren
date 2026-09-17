# Purchase confirmation with four PDF attachments

Status: task 1 partially implemented — the authenticated Billing fulfillment route and evidence persistence are implemented;
downstream worker/orchestration remains deferred.

## Goal

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

- Eventoren creates ticket orders through Billing. Its paid-state mutation issues tickets atomically; payment reconciliation currently depends on the customer opening the order page.
- Eventoren already displays online tickets with QR codes, but guest access relies on browser-local storage. An ordinary order URL is insufficient for an email opened on another device.
- Billing's existing accepted-order email path generates legal PDFs, renders email-generator Markdown into branded HTML/text, and sends via organization-configured Resend or SMTP. Existing attachments are invoice, terms, privacy.
- Billing currently creates invoices through Lexware and has existing Chromium-based PDF infrastructure for accepted-order/legal PDFs. A dedicated ticket HTML template is not yet part of the verified implementation; reuse the infrastructure without assuming a generic ticket-PDF API.
- The user chose Billing's existing rendering pipeline for ticket PDF rendering. Lexware remains the invoice source.
- Eventoren's installed email-generator package has authentication templates, not Billing's Markdown-generation API. Reuse Billing's existing rendering integration rather than adding a separate Eventoren mail pipeline.
- Eventoren ticket checkout is a separate Billing path. The `relation.dynamicContext` branch in `src/payments/stripeCheckoutSessionPaidProcess.ts` marks payment paid and returns before invoice processing. Wiring Eventoren into Lexware invoice creation/PDF retrieval requires code, not merely organization configuration.
- Eventoren passes legal acceptance/revision evidence to Billing. Confirm availability of the actual revision-matched legal document bodies before reusing Billing's accepted-order PDF generator.

## Proposed decisions

- **Eventoren owns fulfillment:** ticket issuance, inventory, ticket QR identity, customer ticket access, and the ticket PDF request data.
- **Billing owns invoices and delivery:** reuse its Lexware integration, organization sender configuration, existing Chromium-based PDF infrastructure, legal PDF generation, email-generator integration, and delivery tracking. Billing validates Eventoren's authoritative ticket data, renders/stores the actual ticket PDF, and attaches it first.
- **Lexware supplies the invoice PDF:** Billing creates the invoice and downloads its PDF through the existing Lexware integration. Do not locally render a replacement invoice.
- **Billing renders the ticket PDF:** add a dedicated ticket HTML template to Billing's existing Chromium-based PDF infrastructure, using authoritative issued-ticket data from Eventoren. Billing stores/reuses the actual generated PDF.
- **One combined ticket PDF per order:** Billing produces one combined PDF with up to four tickets per A4 page and overflow pages as needed, preserving exactly four attachments even when several tickets are purchased. Each ticket has its own unique, scan-readable admission QR.
- **One confirmation per Eventoren order:** checkout currently creates an order per event. Cross-event/cart-wide invoice and email consolidation is not included.
- **Mobile access lasts through the event:** use an opaque, revocable, order-scoped read-only link usable without login. Do not use a short-lived login link that expires before admission. Do not grant refund, transfer, or administrative permissions through this link.
- Preserve the requested attachment order in the send payload. Mail clients may choose their own display ordering.
- **Language-appropriate attachment filenames:** select filenames from the confirmation/order language. For English use `tickets.pdf`, `invoice.pdf`, `terms.pdf`, and `privacy.pdf`; for German use `Tickets.pdf`, `Rechnung.pdf`, `AGB.pdf`, and `Datenschutzerklaerung.pdf`. Keep the same ticket/invoice/terms/privacy order and exactly four attachments in both languages.

## Approach and tasks

### 1. Define the cross-service contracts

Status: partial — shared request/response contracts, exact legal snapshot persistence, and the authenticated Billing
handler/route are defined; downstream fulfillment orchestration is deferred to the next implementation context.

Define an authenticated, idempotent fulfillment-ready request from Eventoren to Billing, keyed by the stable Billing/Eventoren order mapping. It contains immutable authoritative issued-ticket data or references, the online-ticket URL, and legal revision reference. Billing validates ownership and authoritative payment state, then renders/stores the ticket PDF from that validated data with its dedicated ticket HTML template; do not accept customer-supplied fulfillment claims or arbitrary fetch URLs.

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
idempotently. No PDF, invoice, email, provider, or downstream side effect is performed. The route is included in Billing
OpenAPI; the worker/orchestration remains deferred.

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

Confirm how Eventoren's existing checkout snapshot maps to Lexware invoice creation, invoice identity, customer/tax data, and accepted legal document content. Reuse existing Billing invoice records where present; retries must not create another invoice. Keep existing non-Eventoren invoice emails unchanged.

Relevant files:
- Eventoren: `src/ticketing/convex/billingEventorenClient.ts`, `src/ticketing/convex/ticketTables.ts`.
- Billing: `src/checkout/server/eventorenTicketCheckoutHandlerCreate.ts`, `src/invoicing/invoicePurchaseProcess.ts`, `src/invoicing/invoiceEmailSend.ts`.

### 2. Make fulfillment browser-independent

Status: pending approval. Depends on task 1.

Add server-scheduled reconciliation of unsettled Eventoren orders using the existing scoped Billing status API. Continue handling late settlement after reservation expiry through existing inventory-conflict behavior; do not rely solely on browser polling or redirect success.

When the existing paid mutation successfully issues tickets, atomically record pending confirmation work. A retryable server action prepares fulfillment and notifies Billing using the stable order key. Do not queue a normal confirmation for `paid_inventory_conflict`, non-paid orders, or orders without the expected issued tickets. Retrying reconciliation or fulfillment must not reissue tickets.

Relevant files: `convex/crons.ts`, `src/ticketing/convex/ticketPaymentReconcileAction.ts`, `src/ticketing/convex/ticketPaymentStatusApplyMutation.ts`.

### 3. Enable the emailed mobile ticket link

Status: pending approval. Depends on task 1.

Extend the existing order/ticket access flow with a server-issued, read-only bearer link. Exchange/resolve the token without depending on checkout localStorage; keep it out of analytics/logs and third-party referrers. Reuse the current ticket view and `#ui/...` components, retaining QR readability on phones. Use the same link in the confirmation email and optionally on the ticket PDF.

Relevant files: `src/routes/checkout.tsx`, `src/ticketing/convex/ticketOrderAccessResolve.ts`, `src/ticketing/convex/ticketOrderGetQuery.ts`, `src/ticketing/TicketOrderWalletPass.tsx`.

### 4. Add ticket PDF rendering in Billing

Status: pending approval. Depends on task 1; can run independently of tasks 2–3 once the contract is agreed.

Add a dedicated ticket HTML template to Billing's existing Chromium-based PDF infrastructure, with validated ticket input from Eventoren. Produce one combined PDF with up to four tickets per A4 page and overflow pages as needed. Include event title/date/time/timezone/location, ticket type, issued ticket identifier, purchaser/attendee information where already available, and each ticket's existing admission QR payload. Each ticket must retain a unique, scan-readable admission QR; do not invent a new check-in identity or substitute the online-order link for the admission QR.

Eventoren supplies authoritative issued-ticket data through the authenticated fulfillment contract. Billing renders and stores/reuses the actual generated PDF through its private artifact infrastructure. Verify and reuse the existing Chromium/PDF artifact path, but do not assume a generic reusable ticket-PDF API exists; this task adds the ticket-specific HTML template. Keep ticket templates separate from legal document templates.

Relevant Billing starting point: `src/legal/acceptedOrderLegalPdfEnsure.ts` and the Chromium-based PDF infrastructure it uses.

### 5. Compose and send the four-attachment confirmation in Billing

Status: pending approval. Depends on tasks 1–4.

Adapt the Eventoren-specific fulfillment path to create/retrieve its Lexware invoice and obtain the actual ticket PDF rendered/stored by Billing. Generate/cache terms and privacy PDFs from the legal documents accepted for that order, not mutable latest text and not Contentoren's documents. Preserve the accepted language/revision.

Render the confirmation with Billing's existing email-generator integration: purchase summary, event information, and prominent mobile ticket CTA, with a plain-text URL. Send only once all four PDFs are ready; do not send an invoice-only email first. Set attachment filenames, PDF content types, and array order explicitly. Select `tickets.pdf`, `invoice.pdf`, `terms.pdf`, and `privacy.pdf` for English confirmation/order language, or `Tickets.pdf`, `Rechnung.pdf`, `AGB.pdf`, and `Datenschutzerklaerung.pdf` for German confirmation/order language. The selected names must preserve the ticket/invoice/terms/privacy order and exactly four attachments.

Persist retryable confirmation state and a stable provider idempotency key. Reuse Billing's existing email tracking but verify it covers this separate checkout path. SMTP deterministic Message-ID does not guarantee exactly-once delivery after ambiguous failures; do not claim that guarantee. Automatic retries and manual resend must remain distinct operations.

Relevant Billing files: `src/invoicing/acceptedOrderInvoiceEmailSend.ts`, `src/invoicing/orderConfirmationEmailRender.ts`, `src/legal/acceptedOrderLegalPdfEnsure.ts`, `src/platform/email/organizationEmailSend.ts`.

### 6. Verify the complete purchase flow

Status: pending approval. Depends on tasks 2–5.

- Successful payment sends the confirmation even if the buyer closes the checkout tab.
- Received message has exactly four PDF attachments in ticket/invoice/terms/privacy payload order, with `tickets.pdf`, `invoice.pdf`, `terms.pdf`, and `privacy.pdf` for English confirmation/order language, and `Tickets.pdf`, `Rechnung.pdf`, `AGB.pdf`, and `Datenschutzerklaerung.pdf` for German confirmation/order language.
- Multiple purchased tickets produce one combined PDF with up to four tickets per A4 page and overflow pages as needed; every ticket has a unique, scan-readable admission QR matching its issued online ticket.
- Invoice totals/identity and legal revisions match the purchase.
- Email CTA opens readable tickets on a clean mobile browser without login or previous localStorage.
- Repeated payment events, reconciliation, and job retries do not create duplicate tickets/invoices or normal duplicate confirmation jobs.
- PDF or provider failure retries without sending an incomplete email.
- Inventory-conflict purchases do not send a normal ticket confirmation.
- Existing Contentoren and other Billing invoice-email flows remain unchanged.

Use existing test tooling/libraries first. Browser verification must cover the received HTML CTA and mobile ticket display; inspect raw message attachment ordering separately.

## Review decisions

The up-to-four-tickets-per-A4-page layout is approved, including overflow pages and a unique, scan-readable admission QR per ticket. The plan uses Billing's existing Chromium-based PDF infrastructure with a new dedicated ticket HTML template: Eventoren sends authoritative issued-ticket data to Billing, which renders/stores the combined PDF and attaches it first; Lexware remains the invoice PDF source and Billing/Lexware ownership is unchanged. The combined PDF and exactly four attachments (ticket, invoice, terms, privacy) remain in scope. Attachment filenames follow the confirmation/order language: English uses `tickets.pdf`, `invoice.pdf`, `terms.pdf`, and `privacy.pdf`; German uses `Tickets.pdf`, `Rechnung.pdf`, `AGB.pdf`, and `Datenschutzerklaerung.pdf`, without changing the order or count.

Invoicegen integration, changes, and contract work are out of scope.

Tasks 2–6 remain pending review and are not authorized by this context. Confirm the invoice issuer/Billing organization
for Eventoren purchases and the desired mobile-link validity after the event before those tasks begin. Task 1 remains
partial until downstream fulfillment orchestration is implemented.
