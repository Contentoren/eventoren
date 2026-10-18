import * as v from "valibot"

export const dashOrderBuyerSchema = v.object({
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
})

export type DashOrderBuyer = v.InferOutput<typeof dashOrderBuyerSchema>
