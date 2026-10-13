import { v } from "convex/values"
import { catalogAllowedStripePaymentMethodsSchema } from "../catalogAllowedStripePaymentMethodsSchema.ts"

export const catalogAllowedStripePaymentMethodsValidator = v.array(
  v.union(...catalogAllowedStripePaymentMethodsSchema.item.options.map((method) => v.literal(method))),
)
