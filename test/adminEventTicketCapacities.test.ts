import { expect, test } from "bun:test"
import type { AdminEventItem } from "../src/admin/AdminEventItem.ts"
import { adminEventTicketCapacities } from "../src/admin/adminEventTicketCapacities.ts"
import { demoCatalogEvents } from "../src/demo/fixtures/demoCatalogEvents.ts"

test("maximum ticket capacity sums tiers for the selected event or all events", () => {
  const fixtures = [
    {
      id: "first",
      title: "Erste Fahrt",
      tiers: [
        { capacity: 100, available: 20 },
        { capacity: 50, available: 0 },
      ],
    },
    { id: "second", title: "Zweite Fahrt", tiers: [{ capacity: 80, available: 10 }] },
  ]
  const events: AdminEventItem[] = fixtures.map((event) => ({
    ...demoCatalogEvents[0]!,
    ...event,
    status: "published",
    tiers: event.tiers.map((tier) => ({
      id: "tier",
      name: "Standard",
      description: "",
      priceCents: 1000,
      feeCents: 0,
      ...tier,
    })),
  }))

  expect(adminEventTicketCapacities(events, "")).toEqual([
    { id: "first", title: "Erste Fahrt", ticketCount: 150 },
    { id: "second", title: "Zweite Fahrt", ticketCount: 80 },
  ])
  expect(adminEventTicketCapacities(events, "first")).toEqual([{ id: "first", title: "Erste Fahrt", ticketCount: 150 }])
  expect(adminEventTicketCapacities(events, "second")).toEqual([
    { id: "second", title: "Zweite Fahrt", ticketCount: 80 },
  ])
  expect(adminEventTicketCapacities(events, "unknown")).toEqual([])
  expect(adminEventTicketCapacities([], "")).toEqual([])
})
