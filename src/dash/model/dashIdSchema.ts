import * as v from "valibot"

export const dashIdSchema = v.pipe(v.string(), v.minLength(1))

export type DashId = v.InferOutput<typeof dashIdSchema>
