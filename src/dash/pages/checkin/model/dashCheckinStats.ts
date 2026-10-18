import type { DashEntrance } from "../../../model/dashEntranceSchema.ts"
import type { DashScan } from "../../../model/dashScanSchema.ts"
import type { DashState } from "../../../model/dashStateSchema.ts"

export type DashCheckinStats = {
  checkedIn: number
  valid: number
  percent: number
  last15: number
  byTicketType: { ticketTypeId: string; name: string; checkedIn: number; valid: number }[]
  byEntrance: { entrance: DashEntrance; ok: number; rejected: number; devices: string[] }[]
  quarters: { label: string; count: number; current: boolean }[]
  rejected: number
  recent: DashScan[]
}

const quarterFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
})

const entrances: DashEntrance[] = ["Haupteingang", "Seiteneingang", "Abendkasse"]

const cancelledStatuses = new Set(["storniert", "erstattet"])

const quarterMs = 900_000

export function dashCheckinStats(state: DashState, eventId: string, now: Date): DashCheckinStats {
  const orderById = new Map(state.orders.map((order) => [order.id, order]))
  const valid = state.tickets.filter((ticket) => {
    if (ticket.eventId !== eventId) return false
    if (ticket.status !== "gueltig") return false
    const order = orderById.get(ticket.orderId)
    if (!order) return false
    if (cancelledStatuses.has(order.status)) return false
    return true
  })
  const checked = valid.filter((ticket) => ticket.checkedInAt !== null)
  const validCount = valid.length
  const checkedCount = checked.length

  const types = state.ticketTypes.filter((type) => type.eventId === eventId)
  const byTicketType = types.map((type) => {
    const typeTickets = valid.filter((ticket) => ticket.ticketTypeId === type.id)
    return {
      ticketTypeId: type.id,
      name: type.name,
      checkedIn: typeTickets.filter((ticket) => ticket.checkedInAt !== null).length,
      valid: typeTickets.length,
    }
  })

  const eventScans = state.scans.filter((scan) => scan.eventId === eventId)
  const byEntrance = entrances.map((entrance) => {
    const entranceScans = eventScans.filter((scan) => scan.entrance === entrance)
    const devices: string[] = []
    for (const scan of entranceScans) {
      if (!devices.includes(scan.device)) devices.push(scan.device)
    }
    return {
      entrance,
      ok: entranceScans.filter((scan) => scan.result === "ok").length,
      rejected: entranceScans.filter((scan) => scan.result !== "ok").length,
      devices,
    }
  })

  const nowMs = now.getTime()
  const currentEnd = Math.floor(nowMs / quarterMs) * quarterMs
  const quarters = Array.from({ length: 16 }, (_, index) => {
    const end = currentEnd - (15 - index) * quarterMs
    const count = checked.filter((ticket) => {
      if (ticket.checkedInAt === null) return false
      const at = Date.parse(ticket.checkedInAt)
      return at > end - quarterMs && at <= end
    }).length
    return { label: quarterFormatter.format(new Date(end)), count, current: index === 15 }
  })

  const last15 = checked.filter((ticket) => {
    if (ticket.checkedInAt === null) return false
    const at = Date.parse(ticket.checkedInAt)
    return at > nowMs - 15 * 60_000 && at <= nowMs
  }).length

  const recent = [...eventScans]
    .sort((left, right) => (left.at < right.at ? 1 : left.at > right.at ? -1 : 0))
    .slice(0, 50)

  return {
    checkedIn: checkedCount,
    valid: validCount,
    percent: validCount === 0 ? 0 : Math.round((checkedCount / validCount) * 100),
    last15,
    byTicketType,
    byEntrance,
    quarters,
    rejected: eventScans.filter((scan) => scan.result !== "ok").length,
    recent,
  }
}
