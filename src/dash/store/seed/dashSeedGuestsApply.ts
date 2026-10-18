import { dashOrderBuild } from "../../model/dashOrderBuild.ts"
import { dashRandomCreate } from "../../model/dashRandomCreate.ts"
import type { DashGuest } from "../../model/dashGuestSchema.ts"
import type { DashOrder } from "../../model/dashOrderSchema.ts"
import type { DashScan } from "../../model/dashScanSchema.ts"
import type { DashState } from "../../model/dashStateSchema.ts"
import type { DashTicket } from "../../model/dashTicketSchema.ts"

import { dashSeedFirstNames, dashSeedLastNames } from "./dashSeedNames.ts"
import { dashSeedTicketCodeCreate } from "./dashSeedTicketCodeCreate.ts"

const seedConstant = 20261020

function nameEmailCreate(firstName: string, lastName: string): string {
  const normalized = `${firstName}.${lastName}`
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .replaceAll(/[^a-z.]/gu, "")
  return `${normalized}@example.de`
}

const notes = [
  "Bühne links, ruhiger Platz.",
  "Kommt mit Begleitung.",
  "Interview vor der Show.",
  "Fotograf mit Akkreditierung.",
  "Bandbus parkt hinten.",
  "Vegan bitte vormerken.",
  "Rollstuhlplatz reserviert.",
  "",
  "",
  "Anreise mit Zug, verspätet sich evtl.",
]

/**
 * Seedet Gästelisten mit Kontingent-Quoten und kostenlosen Tickets.
 * Deterministisch über `dashRandomCreate` mit fester Konstante.
 */
