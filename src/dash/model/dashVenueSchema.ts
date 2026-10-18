import * as v from "valibot"

export const dashVenueSchema = v.object({
  name: v.string(),
  street: v.string(),
  zip: v.string(),
  city: v.string(),
})

export type DashVenue = v.InferOutput<typeof dashVenueSchema>
