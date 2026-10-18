import { createResult, createResultError, type Result } from "#result"

import type { DashTemplate } from "../../../model/dashTemplateSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

function dashTemplateOffsetMinutes(baseIso: string, targetIso: string | null): number | null {
  if (targetIso === null) return null
  return Math.round((Date.parse(targetIso) - Date.parse(baseIso)) / 60_000)
}

/** Speichert ein Event als Vorlage (Phasen- und Verkaufsdaten als Minuten-Offsets ab Beginn). */
export function dashTemplateCreateFromEvent(
  input: { eventId: string; name: string },
  store: DashStore = dashStoreGet(),
): Result<DashTemplate> {
  const op = "dashTemplateCreateFromEvent"
  const event = store.state.events.find((candidate) => candidate.id === input.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const name = input.name.trim()
  if (!name) return createResultError(op, "Bitte gib einen Namen für die Vorlage an.")
  if (store.state.templates.some((candidate) => candidate.orgId === event.orgId && candidate.name === name))
    return createResultError(op, "Es gibt schon eine Vorlage mit diesem Namen.")
  const startsAtMs = Date.parse(event.startsAt)
  const endsAtMs = Date.parse(event.endsAt)
  if (!Number.isFinite(startsAtMs) || !Number.isFinite(endsAtMs) || endsAtMs <= startsAtMs)
    return createResultError(op, "Das Event hat keine gültigen Zeiten.")
  const nowIso = new Date().toISOString()
  const template: DashTemplate = {
    id: dashIdCreate("tpl"),
    orgId: event.orgId,
    name,
    createdAt: nowIso,
    sourceEventId: event.id,
    durationMinutes: Math.round((endsAtMs - startsAtMs) / 60_000),
    doorsBeforeMinutes:
      event.doorsAt === null ? null : Math.max(0, Math.round((startsAtMs - Date.parse(event.doorsAt)) / 60_000)),
    event: {
      title: event.title,
      subtitle: event.subtitle,
      category: event.category,
      venue: { ...event.venue },
      description: event.description,
      faq: event.faq.map((item) => ({ ...item })),
      schedule: event.schedule.map((item) => ({ ...item })),
      imageUrl: event.imageUrl,
      imageAlt: event.imageAlt,
      reminder: { ...event.reminder, sentAt: null },
    },
    ticketTypes: store.state.ticketTypes
      .filter((candidate) => candidate.eventId === event.id)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((type) => ({
        name: type.name,
        description: type.description,
        channel: type.channel,
        hidden: type.hidden,
        capacity: type.capacity,
        maxPerOrder: type.maxPerOrder,
        taxRateBps: type.taxRateBps,
        sortOrder: type.sortOrder,
        salesStartOffsetMinutes: dashTemplateOffsetMinutes(event.startsAt, type.salesStartAt),
        salesEndOffsetMinutes: dashTemplateOffsetMinutes(event.startsAt, type.salesEndAt),
        phases: type.phases.map((phase) => ({
          name: phase.name,
          priceCents: phase.priceCents,
          endsOffsetMinutes: dashTemplateOffsetMinutes(event.startsAt, phase.endsAt),
          quota: phase.quota,
        })),
      })),
  }
  const saved = store.update(op, (draft) => {
    draft.templates.push(template)
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "event",
      action: `Vorlage „${name}“ gespeichert`,
      before: null,
      after: event.title,
    })
  })
  if (!saved.success) return createResultError(op, "Die Vorlage konnte nicht gespeichert werden.")
  return createResult(template)
}
