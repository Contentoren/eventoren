import * as v from "valibot"

export const dashTaxStatusSchema = v.picklist(["regel", "klein"])

export type DashTaxStatus = v.InferOutput<typeof dashTaxStatusSchema>
