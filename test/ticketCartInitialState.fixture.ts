import { expect, mock, test } from "bun:test"
import { createRoot } from "solid-js"
import type { EventItem } from "../src/events/EventItem.ts"
import type { TicketCartDraft } from "../src/ticketing/TicketCartDraft.ts"

const event: EventItem = {
  id: "limit-event",
  catalogVersion: 1,
  title: "Limits",
  subtitle: "",
  description: "",
  category: "konzerte",
  startsAt: "2026-10-01T18:00:00.000Z",
  endsAt: "2026-10-01T22:00:00.000Z",
  doorsAt: "",
  venue: "Hall",
  city: "Berlin",
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
      priceCents: 100,
      feeCents: 0,
      capacity: 100,
      available: 100,
      maxPerOrder: 2,
    },
    {
      id: "large",
      name: "Large",
      description: "",
      priceCents: 100,
      feeCents: 0,
      capacity: 100,
      available: 100,
      maxPerOrder: 25,
    },
    {
      id: "empty",
      name: "Empty",
      description: "",
      priceCents: 100,
      feeCents: 0,
      capacity: 100,
      available: 0,
      maxPerOrder: 25,
    },
  ],
}
let draft: TicketCartDraft = []
// Isolated subprocess keeps these router/storage mocks out of other tests.
mock.module("@tanstack/solid-router", () => ({
  getRouteApi: () => ({
    useParams: () => () => ({ eventId: event.id }),
    useSearch: () => () => ({ tickets: "limited:99,large:20,empty:1" }),
    useNavigate: () => () => {},
  }),
  useNavigate: () => () => {},
}))
mock.module("../src/ticketing/ticketCartDraftLoad.ts", () => ({ ticketCartDraftLoad: () => draft }))
mock.module("../src/ticketing/ticketCartDraftSave.ts", () => ({
  ticketCartDraftSave: (next: TicketCartDraft) => {
    draft = next
    return { success: true, data: null }
  },
}))
const { eventDetailPageStateCreate } = await import("../src/events/eventDetailPageStateCreate.ts")
const { ticketBagPageStateCreate } = await import("../src/ticketing/ticketBagPageStateCreate.ts")

test("event URL quantities are normalized before displaying or saving the initial selection", () => {
  createRoot((dispose) => {
    try {
      draft = []
      const state = eventDetailPageStateCreate({ event: () => event })
      expect(state.cart().lines).toEqual([
        { tierId: "limited", quantity: 2 },
        { tierId: "large", quantity: 20 },
      ])
      state.goToCart()
      expect(draft).toEqual([state.cart()])
    } finally {
      dispose()
    }
  })
})

test("persisted bag quantities aggregate duplicates and match displayed totals within product limits", async () => {
  await createRoot(async (dispose) => {
    try {
      draft = [
        {
          eventId: event.id,
          lines: [
            { tierId: "limited", quantity: 99 },
            { tierId: "large", quantity: 11 },
            { tierId: "large", quantity: 9 },
            { tierId: "empty", quantity: 1 },
            { tierId: "large", quantity: 2.5 },
          ],
        },
      ]
      const state = ticketBagPageStateCreate({ getCatalogEvents: async () => ({ success: true, data: [event] }) })
      await Promise.resolve()
      await Promise.resolve()
      expect(state.groups()[0]?.items.map(({ tierId, quantity }) => ({ tierId, quantity }))).toEqual([
        { tierId: "limited", quantity: 2 },
        { tierId: "large", quantity: 20 },
      ])
      expect(state.totalQuantity()).toBe(22)
      expect(state.totals()).toMatchObject({ quantity: 22, totalCents: 2200 })
    } finally {
      dispose()
    }
  })
})
