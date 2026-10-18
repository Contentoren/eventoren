import { createResult, type Result } from "#result"

import type { DashEntrance } from "../../../model/dashEntranceSchema.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"
import { dashTicketScan } from "../dashTicketScan.ts"

function entranceTake(random: () => number): { entrance: DashEntrance; device: string } {
  if (random() < 0.7) {
    if (random() < 0.5) return { entrance: "Haupteingang", device: "Einlass Nord" }
    return { entrance: "Haupteingang", device: "Einlass Hof" }
  }
  if (random() < 0.5) return { entrance: "Seiteneingang", device: "Einlass Nord" }
  return { entrance: "Seiteneingang", device: "Einlass Hof" }
}

function openValidTicketIds(store: DashStore, eventId: string): string[] {
  const orderStatusById = new Map(store.state.orders.map((order) => [order.id, order.status]))
  return store.state.tickets
    .filter((ticket) => {
      if (ticket.eventId !== eventId) return false
      if (ticket.status !== "gueltig") return false
      if (ticket.checkedInAt !== null) return false
      const status = orderStatusById.get(ticket.orderId)
      if (status === "storniert" || status === "erstattet") return false
      return true
    })
    .map((ticket) => ticket.id)
}

export function dashCheckinSimulateTick(
  args: { eventId: string; random: () => number; now: Date },
  store: DashStore = dashStoreGet(),
): Result<{ scans: number }> {
  void args.now
  const openIds = openValidTicketIds(store, args.eventId)
  if (openIds.length === 0) return createResult({ scans: 0 })
  const total = 1 + Math.floor(args.random() * 3)
  let scans = 0
  for (let index = 0; index < total; index += 1) {
    if (args.random() < 0.08) {
      const checked = store.state.tickets.filter(
        (ticket) => ticket.eventId === args.eventId && ticket.status === "gueltig" && ticket.checkedInAt !== null,
      )
      const source = checked.length > 0 ? checked[Math.floor(args.random() * checked.length)] : undefined
      const picked = entranceTake(args.random)
      if (source) {
        const result = dashTicketScan(args.eventId, source.code, picked.entrance, picked.device, store)
        if (result.success) scans += 1
        continue
      }
      const unknown = `T-${String(Math.floor(args.random() * 9000) + 1000)}`
      const result = dashTicketScan(args.eventId, unknown, picked.entrance, picked.device, store)
      if (result.success) scans += 1
      continue
    }
    const remaining = openValidTicketIds(store, args.eventId)
    if (remaining.length === 0) break
    const ticketId = remaining[Math.floor(args.random() * remaining.length)]
    const ticket = store.state.tickets.find((candidate) => candidate.id === ticketId)
    if (!ticket) break
    const picked = entranceTake(args.random)
    const result = dashTicketScan(args.eventId, ticket.code, picked.entrance, picked.device, store)
    if (result.success) scans += 1
  }
  return createResult({ scans })
}
