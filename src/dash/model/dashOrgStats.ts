import { dashOrderTicketRefunds } from "./dashOrderTicketRefunds.ts"
import { dashOrderTicketValue } from "./dashOrderTicketValue.ts"
import type { DashOrder } from "./dashOrderSchema.ts"
import type { DashState } from "./dashStateSchema.ts"

const berlinDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" })
const dayLabel = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" })
const monthLabel = new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "Europe/Berlin" })

const dayMs = 86_400_000
const countedStatus = new Set<DashOrder["status"]>(["bezahlt", "offen", "teilerstattet"])

export function dashOrgStats(args: { state: DashState; orgId: string; range: 7 | 30 | 365; now: Date }): {
  revenueCents: number
  tickets: number
  orders: number
  avgOrderCents: number
  occupancyBps: number
  deltas: { revenue: number | null; tickets: number | null; orders: number | null; avgOrder: number | null }
  series: { key: string; label: string; revenueCents: number; tickets: number }[]
  previousRevenue: number[]
} {
  const { state, orgId, range, now } = args
  const eventIds = new Set(state.events.filter((event) => event.orgId === orgId).map((event) => event.id))
  const relevant = state.orders.filter(
    (order) =>
      order.orgId === orgId &&
      eventIds.has(order.eventId) &&
      countedStatus.has(order.status) &&
      order.channel !== "gaesteliste",
  )
  const relevantIds = new Set(relevant.map((order) => order.id))
  const validTickets = new Map<string, number>()
  for (const ticket of state.tickets) {
    if (ticket.status !== "gueltig") continue
    if (!relevantIds.has(ticket.orderId)) continue
    validTickets.set(ticket.orderId, (validTickets.get(ticket.orderId) ?? 0) + 1)
  }
  const eligible = relevant.filter((order) => (validTickets.get(order.id) ?? 0) > 0)
  const valueOf = new Map(
    eligible.map((order) => [order.id, dashOrderTicketValue(order) - dashOrderTicketRefunds(order)]),
  )
  const ticketsOf = new Map(eligible.map((order) => [order.id, validTickets.get(order.id) ?? 0]))

  const slots = range === 365 ? monthSlots(now) : daySlots(now, range)
  const periodStart = slots[0]?.start ?? 0
  const periodLength = (slots[slots.length - 1]?.end ?? periodStart) - periodStart

  const totals = { revenueCents: 0, tickets: 0, orders: 0 }
  const series = slots.map((slot) => ({ key: slot.key, label: slot.label, revenueCents: 0, tickets: 0 }))
  const previousRevenue = slots.map(() => 0)
  const previousTotals = { revenueCents: 0, tickets: 0, orders: 0 }
  // Vorzeitraum-Fenster exakt wie zuvor per Subtraktion (statt `created +
  // periodLength`, das bei Monats-Slots nahe 2^53 an Präzision verlöre).
  const previousSlots = slots.map((slot) => ({ start: slot.start - periodLength, end: slot.end - periodLength }))
  for (const order of eligible) {
    const created = new Date(order.createdAt).getTime()
    const index = slotIndexFind(slots, created)
    if (index >= 0) {
      const point = series[index]
      if (point === undefined) continue
      point.revenueCents += valueOf.get(order.id) ?? 0
      point.tickets += ticketsOf.get(order.id) ?? 0
      totals.revenueCents += valueOf.get(order.id) ?? 0
      totals.tickets += ticketsOf.get(order.id) ?? 0
      totals.orders += 1
      continue
    }
    const previousIndex = slotIndexFind(previousSlots, created)
    if (previousIndex < 0) continue
    previousRevenue[previousIndex] = (previousRevenue[previousIndex] ?? 0) + (valueOf.get(order.id) ?? 0)
    previousTotals.revenueCents += valueOf.get(order.id) ?? 0
    previousTotals.tickets += ticketsOf.get(order.id) ?? 0
    previousTotals.orders += 1
  }

  const avgOrder = totals.orders === 0 ? 0 : Math.round(totals.revenueCents / totals.orders)
  const previousAvg = previousTotals.orders === 0 ? 0 : Math.round(previousTotals.revenueCents / previousTotals.orders)
  const delta = (current: number, previous: number): number | null =>
    previous === 0 ? null : (current - previous) / previous

  const upcomingIds = new Set(
    state.events
      .filter((event) => event.orgId === orgId && event.status === "veroeffentlicht" && new Date(event.endsAt) > now)
      .map((event) => event.id),
  )
  const upcomingTypes = state.ticketTypes.filter(
    (type) => upcomingIds.has(type.eventId) && type.channel === "online" && type.archivedAt === null,
  )
  const upcomingTypeIds = new Set(upcomingTypes.map((type) => type.id))
  const upcomingOrderIds = new Set(
    state.orders.filter((order) => upcomingIds.has(order.eventId)).map((order) => order.id),
  )
  const sold = state.tickets.filter(
    (ticket) =>
      upcomingIds.has(ticket.eventId) &&
      ticket.status === "gueltig" &&
      upcomingOrderIds.has(ticket.orderId) &&
      upcomingTypeIds.has(ticket.ticketTypeId),
  ).length
  const capacity = upcomingTypes.reduce((sum, type) => sum + type.capacity, 0)

  return {
    revenueCents: totals.revenueCents,
    tickets: totals.tickets,
    orders: totals.orders,
    avgOrderCents: avgOrder,
    occupancyBps: capacity === 0 ? 0 : Math.round((sold / capacity) * 10000),
    deltas: {
      revenue: delta(totals.revenueCents, previousTotals.revenueCents),
      tickets: delta(totals.tickets, previousTotals.tickets),
      orders: delta(totals.orders, previousTotals.orders),
      avgOrder: delta(avgOrder, previousAvg),
    },
    series,
    previousRevenue,
  }
}

