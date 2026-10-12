import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import type { EventItem } from "../src/events/EventItem.ts"
import { ticketCartForEventResolve } from "../src/ticketing/ticketCartForEventResolve.ts"
import { ticketCartSearchParse } from "../src/ticketing/ticketCartSearchParse.ts"
import { ticketTierSelectorStateCreate } from "../src/ticketing/ticketTierSelectorStateCreate.ts"

function limitEvent(): EventItem {
  return {
    id: "limit-event",
    catalogVersion: 1,
    title: "Limit event",
    subtitle: "",
    description: "",
    category: "konzerte",
    startsAt: "",
    endsAt: "",
    doorsAt: "",
    venue: "",
    city: "",
    address: "",
    organizer: "",
    imageUrl: "",
    imageAlt: "",
    tags: [],
    soldOut: false,
    tiers: [
      {
        id: "limited",
        name: "Limited",
        description: "",
        priceCents: 1000,
        feeCents: 0,
        capacity: 100,
        available: 100,
        maxPerOrder: 2,
      },
      {
        id: "legacy",
        name: "Legacy",
        description: "",
        priceCents: 1000,
        feeCents: 0,
        capacity: 100,
        available: 100,
      },
      {
        id: "large",
        name: "Large",
        description: "",
        priceCents: 1000,
        feeCents: 0,
        capacity: 100,
        available: 100,
        maxPerOrder: 25,
      },
    ],
  }
}

test("the checkout URL parser accepts positive safe integers without a global cap of ten", () => {
  expect(ticketCartSearchParse("limit-event", "large:25").lines).toEqual([{ tierId: "large", quantity: 25 }])
  expect(ticketCartSearchParse("limit-event", "large:0,large:-3,large:abc").lines).toEqual([])
  expect(
    ticketCartSearchParse("limit-event", "large:2.5,large:2x,large:1e2,large:2:extra,large:9007199254740992").lines,
  ).toEqual([])
  expect(ticketCartSearchParse("limit-event", "").lines).toEqual([])
})

test("product quantity selectors bind against the configured per-product limit and availability", () => {
  createRoot((dispose) => {
    try {
      const event = limitEvent()
      const state = ticketTierSelectorStateCreate({
        event: () => event,
        cart: () => ({ eventId: event.id, lines: [] }),
        onCartChange: () => {},
      })
      const rows = state.rows()
      expect(rows.find((row) => row.id === "limited")?.maxQuantity).toBe(2)
      expect(rows.find((row) => row.id === "legacy")?.maxQuantity).toBe(10)
      expect(rows.find((row) => row.id === "large")?.maxQuantity).toBe(25)
    } finally {
      dispose()
    }
  })
})

test("mixed products allow a combined total above ten within individual limits", () => {
  createRoot((dispose) => {
    try {
      const event = limitEvent()
      const state = ticketTierSelectorStateCreate({
        event: () => event,
        cart: () => ({
          eventId: event.id,
          lines: [
            { tierId: "legacy", quantity: 10 },
            { tierId: "large", quantity: 15 },
          ],
        }),
        onCartChange: () => {},
      })
      const rows = state.rows()
      expect(rows.find((row) => row.id === "legacy")?.canIncrease).toBe(false)
      expect(rows.find((row) => row.id === "large")?.canIncrease).toBe(true)
      expect(state.total().quantity).toBe(25)
    } finally {
      dispose()
    }
  })
})

test("product-aware cart resolution clamps quantities and sums duplicate selections", () => {
  const event = limitEvent()
  expect(
    ticketCartForEventResolve(event, { eventId: event.id, lines: [{ tierId: "large", quantity: 99 }] })?.lines,
  ).toEqual([{ tierId: "large", quantity: 25 }])
  expect(
    ticketCartForEventResolve(event, {
      eventId: event.id,
      lines: [
        { tierId: "limited", quantity: 1 },
        { tierId: "limited", quantity: 2 },
      ],
    })?.lines,
  ).toEqual([{ tierId: "limited", quantity: 2 }])
  expect(
    ticketCartForEventResolve(event, { eventId: event.id, lines: [{ tierId: "legacy", quantity: 11 }] })?.lines,
  ).toEqual([{ tierId: "legacy", quantity: 10 }])
})

test("product-aware cart resolution discards invalid quantities and unavailable products", () => {
  const event = limitEvent()
  event.tiers[0]!.available = 0
  expect(
    ticketCartForEventResolve(event, {
      eventId: event.id,
      lines: [
        { tierId: "limited", quantity: 1 },
        { tierId: "legacy", quantity: 2.5 },
        { tierId: "large", quantity: Number.MAX_SAFE_INTEGER + 1 },
      ],
    }),
  ).toBeUndefined()
})
