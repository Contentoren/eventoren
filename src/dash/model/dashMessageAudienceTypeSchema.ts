import * as v from "valibot"

export const dashMessageAudienceTypeSchema = v.picklist(["alle", "ticketarten", "eingecheckt", "nicht-eingecheckt"])

export type DashMessageAudienceType = v.InferOutput<typeof dashMessageAudienceTypeSchema>
