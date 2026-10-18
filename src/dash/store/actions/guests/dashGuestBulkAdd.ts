import { createResult, createResultError, type Result } from "#result"

import { dashGuestQuotaUsed } from "../../../pages/guests/model/dashGuestQuotaUsed.ts"

import type { DashStore } from "../../dashStoreCreate.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"
import { dashGuestOrderBuild } from "./dashGuestOrderBuild.ts"

export type DashGuestBulkAddInput = {
  eventId: string
  quotaId: string | null
  entries: { name: string; email: string }[]
  sendTicket: boolean
}

/** Fügt mehrere Gäste auf einmal hinzu; übersprungene Zeilen landen in der Fehlerliste. */
export function dashGuestBulkAdd(
  input: DashGuestBulkAddInput,
  store: DashStore = dashStoreGet(),
): Result<{ added: number; errors: string[] }> {
  const op = "dashGuestBulkAdd"
  const event = store.state.events.find((candidate) => candidate.id === input.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  if (input.entries.length === 0) return createResultError(op, "Es gibt nichts zu importieren.")
  let quota: (typeof store.state.guestQuotas)[number] | null =
    input.quotaId === null
      ? null
      : (store.state.guestQuotas.find((candidate) => candidate.id === input.quotaId) ?? null)
  if (input.quotaId !== null && (!quota || quota.eventId !== input.eventId))
    return createResultError(op, "Kontingent nicht gefunden.")
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const nowIso = new Date().toISOString()
  const pending = {
    guestDocs: [] as {
      quotaId: string | null
      name: string
      email: string
      ticketId: string | null
    }[],
    orders: [] as (typeof store.state.orders)[number][],
    tickets: [] as (typeof store.state.tickets)[number][],
    used: quota === null ? 0 : dashGuestQuotaUsed(store.state.guests.filter((guest) => guest.quotaId === quota.id)),
    errors: [] as string[],
  }
  for (let index = 0; index < input.entries.length; index += 1) {
    const lineNumber = index + 1
    const name = input.entries[index]?.name.trim() ?? ""
    const email = input.entries[index]?.email.trim() ?? ""
    if (name === "") {
      pending.errors.push(`Zeile ${lineNumber}: Bitte gib einen Namen an.`)
      continue
    }
    if (email !== "" && !emailPattern.test(email)) {
      pending.errors.push(`Zeile ${lineNumber}: „${email}“ ist keine gültige E-Mail-Adresse.`)
      continue
    }
    if (input.sendTicket && email === "") {
      pending.errors.push(`Zeile ${lineNumber}: Ohne E-Mail-Adresse kann kein Ticket gesendet werden.`)
      continue
    }
    if (quota && pending.used + 1 > quota.limit) {
      pending.errors.push(`Zeile ${lineNumber}: Kontingent voll: „${name}“ wurde übersprungen.`)
      continue
    }
    const built =
      input.sendTicket && email !== ""
        ? dashGuestOrderBuild({
            eventId: input.eventId,
            name,
            email,
            plusOnes: 0,
            nowIso,
            state: {
              ...store.state,
              orders: [...store.state.orders, ...pending.orders],
              tickets: [...store.state.tickets, ...pending.tickets],
            },
          })
        : null
    if (built && !built.success) {
      pending.errors.push(`Zeile ${lineNumber}: ${built.errorMessage}`)
      continue
    }
    if (built) {
      pending.orders.push(built.data.order)
      for (const ticket of built.data.tickets) pending.tickets.push(ticket)
    }
    if (quota) pending.used += 1
    pending.guestDocs.push({
      quotaId: input.quotaId,
      name,
      email,
      ticketId: built?.data.tickets[0]?.id ?? null,
    })
  }
  if (pending.guestDocs.length === 0)
    return createResultError(op, pending.errors[0] ?? "Es konnte kein Gast hinzugefügt werden.")
  let addedCount = 0
  const updated = store.update(op, (draft) => {
    const live = draft.events.find((candidate) => candidate.id === input.eventId)
    if (!live) throw new Error("Event nicht gefunden.")
    for (const order of pending.orders) draft.orders.push(order)
    for (const ticket of pending.tickets) draft.tickets.push(ticket)
    const taken = new Set(draft.guests.map((guest) => guest.id))
    for (const doc of pending.guestDocs) {
      let id = dashIdCreate("guest")
      while (taken.has(id)) id = dashIdCreate("guest")
      taken.add(id)
      draft.guests.push({
        id,
        eventId: input.eventId,
        quotaId: doc.quotaId,
        name: doc.name,
        email: doc.email,
        plusOnes: 0,
        note: "",
        ticketId: doc.ticketId,
        checkedInAt: null,
        createdAt: nowIso,
      })
      addedCount += 1
    }
  })
  if (!updated.success) return createResultError(op, "Die Gäste konnten nicht gespeichert werden.")
  return createResult({ added: addedCount, errors: pending.errors })
}
