import * as v from "valibot"

export const dashDateOnlySchema = v.pipe(
  v.string(),
  v.regex(/^\d{4}-\d{2}-\d{2}$/),
  v.check((value) => {
    const time = Date.parse(`${value}T00:00:00Z`)
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
  }, "Must be a valid calendar date (YYYY-MM-DD)"),
)

export type DashDateOnly = v.InferOutput<typeof dashDateOnlySchema>
