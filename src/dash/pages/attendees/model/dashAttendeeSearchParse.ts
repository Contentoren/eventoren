import * as v from "valibot"

export type DashAttendeeCheckinFilter = "alle" | "eingecheckt" | "offen"

export type DashAttendeeKanalFilter = "alle" | "online" | "abendkasse" | "gaesteliste"

export interface DashAttendeeSearch {
  q: string
  ticketart: string
  checkin: DashAttendeeCheckinFilter
  kanal: DashAttendeeKanalFilter
}

const checkinField = v.optional(v.picklist(["alle", "eingecheckt", "offen"]), "alle")
const kanalField = v.optional(v.picklist(["alle", "online", "abendkasse", "gaesteliste"]), "alle")
const ticketartField = v.optional(v.string(), "")

/** Leniente Search-Parse für die Teilnehmerfilter: ungültige Werte fallen auf die Defaults zurück. */
export function dashAttendeeSearchParse(raw: Record<string, unknown>): DashAttendeeSearch {
  const q = typeof raw["q"] === "string" ? raw["q"] : ""
  const ticketartParsed = v.safeParse(ticketartField, raw["ticketart"])
  const checkinParsed = v.safeParse(checkinField, raw["checkin"])
  const kanalParsed = v.safeParse(kanalField, raw["kanal"])
  return {
    q,
    ticketart: ticketartParsed.success ? ticketartParsed.output : "",
    checkin: checkinParsed.success ? checkinParsed.output : "alle",
    kanal: kanalParsed.success ? kanalParsed.output : "alle",
  }
}
