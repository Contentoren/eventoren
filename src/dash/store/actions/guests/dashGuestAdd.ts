import { createResult, createResultError, type Result } from "#result"

import { dashGuestQuotaUsed } from "../../../pages/guests/model/dashGuestQuotaUsed.ts"

import type { DashGuest } from "../../../model/dashGuestSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"
import { dashGuestOrderBuild } from "./dashGuestOrderBuild.ts"

export type DashGuestAddInput = {
  eventId: string
  quotaId: string | null
  name: string
  email: string
  plusOnes: number
  note: string
  sendTicket: boolean
}

const dashGuestEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Fügt einen Gast hinzu. Mit Kontingent zählt 1 + Begleitpersonen
 * gegen das Limit; mit Ticket entsteht eine 0-€-Bestellung
 * (gaesteliste/kostenlos), deren erstes Ticket verlinkt wird.
 */
export function dashGuestAdd(input: DashGuestAddInput, store: DashStore = dashStoreGet()): Result<DashGuest> {
  const op = "dashGuestAdd"
  const event = store.state.events.find((candidate) => candidate.id === input.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const name = input.name.trim()
  if (name === "") return createResultError(op, "Bitte gib einen Namen für den Gast an.")
  const email = input.email.trim()
  if (email !== "" && !dashGuestEmailPattern.test(email))
    return createResultError(op, "Diese E-Mail-Adresse ist ungültig.")
  if (!Number.isInteger(input.plusOnes) || input.plusOnes < 0 || input.plusOnes > 5)
    return createResultError(op, "Begleitpersonen müssen zwischen 0 und 5 liegen.")
  if (input.sendTicket && email === "")
    return createResultError(op, "Zum Versenden des Tickets braucht der Gast eine E-Mail-Adresse.")
  let quotaName: string | null = null
  if (input.quotaId !== null) {
    const quota = store.state.guestQuotas.find((candidate) => candidate.id === input.quotaId)
    if (!quota || quota.eventId !== input.eventId) return createResultError(op, "Kontingent nicht gefunden.")
    const used = dashGuestQuotaUsed(store.state.guests.filter((guest) => guest.quotaId === quota.id))
    if (used + 1 + input.plusOnes > quota.limit)
      return createResultError(
        op,
        `„${quota.name}“ ist voll – noch ${Math.max(0, quota.limit - used)} ${quota.limit - used === 1 ? "Platz" : "Plätze"} frei.`,
      )
    quotaName = quota.name
  }
  const nowIso = new Date().toISOString()
  const built =
    input.sendTicket && email !== ""
      ? dashGuestOrderBuild({
          eventId: input.eventId,
          name,
          email,
          plusOnes: input.plusOnes,
          nowIso,
          state: store.state,
        })
      : null
  if (built && !built.success) return createResultError(op, built.errorMessage)
  const guest: DashGuest = {
    id: dashIdCreate("guest"),
    eventId: input.eventId,
    quotaId: input.quotaId,
    name,
    email,
    plusOnes: input.plusOnes,
    note: input.note.trim(),
    ticketId: built?.data.tickets[0]?.id ?? null,
    checkedInAt: null,
    createdAt: nowIso,
  }
  const updated = store.update(op, (draft) => {
    if (built?.success) {
      draft.orders.push(built.data.order)
      for (const ticket of built.data.tickets) draft.tickets.push(ticket)
    }
    draft.guests.push(guest)
    const live = draft.events.find((candidate) => candidate.id === input.eventId)
    if (!live) throw new Error("Event nicht gefunden.")
    dashAuditAdd(draft, {
      orgId: live.orgId,
      eventId: live.id,
      area: "gaesteliste",
      action: built?.success === true ? `Gast „${name}“ hinzugefügt · Ticket gesendet` : `Gast „${name}“ hinzugefügt`,
      before: null,
      after: quotaName ?? "Ohne Kontingent",
    })
  })
  if (!updated.success) return createResultError(op, "Der Gast konnte nicht gespeichert werden.")
  return createResult(guest)
}
