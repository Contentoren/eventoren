import * as v from "valibot"

const schema = v.object({
  org: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
  message: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
})
export function veranstalterDashboardNachrichtenSearchParse(input: unknown) {
  const parsed = v.safeParse(schema, input)
  return parsed.success ? parsed.output : {}
}
export type VeranstalterDashboardNachrichtenSearch = v.InferOutput<typeof schema>
