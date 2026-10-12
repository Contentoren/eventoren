import { expect, mock, test } from "bun:test"
import { createRoot } from "solid-js"
import type { EventItem } from "../src/events/EventItem.ts"
import type { TicketCartDraft } from "../src/ticketing/TicketCartDraft.ts"

const protectedTier = {
  id: "vip",
  name: "VIP",
  description: "",
  priceCents: 100,
  feeCents: 0,
  capacity: 10,
  available: 10,
  maxPerOrder: 10,
  activationCodeRequired: true,
}

const openTier = {
  id: "standard",
  name: "Standard",
  description: "",
  priceCents: 100,
  feeCents: 0,
  capacity: 100,
  available: 100,
  maxPerOrder: 10,
}

const eventBase = {
  catalogVersion: 1,
  title: "Codes",
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
} as const

const protectedOnlyEvent: EventItem = { ...eventBase, id: "protected-only", tiers: [protectedTier] }
const mixedEvent: EventItem = { ...eventBase, id: "mixed", tiers: [protectedTier, openTier] }

let currentEvent: EventItem = mixedEvent
let searchTickets: string | undefined
let draft: TicketCartDraft = []
let savedDrafts: TicketCartDraft[] = []
type Navigation = { to?: string; search?: Record<string, string | undefined> }
let navigations: Navigation[] = []

// Isolated subprocess keeps these router/storage mocks out of other tests.
mock.module("@tanstack/solid-router", () => ({
  getRouteApi: () => ({
    useParams: () => () => ({ eventId: currentEvent.id }),
    useSearch: () => () => ({ tickets: searchTickets }),
    useNavigate: () => (options: { to?: string; search?: Record<string, string | undefined> }) => {
      navigations.push({ to: options.to, search: options.search })
      if (options.to === "/events/$eventId" && options.search && "tickets" in options.search) {
        searchTickets = options.search.tickets
      }
    },
  }),
  useNavigate: () => () => {},
}))
mock.module("../src/ticketing/ticketCartDraftLoad.ts", () => ({ ticketCartDraftLoad: () => draft }))
mock.module("../src/ticketing/ticketCartDraftSave.ts", () => ({
  ticketCartDraftSave: (next: TicketCartDraft) => {
    draft = next
    savedDrafts.push(next)
    return { success: true, data: null }
  },
}))

const { eventDetailPageStateCreate } = await import("../src/events/eventDetailPageStateCreate.ts")

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
const flush = async () => {
  await tick()
  await tick()
}

const reset = (event: EventItem, tickets: string | undefined, initialDraft: TicketCartDraft) => {
  currentEvent = event
  searchTickets = tickets
  draft = initialDraft
  savedDrafts = []
  navigations = []
}

const ticketSearches = () =>
  navigations.flatMap((navigation) => {
    const tickets = navigation.search?.tickets
    return tickets === undefined ? [] : [tickets]
  })

test("leaves the cart empty when every available tier requires an activation code", async () => {
  await createRoot(async (dispose) => {
    try {
      reset(protectedOnlyEvent, undefined, [])
      const state = eventDetailPageStateCreate({ event: () => currentEvent })
      await flush()
      expect(state.cart().lines).toEqual([])
      expect(ticketSearches()).toEqual([])
    } finally {
      dispose()
    }
  })
})

test("defaults to the first available tier without a code requirement", async () => {
  await createRoot(async (dispose) => {
    try {
      reset(mixedEvent, undefined, [])
      const state = eventDetailPageStateCreate({ event: () => currentEvent })
      await flush()
      expect(state.cart().lines).toEqual([{ tierId: "standard", quantity: 1 }])
      expect(ticketSearches()).toEqual(["standard:1"])
    } finally {
      dispose()
    }
  })
})

test("attaching a code without a quantity change survives an immediate checkout", async () => {
  await createRoot(async (dispose) => {
    try {
      reset(mixedEvent, "vip:1", [])
      const state = eventDetailPageStateCreate({ event: () => currentEvent })
      await flush()
      expect(state.cart().lines).toEqual([{ tierId: "vip", quantity: 1 }])

      state.applyCart({ eventId: currentEvent.id, lines: [{ tierId: "vip", quantity: 1, activationCode: "ab12cd34" }] })
      expect(state.cart().lines).toEqual([{ tierId: "vip", quantity: 1, activationCode: "AB12CD34" }])

      state.goToCheckout()
      expect(draft).toEqual([
        { eventId: currentEvent.id, lines: [{ tierId: "vip", quantity: 1, activationCode: "AB12CD34" }] },
      ])
      const checkout = navigations.find((navigation) => navigation.to === "/checkout")
      expect(checkout?.search).toMatchObject({ event: currentEvent.id, tickets: "vip:1" })
      for (const tickets of ticketSearches()) expect(tickets).not.toContain("AB12CD34")
      await flush()
    } finally {
      dispose()
    }
  })
})

test("clearing a code stays cleared on an immediate checkout", async () => {
  await createRoot(async (dispose) => {
    try {
      reset(mixedEvent, "vip:1", [
        { eventId: currentEvent.id, lines: [{ tierId: "vip", quantity: 1, activationCode: "AB12CD34" }] },
      ])
      const state = eventDetailPageStateCreate({ event: () => currentEvent })
      await flush()
      expect(state.cart().lines).toEqual([{ tierId: "vip", quantity: 1, activationCode: "AB12CD34" }])

      state.applyCart({ eventId: currentEvent.id, lines: [{ tierId: "vip", quantity: 1 }] })
      expect(state.cart().lines).toEqual([{ tierId: "vip", quantity: 1 }])

      state.goToCheckout()
      expect(draft).toEqual([{ eventId: currentEvent.id, lines: [{ tierId: "vip", quantity: 1 }] }])
      const checkout = navigations.find((navigation) => navigation.to === "/checkout")
      expect(checkout?.search).toMatchObject({ event: currentEvent.id, tickets: "vip:1" })
      for (const tickets of ticketSearches()) expect(tickets).not.toContain("AB12CD34")
      await flush()
    } finally {
      dispose()
    }
  })
})

test("code edits without a quantity change replace the saved code", async () => {
  await createRoot(async (dispose) => {
    try {
      reset(mixedEvent, "vip:1", [
        { eventId: currentEvent.id, lines: [{ tierId: "vip", quantity: 1, activationCode: "AB12CD34" }] },
      ])
      const state = eventDetailPageStateCreate({ event: () => currentEvent })
      await flush()

      state.applyCart({ eventId: currentEvent.id, lines: [{ tierId: "vip", quantity: 1, activationCode: "zz99yy88" }] })
      expect(state.cart().lines).toEqual([{ tierId: "vip", quantity: 1, activationCode: "ZZ99YY88" }])

      state.goToCheckout()
      expect(draft).toEqual([
        { eventId: currentEvent.id, lines: [{ tierId: "vip", quantity: 1, activationCode: "ZZ99YY88" }] },
      ])
      for (const tickets of ticketSearches()) {
        expect(tickets).not.toContain("ZZ99YY88")
        expect(tickets).not.toContain("AB12CD34")
      }
      await flush()
    } finally {
      dispose()
    }
  })
})
