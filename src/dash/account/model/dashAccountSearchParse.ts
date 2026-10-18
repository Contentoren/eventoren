import * as v from "valibot"
import type { DashAccountSearch } from "./dashAccountSearch.ts"

const accountSearchSchema = v.object({
  tab: v.optional(v.picklist(["tickets", "bestellungen", "profil"])),
  ticket: v.optional(v.string()),
  bestellung: v.optional(v.string()),
})

export function dashAccountSearchParse(raw: Record<string, unknown>): DashAccountSearch {
  const parsed = v.safeParse(accountSearchSchema, raw)
  if (!parsed.success) return {}
  const output: DashAccountSearch = {}
  if (parsed.output.tab) output.tab = parsed.output.tab
  if (parsed.output.ticket && parsed.output.ticket !== "") output.ticket = parsed.output.ticket
  if (parsed.output.bestellung && parsed.output.bestellung !== "") output.bestellung = parsed.output.bestellung
  return output
}
