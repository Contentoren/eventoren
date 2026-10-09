import type { documentList } from "./documentList.js"

// Public-root-relative source paths mapped to their pinned catalog keys.
// Catalog outputs are exact-byte passthrough originals in the canonical
// dedicated binding (single `production`-prefix catalog for both build modes).
export const managedDocumentPaths = {
  "favicon.svg": "public_favicon",
  "favicon.ico": "public_favicon_ico",
  "logo.svg": "public_logo",
  "payment-american-express.svg": "public_payment_american_express",
  "payment-discover.svg": "public_payment_discover",
  "payment-klarna.svg": "public_payment_klarna",
  "payment-mastercard.svg": "public_payment_mastercard",
  "payment-paypal.svg": "public_payment_paypal",
  "payment-visa.svg": "public_payment_visa",
} as const satisfies Record<string, keyof typeof documentList>
