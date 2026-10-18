import { dashOrderBuild } from "../../model/dashOrderBuild.ts"
import { dashPaymentCostCompute } from "../../model/dashPaymentCostCompute.ts"
import type { DashCode } from "../../model/dashCodeSchema.ts"
import type { DashEvent } from "../../model/dashEventSchema.ts"
import type { DashOrder } from "../../model/dashOrderSchema.ts"
import type { DashOrg } from "../../model/dashOrgSchema.ts"
import type { DashState } from "../../model/dashStateSchema.ts"
import type { DashTicket } from "../../model/dashTicketSchema.ts"
import type { DashTicketType } from "../../model/dashTicketTypeSchema.ts"
import type { DashVoucher } from "../../model/dashVoucherSchema.ts"
import { dashPhaseResolve } from "../../model/dashPhaseResolve.ts"
import { dashRandomCreate } from "../../model/dashRandomCreate.ts"

import { dashSeedLastNames, dashSeedFirstNames } from "./dashSeedNames.ts"
import { dashSeedLeaOrders } from "./dashSeedLeaOrders.ts"
import { dashSeedOrderTimes } from "./dashSeedOrderTimes.ts"
import { dashSeedTicketCodeCreate } from "./dashSeedTicketCodeCreate.ts"

const seedConstant = 20261018

type PlanTarget = {
  eventId: string
  tickets: number
}

const planTargets: PlanTarget[] = [
  { eventId: "ev-sommernacht", tickets: 400 },
  { eventId: "ev-indie-night", tickets: 400 },
  { eventId: "ev-jazz-wein", tickets: 82 },
  { eventId: "ev-winterball", tickets: 88 },
  { eventId: "ev-poetry-slam", tickets: 138 },
  { eventId: "ev-abi-warmup", tickets: 465 },
  { eventId: "ev-abiball-2027", tickets: 0 },
]

function nameEmailCreate(firstName: string, lastName: string, random: () => number): string {
  const normalized = `${firstName}.${lastName}`
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .replaceAll(/[^a-z.]/gu, "")
  const domains = ["example.de", "example.de", "example.de", "example.org", "example.net"]
  const domain = domains[Math.floor(random() * domains.length)]
  return `${normalized}@${domain}`
}

function methodPick(random: () => number): DashOrder["payment"]["method"] {
  const roll = random()
  if (roll < 0.4) return "karte"
  if (roll < 0.65) return "paypal"
  if (roll < 0.8) return "applepay"
  if (roll < 0.9) return "googlepay"
  return "sepa"
}

function quantityPick(random: () => number): number {
  const roll = random()
  if (roll < 0.55) return 1
  if (roll < 0.85) return 2
  if (roll < 0.95) return 3
  return 4
}

function daysAgoToIso(now: Date, daysAgo: number, random: () => number): string {
  const ms = now.getTime() - daysAgo * 86_400_000 - Math.floor(random() * 3_600_000)
  return new Date(ms).toISOString()
}

function beratungNotePick(random: () => number): string {
  const notes = [
    "Kundin wünscht Sitzplätze nebeneinander.",
    "Rechnung wurde erneut gesendet.",
    "Gast kommt mit Rollstuhl, Platz reserviert.",
    "Anruf: Einlasszeit bestätigt.",
    "Ermäßigung an der Abendkasse geprüft.",
    "Doppelte Buchung zusammengeführt.",
    "Wünscht vegetarisches Menü am Ball.",
    "E-Mail-Adresse korrigiert.",
    "Code nachträglich gutgeschrieben.",
    "Gruppe mit 8 Personen, gemeinsam platziert.",
    "Rückfrage zur Abendkasse beantwortet.",
    "Behindertenbegleitung kostenfrei ergänzt.",
  ]
  return notes[Math.floor(random() * notes.length)] ?? notes[0] ?? ""
}

/**
 * Seedet alle Online-Bestellungen mit Tickets, Codes, Gutscheinen und Lea.
 * Deterministisch über `dashRandomCreate` mit fester Konstante.
 */
