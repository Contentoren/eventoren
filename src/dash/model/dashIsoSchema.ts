import * as v from "valibot"

export const dashIsoSchema = v.pipe(v.string(), v.isoTimestamp())

export type DashIso = v.InferOutput<typeof dashIsoSchema>
