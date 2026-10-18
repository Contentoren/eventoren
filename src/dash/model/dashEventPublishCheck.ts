import type { DashEvent } from "./dashEventSchema.ts"
import type { DashOrg } from "./dashOrgSchema.ts"
import type { DashTicketType } from "./dashTicketTypeSchema.ts"

export type DashEventPublishCheckId = "basis" | "bild" | "alt" | "tickets" | "beschreibung" | "org"

export type DashEventPublishCheckItem = {
  id: DashEventPublishCheckId
  label: string
  done: boolean
  required: boolean
}

export type DashEventPublishCheckResult = {
  ok: boolean
  items: DashEventPublishCheckItem[]
}

function dashEventPublishCheckTextPresent(value: string): boolean {
  return value.trim().length > 0
}

/** Prüft, ob ein Event veröffentlicht werden kann (Setup-Checkliste). */
export function dashEventPublishCheck(
  event: DashEvent,
  ticketTypes: DashTicketType[],
  org: DashOrg | null,
): DashEventPublishCheckResult {
  const basisDone =
    dashEventPublishCheckTextPresent(event.title) &&
    Number.isFinite(Date.parse(event.startsAt)) &&
    Number.isFinite(Date.parse(event.endsAt)) &&
    Date.parse(event.startsAt) < Date.parse(event.endsAt) &&
    dashEventPublishCheckTextPresent(event.venue.name) &&
    dashEventPublishCheckTextPresent(event.venue.city)
  const bildDone = dashEventPublishCheckTextPresent(event.imageUrl)
  const altDone = dashEventPublishCheckTextPresent(event.imageAlt)
  const ticketsDone = ticketTypes.some((type) => type.channel === "online" && type.archivedAt === null)
  const beschreibungDone = dashEventPublishCheckTextPresent(event.description)
  const orgDone = org?.status === "aktiv"
  const items: DashEventPublishCheckItem[] = [
    { id: "basis", label: "Basisdaten", done: basisDone, required: true },
    { id: "bild", label: "Titelbild", done: bildDone, required: true },
    { id: "alt", label: "Alt-Text", done: altDone, required: true },
    { id: "tickets", label: "Ticketarten", done: ticketsDone, required: true },
    { id: "beschreibung", label: "Beschreibung", done: beschreibungDone, required: false },
    { id: "org", label: "Organisation freigegeben", done: orgDone, required: true },
  ]
  return { ok: items.every((item) => !item.required || item.done), items }
}