export function dashSeedGuestsApply(state: DashState, now: Date): DashState {
  const random = dashRandomCreate(seedConstant)
  const firstNames = dashSeedFirstNames()
  const lastNames = dashSeedLastNames()
  const nowMs = now.getTime()

  const tickets: DashTicket[] = state.tickets.map((ticket) => ({ ...ticket }))
  const orders: DashOrder[] = [...state.orders]
  const scans: DashScan[] = [...state.scans]
  const guests: DashGuest[] = [...state.guests]

  const taken = new Set(tickets.map((ticket) => ticket.code))
  const ticketCodeTake = () => dashSeedTicketCodeCreate(random, taken)

  let orderSeq = 5000
  let ticketSeq = 50000
  let guestSeq = guests.length
  let scanSeq = scans.length
  let orderNumberSeq = 269000
  const orderIdTake = () => {
    orderSeq += 1
    return `order-guest-${String(orderSeq).padStart(4, "0")}`
  }
  const ticketIdTake = () => {
    ticketSeq += 1
    return `ticket-guest-${String(ticketSeq).padStart(5, "0")}`
  }
  const guestIdTake = () => {
    guestSeq += 1
    return `guest-seed-${String(guestSeq).padStart(4, "0")}`
  }
  const scanIdTake = () => {
    scanSeq += 1
    return `scan-guest-${String(scanSeq).padStart(5, "0")}`
  }
  const orderNumberTake = () => {
    orderNumberSeq += 1
    return `EV-${orderNumberSeq}`
  }

  const orgById = new Map(state.orgs.map((org) => [org.id, org]))
  const eventById = new Map(state.events.map((event) => [event.id, event]))
  const typesByEvent = new Map<string, DashState["ticketTypes"]>()
  for (const type of state.ticketTypes) {
    const list = typesByEvent.get(type.eventId) ?? []
    list.push(type)
    typesByEvent.set(type.eventId, list)
  }

  const personTake = (used: Set<string>) => {
    for (let guard = 0; guard < 200; guard += 1) {
      const firstName = firstNames[Math.floor(random() * firstNames.length)] ?? "Alex"
      const lastName = lastNames[Math.floor(random() * lastNames.length)] ?? "Mustermann"
      const name = `${firstName} ${lastName}`
      if (used.has(name)) continue
      used.add(name)
      return { firstName, lastName, name }
    }
    const firstName = firstNames[Math.floor(random() * firstNames.length)] ?? "Alex"
    const lastName = lastNames[Math.floor(random() * lastNames.length)] ?? "Mustermann"
    const name = `${firstName} ${lastName} ${String(Math.floor(random() * 1000))}`
    used.add(name)
    return { firstName, lastName, name }
  }

  const guestTicketBuild = (args: {
    eventId: string
    guestName: string
    guestEmail: string
    createdAt: string
  }): { order: DashOrder; ticket: DashTicket } | null => {
    const event = eventById.get(args.eventId)
    if (!event) return null
    const types = typesByEvent.get(args.eventId) ?? []
    if (types.length === 0) return null
    const sorted = [...types].sort((a, b) => a.sortOrder - b.sortOrder)
    const type = sorted[0]
    if (!type) return null
    // Letzte Phase nutzen: Gästeliste-Tickets dürfen keine Frühbucher-Kontingente verbrauchen.
    const phase = type.phases[type.phases.length - 1]
    if (!phase) return null
    const org = orgById.get(event.orgId)
    if (!org) return null
    const [firstName, ...rest] = args.guestName.split(" ")
    const lastName = rest.join(" ") || "Gast"
    const orderId = orderIdTake()
    const ticketIdHolder = { current: "" }
    const built = dashOrderBuild({
      id: orderId,
      number: orderNumberTake(),
      org: { id: event.orgId, fee: org.fee },
      event: { id: event.id },
      ticketTypes: types,
      lines: [{ ticketTypeId: type.id, phaseId: phase.id, unitPriceCents: 0, quantity: 1 }],
      buyer: {
        firstName: firstName ?? "Gast",
        lastName,
        email: args.guestEmail || nameEmailCreate(firstName ?? "Gast", lastName),
      },
      holders: [{ name: args.guestName, email: args.guestEmail || nameEmailCreate(firstName ?? "Gast", lastName) }],
      createdAt: args.createdAt,
      channel: "gaesteliste",
      method: "kostenlos",
      ticketIdCreate: () => {
        const id = ticketIdTake()
        ticketIdHolder.current = id
        return id
      },
      ticketCodeCreate: ticketCodeTake,
      invoiceNumber: "",
    })
    if (!built.success) return null
    const ticket = built.data.tickets[0]
    if (!ticket) return null
    return { order: built.data.order, ticket }
  }

  const quotaPlans: { quotaId: string; eventId: string; limit: number }[] = [
    { quotaId: "gq-winter-presse", eventId: "ev-winterball", limit: 20 },
    { quotaId: "gq-winter-band", eventId: "ev-winterball", limit: 30 },
    { quotaId: "gq-winter-verein", eventId: "ev-winterball", limit: 40 },
    { quotaId: "gq-indie-gaeste", eventId: "ev-indie-night", limit: 25 },
  ]

  const usedNames = new Set<string>()
  const indieEvent = eventById.get("ev-indie-night")
  const indieDoorsMs = indieEvent?.doorsAt ? Date.parse(indieEvent.doorsAt) : nowMs - 60 * 60_000

  const plusOnesTake = (): number => {
    const roll = random()
    if (roll < 0.6) return 0
    if (roll < 0.9) return 1
    return 2
  }

  const guestDocCreate = (args: {
    eventId: string
    quotaId: string
    person: { firstName: string; lastName: string; name: string }
    email: string
    plusOnes: number
    withTicket: boolean
  }): void => {
    const note = notes[Math.floor(random() * notes.length)] ?? ""
    const createdAt = new Date(
      nowMs - Math.floor(random() * 20 * 86_400_000) - Math.floor(random() * 3_600_000),
    ).toISOString()
    let ticketId: string | null = null
    if (args.withTicket) {
      const built = guestTicketBuild({
        eventId: args.eventId,
        guestName: args.person.name,
        guestEmail: args.email,
        createdAt,
      })
      if (built) {
        orders.push(built.order)
        tickets.push(built.ticket)
        ticketId = built.ticket.id
      }
    }
    guests.push({
      id: guestIdTake(),
      eventId: args.eventId,
      quotaId: args.quotaId,
      name: args.person.name,
      email: args.email,
      plusOnes: args.plusOnes,
      note,
      ticketId,
      checkedInAt: null,
      createdAt,
    })
  }

  for (const plan of quotaPlans) {
    // Kontingent-Regel: used = Σ(1 + plusOnes) ≤ Limit. Gäste füllen,
    // bis kein voller Zeilen-Eintrag mehr passt – Begleitpersonen zählen mit.
    // Hält Abstand zum Limit, damit Add-/Bulk-Import-Tests freie Plätze sehen.
    const target = Math.max(1, plan.limit - 6)
    let used = 0
    let withTicketToggle = true
    while (used < target) {
      const person = personTake(usedNames)
      const hasEmail = random() < 0.7
      const email = hasEmail ? nameEmailCreate(person.firstName, person.lastName) : ""
      const plusOnes = plusOnesTake()
      if (used + 1 + plusOnes > target) {
        // Passt nicht mehr: Ersatz ohne Begleitung versuchen, sonst Kontingent schließen.
        if (used + 1 > target || plusOnes === 0) break
        const fallbackEmail = random() < 0.7 ? nameEmailCreate(person.firstName, person.lastName) : ""
        guestDocCreate({
          eventId: plan.eventId,
          quotaId: plan.quotaId,
          person,
          email: fallbackEmail,
          plusOnes: 0,
          withTicket: withTicketToggle,
        })
        used += 1
        break
      }
      guestDocCreate({
        eventId: plan.eventId,
        quotaId: plan.quotaId,
        person,
        email,
        plusOnes,
        withTicket: withTicketToggle,
      })
      withTicketToggle = !withTicketToggle
      used += 1 + plusOnes
    }
  }

  // 6 Indie-Gäste bereits eingecheckt (mit Scans).
  const indieGuests = guests.filter((guest) => guest.eventId === "ev-indie-night" && guest.ticketId !== null)
  const checkedGuests = indieGuests.slice(0, 6)
  for (const guest of checkedGuests) {
    const ticket = tickets.find((item) => item.id === guest.ticketId)
    if (!ticket) continue
    const atMs =
      Math.max(indieDoorsMs, nowMs - 45 * 60_000) +
      Math.floor(random() * Math.max(1, nowMs - Math.max(indieDoorsMs, nowMs - 45 * 60_000)))
    const at = new Date(Math.min(atMs, nowMs)).toISOString()
    guest.checkedInAt = at
    ticket.checkedInAt = at
    ticket.entrance = random() < 0.75 ? "Haupteingang" : "Seiteneingang"
    scans.push({
      id: scanIdTake(),
      eventId: "ev-indie-night",
      at,
      entrance: ticket.entrance,
      device: random() < 0.5 ? "Einlass Nord" : "Einlass Hof",
      ticketId: ticket.id,
      code: ticket.code,
      result: "ok",
    })
  }

  return { ...state, guests, orders, tickets, scans }
}
