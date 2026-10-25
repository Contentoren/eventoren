import { beforeEach, expect, mock, test } from "bun:test"
import { createRoot } from "solid-js"
import type { EventItem } from "../src/events/EventItem.ts"
import { ticketActivationCodeHoldMemoryStore } from "../src/ticketing/ticketActivationCodeHoldMemoryStore.ts"
import { ticketCheckoutRetryStorageLoad } from "../src/ticketing/ticketCheckoutRetryStorageLoad.ts"
import { ticketOrderAccessStorageLoad } from "../src/ticketing/ticketOrderAccessStorageLoad.ts"

// Tiny integration proof for the completed actual form state retry.
// Runs isolated via `bun --conditions=browser test ticketCheckoutRetryForm.fixture.ts`
// so the REAL ticketCheckoutFormStateCreate callsite executes. Transport and
// browser storage are stubbed through the stable get/setItem interface only;
// no Convex/Stripe/SSO requests happen.

type CheckoutCall = { input: Record<string, unknown>; guestAccessToken: unknown }

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

const previousLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
const previousSessionStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage")
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window")

let localStorageMock: MemoryStorage
let sessionStorageMock: MemoryStorage
let redirects: string[]
const transport = {
  calls: [] as CheckoutCall[],
  impl: (_input: Record<string, unknown>, _guest: unknown): unknown => undefined as unknown,
}

mock.module("@tanstack/solid-router", () => ({
  useNavigate: () => () => {},
  useRouter: () => ({ invalidate: async () => {} }),
}))

mock.module("../src/auth/ui/eventorenAuthContextUse.ts", () => ({
  eventorenAuthContextUse: () => ({ ready: () => true, refresh: async () => {}, identity: () => undefined }),
}))

mock.module("../src/ticketing/ticketCheckoutCreate.ts", () => ({
  ticketCheckoutCreate: async (input: Record<string, unknown>, guest?: unknown) => {
    const call = { input, guestAccessToken: (input as { guestAccessToken?: unknown }).guestAccessToken ?? guest }
    transport.calls.push(call)
    return transport.impl(input, (input as { guestAccessToken?: unknown }).guestAccessToken ?? guest)
  },
}))

const { ticketCheckoutFormStateCreate } = await import("../src/ticketing/ticketCheckoutFormStateCreate.ts")

const successResponse = (orderId: string, url: string) => ({
  success: true as const,
  data: {
    orderId,
    paymentReference: `pay_${orderId}`,
    stripeMode: "test" as const,
    status: "checkout_created" as const,
    paymentStatus: "pending" as const,
    url,
    fulfillmentEligible: false,
    replayed: false,
  },
})

const terminalFailure = () => ({
  success: false as const,
  op: "ticketCheckoutCreate",
  errorMessage: "The checkout is no longer retryable",
})

const transientFailure = () => ({
  success: false as const,
  op: "ticketCheckoutCreate",
  errorMessage: "Checkout konnte nicht erstellt werden.",
})

function retryEvent(): EventItem {
  return {
    id: "retry-event",
    catalogVersion: 1,
    eventRevision: 1,
    title: "Retry Event",
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
        id: "vip",
        name: "VIP",
        description: "",
        priceCents: 5000,
        feeCents: 0,
        capacity: 10,
        available: 10,
        maxPerOrder: 3,
        activationCodeRequired: true,
      },
    ],
  }
}

function seedHold() {
  ticketActivationCodeHoldMemoryStore.clear()
  ticketActivationCodeHoldMemoryStore.set({
    eventKey: "retry-event",
    tierKey: "vip",
    code: "AB12CD34",
    holdToken: "hold-token-0123456789abcdef",
    savedAt: Date.now(),
    expiresAt: Date.now() + 900_000,
  })
}

function fillValidForm(state: ReturnType<typeof ticketCheckoutFormStateCreate>) {
  state.contactFieldChange("firstName", "Ada")
  state.contactFieldChange("lastName", "Lovelace")
  state.contactFieldChange("email", "ada@example.test")
  state.contactFieldChange("address", "1 Main St")
  state.contactFieldChange("postalCode", "10115")
  state.contactFieldChange("city", "Berlin")
  state.contactFieldChange("country", "DE")
  state.participantNameChange("retry-event", "vip", 0, "Ada")
  state.termsAcceptanceChange(true)
  state.privacyAcknowledgementChange(true)
}

