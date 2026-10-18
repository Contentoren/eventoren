import { onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { dashCentsFormat } from "../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import { dashPhaseResolve } from "../../model/dashPhaseResolve.ts"
import type { DashTicket } from "../../model/dashTicketSchema.ts"
import { dashTicketTypeSales } from "../../model/dashTicketTypeSales.ts"
import type { DashTicketType } from "../../model/dashTicketTypeSchema.ts"
import { dashBoxOfficeGuestBuy } from "../../store/actions/kasse/dashBoxOfficeGuestBuy.ts"
import { dashBoxOfficeSalePay } from "../../store/actions/kasse/dashBoxOfficeSalePay.ts"
import { dashNow } from "../../store/dashNow.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { dashStoreGet } from "../../store/dashStoreGet.ts"

export type DashAbendkasseMethod = "applepay" | "googlepay" | "karte"

export type DashAbendkasseTile = {
  type: DashTicketType
  unitPriceCents: number
  available: number | null
  soldOut: boolean
}

export type DashAbendkassePhase = "kauf" | "verarbeitung" | "fertig"

/** Zustand Gast-Kaufseite: Auswahl oder fester Vorgang, Bezahlung und Erfolgsansicht. */
export function dashAbendkasseStateCreate(inputs: { eventId: () => string; saleId: () => string | null }) {
  const now = dashNow()
  const quantities = createSignalObject<Record<string, number>>({})
  const buyerName = createSignalObject("")
  const buyerEmail = createSignalObject("")
  const busy = createSignalObject(false)
  const error = createSignalObject<string | null>(null)
  const tickets = createSignalObject<DashTicket[] | null>(null)

  const event = () => dashStateGet().events.find((candidate) => candidate.id === inputs.eventId()) ?? null
  const org = () => {
    const current = event()
    if (!current) return null
    return dashStateGet().orgs.find((candidate) => candidate.id === current.orgId) ?? null
  }

  const sale = () => {
    const id = inputs.saleId()
    if (!id) return null
    const found = dashStateGet().boxOfficeSales.find((candidate) => candidate.id === id)
    if (!found || found.eventId !== inputs.eventId()) return null
    return found
  }

  const boxOfficeOn = () => event()?.boxOffice.enabled === true

  const tiles = (): DashAbendkasseTile[] => {
    const state = dashStateGet()
    const eventId = inputs.eventId()
    return state.ticketTypes
      .filter((type) => type.eventId === eventId && type.channel === "abendkasse" && type.archivedAt === null)
      .toSorted((left, right) => left.sortOrder - right.sortOrder)
      .map((type) => {
        const sales = dashTicketTypeSales({ ticketType: type, orders: state.orders, tickets: state.tickets })
        const phase = dashPhaseResolve(type, sales.soldByPhase, now())
        const available = phase.phase ? Math.min(sales.available, phase.remainingInPhase ?? sales.available) : 0
        return {
          type,
          unitPriceCents: phase.phase?.priceCents ?? type.phases[0]?.priceCents ?? 0,
          available: phase.phase ? available : 0,
          soldOut: !phase.phase,
        }
      })
  }

  const typeNameById = (ticketTypeId: string) =>
    dashStateGet().ticketTypes.find((candidate) => candidate.id === ticketTypeId)?.name ?? "Ticket"

  const saleLines = () => {
    const current = sale()
    if (!current) return []
    return current.lines.map((line) => ({
      name: typeNameById(line.ticketTypeId),
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
    }))
  }

  const tileQuantity = (ticketTypeId: string) => quantities.get()[ticketTypeId] ?? 0

  const increase = (ticketTypeId: string) => {
    const tile = tiles().find((candidate) => candidate.type.id === ticketTypeId)
    if (!tile || tile.soldOut || sale()) return
    const max = Math.min(tile.available ?? 0, tile.type.maxPerOrder)
    const next = Math.min(tileQuantity(ticketTypeId) + 1, Math.max(max, 0))
    if (next <= 0) return
    quantities.set({ ...quantities.get(), [ticketTypeId]: next })
    error.set(null)
  }

  const decrease = (ticketTypeId: string) => {
    if (sale()) return
    const next = tileQuantity(ticketTypeId) - 1
    const rest = { ...quantities.get() }
    if (next <= 0) delete rest[ticketTypeId]
    else rest[ticketTypeId] = next
    quantities.set(rest)
  }

  const selectedLines = () =>
    Object.entries(quantities.get())
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }))
      .filter((line) => line.quantity > 0)

  const totalCents = () => {
    const current = sale()
    if (current) return current.totalCents
    const byId = new Map(tiles().map((tile) => [tile.type.id, tile.unitPriceCents]))
    return selectedLines().reduce((sum, line) => sum + (byId.get(line.ticketTypeId) ?? 0) * line.quantity, 0)
  }

  const ticketCount = () => {
    const current = sale()
    if (current) return current.lines.reduce((sum, line) => sum + line.quantity, 0)
    return selectedLines().reduce((sum, line) => sum + line.quantity, 0)
  }

  const phase = (): DashAbendkassePhase => {
    if (tickets.get()) return "fertig"
    if (busy.get()) return "verarbeitung"
    return "kauf"
  }

  const pay = (method: DashAbendkasseMethod) => {
    if (busy.get()) return
    const name = buyerName.get().trim()
    const email = buyerEmail.get().trim()
    if (name.split(/\s+/).filter((part) => part.length > 0).length < 2) {
      error.set("Bitte gib deinen Vor- und Nachnamen an.")
      return
    }
    if (!email.includes("@")) {
      error.set("Bitte gib eine gültige E-Mail-Adresse an – dorthin senden wir Ticket und Beleg.")
      return
    }
    const current = sale()
    if (current && current.status !== "wartet") {
      error.set(
        current.status === "bezahlt"
          ? "Dieser Vorgang ist schon bezahlt. Frag einfach an der Kasse nach."
          : "Dieser Vorgang wurde abgebrochen. Frag einfach an der Kasse nach.",
      )
      return
    }
    const lines = current
      ? current.lines.map((line) => ({ ticketTypeId: line.ticketTypeId, quantity: line.quantity }))
      : selectedLines()
    if (lines.length === 0) {
      error.set("Wähle zuerst mindestens ein Ticket.")
      return
    }
    error.set(null)
    busy.set(true)
    window.setTimeout(() => {
      const result = current
        ? dashBoxOfficeSalePay({ saleId: current.id, buyerName: name, buyerEmail: email, method })
        : dashBoxOfficeGuestBuy({ eventId: inputs.eventId(), lines, buyerName: name, buyerEmail: email, method })
      busy.set(false)
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      // Sofort persistieren, damit andere Tabs (Kasse) per Storage-Event live aktualisieren.
      dashStoreGet().flush()
      tickets.set(result.data.tickets)
    }, 1000)
  }

  const setName = (value: string) => buyerName.set(value)
  const setEmail = (value: string) => buyerEmail.set(value)
  const dismissError = () => error.set(null)

  // Falls der Vorgang an der Kasse storniert wird, zeigen wir das sofort an.
  onMount(() => {
    if (typeof window === "undefined") return
    const interval = window.setInterval(() => {
      if (tickets.get() || busy.get()) return
      const id = inputs.saleId()
      if (!id) return
      const current = dashStateGet().boxOfficeSales.find((candidate) => candidate.id === id)
      if (current?.status === "abgebrochen")
        error.set("Dieser Vorgang wurde an der Kasse abgebrochen. Frag einfach an der Kasse nach.")
    }, 1000)
    onCleanup(() => window.clearInterval(interval))
  })

  return {
    event,
    org,
    sale,
    saleLines,
    boxOfficeOn,
    tiles,
    tileQuantity,
    increase,
    decrease,
    totalCents,
    ticketCount,
    phase,
    tickets,
    paidTickets: () => (phase() === "fertig" ? tickets.get() : null),
    buyerName,
    buyerEmail,
    setName,
    setEmail,
    busy,
    error,
    pay,
    dismissError,
    dateLabel: () => {
      const current = event()
      return current ? dashDateFormat(current.startsAt, "lang") : ""
    },
    totalLabel: () => dashCentsFormat(totalCents()),
  }
}

export type DashAbendkasseState = ReturnType<typeof dashAbendkasseStateCreate>
