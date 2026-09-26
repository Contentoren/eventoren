import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { createRoot } from "solid-js"
import type { TicketCheckoutFormDraft } from "../src/ticketing/TicketCheckoutFormDraft.ts"
import { ticketCheckoutLegalDocumentRevision } from "../src/ticketing/ticketCheckoutLegalDocumentRevision.ts"
import { ticketContactDraftKey } from "../src/ticketing/ticketContactDraftKey.ts"
import { ticketContactDraftLoad } from "../src/ticketing/ticketContactDraftLoad.ts"
import { ticketContactDraftSave } from "../src/ticketing/ticketContactDraftSave.ts"
import { ticketParticipantNamesAlign } from "../src/ticketing/ticketParticipantNamesAlign.ts"

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

type ScheduledCallback = { id: number; callback: () => void }

class CheckoutWindow {
  private nextId = 1
  private readonly timers = new Map<number, () => void>()
  private readonly listeners = new Map<string, Set<() => void>>()
  readonly idleCallbacks: ScheduledCallback[] = []

  setTimeout = (callback: () => void): number => {
    const id = this.nextId++
    this.timers.set(id, callback)
    return id
  }

  clearTimeout = (id: number): void => {
    this.timers.delete(id)
  }

  requestIdleCallback = (callback: () => void): number => {
    const id = this.nextId++
    this.idleCallbacks.push({ id, callback })
    return id
  }

  cancelIdleCallback = (id: number): void => {
    const index = this.idleCallbacks.findIndex((entry) => entry.id === id)
    if (index >= 0) this.idleCallbacks.splice(index, 1)
  }

  addEventListener = (type: string, listener: EventListenerOrEventListenerObject): void => {
    const callbacks = this.listeners.get(type) ?? new Set<() => void>()
    callbacks.add(
      typeof listener === "function" ? () => listener(new Event(type)) : () => listener.handleEvent(new Event(type)),
    )
    this.listeners.set(type, callbacks)
  }

  removeEventListener = (type: string): void => {
    this.listeners.delete(type)
  }

  runTimers(): void {
    const callbacks = [...this.timers.values()]
    this.timers.clear()
    for (const callback of callbacks) callback()
  }

  pagehide(): void {
    for (const callback of this.listeners.get("pagehide") ?? []) callback()
  }
}

const previousLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
let storage: MemoryStorage
let checkoutWindow: CheckoutWindow

mock.module("@tanstack/solid-router", () => ({
  useNavigate: () => () => {},
  useRouter: () => ({ invalidate: async () => {} }),
}))

mock.module("../src/auth/ui/eventorenAuthContextUse.ts", () => ({
  eventorenAuthContextUse: () => ({ ready: () => true, refresh: async () => {}, identity: () => undefined }),
}))

const { ticketCheckoutFormStateCreate } = await import("../src/ticketing/ticketCheckoutFormStateCreate.ts")

beforeEach(() => {
  storage = new MemoryStorage()
  checkoutWindow = new CheckoutWindow()
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage })
  Object.defineProperty(globalThis, "window", { configurable: true, value: checkoutWindow })
})

afterEach(() => {
  if (previousLocalStorage) Object.defineProperty(globalThis, "localStorage", previousLocalStorage)
  else Reflect.deleteProperty(globalThis, "localStorage")
  if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow)
  else Reflect.deleteProperty(globalThis, "window")
})

const formDraft: TicketCheckoutFormDraft = {
  contact: {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.test",
    billingKind: "company",
    companyName: "Analytical Engines",
    companyExtra: "Research",
    taxId: "DE123456789",
    address: "1 Main St",
    addressLine2: "Suite 2",
    postalCode: "10115",
    city: "Berlin",
    country: "DE",
    phone: "123",
  },
  participantNames: { event: { standard: ["Grace"] } },
  documentSetRevision: ticketCheckoutLegalDocumentRevision,
  termsAccepted: true,
  privacyAcknowledged: false,
}

test("saves and loads the full checkout draft, including participant names and legal consent", () => {
  expect(ticketContactDraftSave(formDraft).success).toBe(true)

  expect(storage.getItem(ticketContactDraftKey)).toBe(JSON.stringify(formDraft))
  expect(ticketContactDraftLoad()).toEqual({ success: true, data: formDraft })
})

test("loads legacy contact-only drafts without carrying the old combined consent forward", () => {
  storage.setItem(
    ticketContactDraftKey,
    JSON.stringify({ firstName: "Ada", email: "ada@example.test", legalAccepted: true }),
  )

  const loaded = ticketContactDraftLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data).toEqual({
    contact: {
      firstName: "Ada",
      lastName: "",
      email: "ada@example.test",
      billingKind: "person",
      companyName: "",
      companyExtra: "",
      taxId: "",
      address: "",
      addressLine2: "",
      postalCode: "",
      city: "",
      country: "",
      phone: "",
    },
    participantNames: {},
    documentSetRevision: ticketCheckoutLegalDocumentRevision,
    termsAccepted: false,
    privacyAcknowledged: false,
  })
})

