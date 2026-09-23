import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import type { EventItem } from "../src/events/EventItem.ts"
import { ticketTierSelectorStateCreate } from "../src/ticketing/ticketTierSelectorStateCreate.ts"

test("ticket products appear in the order provided by the catalog", () => {
  createRoot((dispose) => {
    try {
      const event = {
        id: "concert",
        catalogVersion: 1,
        title: "Concert",
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
        tiers: ["Class 1 — 14:30 - 15:20 Uhr", "Class 2 — 16:30 - 17:20 Uhr", "Class 3 — 18:30 - 19:20 Uhr"].map(
          (name, index) => ({
            id: String(index),
            name,
            description: "",
            priceCents: 3000,
            feeCents: 0,
            capacity: 10,
            available: 10,
            sortOrder: index + 1,
          }),
        ),
      } satisfies EventItem
      const state = ticketTierSelectorStateCreate({
        event: () => event,
        cart: () => ({ eventId: event.id, lines: [] }),
        onCartChange: () => {},
      })

      expect(state.rows().map((row) => row.name)).toEqual(event.tiers.map((tier) => tier.name))
    } finally {
      dispose()
    }
  })
})
