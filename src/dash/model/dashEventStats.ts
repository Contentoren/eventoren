import { dashBerlinDayStart } from "./dashBerlinDayStart.ts"
import { dashOrderTicketRefunds } from "./dashOrderTicketRefunds.ts"
import { dashOrderTicketValue } from "./dashOrderTicketValue.ts"
import { dashPhaseResolve } from "./dashPhaseResolve.ts"
import type { DashEvent } from "./dashEventSchema.ts"
import type { DashOrder } from "./dashOrderSchema.ts"
import type { DashOrderChannel } from "./dashOrderChannelSchema.ts"
import type { DashState } from "./dashStateSchema.ts"
import type { DashTicket } from "./dashTicketSchema.ts"

const berlinDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" })
const dayLabel = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" })
const quarterLabel = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
})
const dayMs = 86_400_000

const countedStatus = new Set<DashOrder["status"]>(["bezahlt", "offen", "teilerstattet"])

export function dashEventStats(args: { state: DashState; eventId: string; now: Date }): {
  revenueCents: number
  sold: number
  capacity: number
  available: number
  checkedIn: number
  validTickets: number
  openPayments: { count: number; amountCents: number }
  byTicketType: {
    ticketType: string
    sold: number
    capacity: number
    available: number
    revenueCents: number
    phase: ReturnType<typeof dashPhaseResolve>
  }[]
  byChannel: { channel: DashOrderChannel; tickets: number; revenueCents: number }[]
  salesCurve: { key: string; label: string; cumulativeTickets: number }[]
  phaseMarkers: { index: number; label: string }[]
  checkInsByQuarter: { label: string; count: number }[]
  entrances: { entrance: string; ok: number; rejected: number }[]
  rejectedScans: number
  recentOrderIds: string[]
} {
  const { state, eventId, now } = args
  const event = state.events.find((entry) => entry.id === eventId)
  const types = state.ticketTypes.filter((type) => type.eventId === eventId)
  if (event === undefined) return empty(types.map((type) => type.id))

  const orders = state.orders.filter((order) => order.eventId === eventId)
  const orderById = new Map(orders.map((order) => [order.id, order]))
  const eventTickets = state.tickets.filter((ticket) => ticket.eventId === eventId)
  const eventScans = state.scans.filter((scan) => scan.eventId === eventId)

  const counted = orders.filter((order) => countedStatus.has(order.status) && order.channel !== "gaesteliste")
  const validByOrder = new Map<string, DashTicket[]>()
  const validTickets: DashTicket[] = []
  const checkedInMs: number[] = []
  for (const ticket of eventTickets) {
    if (ticket.status !== "gueltig") continue
    validTickets.push(ticket)
    const list = validByOrder.get(ticket.orderId) ?? []
    list.push(ticket)
    validByOrder.set(ticket.orderId, list)
    if (ticket.checkedInAt !== null) checkedInMs.push(new Date(ticket.checkedInAt).getTime())
  }
  const eligible = counted.filter((order) => (validByOrder.get(order.id)?.length ?? 0) > 0)

  const soldByType = new Map<string, number>()
  const revenueByType = new Map<string, number>()
  const valueByOrder = new Map<string, number>()
  let revenue = 0
  let sold = 0
  for (const order of eligible) {
    const value = dashOrderTicketValue(order) - dashOrderTicketRefunds(order)
    valueByOrder.set(order.id, value)
    revenue += value
    const tickets = validByOrder.get(order.id) ?? []
    sold += tickets.length
    const countByType = new Map<string, number>()
    for (const ticket of tickets) countByType.set(ticket.ticketTypeId, (countByType.get(ticket.ticketTypeId) ?? 0) + 1)
    for (const [ticketTypeId, count] of countByType)
      soldByType.set(ticketTypeId, (soldByType.get(ticketTypeId) ?? 0) + count)
    for (const line of order.lines) {
      const valid = countByType.get(line.ticketTypeId) ?? 0
      revenueByType.set(line.ticketTypeId, (revenueByType.get(line.ticketTypeId) ?? 0) + valid * line.unitPriceCents)
    }
  }

  const checkedIn = checkedInMs.length

  const soldByPhase = new Map<string, Record<string, number>>()
  for (const type of types) soldByPhase.set(type.id, {})
  for (const ticket of validTickets) {
    const order = orderById.get(ticket.orderId)
    const phaseId = order?.lines.find((line) => line.ticketTypeId === ticket.ticketTypeId)?.phaseId
    if (phaseId === undefined) continue
    const record = soldByPhase.get(ticket.ticketTypeId)
    if (record === undefined) continue
    record[phaseId] = (record[phaseId] ?? 0) + 1
  }

  const byTicketType = types.map((type) => {
    const typeSold = soldByType.get(type.id) ?? 0
    return {
      ticketType: type.id,
      sold: typeSold,
      capacity: type.capacity,
      available: Math.max(0, type.capacity - typeSold),
      revenueCents: revenueByType.get(type.id) ?? 0,
      phase: dashPhaseResolve(type, soldByPhase.get(type.id) ?? {}, now),
    }
  })

  const channels: DashOrderChannel[] = ["online", "abendkasse", "gaesteliste"]
  const byChannel = channels.map((channel) => {
    let channelTickets = 0
    let channelRevenue = 0
    for (const order of eligible) {
      if (order.channel !== channel) continue
      channelTickets += validByOrder.get(order.id)?.length ?? 0
      channelRevenue += valueByOrder.get(order.id) ?? 0
    }
    return { channel, tickets: channelTickets, revenueCents: channelRevenue }
  })

  const dayCache = new Map<string, number>()
  const salesCurve = salesCurveBuild({ event, eligible, validByOrder, now, dayCache })
  const phaseMarkers = phaseMarkersBuild({ days: salesCurve, types })

  const nowMs = now.getTime()
  const doorsMinusHour = new Date(event.doorsAt ?? event.startsAt).getTime() - 3_600_000
  const checkInsByQuarter = nowMs < doorsMinusHour ? [] : quarterBuild({ checkedInMs, nowMs })

  const entranceNames = ["Haupteingang", "Seiteneingang", "Abendkasse"] as const
  const entranceCounts = new Map<string, { ok: number; rejected: number }>()
  for (const name of entranceNames) entranceCounts.set(name, { ok: 0, rejected: 0 })
  let rejectedScans = 0
  for (const scan of eventScans) {
    const counts = entranceCounts.get(scan.entrance)
    if (scan.result !== "ok") rejectedScans += 1
    if (counts === undefined) continue
    if (scan.result === "ok") counts.ok += 1
    else counts.rejected += 1
  }
  const entrances = entranceNames.map((entrance) => {
    const counts = entranceCounts.get(entrance) ?? { ok: 0, rejected: 0 }
    return { entrance, ok: counts.ok, rejected: counts.rejected }
  })

  const open = orders.filter((order) => order.status === "offen")

  return {
    revenueCents: revenue,
    sold,
    capacity: types.reduce((sum, type) => sum + type.capacity, 0),
    available: Math.max(0, types.reduce((sum, type) => sum + type.capacity, 0) - sold),
    checkedIn,
    validTickets: validTickets.length,
    openPayments: { count: open.length, amountCents: open.reduce((sum, order) => sum + order.totalCents, 0) },
    byTicketType,
    byChannel,
    salesCurve,
    phaseMarkers,
    checkInsByQuarter,
    entrances,
    rejectedScans,
    recentOrderIds: [...orders]
      .sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1))
      .slice(0, 5)
      .map((order) => order.id),
  }
}

