import { createResult, createResultError, type Result } from "#result"

import type { DashCode } from "../../../model/dashCodeSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export type DashCodeUpsertInput = {
  id?: string
  eventId: string
  kind: "rabatt" | "zugang"
  code: string
  ticketTypeIds: string[]
  maxTickets: number | null
  validFrom: string | null
  validUntil: string | null
  active: boolean
  note: string
  discount: { type: "prozent" | "betrag"; value: number } | null
}

function dashCodeUpsertValidate(
  input: DashCodeUpsertInput,
  existing: DashCode[],
  ticketTypes: { id: string; eventId: string; hidden: boolean }[],
): Result<string> {
  const op = "dashCodeUpsert"
  const normalized = (input.code ?? "").trim().toUpperCase()
  if (!normalized) return createResultError(op, "Bitte gib einen Code ein.")
  if (!/^[A-Z0-9-]+$/.test(normalized))
    return createResultError(op, "Der Code darf nur Großbuchstaben, Ziffern und Bindestriche enthalten.")
  const clash = existing.find(
    (candidate) =>
      candidate.eventId === input.eventId && candidate.id !== input.id && candidate.code.toUpperCase() === normalized,
  )
  if (clash) return createResultError(op, `Der Code „${normalized}“ existiert in diesem Event bereits.`)
  if (input.kind === "rabatt") {
    if (!input.discount) return createResultError(op, "Bitte wähle einen Rabattwert.")
    if (!Number.isInteger(input.discount.value) || input.discount.value <= 0)
      return createResultError(op, "Der Rabattwert muss größer als 0 sein.")
    if (input.discount.type === "prozent" && input.discount.value > 10000)
      return createResultError(op, "Der Prozentrabatt darf höchstens 100 % (10000 Basispunkte) betragen.")
  } else {
    if (input.discount !== null) return createResultError(op, "Ein Zugangscode braucht keinen Rabatt.")
    if (input.ticketTypeIds.length === 0)
      return createResultError(op, "Bitte wähle mindestens eine versteckte Ticketart für den Zugang.")
  }
  const eventTypes = ticketTypes.filter((type) => type.eventId === input.eventId)
  const byId = new Map(eventTypes.map((type) => [type.id, type]))
  for (const typeId of input.ticketTypeIds) {
    const type = byId.get(typeId)
    if (!type) return createResultError(op, "Eine gewählte Ticketart gehört nicht zu diesem Event.")
    if (input.kind === "zugang" && !type.hidden)
      return createResultError(op, "Zugangscodes schalten nur versteckte Ticketarten frei.")
  }
  if (input.maxTickets !== null && (!Number.isInteger(input.maxTickets) || input.maxTickets < 1))
    return createResultError(op, "Das Limit muss eine ganze Zahl ab 1 sein.")
  if (input.validFrom && Number.isNaN(Date.parse(input.validFrom)))
    return createResultError(op, "„Gültig von“ ist kein gültiges Datum.")
  if (input.validUntil && Number.isNaN(Date.parse(input.validUntil)))
    return createResultError(op, "„Gültig bis“ ist kein gültiges Datum.")
  if (input.validFrom && input.validUntil && Date.parse(input.validUntil) <= Date.parse(input.validFrom))
    return createResultError(op, "„Gültig bis“ muss nach „Gültig von“ liegen.")
  return createResult(normalized)
}

/** Legt einen Rabatt- oder Zugangscode an bzw. ändert ihn (du sprichst). */
export function dashCodeUpsert(input: DashCodeUpsertInput, store: DashStore = dashStoreGet()): Result<DashCode> {
  const op = "dashCodeUpsert"
  const event = store.state.events.find((candidate) => candidate.id === input.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const validated = dashCodeUpsertValidate(input, store.state.codes, store.state.ticketTypes)
  if (!validated.success) return createResultError(op, validated.errorMessage, validated.errorData)
  const normalized = validated.data
  const nowIso = new Date().toISOString()
  const isNew = !input.id || !store.state.codes.some((candidate) => candidate.id === input.id)
  const id = input.id ?? dashIdCreate("code")
  const previous = store.state.codes.find((candidate) => candidate.id === id) ?? null
  const next: DashCode = {
    id,
    eventId: input.eventId,
    kind: input.kind,
    code: normalized,
    ticketTypeIds: [...input.ticketTypeIds],
    maxTickets: input.maxTickets,
    usedTickets: previous?.usedTickets ?? 0,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    active: input.active,
    note: input.note,
    createdAt: previous?.createdAt ?? nowIso,
    discount: input.discount ? { type: input.discount.type, value: input.discount.value } : null,
  }
  const updated = store.update(op, (draft) => {
    const index = draft.codes.findIndex((candidate) => candidate.id === id)
    if (index < 0) draft.codes.push(next)
    else draft.codes[index] = next
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "codes",
      action: isNew ? `Code ${normalized} erstellt` : `Code ${normalized} geändert`,
      before: previous ? previous.code : null,
      after: normalized,
    })
  })
  if (!updated.success) return createResultError(op, "Der Code konnte nicht gespeichert werden.")
  return createResult(next)
}