test("restores separate consent only when the saved legal document revision matches", () => {
  const draftWithRevision = {
    ...formDraft,
    contact: { ...formDraft.contact, firstName: "Revision" },
    participantNames: { event: { standard: ["Participant"] } },
  }

  storage.setItem(ticketContactDraftKey, JSON.stringify(draftWithRevision))
  expect(ticketContactDraftLoad()).toEqual({ success: true, data: draftWithRevision })

  storage.setItem(
    ticketContactDraftKey,
    JSON.stringify({ ...draftWithRevision, documentSetRevision: "sha256:old-revision" }),
  )
  expect(ticketContactDraftLoad()).toEqual({
    success: true,
    data: {
      ...draftWithRevision,
      documentSetRevision: ticketCheckoutLegalDocumentRevision,
      termsAccepted: false,
      privacyAcknowledged: false,
    },
  })

  const { documentSetRevision: _missingRevision, ...legacyDraft } = draftWithRevision
  storage.setItem(ticketContactDraftKey, JSON.stringify(legacyDraft))
  expect(ticketContactDraftLoad()).toEqual({
    success: true,
    data: {
      ...draftWithRevision,
      documentSetRevision: ticketCheckoutLegalDocumentRevision,
      termsAccepted: false,
      privacyAcknowledged: false,
    },
  })
})

test("handles malformed JSON and malformed fields without throwing", () => {
  storage.setItem(ticketContactDraftKey, "{")
  expect(ticketContactDraftLoad().success).toBe(false)

  storage.setItem(
    ticketContactDraftKey,
    JSON.stringify({
      contact: { firstName: 4, phone: "555" },
      participantNames: { event: { standard: ["Grace", 4] } },
      legalAccepted: "yes",
    }),
  )
  expect(ticketContactDraftLoad()).toEqual({
    success: true,
    data: {
      contact: {
        firstName: "",
        lastName: "",
        email: "",
        billingKind: "person",
        companyName: "",
        companyExtra: "",
        taxId: "",
        address: "",
        addressLine2: "",
        postalCode: "",
        city: "",
        country: "",
        phone: "555",
      },
      participantNames: { event: { standard: ["Grace", ""] } },
      documentSetRevision: ticketCheckoutLegalDocumentRevision,
      termsAccepted: false,
      privacyAcknowledged: false,
    },
  })
})

test("treats unavailable and throwing storage as non-fatal", () => {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: undefined })
  expect(ticketContactDraftLoad().success).toBe(true)
  expect(ticketContactDraftSave(formDraft).success).toBe(true)

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => {
        throw new Error("blocked")
      },
      setItem: () => {
        throw new Error("blocked")
      },
    },
  })
  expect(ticketContactDraftLoad().success).toBe(false)
  expect(ticketContactDraftSave(formDraft).success).toBe(false)
})

test("retains participant values by event, tier, and ticket index while dropping removed cart entries", () => {
  const aligned = ticketParticipantNamesAlign(
    { eventA: { standard: ["Ada", "Grace"], removed: ["Linus"] }, removedEvent: { standard: ["Margaret"] } },
    [
      { event: { id: "eventA" }, cart: { lines: [{ tierId: "standard", quantity: 3 }] } },
      { event: { id: "eventB" }, cart: { lines: [{ tierId: "standard", quantity: 1 }] } },
    ],
  )

  expect(aligned).toEqual({ eventA: { standard: ["Ada", "Grace", ""] }, eventB: { standard: [""] } })
})

test("debounces repeated edits and saves the latest contact and consent values during idle time", () => {
  let state: ReturnType<typeof ticketCheckoutFormStateCreate> | undefined
  let dispose: (() => void) | undefined
  createRoot((rootDispose) => {
    dispose = rootDispose
    state = ticketCheckoutFormStateCreate({
      items: () => [],
      appOrigin: () => ({ success: true, data: "https://eventoren.test" }),
    })
  })

  try {
    if (!state) throw new Error("checkout form state was not created")
    state.contactFieldChange("firstName", "Ada")
    state.termsAcceptanceChange(true)
    state.privacyAcknowledgementChange(true)
    expect(storage.getItem(ticketContactDraftKey)).toBeNull()

    checkoutWindow.runTimers()
    expect(storage.getItem(ticketContactDraftKey)).toBeNull()
    expect(checkoutWindow.idleCallbacks).toHaveLength(1)
    checkoutWindow.idleCallbacks.shift()?.callback()
    expect(ticketContactDraftLoad().success).toBe(true)

    state.contactFieldChange("lastName", "Lovelace")
    expect(checkoutWindow.idleCallbacks).toHaveLength(0)
    checkoutWindow.runTimers()
    checkoutWindow.idleCallbacks.shift()?.callback()

    const saved = ticketContactDraftLoad()
    expect(saved.success).toBe(true)
    if (!saved.success) return
    expect(saved.data.contact).toMatchObject({ firstName: "Ada", lastName: "Lovelace" })
    expect(saved.data.termsAccepted).toBe(true)
    expect(saved.data.privacyAcknowledged).toBe(true)
  } finally {
    dispose?.()
  }
})

