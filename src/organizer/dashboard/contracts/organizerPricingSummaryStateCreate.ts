import { dashFeeCompute } from "#src/dash/model/dashFeeCompute.ts"
import { organizerStandardPricing } from "./organizerStandardPricing.ts"

export function organizerPricingSummaryStateCreate(p: { readonly payer: () => "kaeufer" | "veranstalter" }) {
  const money = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })
  return {
    rate: `${(organizerStandardPricing.percentBps / 100).toLocaleString("de-DE")} %`,
    fixed: money(organizerStandardPricing.fixedCents),
    examples: () =>
      [1000, 2000, 5000].map((priceCents) => {
        const amounts = dashFeeCompute({ priceCents, fee: { ...organizerStandardPricing, payer: p.payer() } })
        return {
          price: money(priceCents),
          fee: money(amounts.feeCents),
          buyer: money(amounts.buyerPaysCents),
          organizer: money(amounts.organizerGetsCents),
        }
      }),
  }
}
