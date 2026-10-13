import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { createRoot } from "solid-js"
import type { TicketOrderProjection } from "../src/ticketing/TicketOrderProjection.ts"
import { ticketCartDraftKey } from "../src/ticketing/ticketCartDraftKey.ts"
import { ticketCartDraftLoad } from "../src/ticketing/ticketCartDraftLoad.ts"
import { ticketCartDraftSave } from "../src/ticketing/ticketCartDraftSave.ts"
import { ticketOrderAccessStorageKey } from "../src/ticketing/ticketOrderAccessStorageKey.ts"

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

mock.module("@tanstack/solid-router", () => ({
  useNavigate: () => () => {},
  useRouter: () => ({ invalidate: async () => {} }),
}))

mock.module("../src/auth/ui/eventorenAuthContextUse.ts", () => ({
  eventorenAuthContextUse: () => ({
    ready: () => true,
    refresh: async () => {},
    identity: () => null,
  }),
}))

const validCheckoutKey = "ABCDEFGHIJKLMNOPQRSTUVWXYZ01234567"
const validGuestAccessToken = "guestAccessToken01234567890123456789"

const sampleOrder: TicketOrderProjection = {
  id: "order-1",
  checkoutKey: validCheckoutKey,
  eventKey: "event-paid-1",
  eventTitle: "Paid Event",
  eventSubtitle: "",
  eventDescription: "",
  eventStartsAt: "2026-10-01T18:00:00.000Z",
  eventEndsAt: "2026-10-01T20:00:00.000Z",
  eventDoorsAt: "2026-10-01T17:00:00.000Z",
  venue: "Venue",
  city: "City",
  address: "Address",
  organizer: "Organizer",
  imageUrl: "",
  imageAlt: "",
  catalogVersion: 1,
  contact: { email: "test@example.test", givenName: "Test", familyName: "User", phone: "" },
  subtotalCents: 1000,
  feeCents: 100,
  totalCents: 1100,
  paymentReference: "ref-1",
  stripeMode: "test",
  status: "paid",
  paymentStatus: "paid",
  createdAt: "2026-09-15T08:00:00.000Z",
  updatedAt: "2026-09-15T08:00:00.000Z",
  lines: [],
  tickets: [],
}

mock.module("../src/ticketing/ticketOrderGet.ts", () => ({
  ticketOrderGet: async () => ({ success: true, data: sampleOrder }),
}))

const { ticketOrderStatusPageStateCreate } = await import("../src/ticketing/ticketOrderStatusPageStateCreate.ts")

test("clears the paid event from cart draft upon loading paid order on status page", async () => {
  storage.setItem(
    ticketOrderAccessStorageKey,
    JSON.stringify([{ orderId: "order-1", checkoutKey: validCheckoutKey, guestAccessToken: validGuestAccessToken }]),
  )

  ticketCartDraftSave([
    { eventId: "event-paid-1", lines: [{ tierId: "t1", quantity: 1 }] },
    { eventId: "event-unpaid-2", lines: [{ tierId: "t2", quantity: 2 }] },
  ])

  let state: ReturnType<typeof ticketOrderStatusPageStateCreate> | undefined
  let dispose: (() => void) | undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    state = ticketOrderStatusPageStateCreate({
      orderIds: () => ["order-1"],
      checkoutKey: () => validCheckoutKey,
    })
  })

  try {
    await state?.refresh()
    const remaining = ticketCartDraftLoad()
    expect(remaining).toEqual([{ eventId: "event-unpaid-2", lines: [{ tierId: "t2", quantity: 2 }] }])
  } finally {
    dispose?.()
  }
})

test("retains cart draft when order payment is failed or pending", async () => {
  const pendingOrder: TicketOrderProjection = {
    ...sampleOrder,
    status: "failed",
    paymentStatus: "failed",
  }

  const { ticketOrderGet } = await import("../src/ticketing/ticketOrderGet.ts")
  const originalGet = ticketOrderGet
  mock.module("../src/ticketing/ticketOrderGet.ts", () => ({
    ticketOrderGet: async () => ({ success: true, data: pendingOrder }),
  }))

  storage.setItem(
    ticketOrderAccessStorageKey,
    JSON.stringify([{ orderId: "order-1", checkoutKey: validCheckoutKey, guestAccessToken: validGuestAccessToken }]),
  )

  const initialDraft = [
    { eventId: "event-paid-1", lines: [{ tierId: "t1", quantity: 1 }] },
    { eventId: "event-unpaid-2", lines: [{ tierId: "t2", quantity: 2 }] },
  ]
  ticketCartDraftSave(initialDraft)

  let state: ReturnType<typeof ticketOrderStatusPageStateCreate> | undefined
  let dispose: (() => void) | undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    state = ticketOrderStatusPageStateCreate({
      orderIds: () => ["order-1"],
      checkoutKey: () => validCheckoutKey,
    })
  })

  try {
    await state?.refresh()
    const remaining = ticketCartDraftLoad()
    expect(remaining).toEqual(initialDraft)
  } finally {
    dispose?.()
  }
})
