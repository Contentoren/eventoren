import * as v from "valibot"

export const dashCentsSchema = v.pipe(v.number(), v.integer(), v.minValue(0))

export type DashCents = v.InferOutput<typeof dashCentsSchema>
