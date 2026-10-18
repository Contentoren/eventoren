import { createResult, createResultError, type Result } from "#result"
import * as v from "valibot"

import type { DashEvent } from "../../../model/dashEventSchema.ts"
import { dashEventSchema } from "../../../model/dashEventSchema.ts"
import { dashEventShift } from "../../../model/dashEventShift.ts"
import { dashSlugCreate } from "../../../model/dashSlugCreate.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export type DashEventDuplicateInput = {
  eventId: string
  startsAt: string
}

function dashEventDuplicateIdCreate(existing: Set<string>): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = dashIdCreate("ev").slice(0, 9)
    if (!existing.has(candidate)) return candidate
  }
  throw new Error("Es konnte keine eindeutige Event-ID erzeugt werden.")
}

function dashEventDuplicateBerlinDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso))
}

function dashEventDuplicateSlugCreate(orgSlugs: Set<string>, title: string, startsAt: string): string {
  const base = `${dashSlugCreate(title)}-${dashEventDuplicateBerlinDate(startsAt)}`
  if (!orgSlugs.has(base)) return base
  let counter = 2
  while (orgSlugs.has(`${base}-${counter}`)) counter += 1
  return `${base}-${counter}`
}

/** Dupliziert ein Event ins selbe Org: Entwurf, Zeiten mitverschoben, Codes werden nicht übernommen. */
export function dashEventDuplicate(
  input: DashEventDuplicateInput,
  store: DashStore = dashStoreGet(),
): Result<DashEvent> {
  const op = "dashEventDuplicate"
  const source = store.state.events.find((candidate) => candidate.id === input.eventId)
  if (!source) return createResultError(op, "Event nicht gefunden.")
  if (!Number.isFinite(Date.parse(input.startsAt))) return createResultError(op, "Bitte gib ein gültiges Datum an.")
  const orgEvents = store.state.events.filter((candidate) => candidate.orgId === source.orgId)
  const id = dashEventDuplicateIdCreate(new Set(store.state.events.map((candidate) => candidate.id)))
  const slug = dashEventDuplicateSlugCreate(
    new Set(orgEvents.map((candidate) => candidate.slug)),
    source.title,
    input.startsAt,
  )
  const nowIso = new Date().toISOString()
  const shifted = dashEventShift(
    source,
    store.state.ticketTypes.filter((candidate) => candidate.eventId === source.id),
    input.startsAt,
  )
  const duplicated: DashEvent = {
    ...shifted.event,
    id,
    orgId: source.orgId,
    slug,
    status: "entwurf",
    salesPaused: false,
    cancelReason: "",
    reminder: { ...shifted.event.reminder, sentAt: null },
    createdAt: nowIso,
    updatedAt: nowIso,
    publishedAt: null,
  }
  const duplicatedTypes = shifted.ticketTypes.map((type, index) => ({
    ...type,
    id: `${dashIdCreate("tt").slice(0, 9)}-${index.toString(36)}`,
    eventId: id,
    archivedAt: null,
    phases: type.phases.map((phase, phaseIndex) => ({
      ...phase,
      id: `${dashIdCreate("ph").slice(0, 9)}-${phaseIndex.toString(36)}`,
    })),
  }))
  if (!v.safeParse(dashEventSchema, duplicated).success)
    return createResultError(op, "Das duplizierte Event ist ungültig.")
  const saved = store.update(op, (draft) => {
    draft.events.push(duplicated)
    for (const type of duplicatedTypes) draft.ticketTypes.push(type)
    dashAuditAdd(draft, {
      orgId: duplicated.orgId,
      eventId: duplicated.id,
      area: "event",
      action: `Event aus „${source.title}“ dupliziert`,
      before: null,
      after: duplicated.title,
    })
  })
  if (!saved.success) return createResultError(op, "Das Event konnte nicht dupliziert werden.")
  return createResult(duplicated)
}
