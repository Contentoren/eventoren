import * as v from "valibot"

const schema = v.object({
  org: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
  tier: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(200))),
  art: v.optional(v.picklist(["rabatt", "zugang"])),
  cursor: v.optional(v.pipe(v.string(), v.maxLength(32768))),
})

export function veranstalterDashboardPreiseSearchParse(input: unknown) {
  const parsed = v.safeParse(schema, input)
  return parsed.success ? parsed.output : {}
}

export type VeranstalterDashboardPreiseSearch = v.InferOutput<typeof schema>