test("ignores stale idle saves without disrupting the newer scheduled save", () => {
  let state: ReturnType<typeof ticketCheckoutFormStateCreate> | undefined
  let dispose: (() => void) | undefined
  createRoot((rootDispose) => {
    dispose = rootDispose
    state = ticketCheckoutFormStateCreate({
      items: () => [],
      appOrigin: () => ({ success: true, data: "https://eventoren.test" }),
    })
  })

  try {
    if (!state) throw new Error("checkout form state was not created")
    state.contactFieldChange("firstName", "Old")
    checkoutWindow.runTimers()
    const staleCallback = checkoutWindow.idleCallbacks[0]?.callback
    if (!staleCallback) throw new Error("first idle save was not scheduled")

    state.contactFieldChange("firstName", "New")
    checkoutWindow.runTimers()
    const newerCallback = checkoutWindow.idleCallbacks[0]?.callback
    if (!newerCallback) throw new Error("newer idle save was not scheduled")

    staleCallback()
    expect(storage.getItem(ticketContactDraftKey)).toBeNull()

    state.contactFieldChange("firstName", "Newest")
    expect(checkoutWindow.idleCallbacks).toHaveLength(0)
    checkoutWindow.runTimers()
    checkoutWindow.idleCallbacks[0]?.callback()

    const saved = ticketContactDraftLoad()
    expect(saved.success).toBe(true)
    if (saved.success) expect(saved.data.contact.firstName).toBe("Newest")
  } finally {
    dispose?.()
  }
})

test("unmount before hydration preserves the previously stored checkout draft", () => {
  expect(ticketContactDraftSave(formDraft).success).toBe(true)
  const storedDraft = storage.getItem(ticketContactDraftKey)

  let dispose: (() => void) | undefined
  createRoot((rootDispose) => {
    dispose = rootDispose
    ticketCheckoutFormStateCreate({
      items: () =>
        [
          {
            event: { id: "event", tiers: [{ id: "standard", name: "Standard" }] },
            cart: { lines: [{ tierId: "standard", quantity: 1 }] },
          },
        ] as never,
      appOrigin: () => ({ success: true, data: "https://eventoren.test" }),
    })
  })
  dispose?.()

  expect(storage.getItem(ticketContactDraftKey)).toBe(storedDraft)
})

test("submit before hydration preserves the previously stored checkout draft", async () => {
  expect(ticketContactDraftSave(formDraft).success).toBe(true)
  const storedDraft = storage.getItem(ticketContactDraftKey)
  let state: ReturnType<typeof ticketCheckoutFormStateCreate> | undefined
  let dispose: (() => void) | undefined
  let submit: Promise<void> | undefined
  createRoot((rootDispose) => {
    dispose = rootDispose
    state = ticketCheckoutFormStateCreate({
      items: () => [],
      appOrigin: () => ({ success: true, data: "https://eventoren.test" }),
    })
    submit = state.confirmPayment()
  })

  try {
    if (!state) throw new Error("checkout form state was not created")
    await submit
    expect(storage.getItem(ticketContactDraftKey)).toBe(storedDraft)
  } finally {
    dispose?.()
  }
})

test("submit flushes pending edits before an early empty-cart return", async () => {
  let state: ReturnType<typeof ticketCheckoutFormStateCreate> | undefined
  let dispose: (() => void) | undefined
  createRoot((rootDispose) => {
    dispose = rootDispose
    state = ticketCheckoutFormStateCreate({
      items: () => [],
      appOrigin: () => ({ success: true, data: "https://eventoren.test" }),
    })
  })

  try {
    if (!state) throw new Error("checkout form state was not created")
    state.contactFieldChange("email", "ada@example.test")
    state.termsAcceptanceChange(true)
    state.privacyAcknowledgementChange(true)

    await state.confirmPayment()

    const saved = ticketContactDraftLoad()
    expect(saved.success).toBe(true)
    if (saved.success) {
      expect(saved.data.contact.email).toBe("ada@example.test")
      expect(saved.data.termsAccepted).toBe(true)
      expect(saved.data.privacyAcknowledged).toBe(true)
    }
  } finally {
    dispose?.()
  }
})
