import { createResult, createResultError, type Result } from "#result"

import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashEventCategory } from "../../../model/dashEventCategorySchema.ts"
import type { DashEventVisibility } from "../../../model/dashEventVisibilitySchema.ts"
import type { DashTaxRate } from "../../../model/dashTaxRateSchema.ts"
import type { DashTicketType } from "../../../model/dashTicketTypeSchema.ts"
import { dashSlugCreate } from "../../../model/dashSlugCreate.ts"
import { dashActiveOrgIn } from "../../dashActiveOrgIn.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"
import { dashEventPublish } from "../event/dashEventPublish.ts"

const wizardIdAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789"

function dashWizardIdCreate(prefix: string): string {
  const bytes = new Uint8Array(6)
  const crypto = (globalThis as { crypto?: { getRandomValues?: (bytes: Uint8Array) => void } }).crypto
  if (crypto?.getRandomValues) crypto.getRandomValues(bytes)
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)
  let suffix = ""
  for (const byte of bytes) suffix += wizardIdAlphabet.charAt(byte % wizardIdAlphabet.length)
  return `${prefix}-${suffix}`
}

function dashWizardErrorMessage(result: Result<void>): string {
  const failure = result as { success: boolean; error?: { message?: unknown } }
  const raw = failure.success ? null : failure.error?.message
  return typeof raw === "string" && raw.length > 0 ? raw : "Veröffentlichen ist gerade nicht möglich."
}

/** Legt ein Event aus dem 3-Schritte-Assistenten an (immer erst als Entwurf, optional danach veröffentlichen). */
export function dashEventCreateFromWizard(
  input: {
    title: string
    subtitle: string
    category: DashEventCategory
    startsAt: string
    endsAt: string
    doorsAt: string | null
    venue: { name: string; street: string; zip: string; city: string }
    imageUrl: string
    imageAlt: string
    description: string
    faq: { question: string; answer: string }[]
    schedule: { time: string; title: string; detail: string }[]
    visibility: DashEventVisibility
    ticketTypes: {
      name: string
      priceCents: number
      capacity: number
      taxRateBps: DashTaxRate
      hidden: boolean
      phases?: { name: string; priceCents: number; endsAt: string | null; quota: number | null }[]
    }[]
    publish: boolean
  },
  store: DashStore = dashStoreGet(),
): Result<{ event: DashEvent; published: boolean; publishError: string | null }> {
  const op = "dashEventCreateFromWizard"
  const org = dashActiveOrgIn(store.state)
  if (!org) return createResultError(op, "Keine Organisation aktiv.")
  if (input.title.trim().length === 0) return createResultError(op, "Bitte gib einen Titel ein.")
  const starts = Date.parse(input.startsAt)
  const ends = Date.parse(input.endsAt)
  if (!Number.isFinite(starts) || !Number.isFinite(ends) || starts >= ends)
    return createResultError(op, "Beginn muss vor dem Ende liegen.")
  if (input.ticketTypes.length === 0) return createResultError(op, "Lege mindestens eine Ticketart an.")
  for (const type of input.ticketTypes) {
    if (type.name.trim().length === 0) return createResultError(op, "Jede Ticketart braucht einen Namen.")
    if (!Number.isInteger(type.priceCents) || type.priceCents < 0)
      return createResultError(op, `Der Preis für „${type.name}“ ist ungültig.`)
    if (!Number.isInteger(type.capacity) || type.capacity < 0)
      return createResultError(op, `Das Kontingent für „${type.name}“ ist ungültig.`)
  }

  const base = dashSlugCreate(input.title) || "event"
  const taken = new Set(store.state.events.filter((event) => event.orgId === org.id).map((event) => event.slug))
  let slug = base
  let suffix = 2
  while (taken.has(slug)) {
    slug = `${base}-${suffix}`
    suffix += 1
  }

  const nowIso = new Date().toISOString()
  const eventId = dashWizardIdCreate("ev")
  const event: DashEvent = {
    id: eventId,
    orgId: org.id,
    slug,
    title: input.title.trim(),
    subtitle: input.subtitle,
    category: input.category,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    doorsAt: input.doorsAt,
    venue: {
      name: input.venue.name,
      street: input.venue.street,
      zip: input.venue.zip,
      city: input.venue.city,
    },
    imageUrl: input.imageUrl,
    imageAlt: input.imageAlt,
    description: input.description,
    faq: input.faq.map((item) => ({ id: dashWizardIdCreate("faq"), question: item.question, answer: item.answer })),
    schedule: input.schedule.map((item) => ({
      id: dashWizardIdCreate("sch"),
      time: item.time,
      title: item.title,
      detail: item.detail,
    })),
    status: "entwurf",
    visibility: input.visibility,
    salesPaused: false,
    cancelReason: "",
    boxOffice: { enabled: false, opensAt: null },
    reminder: { enabled: true, hoursBefore: 24, directions: "", calendar: "", sentAt: null },
    createdAt: nowIso,
    updatedAt: nowIso,
    publishedAt: null,
  }
  const types: DashTicketType[] = input.ticketTypes.map((type, index) => ({
    id: dashWizardIdCreate("tt"),
    eventId,
    name: type.name.trim(),
    description: "",
    channel: "online",
    hidden: type.hidden,
    capacity: type.capacity,
    maxPerOrder: 10,
    taxRateBps: type.taxRateBps,
    sortOrder: index,
    archivedAt: null,
    salesStartAt: null,
    salesEndAt: null,
    phases: (type.phases && type.phases.length > 0
      ? type.phases
      : [{ name: "Regulär", priceCents: type.priceCents, endsAt: null, quota: null }]
    ).map((phase) => ({
      id: dashWizardIdCreate("ph"),
      name: phase.name,
      priceCents: phase.priceCents,
      endsAt: phase.endsAt,
      quota: phase.quota,
    })),
  }))

  const stored = store.update(op, (draft) => {
    draft.events.push(event)
    for (const type of types) draft.ticketTypes.push(type)
    dashAuditAdd(draft, {
      orgId: org.id,
      eventId,
      area: "event",
      action: `Event „${event.title}“ als Entwurf angelegt`,
      before: null,
      after: "Entwurf",
    })
  })
  if (!stored.success) return createResultError(op, "Dein Event konnte nicht gespeichert werden.")
  const saved = store.state.events.find((candidate) => candidate.id === eventId) ?? event
  if (!input.publish) return createResult({ event: saved, published: false, publishError: null })

  const publishResult = dashEventPublish(eventId, store)
  const current = store.state.events.find((candidate) => candidate.id === eventId) ?? saved
  if (publishResult.success) return createResult({ event: current, published: true, publishError: null })
  return createResult({ event: current, published: false, publishError: dashWizardErrorMessage(publishResult) })
}
