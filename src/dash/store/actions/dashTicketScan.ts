import { createResult, createResultError, type Result } from "#result"

import type { DashEntrance } from "../../model/dashEntranceSchema.ts"
import type { DashScan } from "../../model/dashScanSchema.ts"
import { dashAuditAdd } from "../dashAuditAdd.ts"
import type { DashStore } from "../dashStoreCreate.ts"
import { dashIdCreate } from "../dashIdCreate.ts"
import { dashStoreGet } from "../dashStoreGet.ts"

function dashScanPush(
  store: DashStore,
  op: string,
  scan: Omit<DashScan, "id">,
  applyOk: ((ticketId: string) => void) | null,
): Result<DashScan> {
  const saved: DashScan = { ...scan, id: dashIdCreate("scan") }
  const updated = store.update(op, (draft) => {
    draft.scans.push(saved)
    if (applyOk && saved.ticketId) {
      const ticket = draft.tickets.find((candidate) => candidate.id === saved.ticketId)
      if (!ticket) throw new Error("Ticket nicht gefunden.")
      applyOk(ticket.id)
      const live = draft.tickets.find((candidate) => candidate.id === ticket.id)
      if (live) {
        live.checkedInAt = saved.at
        live.entrance = saved.entrance
      }
      const event = draft.events.find((candidate) => candidate.id === saved.eventId)
      if (event)
        dashAuditAdd(draft, {
          orgId: event.orgId,
          eventId: event.id,
          area: "einlass",
          action: `Ticket ${saved.code} eingecheckt`,
          before: null,
          after: `${saved.entrance} · ${saved.device}`,
        })
    }
  })
  if (!updated.success) return createResultError(op, "Der Scan konnte nicht gespeichert werden.")
  return createResult(saved)
}

export function dashTicketScan(
  eventId: string,
  code: string,
  entrance: DashEntrance,
  device: string,
  store: DashStore = dashStoreGet(),
): Result<DashScan> {
  const op = "dashTicketScan"
  const normalized = code.trim().toUpperCase()
  if (!normalized) return createResultError(op, "Bitte gib einen Code ein.")
  const nowIso = new Date().toISOString()
  const base = { eventId, at: nowIso, entrance, device, code: normalized }
  const ticket = store.state.tickets.find((candidate) => candidate.code === normalized)
  if (!ticket) return dashScanPush(store, op, { ...base, ticketId: null, result: "unbekannt" }, null)
  if (ticket.eventId !== eventId)
    return dashScanPush(store, op, { ...base, ticketId: ticket.id, result: "falsches-event" }, null)
  const order = store.state.orders.find((candidate) => candidate.id === ticket.orderId)
  if (ticket.status === "storniert" || (order && (order.status === "storniert" || order.status === "erstattet")))
    return dashScanPush(store, op, { ...base, ticketId: ticket.id, result: "storniert" }, null)
  if (ticket.checkedInAt !== null)
    return dashScanPush(store, op, { ...base, ticketId: ticket.id, result: "doppelt" }, null)
  return dashScanPush(store, op, { ...base, ticketId: ticket.id, result: "ok" }, () => {})
}
