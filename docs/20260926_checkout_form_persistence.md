# Checkout form persistence

## Goal
Keep all editable checkout form data in local storage across reloads and navigation, including after successful submission. Save edits asynchronously with a debounce, while ensuring pending edits are flushed before leaving/submitting.

## Decisions
- Persist contact details, participant names, and legal-consent state. Retain the existing contact draft key and storage behavior where possible.
- Restore participant values using the existing event/tier/ticket-index alignment so cart changes do not assign one ticket's name to another.
- Keep saved form drafts on submit; do not change cart/order-access cleanup or checkout payload behavior.
- Handle unavailable or malformed local storage gracefully. Reuse existing dependencies and conventions; avoid unrelated packages or UI redesign.

## Tasks
1. Implement persistence and hydration for all checkout form fields, debounced asynchronous saves and submit/navigation flush, without clearing persisted form data on submit. [completed]
2. Add focused tests for hydration, debouncing/flush, malformed storage, cart alignment, and submit retention as practical at existing test boundaries. [completed]
3. Verify with targeted tests and a browser checkout smoke test. [in progress]

## Current context
- Checkout state lives in `src/ticketing/ticketCheckoutFormStateCreate.ts`; contact draft already saves after a 250ms debounce/idle and is currently cleared after successful order creation.
- Participants are in memory, aligned by event/tier/ticket index. Legal consent is currently transient.
- No change to checkout display or payment flow is intended.
- Implementation now stores contact, aligned participant names, and consent in the existing draft key, accepting legacy contact-only drafts; save is debounced and flushed on submit/pagehide/unmount. Typecheck and formatter passed for this increment.
- Focused draft tests cover storage parsing, legacy data, consent, alignment, debounce and flush. Stale idle saves and pre-hydration cleanup are guarded. Targeted tests, typecheck, lint, and diff check pass.
