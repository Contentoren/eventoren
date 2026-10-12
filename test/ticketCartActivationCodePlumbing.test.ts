import { afterEach, beforeEach, expect, test } from "bun:test"
import { demoCatalogEvents } from "../src/demo/fixtures/demoCatalogEvents.ts"
import type { TicketCartDraft } from "../src/ticketing/TicketCartDraft.ts"
import { ticketCartActivationCodeMerge } from "../src/ticketing/ticketCartActivationCodeMerge.ts"
import { ticketCartDraftKey } from "../src/ticketing/ticketCartDraftKey.ts"
import { ticketCartDraftLoad } from "../src/ticketing/ticketCartDraftLoad.ts"
import { ticketCartDraftSave } from "../src/ticketing/ticketCartDraftSave.ts"
import { ticketCartForEventResolve } from "../src/ticketing/ticketCartForEventResolve.ts"
import { ticketCartQuantitySet } from "../src/ticketing/ticketCartQuantitySet.ts"
import { ticketCartSearchFormat } from "../src/ticketing/ticketCartSearchFormat.ts"
import { ticketCartSearchParse } from "../src/ticketing/ticketCartSearchParse.ts"
import { ticketCheckoutTicketsCreate } from "../src/ticketing/ticketCheckoutTicketsCreate.ts"

const event = demoCatalogEvents[0]
if (!event) throw new Error("expected a demo event fixture")

class MemoryStorage implements Storage {
  private map = new Map<string, string>()
  get length(): number {
    return this.map.size
  }
  clear(): void {
    this.map.clear()
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
}

const previousLocalStorage = globalThis.localStorage
let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage })
})

afterEach(() => {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previousLocalStorage })
})

test("quantity changes preserve the normalized code and quantity zero drops the line", () => {
  const cart = { eventId: event.id, lines: [{ tierId: "innenraum", quantity: 1, activationCode: " ab12cd34 " }] }
  const grown = ticketCartQuantitySet(cart, "innenraum", 3)
  expect(grown.lines).toEqual([{ tierId: "innenraum", quantity: 3, activationCode: "AB12CD34" }])
  expect(ticketCartQuantitySet(grown, "innenraum", 0).lines).toEqual([])
})

test("event resolve preserves the code within existing maxPerOrder clamping", () => {
  const resolved = ticketCartForEventResolve(event, {
    eventId: event.id,
    lines: [{ tierId: "innenraum", quantity: 99, activationCode: "ab12cd34" }],
  })
  expect(resolved?.lines).toEqual([{ tierId: "innenraum", quantity: 10, activationCode: "AB12CD34" }])
})

test("draft save and load roundtrip keeps normalized codes and stays backward compatible", () => {
  const draft: TicketCartDraft = [
    { eventId: event.id, lines: [{ tierId: "innenraum", quantity: 2, activationCode: " ab12cd34 " }] },
  ]
  ticketCartDraftSave(draft, 1_000_000_000)
  expect(ticketCartDraftLoad(1_000_000_000 + 10_000)).toEqual([
    { eventId: event.id, lines: [{ tierId: "innenraum", quantity: 2, activationCode: "AB12CD34" }] },
  ])

  storage.setItem(
    ticketCartDraftKey,
    JSON.stringify({ version: 2, carts: [{ eventId: event.id, lines: [{ tierId: "innenraum", quantity: 1 }] }] }),
  )
  expect(ticketCartDraftLoad()).toEqual([{ eventId: event.id, lines: [{ tierId: "innenraum", quantity: 1 }] }])
})

test("cart URLs stay quantity-only while draft codes merge onto matching URL lines", () => {
  const cart = { eventId: event.id, lines: [{ tierId: "innenraum", quantity: 2, activationCode: "AB12CD34" }] }
  const url = ticketCartSearchFormat(cart)
  expect(url).toBe("innenraum:2")
  expect(url).not.toContain("AB12CD34")

  const urlCart = ticketCartSearchParse(event.id, url)
  const resolved = ticketCartForEventResolve(event, urlCart)
  if (!resolved) throw new Error("expected resolved cart")
  expect(resolved.lines.every((line) => line.activationCode === undefined)).toBe(true)

  const merged = ticketCartActivationCodeMerge(resolved, [
    { eventId: event.id, lines: [{ tierId: "innenraum", quantity: 2, activationCode: "ab12cd34" }] },
  ])
  expect(merged.lines).toEqual([{ tierId: "innenraum", quantity: 2, activationCode: "AB12CD34" }])
})

test("checkout request mapping carries normalized codes for authenticated and guest requests", () => {
  const cart = { eventId: event.id, lines: [{ tierId: "innenraum", quantity: 2, activationCode: " ab12cd34 " }] }
  const tickets = ticketCheckoutTicketsCreate(cart, { [event.id]: { innenraum: ["Ada", "Bo"] } })
  expect(tickets).toEqual([
    { tierKey: "innenraum", quantity: 2, activationCode: "AB12CD34", participantNames: ["Ada", "Bo"] },
  ])

  const withoutCode = ticketCheckoutTicketsCreate(
    { eventId: event.id, lines: [{ tierId: "innenraum", quantity: 1 }] },
    { [event.id]: { innenraum: ["Ada"] } },
  )
  expect(withoutCode).toEqual([{ tierKey: "innenraum", quantity: 1, participantNames: ["Ada"] }])
})