function salesCurveBuild(args: {
  event: DashEvent
  eligible: DashOrder[]
  validByOrder: Map<string, DashTicket[]>
  now: Date
  dayCache: Map<string, number>
}): { key: string; label: string; cumulativeTickets: number }[] {
  const { event, eligible, validByOrder, now, dayCache } = args
  if (eligible.length === 0) {
    const single = dashBerlinDayStart(now.getTime(), dayCache)
    return [
      { key: berlinDay.format(new Date(single)), label: dayLabel.format(new Date(single)), cumulativeTickets: 0 },
      { key: berlinDay.format(new Date(single)), label: dayLabel.format(new Date(single)), cumulativeTickets: 0 },
    ]
  }
  let first = Number.POSITIVE_INFINITY
  const rows: { ms: number; count: number }[] = []
  for (const order of eligible) {
    const ms = new Date(order.createdAt).getTime()
    if (ms < first) first = ms
    rows.push({ ms, count: validByOrder.get(order.id)?.length ?? 0 })
  }
  const firstDay = dashBerlinDayStart(first, dayCache)
  const lastDay = Math.min(
    dashBerlinDayStart(now.getTime(), dayCache),
    dashBerlinDayStart(new Date(event.startsAt).getTime(), dayCache),
  )
  const perDay = new Map<number, number>()
  for (const row of rows) {
    const day = dashBerlinDayStart(row.ms, dayCache)
    perDay.set(day, (perDay.get(day) ?? 0) + row.count)
  }
  const days: { key: string; label: string; cumulativeTickets: number }[] = []
  let cumulative = 0
  for (let day = firstDay; day <= lastDay; day += dayMs) {
    cumulative += perDay.get(day) ?? 0
    days.push({
      key: berlinDay.format(new Date(day)),
      label: dayLabel.format(new Date(day)),
      cumulativeTickets: cumulative,
    })
  }
  if (days.length === 1) {
    const only = days[0]
    if (only !== undefined) days.push({ ...only })
  }
  return days
}

