import * as v from "valibot"

export const dashPaymentMethodSchema = v.picklist([
  "karte",
  "paypal",
  "sepa",
  "applepay",
  "googlepay",
  "gutschein",
  "kostenlos",
])

export type DashPaymentMethod = v.InferOutput<typeof dashPaymentMethodSchema>
