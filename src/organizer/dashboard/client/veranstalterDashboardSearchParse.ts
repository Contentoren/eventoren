import * as v from "valibot"

const veranstalterDashboardSearchSchema = v.object({
  org: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
})

export function veranstalterDashboardSearchParse(value: unknown): { readonly org: string | undefined } {
  const result = v.safeParse(veranstalterDashboardSearchSchema, value)
  if (!result.success) return { org: undefined }
  return { org: result.output.org }
}