export function dashSeedOrdersApply(state: DashState, now: Date): DashState {
  const random = dashRandomCreate(seedConstant)
  const firstNames = dashSeedFirstNames()
  const lastNames = dashSeedLastNames()
  const { timesCreate } = dashSeedOrderTimes(random)

  const typeById = new Map(state.ticketTypes.map((type) => [type.id, type]))
  void typeById
  const orgById = new Map(state.orgs.map((org) => [org.id, org]))
  const eventById = new Map(state.events.map((event) => [event.id, event]))
  const codes = state.codes.map((code) => ({ ...code, usedTickets: 0 }))
  const codeByCode = new Map(codes.map((code) => [code.code, code]))
  const vouchers: DashVoucher[] = state.vouchers.map((voucher) => ({
    ...voucher,
    balanceCents: voucher.initialCents,
    status: voucher.status === "deaktiviert" ? ("deaktiviert" as const) : ("aktiv" as const),
    redemptions: [],
  }))

  const orders: DashOrder[] = []
  const tickets: DashTicket[] = []
  const soldByType = new Map<string, { sold: number; soldByPhase: Record<string, number> }>()
  const ticketCodesTaken = new Set<string>()
  let orderCounter = 0
  let ticketCounter = 0
  let refundCounter = 0
  let noteCounter = 0
  let invoiceCounter = 0

  const orderNumberTake = () => {
    orderCounter += 1
    return `EV-${260000 + orderCounter}`
  }
  const invoiceNumberTake = (paidByMethodCents: number): string => {
    if (paidByMethodCents === 0) return ""
    invoiceCounter += 1
    return `RE-2026-${String(invoiceCounter).padStart(5, "0")}`
  }
  const orderIdTake = () => {
    orderCounter += 1
    return `order-seed-${String(orderCounter).padStart(4, "0")}`
  }
  const ticketIdTake = () => {
    ticketCounter += 1
    return `ticket-seed-${String(ticketCounter).padStart(5, "0")}`
  }
  const ticketCodeTake = () => dashSeedTicketCodeCreate(random, ticketCodesTaken)

  const trackSale = (order: DashOrder) => {
    for (const line of order.lines) {
      const entry = soldByType.get(line.ticketTypeId) ?? { sold: 0, soldByPhase: {} }
      entry.sold += line.quantity
      entry.soldByPhase[line.phaseId] = (entry.soldByPhase[line.phaseId] ?? 0) + line.quantity
      soldByType.set(line.ticketTypeId, entry)
    }
    if (order.discount) {
      const code = codeByCode.get(order.discount.code)
      if (code) code.usedTickets += order.lines.reduce((sum, line) => sum + line.quantity, 0)
    }
  }

  const personCreate = () => {
    const firstName = firstNames[Math.floor(random() * firstNames.length)] ?? "Alex"
    const lastName = lastNames[Math.floor(random() * lastNames.length)] ?? "Mustermann"
    return { firstName, lastName, email: nameEmailCreate(firstName, lastName, random) }
  }

  const linePick = (args: {
    types: DashTicketType[]
    at: Date
    code: DashCode | null
    maxQty: number
  }): { ticketType: DashTicketType; phase: DashTicketType["phases"][number]; quantity: number } | null => {
    const eligible = args.types.filter((type) => {
      if (type.channel !== "online") return false
      if (args.code !== null && args.code.ticketTypeIds.length > 0 && !args.code.ticketTypeIds.includes(type.id))
        return false
      if (args.code === null && type.hidden) return false
      return true
    })
    if (eligible.length === 0) return null
    const shuffled = [...eligible].sort(() => random() - 0.5)
    for (const type of shuffled) {
      const sold = soldByType.get(type.id)
      if (sold && sold.sold >= type.capacity) continue
      const at = args.at
      const resolved = dashPhaseResolve(type, sold?.soldByPhase ?? {}, at)
      const phase = resolved.phase
      if (phase === null || resolved.state !== "aktiv") continue
      const remainingType = type.capacity - (sold?.sold ?? 0)
      const remainingPhase =
        phase.quota === null ? remainingType : Math.max(0, phase.quota - (sold?.soldByPhase[phase.id] ?? 0))
      if (remainingPhase < 1 || remainingType < 1) continue
      const cap = Math.min(type.maxPerOrder, args.maxQty, remainingType, remainingPhase)
      if (cap < 1) continue
      const wantCapped =
        args.code !== null && args.code.maxTickets !== null
          ? Math.min(args.maxQty, args.code.maxTickets - args.code.usedTickets)
          : args.maxQty
      const qty = Math.min(wantCapped, cap)
      if (qty < 1) continue
      return { ticketType: type, phase, quantity: qty }
    }
    return null
  }

  const orgFeeFor = (event: DashEvent): DashOrg["fee"] =>
    orgById.get(event.orgId)?.fee ?? { percentBps: 500, fixedCents: 49, payer: "kaeufer" }

  // Mengen je Event aus der Zeitkurve verteilen
  for (const target of planTargets) {
    const event = eventById.get(target.eventId)
    if (!event) continue
    const types = state.ticketTypes.filter((type) => type.eventId === event.id && type.channel === "online")
    if (types.length === 0) continue
    const salesStarts = types
      .map((type) => (type.salesStartAt ? Date.parse(type.salesStartAt) : Number.NaN))
      .filter((value) => !Number.isNaN(value))
    const salesStartMs =
      salesStarts.length > 0 ? Math.min(...salesStarts) : Date.parse(event.publishedAt ?? event.startsAt)
    const salesStartAgo = Math.max(1, (now.getTime() - salesStartMs) / 86_400_000)
    const endAgo = Math.max(0, (now.getTime() - Math.min(now.getTime(), Date.parse(event.startsAt))) / 86_400_000)
    const phaseEndAgos = types.flatMap((type) =>
      type.phases
        .filter((phase) => phase.endsAt !== null)
        .map((phase) => (now.getTime() - Date.parse(phase.endsAt ?? "")) / 86_400_000)
        .filter((value) => value >= endAgo - 1 && value <= salesStartAgo + 1),
    )
    const lastWeekBoost = target.eventId === "ev-indie-night" ? 2.5 : 1.2
    const times = timesCreate({ count: target.tickets, salesStartAgo, endAgo, phaseEndAgos, lastWeekBoost })

    // Indie Night: Bestellungen in den letzten Stunden und Tagen erzwingen
    const recentDaysAgos: number[] = []
    if (target.eventId === "ev-indie-night") {
      for (let index = 0; index < 5; index += 1) recentDaysAgos.push(random() * 0.25)
      for (let index = 0; index < 16; index += 1) recentDaysAgos.push(0.25 + random() * 6.75)
      for (let index = 0; index < 14; index += 1) recentDaysAgos.push(7 + random() * 7)
      recentDaysAgos.sort((a, b) => a - b)
    }

    let ticketsPlanted = 0
    let guard = 0
    let timeIndex = 0
    let recentIndex = 0
    while (ticketsPlanted < target.tickets && guard < target.tickets * 30 + 500) {
      guard += 1
      let daysAgo = times[timeIndex % times.length] ?? salesStartAgo * random()
      timeIndex += 1
      // Indie Night: Bestellungen in den letzten Stunden und Tagen erzwingen
      if (recentIndex < recentDaysAgos.length && guard % 7 === 0) {
        daysAgo = recentDaysAgos[recentIndex] ?? daysAgo
        recentIndex += 1
      }
      const createdAt = daysAgoToIso(now, daysAgo, random)
      const at = new Date(createdAt)

      // Codes: Jazz ~8 % JAZZ10, ~5 % FREUNDE5; Winterball ~10 % WINTER15 (innerhalb Gültigkeit)
      let code: DashCode | null = null
      const roll = random()
      if (target.eventId === "ev-jazz-wein") {
        if (roll < 0.08) code = codeByCode.get("JAZZ10") ?? null
        else if (roll < 0.13) code = codeByCode.get("FREUNDE5") ?? null
      } else if (target.eventId === "ev-winterball") {
        const winter = codeByCode.get("WINTER15")
        if (roll < 0.1 && winter && (winter.validUntil === null || at <= new Date(winter.validUntil))) code = winter
      }
      if (code?.maxTickets !== null && code && code.usedTickets >= (code.maxTickets ?? 0)) code = null

      const wantQty = quantityPick(random)
      const picked = linePick({ types, at, code, maxQty: wantQty })
      if (!picked) continue
      // JAZZ10-Kontingent (maxTickets 50) respektieren
      if (code && code.maxTickets !== null && code.usedTickets + picked.quantity > code.maxTickets) continue
      const buyer = personCreate()
      const holderCount = picked.quantity > 1 && random() < 0.7 ? picked.quantity : 0
      const holders =
        holderCount > 0
          ? Array.from({ length: holderCount }, () => {
              const person = personCreate()
              return { name: `${person.firstName} ${person.lastName}`, email: person.email }
            })
          : undefined
      const built = dashOrderBuild({
        id: orderIdTake(),
        number: orderNumberTake(),
        org: { id: event.orgId, fee: orgFeeFor(event) },
        event: { id: event.id },
        ticketTypes: types,
        lines: [
          {
            ticketTypeId: picked.ticketType.id,
            phaseId: picked.phase.id,
            unitPriceCents: picked.phase.priceCents,
            quantity: picked.quantity,
          },
        ],
        buyer,
        holders,
        createdAt,
        channel: "online",
        method: methodPick(random),
        code,
        ticketIdCreate: ticketIdTake,
        ticketCodeCreate: ticketCodeTake,
        invoiceNumber: "TEMP",
      })
      if (!built.success) continue
      const paidByMethod = built.data.order.totalCents - (built.data.order.voucher?.amountCents ?? 0)
      const order: DashOrder = { ...built.data.order, invoiceNumber: invoiceNumberTake(paidByMethod) }
      orders.push(order)
      tickets.push(...built.data.tickets)
      trackSale(order)
      ticketsPlanted += picked.quantity
    }
  }

  // Abiball Zugangscodes: Schüler:innen je Klasse 15–45 Tickets, Gäste ~20 %, Lehrkräfte 12
  const abiEvent = eventById.get("ev-abiball-2027")
  if (abiEvent) {
    const abiTypes = state.ticketTypes.filter((type) => type.eventId === abiEvent.id)
    const abiFee = orgFeeFor(abiEvent)
    const abiSalesStartAgo = Math.max(1, (now.getTime() - Date.parse("2026-07-20T10:00:00.000Z")) / 86_400_000)
    // Schüler:innen je Klasse 15–45 Tickets (nie über maxTickets)
    const abiCodes = ["ABI-12A", "ABI-12B", "ABI-12C", "ABI-12D", "ABI-12E", "ABI-12F"]
      .map((code) => codeByCode.get(code))
      .filter((code): code is DashCode => code !== undefined)
    const abiWants = [42, 28, 35, 24, 33, 39]
    abiCodes.forEach((code, codeIndex) => {
      const schueler = abiTypes.find((type) => type.id === "tt-abi-schueler")
      if (!schueler) return
      const want = abiWants[codeIndex % abiWants.length] ?? 30
      let planted = 0
      let guard = 0
      while (planted < want && guard < 300) {
        guard += 1
        const sold = soldByType.get(schueler.id)
        if (sold && sold.sold >= schueler.capacity) break
        if (code.maxTickets !== null && code.usedTickets >= code.maxTickets) break
        const daysAgo = random() * abiSalesStartAgo
        const createdAt = daysAgoToIso(now, daysAgo, random)
        const picked = linePick({
          types: [schueler],
          at: new Date(createdAt),
          code,
          maxQty: Math.min(4, Math.min(want - planted, (code.maxTickets ?? 99) - code.usedTickets)),
        })
        if (!picked) continue
        if (code.maxTickets !== null && code.usedTickets + picked.quantity > code.maxTickets) continue
        const buyer = personCreate()
        const built = dashOrderBuild({
          id: orderIdTake(),
          number: orderNumberTake(),
          org: { id: abiEvent.orgId, fee: abiFee },
          event: { id: abiEvent.id },
          ticketTypes: abiTypes,
          lines: [
            {
              ticketTypeId: schueler.id,
              phaseId: picked.phase.id,
              unitPriceCents: picked.phase.priceCents,
              quantity: picked.quantity,
            },
          ],
          buyer,
          createdAt,
          channel: "online",
          method: methodPick(random),
          code,
          ticketIdCreate: ticketIdTake,
          ticketCodeCreate: ticketCodeTake,
          invoiceNumber: "TEMP",
        })
        if (!built.success) continue
        const paidByMethod = built.data.order.totalCents - (built.data.order.voucher?.amountCents ?? 0)
        const order: DashOrder = { ...built.data.order, invoiceNumber: invoiceNumberTake(paidByMethod) }
        orders.push(order)
        tickets.push(...built.data.tickets)
        trackSale(order)
        planted += picked.quantity
      }
    })
    // Gäste ~20 % von 500
    const gaeste = abiTypes.find((type) => type.id === "tt-abi-gaeste")
    if (gaeste) {
      let planted = 0
      let guard = 0
      while (planted < 100 && guard < 600) {
        guard += 1
        const daysAgo = random() * abiSalesStartAgo
        const createdAt = daysAgoToIso(now, daysAgo, random)
        const picked = linePick({ types: [gaeste], at: new Date(createdAt), code: null, maxQty: quantityPick(random) })
        if (!picked) continue
        const buyer = personCreate()
        const built = dashOrderBuild({
          id: orderIdTake(),
          number: orderNumberTake(),
          org: { id: abiEvent.orgId, fee: abiFee },
          event: { id: abiEvent.id },
          ticketTypes: abiTypes,
          lines: [
            {
              ticketTypeId: gaeste.id,
              phaseId: picked.phase.id,
              unitPriceCents: picked.phase.priceCents,
              quantity: picked.quantity,
            },
          ],
          buyer,
          createdAt,
          channel: "online",
          method: methodPick(random),
          ticketIdCreate: ticketIdTake,
          ticketCodeCreate: ticketCodeTake,
          invoiceNumber: "TEMP",
        })
        if (!built.success) continue
        const paidByMethod = built.data.order.totalCents - (built.data.order.voucher?.amountCents ?? 0)
        const order: DashOrder = { ...built.data.order, invoiceNumber: invoiceNumberTake(paidByMethod) }
        orders.push(order)
        tickets.push(...built.data.tickets)
        trackSale(order)
        planted += picked.quantity
      }
    }
    // Lehrkräfte 12 über LEHRER-IKG
    const lehrerCode = codeByCode.get("LEHRER-IKG")
    const lehrer = abiTypes.find((type) => type.id === "tt-abi-lehrer")
    if (lehrer && lehrerCode) {
      let planted = 0
      let guard = 0
      while (planted < 12 && guard < 200) {
        guard += 1
        const daysAgo = random() * abiSalesStartAgo
        const createdAt = daysAgoToIso(now, daysAgo, random)
        const picked = linePick({ types: [lehrer], at: new Date(createdAt), code: lehrerCode, maxQty: 2 })
        if (!picked) continue
        const buyer = personCreate()
        const built = dashOrderBuild({
          id: orderIdTake(),
          number: orderNumberTake(),
          org: { id: abiEvent.orgId, fee: abiFee },
          event: { id: abiEvent.id },
          ticketTypes: abiTypes,
          lines: [
            {
              ticketTypeId: lehrer.id,
              phaseId: picked.phase.id,
              unitPriceCents: picked.phase.priceCents,
              quantity: picked.quantity,
            },
          ],
          buyer,
          createdAt,
          channel: "online",
          method: "karte",
          code: lehrerCode,
          ticketIdCreate: ticketIdTake,
          ticketCodeCreate: ticketCodeTake,
          invoiceNumber: "TEMP",
        })
        if (!built.success) continue
        const order: DashOrder = { ...built.data.order, invoiceNumber: "" }
        orders.push(order)
        tickets.push(...built.data.tickets)
        trackSale(order)
        planted += picked.quantity
      }
    }
    // Presse 6 über PRESSE-JAZZ
    const presseCode = codeByCode.get("PRESSE-JAZZ")
    const jazzEvent = eventById.get("ev-jazz-wein")
    const presse = state.ticketTypes.find((type) => type.id === "tt-jazz-presse")
    if (presseCode && jazzEvent && presse) {
      const jazzTypes = state.ticketTypes.filter((type) => type.eventId === jazzEvent.id)
      let planted = 0
      let guard = 0
      while (planted < 6 && guard < 100) {
        guard += 1
        const daysAgo = 2 + random() * 40
        const createdAt = daysAgoToIso(now, daysAgo, random)
        const picked = linePick({ types: [presse], at: new Date(createdAt), code: presseCode, maxQty: 1 })
        if (!picked) continue
        const buyer = personCreate()
        const built = dashOrderBuild({
          id: orderIdTake(),
          number: orderNumberTake(),
          org: { id: jazzEvent.orgId, fee: orgFeeFor(jazzEvent) },
          event: { id: jazzEvent.id },
          ticketTypes: jazzTypes,
          lines: [
            {
              ticketTypeId: presse.id,
              phaseId: picked.phase.id,
              unitPriceCents: picked.phase.priceCents,
              quantity: 1,
            },
          ],
          buyer,
          createdAt,
          channel: "online",
          method: "karte",
          code: presseCode,
          ticketIdCreate: ticketIdTake,
          ticketCodeCreate: ticketCodeTake,
          invoiceNumber: "TEMP",
        })
        if (!built.success) continue
        const order: DashOrder = { ...built.data.order, invoiceNumber: "" }
        orders.push(order)
        tickets.push(...built.data.tickets)
        trackSale(order)
        planted += 1
      }
    }
  }

  // 4 Lindenhof-Bestellungen teilweise/voll mit Gutscheinen zahlen
  const lindenhofVouchers = vouchers.filter(
    (voucher) => voucher.orgId === "org-lindenhof" && voucher.status === "aktiv",
  )
  const voucherTargets = orders.filter(
    (order) => order.eventId === "ev-sommernacht" || order.eventId === "ev-poetry-slam",
  )
  for (let index = 0; index < 4; index += 1) {
    const target = voucherTargets[Math.floor(random() * voucherTargets.length)]
    const voucher = lindenhofVouchers[index % lindenhofVouchers.length]
    if (!target || !voucher) continue
    if (target.voucher) continue
    const full = index >= 2
    const amount = full ? target.totalCents : Math.min(voucher.balanceCents, Math.floor(target.totalCents / 2))
    if (amount <= 0 || amount > voucher.balanceCents) continue
    target.voucher = { voucherId: voucher.id, code: voucher.code, amountCents: amount }
    const paidByMethod = target.totalCents - amount
    if (paidByMethod === 0) target.payment = { method: "gutschein", costCents: 0 }
    else
      target.payment = {
        method: target.payment.method,
        costCents: dashPaymentCostCompute(target.payment.method, paidByMethod),
      }
    voucher.balanceCents -= amount
    voucher.redemptions.push({ orderId: target.id, amountCents: amount, at: target.createdAt })
    if (voucher.balanceCents === 0) voucher.status = "eingeloest"
  }

  // Status-Mix: ~2 % storniert, ~1 % erstattet, ~1 % teilerstattet (Erstattung ≥ 1 Tag später)
  const refundable = orders.filter((order) => order.status === "bezahlt" && (order.voucher?.amountCents ?? 0) === 0)
  const shuffledRefundable = [...refundable].sort(() => random() - 0.5)
  const stornoCount = Math.max(1, Math.round(orders.length * 0.02))
  const erstattetCount = Math.max(1, Math.round(orders.length * 0.01))
  const teilCount = Math.max(1, Math.round(orders.length * 0.01))
  const ticketByOrder = new Map<string, DashTicket[]>()
  for (const ticket of tickets) {
    const list = ticketByOrder.get(ticket.orderId)
    if (list) list.push(ticket)
    else ticketByOrder.set(ticket.orderId, [ticket])
  }
  let cursor = 0
  const takeNext = () => {
    const order = shuffledRefundable[cursor]
    cursor += 1
    return order
  }
  for (let index = 0; index < stornoCount; index += 1) {
    const order = takeNext()
    if (!order) break
    refundCounter += 1
    const at = new Date(Date.parse(order.createdAt) + 86_400_000 + Math.floor(random() * 5 * 86_400_000)).toISOString()
    order.status = "storniert"
    order.refunds = [
      {
        id: `${order.id}-refund-${refundCounter}`,
        amountCents: order.totalCents,
        feeCents: order.serviceFeeCents,
        reason: "Stornierung auf Wunsch",
        at,
        ticketIds: (ticketByOrder.get(order.id) ?? []).map((ticket) => ticket.id),
      },
    ]
    for (const ticket of ticketByOrder.get(order.id) ?? []) ticket.status = "storniert"
  }
  for (let index = 0; index < erstattetCount; index += 1) {
    const order = takeNext()
    if (!order) break
    refundCounter += 1
    const at = new Date(Date.parse(order.createdAt) + 86_400_000 + Math.floor(random() * 5 * 86_400_000)).toISOString()
    order.status = "erstattet"
    order.refunds = [
      {
        id: `${order.id}-refund-${refundCounter}`,
        amountCents: order.totalCents,
        feeCents: order.serviceFeeCents,
        reason: "Erstattung nach Absage",
        at,
        ticketIds: (ticketByOrder.get(order.id) ?? []).map((ticket) => ticket.id),
      },
    ]
    for (const ticket of ticketByOrder.get(order.id) ?? []) ticket.status = "storniert"
  }
  for (let index = 0; index < teilCount; index += 1) {
    const order = takeNext()
    if (!order) break
    const orderTickets = ticketByOrder.get(order.id) ?? []
    if (orderTickets.length < 2) continue
    refundCounter += 1
    const one = orderTickets[orderTickets.length - 1]
    if (!one) continue
    one.status = "storniert"
    const line = order.lines[order.lines.length - 1]
    const amount = line ? line.unitPriceCents : 0
    const at = new Date(Date.parse(order.createdAt) + 86_400_000 + Math.floor(random() * 5 * 86_400_000)).toISOString()
    order.status = "teilerstattet"
    order.refunds = [
      {
        id: `${order.id}-refund-${refundCounter}`,
        amountCents: amount,
        feeCents: 0,
        reason: "Teilerstattung",
        at,
        ticketIds: [one.id],
      },
    ]
  }

  // Genau 1 Chargeback auf ev-sommernacht (bezahlt, fee 1500)
  const chargebackCandidate = orders.find((order) => order.eventId === "ev-sommernacht" && order.status === "bezahlt")
  if (chargebackCandidate) {
    chargebackCandidate.chargeback = {
      amountCents: chargebackCandidate.totalCents,
      feeCents: 1500,
      at: new Date(Date.parse(chargebackCandidate.createdAt) + 3 * 86_400_000).toISOString(),
    }
  }

  // Genau 2 offene SEPA-Bestellungen für Jazz, 1–3 Tage alt
  const jazzEvent2 = eventById.get("ev-jazz-wein")
  if (jazzEvent2) {
    const jazzTypes = state.ticketTypes.filter((type) => type.eventId === jazzEvent2.id)
    for (let index = 0; index < 2; index += 1) {
      const daysAgo = 1 + random() * 2
      const createdAt = daysAgoToIso(now, daysAgo, random)
      const picked = linePick({ types: jazzTypes, at: new Date(createdAt), code: null, maxQty: 2 })
      if (!picked) continue
      const buyer = personCreate()
      const built = dashOrderBuild({
        id: orderIdTake(),
        number: orderNumberTake(),
        org: { id: jazzEvent2.orgId, fee: orgFeeFor(jazzEvent2) },
        event: { id: jazzEvent2.id },
        ticketTypes: jazzTypes,
        lines: [
          {
            ticketTypeId: picked.ticketType.id,
            phaseId: picked.phase.id,
            unitPriceCents: picked.phase.priceCents,
            quantity: picked.quantity,
          },
        ],
        buyer,
        createdAt,
        channel: "online",
        method: "sepa",
        status: "offen",
        ticketIdCreate: ticketIdTake,
        ticketCodeCreate: ticketCodeTake,
        invoiceNumber: "TEMP",
      })
      if (!built.success) continue
      const order: DashOrder = {
        ...built.data.order,
        status: "offen",
        invoiceNumber: invoiceNumberTake(built.data.order.totalCents),
      }
      orders.push(order)
      tickets.push(...built.data.tickets)
      trackSale(order)
    }
  }

  // ~12 interne Notizen
  const noteAuthors = ["Mara Lindner", "Jonas Weber"]
  const notedOrders = [...orders].sort(() => random() - 0.5).slice(0, 12)
  for (const order of notedOrders) {
    noteCounter += 1
    order.notes.push({
      id: `${order.id}-note-${noteCounter}`,
      text: beratungNotePick(random),
      author: noteAuthors[Math.floor(random() * noteAuthors.length)] ?? "Mara Lindner",
      at: new Date(Date.parse(order.createdAt) + 3_600_000).toISOString(),
    })
  }

  // Sortieren nach createdAt, Nummern neu vergeben (EV-260001 aufsteigend)
  const sorted = [...orders].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  const numberById = new Map<string, string>()
  sorted.forEach((order, index) => numberById.set(order.id, `EV-${260001 + index}`))
  for (const order of orders) order.number = numberById.get(order.id) ?? order.number

  // Lea Schneider: 2× Indie, 1× Jazz, 1× erstattet Sommer
  const indieEvent = eventById.get("ev-indie-night")
  const jazzEvent = eventById.get("ev-jazz-wein")
  const sommerEvent = eventById.get("ev-sommernacht")
  const lea = dashSeedLeaOrders({
    indie: {
      eventId: "ev-indie-night",
      orgId: indieEvent?.orgId ?? "org-lindenhof",
      fee: indieEvent ? orgFeeFor(indieEvent) : { percentBps: 500, fixedCents: 49, payer: "kaeufer" },
      types: state.ticketTypes.filter((type) => type.eventId === "ev-indie-night"),
    },
    jazz: {
      eventId: "ev-jazz-wein",
      orgId: jazzEvent?.orgId ?? "org-lindenhof",
      fee: jazzEvent ? orgFeeFor(jazzEvent) : { percentBps: 500, fixedCents: 49, payer: "kaeufer" },
      types: state.ticketTypes.filter((type) => type.eventId === "ev-jazz-wein"),
    },
    sommer: {
      eventId: "ev-sommernacht",
      orgId: sommerEvent?.orgId ?? "org-lindenhof",
      fee: sommerEvent ? orgFeeFor(sommerEvent) : { percentBps: 500, fixedCents: 49, payer: "kaeufer" },
      types: state.ticketTypes.filter((type) => type.eventId === "ev-sommernacht"),
    },
    codes,
    vouchers,
    orderNumberTake: () => "EV-TEMP",
    invoiceNumberTake: (free: boolean) => (free ? null : "TEMP"),
    orderIdTake,
    ticketIdTake,
    ticketCodeTake,
  })
  const leaBase = 260001 + sorted.length
  lea.orders.forEach((order, index) => {
    order.number = `EV-${leaBase + index}`
    if (order.invoiceNumber === "TEMP") {
      invoiceCounter += 1
      order.invoiceNumber = `RE-2026-${String(invoiceCounter).padStart(5, "0")}`
    }
    orders.push(order)
    tickets.push(...lea.tickets.filter((ticket) => ticket.orderId === order.id))
  })

  return { ...state, codes, vouchers, orders, tickets }
}
