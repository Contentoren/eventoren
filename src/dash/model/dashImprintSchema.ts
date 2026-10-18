import * as v from "valibot"

export const dashImprintSchema = v.object({
  legalName: v.string(),
  street: v.string(),
  zip: v.string(),
  city: v.string(),
  representative: v.string(),
  register: v.string(),
  vatId: v.string(),
})

export type DashImprint = v.InferOutput<typeof dashImprintSchema>
