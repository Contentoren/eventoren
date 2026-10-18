import * as v from "valibot"

export const dashTicketStatusSchema = v.picklist(["gueltig", "storniert"])

export type DashTicketStatus = v.InferOutput<typeof dashTicketStatusSchema>
