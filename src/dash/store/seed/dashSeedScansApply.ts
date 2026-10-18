import type { DashScan } from "../../model/dashScanSchema.ts"
import type { DashState } from "../../model/dashStateSchema.ts"
import { dashRandomCreate } from "../../model/dashRandomCreate.ts"

const seedConstant = 20261019

function timeBetween(random: () => number, startMs: number, endMs: number): string {
  if (endMs <= startMs) return new Date(startMs).toISOString()
  const at = startMs + Math.floor(random() * (endMs - startMs))
  return new Date(at).toISOString()
}

function shuffleInPlace<T>(items: T[], random: () => number): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    const left = items[index] as T
    items[index] = items[other] as T
    items[other] = left
  }
  return items
}

/**
 * Seedet Check-ins und Scans für vergangene Events und die live Indie Night.
 * Deterministisch über `dashRandomCreate` mit fester Konstante.
 */
export function dashSeedScansApply(state: DashState, now: Date): DashState {
  const random = dashRandomCreate(seedConstant)
  const nowMs = now.getTime()
  const tickets = state.tickets.map((ticket) => ({ ...ticket }))
  const ticketById = new Map(tickets.map((ticket) => [ticket.id, ticket]))
  void ticketById
  const scans: DashScan[] = [...state.scans]
  let scanCounter = scans.length
  const scanIdTake = () => {
    scanCounter += 1
    return `scan-seed-${String(scanCounter).padStart(5, "0")}`
  }

  const eventById = new Map(state.events.map((event) => [event.id, event]))

  const pastIds = ["ev-sommernacht", "ev-poetry-slam", "ev-abi-warmup"]
  for (const eventId of pastIds) {
    const event = eventById.get(eventId)
    if (!event) continue
    if (event.doorsAt === null) continue
    const doorsMs = Date.parse(event.doorsAt)
    const endMs = Date.parse(event.startsAt) + 90 * 60_000
    if (!(endMs > doorsMs)) continue
    const valid = tickets.filter((ticket) => ticket.eventId === eventId && ticket.status === "gueltig")
    if (valid.length === 0) continue
    const shuffled = shuffleInPlace([...valid], random)
    const checkCount = Math.round(valid.length * 0.93)
    const checked = shuffled.slice(0, Math.min(checkCount, shuffled.length))
    for (const ticket of checked) {
      const at = timeBetween(random, doorsMs, endMs)
      const entrance = random() < 0.75 ? ("Haupteingang" as const) : ("Seiteneingang" as const)
      ticket.checkedInAt = at
      ticket.entrance = entrance
      scans.push({
        id: scanIdTake(),
        eventId,
        at,
        entrance,
        device: random() < 0.5 ? "Einlass Nord" : "Einlass Hof",
        ticketId: ticket.id,
        code: ticket.code,
        result: "ok",
      })
    }
    const rejectedCount = Math.max(1, Math.round(valid.length * 0.01))
    const results = ["doppelt", "unbekannt", "storniert", "falsches-event"] as const
    const cancelled = tickets.filter((ticket) => ticket.eventId === eventId && ticket.status === "storniert")
    const jazzTickets = tickets.filter((ticket) => ticket.eventId === "ev-jazz-wein")
    for (let index = 0; index < rejectedCount; index += 1) {
      const result = results[index % results.length] as (typeof results)[number]
      if (result === undefined) continue
      const at = timeBetween(random, doorsMs, endMs)
      const entrance = random() < 0.75 ? ("Haupteingang" as const) : ("Seiteneingang" as const)
      if (result === "doppelt" && checked.length > 0) {
        const source = checked[Math.floor(random() * checked.length)]
        if (!source) continue
        scans.push({
          id: scanIdTake(),
          eventId,
          at,
          entrance,
          device: "Einlass Nord",
          ticketId: source.id,
          code: source.code,
          result: "doppelt",
        })
        continue
      }
      if (result === "storniert" && cancelled.length > 0) {
        const source = cancelled[Math.floor(random() * cancelled.length)]
        if (!source) continue
        scans.push({
          id: scanIdTake(),
          eventId,
          at,
          entrance,
          device: "Einlass Hof",
          ticketId: source.id,
          code: source.code,
          result: "storniert",
        })
        continue
      }
      if (result === "falsches-event" && jazzTickets.length > 0) {
        const source = jazzTickets[Math.floor(random() * jazzTickets.length)]
        if (!source) continue
        scans.push({
          id: scanIdTake(),
          eventId,
          at,
          entrance,
          device: "Einlass Nord",
          ticketId: source.id,
          code: source.code,
          result: "falsches-event",
        })
        continue
      }
      scans.push({
        id: scanIdTake(),
        eventId,
        at,
        entrance,
        device: "Einlass Hof",
        ticketId: null,
        code: `T-XXXX-${String(1000 + Math.floor(random() * 9000))}`,
        result: "unbekannt",
      })
    }
  }

  const indie = eventById.get("ev-indie-night")
  if (indie) {
    if (indie.doorsAt !== null) {
      const doorsMs = Date.parse(indie.doorsAt)
      const valid = tickets.filter(
        (ticket) => ticket.eventId === "ev-indie-night" && ticket.status === "gueltig" && ticket.checkedInAt === null,
      )
      const shuffled = shuffleInPlace([...valid], random)
      const target = Math.min(290, shuffled.length)
      const checked = shuffled.slice(0, target)
      const recentStart = nowMs - 45 * 60_000
      for (const ticket of checked) {
        const dense = random() < 0.7
        const startMs = dense ? Math.max(doorsMs, recentStart) : doorsMs
        const at = timeBetween(random, startMs, nowMs)
        const entrance = random() < 0.75 ? ("Haupteingang" as const) : ("Seiteneingang" as const)
        ticket.checkedInAt = at
        ticket.entrance = entrance
        scans.push({
          id: scanIdTake(),
          eventId: "ev-indie-night",
          at,
          entrance,
          device: random() < 0.5 ? "Einlass Nord" : "Einlass Hof",
          ticketId: ticket.id,
          code: ticket.code,
          result: "ok",
        })
      }
      const atReject = () => timeBetween(random, doorsMs, nowMs)
      for (let index = 0; index < 4; index += 1) {
        const source = checked[index % Math.max(1, checked.length)]
        if (!source) continue
        scans.push({
          id: scanIdTake(),
          eventId: "ev-indie-night",
          at: atReject(),
          entrance: "Haupteingang",
          device: "Einlass Nord",
          ticketId: source.id,
          code: source.code,
          result: "doppelt",
        })
      }
      for (let index = 0; index < 2; index += 1) {
        scans.push({
          id: scanIdTake(),
          eventId: "ev-indie-night",
          at: atReject(),
          entrance: "Seiteneingang",
          device: "Einlass Hof",
          ticketId: null,
          code: `T-XXXX-${String(1000 + Math.floor(random() * 9000))}`,
          result: "unbekannt",
        })
      }
      const cancelledIndie = tickets.filter(
        (ticket) => ticket.eventId === "ev-indie-night" && ticket.status === "storniert",
      )
      for (let index = 0; index < 2; index += 1) {
        const source = cancelledIndie[index % Math.max(1, cancelledIndie.length)]
        if (source) {
          scans.push({
            id: scanIdTake(),
            eventId: "ev-indie-night",
            at: atReject(),
            entrance: "Haupteingang",
            device: "Einlass Hof",
            ticketId: source.id,
            code: source.code,
            result: "storniert",
          })
        } else {
          scans.push({
            id: scanIdTake(),
            eventId: "ev-indie-night",
            at: atReject(),
            entrance: "Haupteingang",
            device: "Einlass Hof",
            ticketId: null,
            code: `T-YYYY-${String(1000 + Math.floor(random() * 9000))}`,
            result: "unbekannt",
          })
        }
      }
      const jazzOne = tickets.find((ticket) => ticket.eventId === "ev-jazz-wein")
      if (jazzOne) {
        scans.push({
          id: scanIdTake(),
          eventId: "ev-indie-night",
          at: atReject(),
          entrance: "Seiteneingang",
          device: "Einlass Nord",
          ticketId: jazzOne.id,
          code: jazzOne.code,
          result: "falsches-event",
        })
      } else {
        scans.push({
          id: scanIdTake(),
          eventId: "ev-indie-night",
          at: atReject(),
          entrance: "Seiteneingang",
          device: "Einlass Nord",
          ticketId: null,
          code: "T-JAZZ-0001",
          result: "falsches-event",
        })
      }
    }
  }

  return { ...state, tickets, scans }
}
