import { createResult, createResultError, type Result } from "#result"

import { dashCodeGenerate } from "../../../model/dashCodeGenerate.ts"
import { dashOrderBuild } from "../../../model/dashOrderBuild.ts"
import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import { dashRandomCreate } from "../../../model/dashRandomCreate.ts"
import type { DashState } from "../../../model/dashStateSchema.ts"
import type { DashTicket } from "../../../model/dashTicketSchema.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"

function dashGuestOrderNumberNext(existing: string[]): string {
  let max = -1
  for (const value of existing) {
    const match = /^EV-(\d+)$/.exec(value)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return max < 0 ? "EV-260001" : `EV-${max + 1}`
}

/**
 * Baut eine 0-€-Gästeliste-Bestellung (Kanal „gaesteliste“, „kostenlos“)
 * mit 1 + plusOnes Tickets der letzten Online-Ticketart des Events zum Preis 0.
 * Rein bauend – Speichern übernimmt die aufrufende Action.
 */
export function dashGuestOrderBuild(args: {
  eventId: string
  name: string
  email: string
  plusOnes: number
  nowIso: string
  state: DashState
}): Result<{ order: DashOrder; tickets: DashTicket[] }> {
  const op = "dashGuestOrderBuild"
  const event = args.state.events.find((candidate) => candidate.id === args.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const org = args.state.orgs.find((candidate) => candidate.id === event.orgId)
  if (!org) return createResultError(op, "Organisation nicht gefunden.")
  const online = args.state.ticketTypes
    .filter((type) => type.eventId === args.eventId && type.channel === "online")
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const type = online[online.length - 1]
  if (!type) return createResultError(op, "Für dieses Event gibt es keine Online-Ticketart.")
  const phase = type.phases[type.phases.length - 1]
  if (!phase) return createResultError(op, "Die Ticketart hat keine Verkaufsphase.")
  const quantity = 1 + args.plusOnes
  const random = dashRandomCreate((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0)
  const rawCodes = dashCodeGenerate({
    count: quantity,
    length: 8,
    existing: args.state.tickets.map((ticket) => ticket.code),
    random,
  })
  const ticketCodes = rawCodes.map((raw) => `T-${raw.slice(0, 4)}-${raw.slice(4)}`)
  let codeIndex = 0
  const nameParts = args.name.split(/\s+/).filter((part) => part !== "")
  const firstName = nameParts[0] ?? "Gast"
  const lastName = nameParts.slice(1).join(" ") || "Gast"
  const holders = [{ name: args.name, email: args.email }]
  for (let index = 0; index < args.plusOnes; index += 1)
    holders.push({ name: `${args.name} (+${index + 1})`, email: args.email })
  const built = dashOrderBuild({
    id: dashIdCreate("order"),
    number: dashGuestOrderNumberNext(args.state.orders.map((order) => order.number)),
    org: { id: org.id, fee: org.fee },
    event: { id: event.id },
    ticketTypes: args.state.ticketTypes.filter((candidate) => candidate.eventId === event.id),
    lines: [{ ticketTypeId: type.id, phaseId: phase.id, unitPriceCents: 0, quantity }],
    buyer: { firstName, lastName, email: args.email },
    holders,
    createdAt: args.nowIso,
    channel: "gaesteliste",
    method: "kostenlos",
    ticketIdCreate: () => dashIdCreate("ticket"),
    ticketCodeCreate: () => ticketCodes[codeIndex++] ?? `T-${dashIdCreate("x").slice(2, 6).toUpperCase()}-0000`,
    invoiceNumber: "",
  })
  if (!built.success) return createResultError(op, built.errorMessage)
  return createResult(built.data)
}
