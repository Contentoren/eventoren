import * as v from "valibot"

export const dashEventVisibilitySchema = v.picklist(["oeffentlich", "nicht-gelistet"])

export type DashEventVisibility = v.InferOutput<typeof dashEventVisibilitySchema>
