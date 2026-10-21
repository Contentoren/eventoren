import * as v from "valibot"

const schema = v.object({
  org: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200))),
  scan: v.optional(v.literal("neu")),
  link: v.optional(v.literal("neu")),
})

/** URL state for the event admission page: org scope plus scan/link sheets. */
export function veranstalterDashboardEinlassSearchParse(input: unknown) {
  const parsed = v.safeParse(schema, input)
  return parsed.success ? parsed.output : {}
}
export type VeranstalterDashboardEinlassSearch = v.InferOutput<typeof schema>
