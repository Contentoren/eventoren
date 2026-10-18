import type { DashPaymentMethod } from "../../model/dashPaymentMethodSchema.ts"

export const dashAccountMethodLabelTable: Record<DashPaymentMethod, string> = {
  karte: "Karte",
  paypal: "PayPal",
  sepa: "SEPA",
  applepay: "Apple Pay",
  googlepay: "Google Pay",
  gutschein: "Gutschein",
  kostenlos: "Kostenlos",
}
