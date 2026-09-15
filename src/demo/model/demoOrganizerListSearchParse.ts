import * as v from "valibot"

const demoOrganizerListSearchSchema = v.object({
  scenario: v.optional(v.picklist(["empty"])),
})

export function demoOrganizerListSearchParse(value: unknown): v.InferOutput<typeof demoOrganizerListSearchSchema> {
  const result = v.safeParse(demoOrganizerListSearchSchema, value)
  return result.success ? result.output : {}
}
