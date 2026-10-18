import { mdiBankOutline } from "@adaptive-ds/mdi/mdiBankOutline.js"
import { mdiBankTransfer } from "@adaptive-ds/mdi/mdiBankTransfer.js"
import { mdiClockOutline } from "@adaptive-ds/mdi/mdiClockOutline.js"
import { mdiPencilOutline } from "@adaptive-ds/mdi/mdiPencilOutline.js"
import { mdiQrcodeScan } from "@adaptive-ds/mdi/mdiQrcodeScan.js"
import { dashEventPhaseGet } from "../../../model/dashEventPhaseGet.ts"
import { dashPhaseResolve } from "../../../model/dashPhaseResolve.ts"
import type { DashState } from "../../../model/dashStateSchema.ts"
import { dashTicketTypeSales } from "../../../model/dashTicketTypeSales.ts"
import type { DashTicketType } from "../../../model/dashTicketTypeSchema.ts"

export type DashNotificationTone = "brand" | "warning" | "danger" | "neutral"

export type DashNotification = {
  id: string
  icon: string
  tone: DashNotificationTone
  text: string
  at: string
  href: string
}

function dashBerlinDayCreate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value)
}

function dashCalendarDaysBetweenCreate(from: Date, to: Date): number {
  const start = Date.parse(dashBerlinDayCreate(from))
  const end = Date.parse(dashBerlinDayCreate(to))
  if (Number.isNaN(start) || Number.isNaN(end)) return Number.NaN
  return Math.round((end - start) / 86_400_000)
}

export function dashNotificationsCreate(state: DashState, orgId: string, now: Date): DashNotification[] {
  const events = state.events.filter((event) => event.orgId === orgId)
  const typesByEvent = new Map<string, DashTicketType[]>()
  for (const type of state.ticketTypes) {
    const list = typesByEvent.get(type.eventId)
    if (list) list.push(type)
    else typesByEvent.set(type.eventId, [type])
  }
  const salesByType = new Map<string, { sold: number; soldByPhase: Record<string, number> }>()
  const salesOf = (type: DashTicketType) => {
    const cached = salesByType.get(type.id)
    if (cached) return cached
    const sales = dashTicketTypeSales({ ticketType: type, orders: state.orders, tickets: state.tickets })
    const entry = { sold: sales.sold, soldByPhase: sales.soldByPhase }
    salesByType.set(type.id, entry)
    return entry
  }

  const live: DashNotification[] = []
  for (const event of events) {
    if (event.status !== "veroeffentlicht") continue
    const types = typesByEvent.get(event.id) ?? []
    const sold = types.reduce((sum, type) => sum + salesOf(type).sold, 0)
    const capacity = types.reduce((sum, type) => sum + type.capacity, 0)
    if (dashEventPhaseGet({ event, sold, capacity, now }) !== "live") continue
    live.push({
      id: `live-${event.id}`,
      icon: mdiQrcodeScan,
      tone: "brand",
      text: `${event.title}: Einlass läuft`,
      at: event.doorsAt ?? event.startsAt,
      href: `/demo/dashboard/events/${event.id}/einlass`,
    })
  }
  live.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))

  const phaseCandidates: { notification: DashNotification; endsMs: number }[] = []
  const seenPhase = new Set<string>()
  for (const event of events) {
    if (event.status !== "veroeffentlicht") continue
    if (Date.parse(event.startsAt) <= now.getTime()) continue
    const types = (typesByEvent.get(event.id) ?? [])
      .filter((type) => type.archivedAt === null)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    for (const type of types) {
      const resolved = dashPhaseResolve(type, salesOf(type).soldByPhase, now)
      if (resolved.state !== "aktiv" || !resolved.phase || resolved.endsReason !== "datum" || !resolved.endsAt) {
        continue
      }
      const endsDate = new Date(resolved.endsAt)
      const days = dashCalendarDaysBetweenCreate(now, endsDate)
      if (Number.isNaN(days) || days < 0 || days > 3) continue
      const key = `${event.id}|${resolved.phase.name}|${resolved.endsAt}`
      if (seenPhase.has(key)) continue
      seenPhase.add(key)
      const label = days === 0 ? "heute" : days === 1 ? "morgen" : `in ${days} Tagen`
      phaseCandidates.push({
        notification: {
          id: `phase-${type.id}-${resolved.phase.id}`,
          icon: mdiClockOutline,
          tone: "warning",
          text: `${resolved.phase.name} von ${event.title} endet ${label}`,
          at: resolved.endsAt,
          href: `/demo/dashboard/events/${event.id}/tickets`,
        },
        endsMs: endsDate.getTime(),
      })
    }
  }
  phaseCandidates.sort((a, b) => a.endsMs - b.endsMs)
  const phases = phaseCandidates.map((candidate) => candidate.notification)

  const sepa: DashNotification[] = []
  const sepaOrders = state.orders.filter(
    (order) => order.orgId === orgId && order.status === "offen" && order.payment.method === "sepa",
  )
  if (sepaOrders.length > 0) {
    const latest =
      sepaOrders
        .map((order) => order.createdAt)
        .sort()
        .at(-1) ?? now.toISOString()
    sepa.push({
      id: "sepa-offen",
      icon: mdiBankOutline,
      tone: "warning",
      text: sepaOrders.length === 1 ? "1 SEPA-Zahlung offen" : `${sepaOrders.length} SEPA-Zahlungen offen`,
      at: latest,
      href: "/demo/dashboard/bestellungen?status=offen",
    })
  }

  const drafts: DashNotification[] = events
    .filter((event) => event.status === "entwurf")
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map((event) => ({
      id: `entwurf-${event.id}`,
      icon: mdiPencilOutline,
      tone: "neutral" as const,
      text: `${event.title} ist noch ein Entwurf`,
      at: event.updatedAt,
      href: `/demo/dashboard/events/${event.id}`,
    }))

  const eventById = new Map(events.map((event) => [event.id, event]))
  const payouts: DashNotification[] = state.payouts
    .filter((payout) => payout.orgId === orgId && payout.status === "bereit")
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
    .map((payout) => ({
      id: `payout-${payout.id}`,
      icon: mdiBankTransfer,
      tone: "brand" as const,
      text: `Auszahlung für ${eventById.get(payout.eventId)?.title ?? "dein Event"} bereit`,
      at: payout.dueAt,
      href: "/demo/dashboard/finanzen",
    }))

  return [...live, ...phases, ...sepa, ...drafts, ...payouts]
}
