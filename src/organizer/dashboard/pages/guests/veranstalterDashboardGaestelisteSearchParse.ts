import * as v from "valibot"

const schema = v.object({
  org: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
  q: v.optional(v.pipe(v.string(), v.maxLength(100))),
  quota: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
})
export function veranstalterDashboardGaestelisteSearchParse(input: unknown) {
  const parsed = v.safeParse(schema, input)
  return parsed.success ? parsed.output : {}
}
export type VeranstalterDashboardGaestelisteSearch = v.InferOutput<typeof schema>
