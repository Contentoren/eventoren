import * as v from "valibot"

export const dashEventCategorySchema = v.picklist([
  "konzert",
  "party",
  "abiball",
  "kurs",
  "kultur",
  "sport",
  "festival",
  "sonstiges",
])

export type DashEventCategory = v.InferOutput<typeof dashEventCategorySchema>
