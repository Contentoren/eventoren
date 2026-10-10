# Ticket purchase fulfillment and confirmation

Eventoren owns ticket inventory, payment reconciliation, issued-ticket identity and guest ticket access. Billing owns payment processing, invoice generation and confirmation delivery. A ticket is issued only after server-confirmed payment; a browser redirect is not proof of payment.

For an eligible paid order, Eventoren creates idempotent fulfillment work from the persisted order and issued-ticket data. A scheduled server action prepares fulfillment with Billing using the stable order/payment references. This work is independent of the customer's browser and retries without issuing duplicate tickets. Orders with inventory conflicts or without the expected issued tickets do not enter normal fulfillment.

The fulfillment request carries authoritative event/ticket data, accepted legal context and an order-scoped ticket-access URL. Billing validates the request and prepares downstream fulfillment. The guest link is an opaque, revocable, read-only capability; it resolves ticket data without requiring login or the original checkout's local storage. It does not grant refund, transfer or administrative access.

Confirmation artifacts depend on the persisted checkout mode. Live confirmations contain the ticket PDF, the invoice PDF sourced through Billing's Lexware integration, and the accepted terms and privacy documents. Test confirmations contain the ticket and accepted legal PDFs but no invoice and make no Lexware request. The ticket PDF is a combined document with a unique admission QR for each issued ticket; the guest-access URL is not a substitute for that QR. Legal PDFs use the accepted checkout snapshot rather than mutable current legal text.

New eligible checkouts capture the Billing organization tax policy in their immutable commercial snapshot. Live invoice retries use the persisted policy rather than current configuration; legacy snapshots without a policy are not retroactively reinterpreted. The fulfillment allowlist is evaluated for a new order and eligibility is persisted, so later configuration changes do not alter that order's eligibility.