function quarterBuild(args: { checkedInMs: number[]; nowMs: number }): { label: string; count: number }[] {
  const { checkedInMs, nowMs } = args
  const nowQuarter = Math.floor(nowMs / 900_000) * 900_000
  const base = nowQuarter - 16 * 900_000
  const counts = Array.from({ length: 16 }, () => 0)
  for (const ms of checkedInMs) {
    const index = Math.floor((ms - base - 1) / 900_000)
    if (index < 0 || index > 15) continue
    counts[index] = (counts[index] ?? 0) + 1
  }
  return Array.from({ length: 16 }, (_, index) => {
    const end = nowQuarter - (15 - index) * 900_000
    return { label: quarterLabel.format(new Date(end)), count: counts[index] ?? 0 }
  })
}

function phaseMarkersBuild(args: {
  days: { key: string; label: string; cumulativeTickets: number }[]
  types: { phases: { id: string; name: string; endsAt: string | null }[] }[]
}): { index: number; label: string }[] {
  const { days, types } = args
  const markers: { index: number; label: string }[] = []
  for (const type of types) {
    for (const phase of type.phases) {
      if (phase.endsAt === null) continue
      const key = berlinDay.format(new Date(phase.endsAt))
      const index = days.findIndex((day) => day.key === key)
      if (index < 0) continue
      markers.push({ index, label: `${phase.name} endet` })
    }
  }
  return markers
}

function empty(typeIds: string[]): ReturnType<typeof dashEventStats> {
  return {
    revenueCents: 0,
    sold: 0,
    capacity: 0,
    available: 0,
    checkedIn: 0,
    validTickets: 0,
    openPayments: { count: 0, amountCents: 0 },
    byTicketType: typeIds.map(() => ({
      ticketType: "",
      sold: 0,
      capacity: 0,
      available: 0,
      revenueCents: 0,
      phase: {
        phase: null,
        index: -1,
        state: "geplant" as const,
        nextPhase: null,
        endsReason: null,
        endsAt: null,
        remainingInPhase: null,
      },
    })),
    byChannel: [],
    salesCurve: [],
    phaseMarkers: [],
    checkInsByQuarter: [],
    entrances: [],
    rejectedScans: 0,
    recentOrderIds: [],
  }
}
