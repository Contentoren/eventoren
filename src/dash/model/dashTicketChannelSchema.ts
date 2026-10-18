import * as v from "valibot"

export const dashTicketChannelSchema = v.picklist(["online", "abendkasse"])

export type DashTicketChannel = v.InferOutput<typeof dashTicketChannelSchema>
