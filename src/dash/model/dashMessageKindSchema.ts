import * as v from "valibot"

export const dashMessageKindSchema = v.picklist(["info", "aenderung", "absage", "erinnerung"])

export type DashMessageKind = v.InferOutput<typeof dashMessageKindSchema>
