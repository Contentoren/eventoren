import type { DashPaymentMethod } from "./dashPaymentMethodSchema.ts"

const karteFixedCents = 25
const paypalFixedCents = 35
const sepaFixedCents = 35

/** Zahlungskosten (Info) in Cent für eine Zahlungsart und einen gezahlten Betrag. */
export function dashPaymentCostCompute(method: DashPaymentMethod, amountCents: number): number {
  if (amountCents <= 0) return 0
  switch (method) {
    case "karte":
    case "applepay":
    case "googlepay":
      return Math.round((amountCents * 150) / 10000) + karteFixedCents
    case "paypal":
      return Math.round((amountCents * 249) / 10000) + paypalFixedCents
    case "sepa":
      return sepaFixedCents
    case "gutschein":
    case "kostenlos":
      return 0
  }
}
