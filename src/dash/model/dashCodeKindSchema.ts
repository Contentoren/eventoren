import * as v from "valibot"

export const dashCodeKindSchema = v.picklist(["rabatt", "zugang"])

export type DashCodeKind = v.InferOutput<typeof dashCodeKindSchema>
