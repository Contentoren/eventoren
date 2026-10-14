# Checkout form persistence

Checkout drafts retain contact/billing fields and participant names in the current tab's `sessionStorage` by default. The optional remember checkbox moves the draft to `localStorage` only after an explicit choice; the stored `rememberDraft: true` records that choice for later visits. Unchecking it immediately removes the local copy and keeps the current draft in session storage. Old local drafts without this flag are migrated to session storage without enabling the checkbox.

Terms/privacy consent is never stored. Both legal checkboxes require fresh confirmation on every checkout visit, including returns from the browser's back-forward cache. Legacy stored consent is ignored and removed when the draft is hydrated. Saves are debounced and flushed before submission, on `pagehide`, and when the form state is disposed. Successful order creation does not clear the form draft; cart/order-access cleanup is separate.

Participant names are aligned by event, ticket tier, and ticket index so changes to cart contents do not assign a name to a different ticket. Legacy contact-only drafts remain supported. Unavailable or malformed browser storage is handled without making checkout depend on persistence. Both `/datenschutz` and `/privacy` use the canonical `src/legal/datenschutz.md` source, which is also used for the checkout legal snapshot.
