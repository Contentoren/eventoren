import * as v from "valibot"

export const dashTaxRateSchema = v.picklist([1900, 700])

export type DashTaxRate = v.InferOutput<typeof dashTaxRateSchema>
