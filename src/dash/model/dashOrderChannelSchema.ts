import * as v from "valibot"

export const dashOrderChannelSchema = v.picklist(["online", "abendkasse", "gaesteliste"])

export type DashOrderChannel = v.InferOutput<typeof dashOrderChannelSchema>
