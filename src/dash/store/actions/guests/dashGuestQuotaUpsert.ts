import { createResult, createResultError, type Result } from "#result"

import { dashGuestQuotaUsed } from "../../../pages/guests/model/dashGuestQuotaUsed.ts"

import type { DashGuestQuota } from "../../../model/dashGuestQuotaSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export type DashGuestQuotaUpsertInput = {
  id?: string
  eventId: string
  name: string
  limit: number
}

/** Legt ein Gästeliste-Kontingent an oder ändert Name/Limit (Limit ≥ belegte Plätze). */
export function dashGuestQuotaUpsert(
  input: DashGuestQuotaUpsertInput,
  store: DashStore = dashStoreGet(),
): Result<DashGuestQuota> {
  const op = "dashGuestQuotaUpsert"
  const event = store.state.events.find((candidate) => candidate.id === input.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const name = input.name.trim()
  if (name === "") return createResultError(op, "Bitte gib einen Namen für das Kontingent an.")
  if (!Number.isInteger(input.limit) || input.limit < 0)
    return createResultError(op, "Das Limit muss eine ganze Zahl ab 0 sein.")
  const existing =
    input.id === undefined ? undefined : store.state.guestQuotas.find((candidate) => candidate.id === input.id)
  if (input.id !== undefined && !existing) return createResultError(op, "Kontingent nicht gefunden.")
  if (existing && existing.eventId !== input.eventId)
    return createResultError(op, "Das Kontingent gehört zu einem anderen Event.")
  const quotaId = existing?.id ?? dashIdCreate("gq")
  const used = dashGuestQuotaUsed(store.state.guests.filter((guest) => guest.quotaId === quotaId))
  if (input.limit < used)
    return createResultError(op, `Das Limit (${input.limit}) liegt unter den bereits belegten Plätzen (${used}).`)
  const saved: DashGuestQuota = { id: quotaId, eventId: input.eventId, name, limit: input.limit }
  const isNew = !existing
  const updated = store.update(op, (draft) => {
    const target = draft.guestQuotas.find((candidate) => candidate.id === saved.id)
    if (target) Object.assign(target, saved)
    else draft.guestQuotas.push(saved)
    const live = draft.events.find((candidate) => candidate.id === saved.eventId)
    if (!live) throw new Error("Event nicht gefunden.")
    dashAuditAdd(draft, {
      orgId: live.orgId,
      eventId: live.id,
      area: "gaesteliste",
      action: isNew ? `Kontingent „${saved.name}“ angelegt` : `Kontingent „${saved.name}“ geändert`,
      before: existing ? `${existing.name} · Limit ${existing.limit}` : null,
      after: `${saved.name} · Limit ${saved.limit}`,
    })
  })
  if (!updated.success) return createResultError(op, "Das Kontingent konnte nicht gespeichert werden.")
  return createResult(saved)
}
