import * as v from "valibot"

const schema = v.object({
  org: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200))),
})

/** URL state for the box-office page: org scope only. */
export function veranstalterDashboardAbendkasseSearchParse(input: unknown) {
  const parsed = v.safeParse(schema, input)
  return parsed.success ? parsed.output : {}
}
export type VeranstalterDashboardAbendkasseSearch = v.InferOutput<typeof schema>