function formItems() {
  const event = retryEvent()
  return [{ event, cart: { eventId: event.id, lines: [{ tierId: "vip", quantity: 1, activationCode: "AB12CD34" }] } }]
}

beforeEach(() => {
  localStorageMock = new MemoryStorage()
  sessionStorageMock = new MemoryStorage()
  redirects = []
  transport.calls = []
  transport.impl = () => undefined as unknown
  ticketActivationCodeHoldMemoryStore.clear()
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: localStorageMock })
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: sessionStorageMock })
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      setTimeout: () => 0,
      clearTimeout: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      location: {
        assign: (url: string) => {
          redirects.push(url)
        },
      },
    },
  })
})

async function afterEachRestore() {
  if (previousLocalStorage) Object.defineProperty(globalThis, "localStorage", previousLocalStorage)
  else Reflect.deleteProperty(globalThis, "localStorage")
  if (previousSessionStorage) Object.defineProperty(globalThis, "sessionStorage", previousSessionStorage)
  else Reflect.deleteProperty(globalThis, "sessionStorage")
  if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow)
  else Reflect.deleteProperty(globalThis, "window")
  ticketActivationCodeHoldMemoryStore.clear()
}

// Same-browser back/cancel: the second submit reuses key, guest, first URLs and hold proof.
test("the real form replays the same checkout key and guest on an unchanged code booking", async () => {
  await createRoot(async (dispose) => {
    try {
      seedHold()
      transport.impl = async () => successResponse("order-replay-1", "https://pay.test/replay-1")
      const items = formItems()
      const state = ticketCheckoutFormStateCreate({
        items: () => items as never,
        appOrigin: () => ({ success: true, data: "https://eventoren.test" }),
      })
      fillValidForm(state)
      await state.confirmPayment()
      expect(state.errorMessage()).toBe("")
      expect(transport.calls).toHaveLength(1)
      const first = transport.calls[0]
      if (!first) throw new Error("expected the first checkout call")
      const firstInput = first.input as Record<string, unknown> & {
        checkoutKey: string
        successUrl: string
        cancelUrl: string
        tickets: { activationCodeHoldToken?: string }[]
      }
      expect(redirects).toEqual(["https://pay.test/replay-1"])
      console.log("DEBUG retry raw:", localStorageMock.getItem("eventoren.ticketCheckoutRetry.v1"))
      console.log("DEBUG first input:", JSON.stringify(first.input).slice(0, 400))
      const stored = ticketCheckoutRetryStorageLoad()
      expect(stored.success).toBe(true)
      if (!stored.success) return
      expect(stored.data).toHaveLength(1)
      expect(stored.data[0]?.checkoutKey).toBe(firstInput.checkoutKey)
      expect(stored.data[0]?.guestAccessToken).toBe(first.guestAccessToken)
      expect(firstInput.tickets[0]?.activationCodeHoldToken).toBe("hold-token-0123456789abcdef")

      transport.impl = async () => successResponse("order-replay-2", "https://pay.test/replay-1")
      await state.confirmPayment()
      expect(state.errorMessage()).toBe("")
      expect(transport.calls).toHaveLength(2)
      const second = transport.calls[1]
      if (!second) throw new Error("expected the replay checkout call")
      const secondInput = second.input as Record<string, unknown> & {
        checkoutKey: string
        successUrl: string
        cancelUrl: string
        tickets: { activationCodeHoldToken?: string }[]
      }
      expect(secondInput.checkoutKey).toBe(firstInput.checkoutKey)
      expect(second.guestAccessToken).toBe(first.guestAccessToken)
      expect(secondInput.successUrl).toBe(firstInput.successUrl)
      expect(secondInput.cancelUrl).toBe(firstInput.cancelUrl)
      expect(secondInput.tickets[0]?.activationCodeHoldToken).toBe("hold-token-0123456789abcdef")
      const storedAfter = ticketCheckoutRetryStorageLoad()
      expect(storedAfter.success).toBe(true)
      if (!storedAfter.success) return
      expect(storedAfter.data).toHaveLength(1)
      expect(storedAfter.data[0]?.checkoutKey).toBe(firstInput.checkoutKey)
      const access = ticketOrderAccessStorageLoad()
      expect(access.success).toBe(true)
      if (!access.success) return
      expect(access.data.find((entry) => entry.orderId === "order-replay-2")?.checkoutKey).toBe(firstInput.checkoutKey)
    } finally {
      dispose()
    }
  })
  await afterEachRestore()
})

