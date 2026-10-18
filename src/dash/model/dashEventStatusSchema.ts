import * as v from "valibot"

export const dashEventStatusSchema = v.picklist(["entwurf", "veroeffentlicht", "abgesagt"])

export type DashEventStatus = v.InferOutput<typeof dashEventStatusSchema>
