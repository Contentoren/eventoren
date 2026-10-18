import * as v from "valibot"

export const dashBpsSchema = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(10000))

export type DashBps = v.InferOutput<typeof dashBpsSchema>
