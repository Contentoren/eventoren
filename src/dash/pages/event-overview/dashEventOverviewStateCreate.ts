import { createMemo } from "solid-js"
import { useNavigate } from "@tanstack/solid-router"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { dashActiveOrg } from "../../store/dashActiveOrg.ts"
import { dashCan } from "../../store/dashCan.ts"
import { dashEventById } from "../../store/dashEventById.ts"
import { dashNow } from "../../store/dashNow.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { dashCentsFormat } from "../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import { dashEventPublishCheck } from "../../model/dashEventPublishCheck.ts"
import { dashEventStats } from "../../model/dashEventStats.ts"
import { dashPhaseLabel } from "./model/dashPhaseLabel.ts"
import type { DotPillTone } from "#ui/static/pill/DotPill.jsx"

const berlinDayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" })

export type DashEventOverviewTicketRow = {
  id: string
  name: string
  hidden: boolean
  boxOffice: boolean
  phaseLabel: string
  phaseTone: DotPillTone
  priceCents: number
  sold: number
  capacity: number
  revenueCents: number
}

export type DashEventOverviewOrderRow = {
  id: string
  number: string
  buyerName: string
  buyerEmail: string
  tickets: number
  totalCents: number
  status: string
  createdAt: string
}

export type DashEventOverviewChecklistItem = {
  id: string
  label: string
  done: boolean
  href: string
}

const phaseToneFor = (state: string): DotPillTone => {
  if (state === "aktiv") return "brand"
  if (state === "ausverkauft") return "warning"
  return "neutral"
}

const checklistTarget: Record<string, string> = {
  basis: "details",
  bild: "details",
  alt: "details",
  tickets: "tickets",
  beschreibung: "details",
}

/** Zustand der Event-Übersicht: Kennzahlen, Checkliste, Ticketarten, Kurven und letzte Bestellungen. */
export function dashEventOverviewStateCreate(inputs: { eventId: () => string }) {
  const navigate = useNavigate()
  const now = dashNow()
  const checklistOpen = createSignalObject(true)

  const event = () => dashEventById(inputs.eventId())
  const org = () => dashActiveOrg()
  const basePath = () => `/demo/dashboard/events/${inputs.eventId()}`
  const canSeeRevenue = () => dashCan("umsatz.sehen")
  const isDraft = () => event()?.status === "entwurf"

  const stats = createMemo(() => dashEventStats({ state: dashStateGet(), eventId: inputs.eventId(), now: now() }))

  const types = createMemo(() =>
    dashStateGet()
      .ticketTypes.filter((type) => type.eventId === inputs.eventId())
      .sort((left, right) => left.sortOrder - right.sortOrder),
  )

  const check = () => {
    const current = event()
    if (!current) return null
    return dashEventPublishCheck(current, types(), org())
  }

  const checklist = (): DashEventOverviewChecklistItem[] => {
    const result = check()
    if (!result) return []
    return result.items.map((item) => ({
      id: item.id,
      label: item.label,
      done: item.done,
      href:
        item.id === "org" ? "/demo/dashboard/einstellungen" : `${basePath()}/${checklistTarget[item.id] ?? "details"}`,
    }))
  }

  const doneCount = () => checklist().filter((item) => item.done).length
  const progressLabel = () => `${doneCount()} / ${checklist().length}`
  const publishOk = () => check()?.ok ?? false

  const revenueText = () => dashCentsFormat(stats().revenueCents)
  const soldText = () => `${stats().sold} / ${stats().capacity}`

  const onEventDay = () => {
    const current = event()
    if (!current) return false
    return berlinDayFormat.format(new Date(current.startsAt)) <= berlinDayFormat.format(now())
  }

  const checkinValue = () => {
    if (!onEventDay()) return "—"
    return `${stats().checkedIn} / ${stats().validTickets}`
  }

  const checkinFooter = (): string | null => {
    const current = event()
    if (current === null || onEventDay()) return null
    return `Einlass ab ${dashDateFormat(current.startsAt, "kurz")}`
  }

  const openCount = () => `${stats().openPayments.count}`

  const openFooter = () => `${dashCentsFormat(stats().openPayments.amountCents)} offen`

  const ticketRows = createMemo((): DashEventOverviewTicketRow[] =>
    stats().byTicketType.map((entry) => {
      const type = types().find((candidate) => candidate.id === entry.ticketType)
      const price = entry.phase.phase?.priceCents ?? type?.phases[0]?.priceCents ?? 0
      return {
        id: entry.ticketType,
        name: type?.name ?? entry.ticketType,
        hidden: type?.hidden ?? false,
        boxOffice: (type?.channel ?? "online") === "abendkasse",
        phaseLabel: dashPhaseLabel(entry.phase, now()),
        phaseTone: phaseToneFor(entry.phase.state),
        priceCents: price,
        sold: entry.sold,
        capacity: entry.capacity,
        revenueCents: entry.revenueCents,
      }
    }),
  )

  const salesPoints = createMemo(() =>
    stats().salesCurve.map((point) => ({ label: point.label, value: point.cumulativeTickets })),
  )

  const salesMarkers = createMemo(() => stats().phaseMarkers)

  const channelSegments = createMemo(() => {
    const byChannel = new Map(stats().byChannel.map((entry) => [entry.channel, entry.tickets]))
    return [
      { label: "Online", value: byChannel.get("online") ?? 0, tone: "brand" as const },
      { label: "Abendkasse", value: byChannel.get("abendkasse") ?? 0, tone: "neutral" as const },
      { label: "Gästeliste", value: byChannel.get("gaesteliste") ?? 0, tone: "success" as const },
    ]
  })

  const channelTotal = () => channelSegments().reduce((sum, segment) => sum + segment.value, 0)

  const orderRows = createMemo((): DashEventOverviewOrderRow[] => {
    const state = dashStateGet()
    return stats()
      .recentOrderIds.map((id) => state.orders.find((order) => order.id === id))
      .filter((order) => order !== undefined)
      .map((order) => ({
        id: order.id,
        number: order.number,
        buyerName: `${order.buyer.firstName} ${order.buyer.lastName}`.trim(),
        buyerEmail: order.buyer.email,
        tickets: order.lines.reduce((sum, line) => sum + line.quantity, 0),
        totalCents: order.totalCents,
        status: order.status,
        createdAt: order.createdAt,
      }))
  })

  const toggleChecklist = () => checklistOpen.set(!checklistOpen.get())

  const openOrder = (id: string) => {
    void navigate({ to: `${basePath()}/bestellungen` as never, search: { bestellung: id } as never })
  }

  const openTicket = (id: string) => {
    void navigate({ to: `${basePath()}/tickets` as never, search: { ticket: id } as never })
  }

  return {
    event,
    basePath,
    canSeeRevenue,
    isDraft,
    checklist,
    doneCount,
    progressLabel,
    publishOk,
    checklistOpen,
    toggleChecklist,
    revenueText,
    soldText,
    sold: () => stats().sold,
    capacity: () => stats().capacity,
    checkinValue,
    checkinFooter,
    openCount,
    openFooter,
    ticketRows,
    salesPoints,
    salesMarkers,
    channelSegments,
    channelTotal,
    orderRows,
    openOrder,
    openTicket,
  }
}

export type DashEventOverviewState = ReturnType<typeof dashEventOverviewStateCreate>
