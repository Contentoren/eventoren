import { createResult, createResultError, type Result } from "#result"
import * as v from "valibot"

import { eventPriceFormat } from "../../../../events/eventPriceFormat.ts"
import type { DashTicketType } from "../../../model/dashTicketTypeSchema.ts"
import { dashTicketTypeSchema } from "../../../model/dashTicketTypeSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Legt eine neue Abendkassen-Ticketart an: Preis = höchster Online-Preis + 3 €, Kontingent 50. */
export function dashBoxOfficeTicketAdd(eventId: string, store: DashStore = dashStoreGet()): Result<DashTicketType> {
  const op = "dashBoxOfficeTicketAdd"
  const event = store.state.events.find((candidate) => candidate.id === eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const org = store.state.orgs.find((candidate) => candidate.id === event.orgId)
  if (!org) return createResultError(op, "Organisation nicht gefunden.")
  const types = store.state.ticketTypes.filter((candidate) => candidate.eventId === eventId)
  const onlinePrices = types
    .filter((type) => type.channel === "online")
    .flatMap((type) => type.phases.map((phase) => phase.priceCents))
  const priceCents = (onlinePrices.length > 0 ? Math.max(...onlinePrices) : 0) + 300
  const candidate: DashTicketType = {
    id: dashIdCreate("tt"),
    eventId,
    name: "Abendkasse",
    description: "Nur an der Abendkasse erhältlich.",
    channel: "abendkasse",
    hidden: false,
    capacity: 50,
    maxPerOrder: 10,
    taxRateBps: org.tax.defaultRateBps,
    sortOrder: types.reduce((max, type) => Math.max(max, type.sortOrder), -1) + 1,
    archivedAt: null,
    salesStartAt: null,
    salesEndAt: null,
    phases: [{ id: dashIdCreate("ph"), name: "Regulär", priceCents, endsAt: null, quota: null }],
  }
  if (!v.safeParse(dashTicketTypeSchema, candidate).success) return createResultError(op, "Die Ticketart ist ungültig.")
  const saved = candidate
  const result = store.update(op, (draft) => {
    draft.ticketTypes.push(saved)
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "abendkasse",
      action: `Abendkassen-Preis „${saved.name}“ erstellt`,
      before: null,
      after: `Preis ${eventPriceFormat(saved.phases[0]?.priceCents ?? 0)} · Kontingent ${saved.capacity}`,
    })
  })
  if (!result.success) return createResultError(op, "Der Preis konnte nicht gespeichert werden.")
  return createResult(saved)
}
