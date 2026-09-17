import { expect, test } from "bun:test"
import { demoCatalogEvents } from "../src/demo/fixtures/demoCatalogEvents.ts"
import { ticketCartForEventResolve } from "../src/ticketing/ticketCartForEventResolve.ts"

const event = demoCatalogEvents[0]
if (!event) throw new Error("expected a demo event fixture")

test("keeps only positive quantities for ticket tiers that still exist", () => {
  expect(
    ticketCartForEventResolve(event, {
      eventId: "stale-event-id",
      lines: [
        { tierId: "innenraum", quantity: 2 },
        { tierId: "oberrang", quantity: 0 },
        { tierId: "removed-tier", quantity: 1 },
      ],
    }),
  ).toEqual({ eventId: event.id, lines: [{ tierId: "innenraum", quantity: 2 }] })
})

test("returns no cart when every stored ticket line is invalid", () => {
  expect(
    ticketCartForEventResolve(event, {
      eventId: event.id,
      lines: [
        { tierId: "oberrang", quantity: 0 },
        { tierId: "removed-tier", quantity: 1 },
      ],
    }),
  ).toBeUndefined()
})