// Exact terminal answer on the reused key: exactly one fresh key/guest, fresh snapshot before transport.
test("the real form mints one fresh key after the exact terminal answer and binds the order to it", async () => {
  await createRoot(async (dispose) => {
    try {
      seedHold()
      transport.impl = async () => successResponse("order-terminal-1", "https://pay.test/terminal-1")
      const items = formItems()
      const state = ticketCheckoutFormStateCreate({
        items: () => items as never,
        appOrigin: () => ({ success: true, data: "https://eventoren.test" }),
      })
      fillValidForm(state)
      await state.confirmPayment()
      const first = transport.calls[0]
      if (!first) throw new Error("expected the first checkout call")
      const firstKey = (first.input as { checkoutKey: string }).checkoutKey
      const firstGuest = first.guestAccessToken

      let freshStoredBeforeTransport = false
      transport.impl = async (input: Record<string, unknown>) => {
        const key = (input as { checkoutKey: string }).checkoutKey
        if (key === firstKey) return terminalFailure()
        const loaded = ticketCheckoutRetryStorageLoad()
        freshStoredBeforeTransport =
          loaded.success === true &&
          loaded.data.some((entry) => entry.checkoutKey === key) &&
          loaded.data.every((entry) => entry.checkoutKey !== firstKey)
        return successResponse("order-terminal-2", "https://pay.test/terminal-2")
      }
      await state.confirmPayment()
      expect(state.errorMessage()).toBe("")
      expect(transport.calls).toHaveLength(3)
      const replay = transport.calls[1]
      const fresh = transport.calls[2]
      if (!replay || !fresh) throw new Error("expected replay plus fresh checkout calls")
      expect((replay.input as { checkoutKey: string }).checkoutKey).toBe(firstKey)
      const freshKey = (fresh.input as { checkoutKey: string }).checkoutKey
      expect(freshKey).not.toBe(firstKey)
      expect(fresh.guestAccessToken).not.toBe(firstGuest)
      expect(freshStoredBeforeTransport).toBe(true)
      const stored = ticketCheckoutRetryStorageLoad()
      expect(stored.success).toBe(true)
      if (!stored.success) return
      expect(stored.data).toHaveLength(1)
      expect(stored.data[0]?.checkoutKey).toBe(freshKey)
      expect(stored.data[0]?.guestAccessToken).toBe(fresh.guestAccessToken)
      const access = ticketOrderAccessStorageLoad()
      expect(access.success).toBe(true)
      if (!access.success) return
      expect(access.data.find((entry) => entry.orderId === "order-terminal-2")?.checkoutKey).toBe(freshKey)
      expect(redirects.at(-1)).toBe("https://pay.test/terminal-2")
    } finally {
      dispose()
    }
  })
  await afterEachRestore()
})

// Transient answer on the reused key: no fresh key, stored evidence stays.
test("the real form keeps the stored key on a transient answer without minting", async () => {
  await createRoot(async (dispose) => {
    try {
      seedHold()
      transport.impl = async () => successResponse("order-transient-1", "https://pay.test/transient-1")
      const items = formItems()
      const state = ticketCheckoutFormStateCreate({
        items: () => items as never,
        appOrigin: () => ({ success: true, data: "https://eventoren.test" }),
      })
      fillValidForm(state)
      await state.confirmPayment()
      const first = transport.calls[0]
      if (!first) throw new Error("expected the first checkout call")
      const firstKey = (first.input as { checkoutKey: string }).checkoutKey

      transport.impl = async () => transientFailure()
      await state.confirmPayment()
      expect(state.errorMessage()).toBe("Checkout konnte nicht erstellt werden.")
      expect(transport.calls).toHaveLength(2)
      expect((transport.calls[1]?.input as { checkoutKey: string }).checkoutKey).toBe(firstKey)
      expect(transport.calls[1]?.guestAccessToken).toBe(first.guestAccessToken)
      const stored = ticketCheckoutRetryStorageLoad()
      expect(stored.success).toBe(true)
      if (!stored.success) return
      expect(stored.data).toHaveLength(1)
      expect(stored.data[0]?.checkoutKey).toBe(firstKey)
    } finally {
      dispose()
    }
  })
  await afterEachRestore()
})