function daySlots(now: Date, range: 7 | 30): { key: string; label: string; start: number; end: number }[] {
  const today = startOfBerlinDay(now)
  return Array.from({ length: range }, (_, index) => {
    const start = today - (range - 1 - index) * dayMs
    return {
      key: berlinDay.format(new Date(start)),
      label: dayLabel.format(new Date(start)),
      start,
      end: start + dayMs,
    }
  })
}

function monthSlots(now: Date): { key: string; label: string; start: number; end: number }[] {
  const slots: { key: string; label: string; start: number; end: number }[] = []
  for (let index = 11; index >= 0; index -= 1) {
    const start = startOfBerlinMonth(now, index)
    const end = index === 0 ? Number.MAX_SAFE_INTEGER : startOfBerlinMonth(now, index - 1)
    slots.push({
      key: berlinDay.format(new Date(start)).slice(0, 7),
      label: monthLabel.format(new Date(start + 12 * 3_600_000)),
      start,
      end,
    })
  }
  return slots
}

function startOfBerlinDay(now: Date): number {
  const day = berlinDay.format(now)
  let low = now.getTime() - 2 * dayMs
  let high = now.getTime() + dayMs
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (berlinDay.format(new Date(mid)) < day) low = mid + 1
    else high = mid
  }
  return low - (low % 1000)
}

// Binäre Suche über aufsteigend sortierte Slot-Starts; Ergebnis:
// Index des Slots mit start <= created < end, sonst −1.
// Hinweis: daySlots erzeugt lückenlose Folgeslots (end = start + dayMs),
// monthSlots hat end = Folgeslot-Start (außer letzter Slot: offen).
function slotIndexFind(slots: { start: number; end: number }[], created: number): number {
  let low = 0
  let high = slots.length - 1
  let found = -1
  while (low <= high) {
    const mid = (low + high) >> 1
    const slot = slots[mid]
    if (slot === undefined) break
    if (created >= slot.start) {
      found = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  if (found < 0) return -1
  const slot = slots[found]
  if (slot === undefined) return -1
  return created < slot.end ? found : -1
}

function startOfBerlinMonth(now: Date, monthsAgo: number): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "1970")
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "01")
  const total = year * 12 + (month - 1) - monthsAgo
  const targetYear = Math.floor(total / 12)
  const targetMonth = (total % 12) + 1
  return berlinMidnightUtc(targetYear, targetMonth, 1)
}

function berlinMidnightUtc(year: number, month: number, day: number): number {
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0)
  const expected = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  if (berlinDay.format(new Date(guess)) === expected) return guess
  for (let hour = 1; hour <= 3; hour += 1) {
    const candidate = guess + hour * 3_600_000
    if (candidate % 1000 !== 0) continue
    if (berlinDay.format(new Date(candidate)) === expected) return candidate
  }
  return guess
}
