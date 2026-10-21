import * as v from "valibot"

const schema = v.object({
  org: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
  cursor: v.optional(v.pipe(v.string(), v.maxLength(32768))),
})

export function veranstalterDashboardGutscheineSearchParse(input: unknown) {
  const parsed = v.safeParse(schema, input)
  return parsed.success ? parsed.output : {}
}

export type VeranstalterDashboardGutscheineSearch = v.InferOutput<typeof schema>
