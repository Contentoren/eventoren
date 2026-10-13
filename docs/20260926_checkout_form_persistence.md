# Checkout form persistence

Checkout drafts in browser local storage retain contact/billing fields and participant names, never terms/privacy consent. Both checkboxes require fresh confirmation on every checkout visit, including returns from the browser's back-forward cache. Legacy stored consent is ignored and removed when the draft is hydrated. Saves are debounced and flushed before submission, on `pagehide`, and when the form state is disposed. Successful order creation does not clear the form draft; cart/order-access cleanup is separate.

Participant names are aligned by event, ticket tier, and ticket index so changes to cart contents do not assign a name to a different ticket. Legacy contact-only drafts remain supported. Unavailable or malformed local storage is handled without making checkout depend on persistence.
