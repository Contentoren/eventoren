import { createResult, createResultError, type Result } from "#result"
import * as v from "valibot"

import { eventPriceFormat } from "../../../events/eventPriceFormat.ts"
import type { DashTicketType } from "../../model/dashTicketTypeSchema.ts"
import { dashTicketTypeSchema } from "../../model/dashTicketTypeSchema.ts"
import { dashTicketTypeSales } from "../../model/dashTicketTypeSales.ts"
import { dashAuditAdd } from "../dashAuditAdd.ts"
import type { DashStore } from "../dashStoreCreate.ts"
import { dashIdCreate } from "../dashIdCreate.ts"
import { dashStoreGet } from "../dashStoreGet.ts"

export type DashTicketTypeUpsertInput = Omit<DashTicketType, "id" | "sortOrder"> & {
  id?: string
  sortOrder?: number
}

function dashTicketRateLabel(rateBps: number): string {
  return `${rateBps / 100} %`
}

function dashTicketTypeDiffText(
  oldType: DashTicketType,
  newType: DashTicketType,
): {
  action: string
  before: string
  after: string
} | null {
  const beforeParts: string[] = []
  const afterParts: string[] = []
  let priceAction: { phaseName: string; before: string; after: string } | null = null
  let changes = 0
  if (oldType.name !== newType.name) {
    changes += 1
    beforeParts.push(`Name ${oldType.name}`)
    afterParts.push(`Name ${newType.name}`)
  }
  if (oldType.capacity !== newType.capacity) {
    changes += 1
    beforeParts.push(`Kontingent ${oldType.capacity}`)
    afterParts.push(`Kontingent ${newType.capacity}`)
  }
  if (oldType.maxPerOrder !== newType.maxPerOrder) {
    changes += 1
    beforeParts.push(`Max. ${oldType.maxPerOrder} je Bestellung`)
    afterParts.push(`Max. ${newType.maxPerOrder} je Bestellung`)
  }
  if (oldType.hidden !== newType.hidden) {
    changes += 1
    beforeParts.push(oldType.hidden ? "Nur mit Zugangscode" : "Sichtbar")
    afterParts.push(newType.hidden ? "Nur mit Zugangscode" : "Sichtbar")
  }
  if (oldType.taxRateBps !== newType.taxRateBps) {
    changes += 1
    beforeParts.push(`USt ${dashTicketRateLabel(oldType.taxRateBps)}`)
    afterParts.push(`USt ${dashTicketRateLabel(newType.taxRateBps)}`)
  }
  const oldPhases = new Map(oldType.phases.map((phase) => [phase.id, phase]))
  const newPhases = new Map(newType.phases.map((phase) => [phase.id, phase]))
  for (const phase of newType.phases) {
    const oldPhase = oldPhases.get(phase.id)
    if (!oldPhase) {
      changes += 1
      beforeParts.push(`Phase ${phase.name}: –`)
      afterParts.push(`Phase ${phase.name}: ${eventPriceFormat(phase.priceCents)}`)
      continue
    }
    if (oldPhase.priceCents === phase.priceCents) continue
    changes += 1
    const before = `Preis ${phase.name}: ${eventPriceFormat(oldPhase.priceCents)}`
    const after = `Preis ${phase.name}: ${eventPriceFormat(phase.priceCents)}`
    beforeParts.push(before)
    afterParts.push(after)
    priceAction = {
      phaseName: phase.name,
      before: eventPriceFormat(oldPhase.priceCents),
      after: eventPriceFormat(phase.priceCents),
    }
  }
  for (const phase of oldType.phases) {
    if (newPhases.has(phase.id)) continue
    changes += 1
    beforeParts.push(`Phase ${phase.name}: ${eventPriceFormat(phase.priceCents)}`)
    afterParts.push(`Phase ${phase.name}: –`)
  }
  if (changes === 0) return null
  if (changes === 1 && priceAction)
    return {
      action: `Preis von ${newType.name} · ${priceAction.phaseName} geändert`,
      before: priceAction.before,
      after: priceAction.after,
    }
  if (changes === 1 && oldType.capacity !== newType.capacity)
    return {
      action: `Kontingent von ${newType.name} geändert`,
      before: `Kontingent ${oldType.capacity}`,
      after: `Kontingent ${newType.capacity}`,
    }
  return {
    action: `Ticketart „${newType.name}“ geändert`,
    before: beforeParts.join(" · "),
    after: afterParts.join(" · "),
  }
}

export function dashTicketTypeUpsert(
  input: DashTicketTypeUpsertInput,
  store: DashStore = dashStoreGet(),
): Result<DashTicketType> {
  const op = "dashTicketTypeUpsert"
  const existing =
    input.id === undefined ? undefined : store.state.ticketTypes.find((candidate) => candidate.id === input.id)
  if (input.id !== undefined && !existing) return createResultError(op, "Ticketart nicht gefunden.")
  if (existing && input.eventId !== existing.eventId)
    return createResultError(op, "Die Ticketart kann nicht in ein anderes Event verschoben werden.")
  if (!existing && !store.state.events.some((event) => event.id === input.eventId))
    return createResultError(op, "Event nicht gefunden.")
  const sortOrder =
    input.sortOrder ??
    existing?.sortOrder ??
    store.state.ticketTypes
      .filter((candidate) => candidate.id !== input.id && candidate.eventId === input.eventId)
      .reduce((max, candidate) => Math.max(max, candidate.sortOrder), -1) + 1
  const candidate: DashTicketType = {
    ...input,
    id: existing?.id ?? dashIdCreate("tt"),
    eventId: input.eventId,
    sortOrder,
  }
  const parsed = v.safeParse(dashTicketTypeSchema, candidate)
  if (!parsed.success) return createResultError(op, "Die Ticketart ist ungültig.")
  const saved = parsed.output
  const sales = dashTicketTypeSales({ ticketType: saved, orders: store.state.orders, tickets: store.state.tickets })
  if (saved.capacity < sales.sold)
    return createResultError(
      op,
      `Kontingent (${saved.capacity}) darf nicht unter den bereits verkauften Tickets (${sales.sold}) liegen.`,
    )
  const diff = existing ? dashTicketTypeDiffText(existing, saved) : null
  return store.update(op, (draft) => {
    const target = draft.ticketTypes.find((candidateItem) => candidateItem.id === saved.id)
    if (target) Object.assign(target, saved)
    else draft.ticketTypes.push(saved)
    const event = draft.events.find((candidateItem) => candidateItem.id === saved.eventId)
    if (!event) throw new Error("Event nicht gefunden.")
    if (existing && diff)
      dashAuditAdd(draft, {
        orgId: event.orgId,
        eventId: event.id,
        area: "tickets",
        action: diff.action,
        before: diff.before,
        after: diff.after,
      })
    if (!existing)
      dashAuditAdd(draft, {
        orgId: event.orgId,
        eventId: event.id,
        area: "tickets",
        action: `Ticketart „${saved.name}“ erstellt`,
        before: null,
        after: `Kontingent ${saved.capacity} · ${saved.phases.map((phase) => `${phase.name}: ${eventPriceFormat(phase.priceCents)}`).join(" · ")}`,
      })
  }).success
    ? createResult(saved)
    : createResultError(op, "Die Ticketart konnte nicht gespeichert werden.")
}
