import * as v from "valibot"

const schema = v.object({
  org: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
  event: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(200))),
})
export function veranstalterDashboardFinanzenSearchParse(input: unknown) {
  const parsed = v.safeParse(schema, input)
  return parsed.success ? parsed.output : {}
}
export type VeranstalterDashboardFinanzenSearch = v.InferOutput<typeof schema>
