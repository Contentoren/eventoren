import * as v from "valibot"

export const dashMessageStatusSchema = v.picklist(["entwurf", "geplant", "gesendet"])

export type DashMessageStatus = v.InferOutput<typeof dashMessageStatusSchema>
