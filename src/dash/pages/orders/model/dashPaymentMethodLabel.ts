import type { DashPaymentMethod } from "../../../model/dashPaymentMethodSchema.ts"

/** Anzeige-Label für Zahlarten (Liste + Sheet teilen sich die Map). */
export const dashPaymentMethodLabel: Record<DashPaymentMethod, string> = {
  karte: "Karte",
  paypal: "PayPal",
  sepa: "SEPA-Lastschrift",
  applepay: "Apple Pay",
  googlepay: "Google Pay",
  gutschein: "Gutschein",
  kostenlos: "Kostenlos",
}
