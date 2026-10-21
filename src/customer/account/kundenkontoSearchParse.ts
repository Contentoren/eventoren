import * as v from "valibot"

const schema = v.object({
  tab: v.optional(v.picklist(["tickets", "bestellungen", "profil"])),
  bestellung: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200))),
  cursor: v.optional(v.pipe(v.string(), v.maxLength(32768))),
})

/** URL state for the customer account: tab plus selected order. */
export function kundenkontoSearchParse(input: unknown) {
  const parsed = v.safeParse(schema, input)
  return parsed.success ? parsed.output : {}
}
export type KundenkontoSearch = v.InferOutput<typeof schema>
