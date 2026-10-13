import * as v from "valibot"

// Keep aligned with Billing's catalog contract until the shared package is integrated.
const methods = ["card", "paypal", "klarna", "sepa_debit", "customer_balance", "ideal", "bancontact"] as const

export const catalogAllowedStripePaymentMethodsSchema = v.pipe(
  v.array(v.picklist(methods)),
  v.minLength(1),
  v.maxLength(methods.length),
  v.transform((selected) => methods.filter((method) => selected.includes(method))),
)

export type CatalogAllowedStripePaymentMethods = v.InferOutput<typeof catalogAllowedStripePaymentMethodsSchema>
