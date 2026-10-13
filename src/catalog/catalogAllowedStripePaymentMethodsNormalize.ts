import * as v from "valibot"
import { createResult, createResultError, type Result } from "#result"
import {
  catalogAllowedStripePaymentMethodsSchema,
  type CatalogAllowedStripePaymentMethods,
} from "./catalogAllowedStripePaymentMethodsSchema.ts"

export function catalogAllowedStripePaymentMethodsNormalize(
  input: unknown,
): Result<CatalogAllowedStripePaymentMethods | undefined> {
  const op = "catalogAllowedStripePaymentMethodsNormalize"
  // An empty UI selection means Allow all, not an explicit Billing override.
  if (input === undefined || (Array.isArray(input) && input.length === 0)) return createResult(undefined)
  const result = v.safeParse(catalogAllowedStripePaymentMethodsSchema, input)
  if (!result.success) return createResultError(op, v.summarize(result.issues))
  return createResult(result.output)
}
