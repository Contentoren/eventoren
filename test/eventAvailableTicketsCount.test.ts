import { expect, test } from "bun:test"
import { eventAvailableTicketsCount } from "../src/events/eventAvailableTicketsCount.ts"
import { eventListAvailableTicketsCount } from "../src/events/eventListAvailableTicketsCount.ts"

test("eventAvailableTicketsCount calculates available tickets for published event", () => {
  const event = {
    status: "published" as const,
    tiers: [
      { id: "t1", name: "Tier 1", description: "", priceCents: 1000, feeCents: 100, capacity: 50, available: 30 },
      { id: "t2", name: "Tier 2", description: "", priceCents: 2000, feeCents: 200, capacity: 50, available: 15 },
    ],
  }
  expect(eventAvailableTicketsCount(event)).toBe(45)
})

test("eventAvailableTicketsCount returns 0 for draft or archived events", () => {
  const draftEvent = {
    status: "draft" as const,
    tiers: [
      { id: "t1", name: "Tier 1", description: "", priceCents: 1000, feeCents: 100, capacity: 50, available: 30 },
    ],
  }
  const archivedEvent = {
    status: "archived" as const,
    tiers: [
      { id: "t1", name: "Tier 1", description: "", priceCents: 1000, feeCents: 100, capacity: 50, available: 30 },
    ],
  }
  expect(eventAvailableTicketsCount(draftEvent)).toBe(0)
  expect(eventAvailableTicketsCount(archivedEvent)).toBe(0)
})

test("eventListAvailableTicketsCount sums across events ignoring non-published", () => {
  const events = [
    {
      status: "published" as const,
      tiers: [{ id: "t1", name: "T1", description: "", priceCents: 1000, feeCents: 100, capacity: 100, available: 40 }],
    },
    {
      status: "draft" as const,
      tiers: [
        { id: "t2", name: "T2", description: "", priceCents: 1000, feeCents: 100, capacity: 100, available: 100 },
      ],
    },
    {
      status: "published" as const,
      tiers: [{ id: "t3", name: "T3", description: "", priceCents: 1000, feeCents: 100, capacity: 100, available: 25 }],
    },
  ]
  expect(eventListAvailableTicketsCount(events)).toBe(65)
})
