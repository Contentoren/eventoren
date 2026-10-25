import { afterEach, beforeEach, expect, test } from "bun:test"
import type { TicketCheckoutCreateInput } from "../src/ticketing/TicketCheckoutCreateInput.ts"
import { ticketCheckoutCancelUrlCreate } from "../src/ticketing/ticketCheckoutCancelUrlCreate.ts"
import { ticketCheckoutRetryKey } from "../src/ticketing/ticketCheckoutRetryKey.ts"
import { ticketCheckoutRetryProbeUrlsRead } from "../src/ticketing/ticketCheckoutRetryProbeUrlsRead.ts"
import { ticketCheckoutRetryStorageLoad } from "../src/ticketing/ticketCheckoutRetryStorageLoad.ts"
import {
  ticketCheckoutRetryHasCode,
  ticketCheckoutRetryLoad,
  ticketCheckoutRetryMaterialKey,
  ticketCheckoutRetryStore,
} from "../src/ticketing/ticketCheckoutRetryStore.ts"
import { ticketCheckoutReturnUrlCreate } from "../src/ticketing/ticketCheckoutReturnUrlCreate.ts"

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
let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage })
})

afterEach(() => {
  if (previousLocalStorage) Object.defineProperty(globalThis, "localStorage", previousLocalStorage)
  else Reflect.deleteProperty(globalThis, "localStorage")
})

const appOrigin = "https://eventoren.test"
const guestAccessToken = "guestToken0123456789abcdef0123456789abcd"

const codeInput = (overrides?: Partial<TicketCheckoutCreateInput>): TicketCheckoutCreateInput => ({
  checkoutKey: "checkoutKey0123456789abcdef0123456789abcdef01",
  eventKey: "event-1",
  catalogVersion: 3,
  eventRevision: 2,
  tickets: [
    {
      tierKey: "vip",
      quantity: 2,
      activationCode: "AB12CD34",
      activationCodeHoldToken: "hold-token-0123456789abcdef",
      participantNames: ["Ada", "Grace"],
    },
  ],
  successUrl: "https://eventoren.test/checkout?checkout=abc",
  cancelUrl: "https://eventoren.test/events/event-1",
  locale: "de",
  customer: {
    email: "ada@example.test",
    givenName: "Ada",
    familyName: "Lovelace",
    address: "1 Main St",
    phone: "",
    billingDetails: {
      givenName: "Ada",
      familyName: "Lovelace",
      address: { line1: "1 Main St", postalCode: "10115", city: "Berlin", country: "DE" },
    },
  },
  legalContext: {
    cta: "Jetzt kostenpflichtig buchen",
    termsAccepted: true,
    privacyAcknowledged: true,
    documentSetRevision: "sha256:abc",
  },
  ...overrides,
})

const freeInput = (): TicketCheckoutCreateInput =>
  codeInput({
    checkoutKey: "checkoutKeyFree0123456789abcdef0123456789ab",
    tickets: [{ tierKey: "standard", quantity: 1, participantNames: ["Ada"] }],
  })

/**
 * Material input of the checkout form before a checkout key exists: it holds
 * the booking evidence and the pre-key URL context of the current attempt.
 */
const materialProbeOf = (input: TicketCheckoutCreateInput) => ({
  eventKey: input.eventKey,
  catalogVersion: input.catalogVersion,
  eventRevision: input.eventRevision,
  tickets: input.tickets,
  locale: input.locale,
  customer: input.customer,
  legalContext: input.legalContext,
})

const probeUrlsOf = (input: TicketCheckoutCreateInput) => ticketCheckoutRetryProbeUrlsRead(appOrigin, input.eventKey)

test("retry snapshot stores the exact first-submit payload for a code order before the network call", () => {
  const input = codeInput()
  ticketCheckoutRetryStore({
    checkoutInput: input,
    checkoutKey: input.checkoutKey,
    guestAccessToken,
  })

  const loaded = ticketCheckoutRetryStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data).toHaveLength(1)
  expect(loaded.data[0]?.checkoutKey).toBe(input.checkoutKey)
  expect(loaded.data[0]?.guestAccessToken).toBe(guestAccessToken)
  expect(loaded.data[0]?.checkoutInput).toEqual(input)
})

test("the pre-key form probe finds the stored snapshot and replays its key and guest token", () => {
  const input = codeInput()
  const returnUrl = ticketCheckoutReturnUrlCreate(appOrigin, input.checkoutKey)
  const cancelUrl = ticketCheckoutCancelUrlCreate(appOrigin, input.eventKey)
  if (!returnUrl.success || !cancelUrl.success) throw new Error("expected checkout urls")
  const storedInput: TicketCheckoutCreateInput = {
    ...input,
    successUrl: returnUrl.data,
    cancelUrl: cancelUrl.data,
  }
  ticketCheckoutRetryStore({
    checkoutInput: storedInput,
    checkoutKey: input.checkoutKey,
    guestAccessToken,
  })

  const retry = ticketCheckoutRetryLoad(materialProbeOf(input), probeUrlsOf(input))

  expect(retry?.checkoutKey).toBe(input.checkoutKey)
  expect(retry?.guestAccessToken).toBe(guestAccessToken)
  expect(retry?.checkoutInput.successUrl).toBe(returnUrl.data)
  expect(retry?.checkoutInput.cancelUrl).toBe(cancelUrl.data)
})

test("unchanged code order reloads the same checkout key and guest token", () => {
  const input = codeInput()
  ticketCheckoutRetryStore({
    checkoutInput: input,
    checkoutKey: input.checkoutKey,
    guestAccessToken,
  })

  const retry = ticketCheckoutRetryLoad(input)
  expect(retry?.checkoutKey).toBe(input.checkoutKey)
  expect(retry?.guestAccessToken).toBe(guestAccessToken)
})

test("changed quantity, customer, participants, or code never replay the old evidence", () => {
  const input = codeInput()
  ticketCheckoutRetryStore({ checkoutInput: input, checkoutKey: input.checkoutKey })
  const firstTicket = input.tickets[0]
  if (!firstTicket) throw new Error("expected a ticket line in the fixture")

  expect(ticketCheckoutRetryLoad({ ...input, tickets: [{ ...firstTicket, quantity: 1 }] })).toBeUndefined()
  expect(
    ticketCheckoutRetryLoad({ ...input, customer: { ...input.customer, email: "other@example.test" } }),
  ).toBeUndefined()
  expect(
    ticketCheckoutRetryLoad({ ...input, tickets: [{ ...firstTicket, participantNames: ["Ada", "Linus"] }] }),
  ).toBeUndefined()
  expect(
    ticketCheckoutRetryLoad({ ...input, tickets: [{ ...firstTicket, activationCode: "ZZZZ9999" }] }),
  ).toBeUndefined()
  expect(ticketCheckoutRetryLoad({ ...input, eventRevision: 3 })).toBeUndefined()
})

test("an altered legal context never replays the stored evidence", () => {
  const input = codeInput()
  ticketCheckoutRetryStore({ checkoutInput: input, checkoutKey: input.checkoutKey })

  expect(
    ticketCheckoutRetryLoad({
      ...input,
      legalContext: { ...input.legalContext, documentSetRevision: "sha256:other" },
    }),
  ).toBeUndefined()
  expect(
    ticketCheckoutRetryLoad({ ...input, legalContext: { ...input.legalContext, cta: "Andere Aktion" } }),
  ).toBeUndefined()
})

test("changed external checkout URLs never replay the stored evidence", () => {
  const input = codeInput()
  ticketCheckoutRetryStore({ checkoutInput: input, checkoutKey: input.checkoutKey })

  expect(ticketCheckoutRetryLoad({ ...input, successUrl: "https://other.test/checkout" })).toBeUndefined()
  expect(ticketCheckoutRetryLoad({ ...input, successUrl: "https://eventoren.test/checkout/step-2" })).toBeUndefined()
  expect(ticketCheckoutRetryLoad({ ...input, successUrl: "https://eventoren.test/checkout?lang=en" })).toBeUndefined()
  expect(ticketCheckoutRetryLoad({ ...input, cancelUrl: "https://other.test/events/event-1" })).toBeUndefined()
  expect(ticketCheckoutRetryLoad({ ...input, cancelUrl: "https://eventoren.test/warenkorb" })).toBeUndefined()
})

test("the generated checkout key query value is no lookup evidence and the first URLs stay stored", () => {
  const input = codeInput()
  ticketCheckoutRetryStore({ checkoutInput: input, checkoutKey: input.checkoutKey })

  const retry = ticketCheckoutRetryLoad({ ...input, successUrl: "https://eventoren.test/checkout?checkout=other" })

  expect(retry?.checkoutKey).toBe(input.checkoutKey)
  expect(retry?.checkoutInput.successUrl).toBe(input.successUrl)
  expect(retry?.checkoutInput.cancelUrl).toBe(input.cancelUrl)
})

test("an identical second submit keeps one checkout key and the first URLs", () => {
  const input = codeInput()
  ticketCheckoutRetryStore({
    checkoutInput: input,
    checkoutKey: input.checkoutKey,
    guestAccessToken,
  })

  const retry = ticketCheckoutRetryLoad(materialProbeOf(input), probeUrlsOf(input))
  const checkoutKey = retry?.checkoutKey ?? "checkoutKeyFresh0123456789abcdef0123456789ab"
  const storedSuccessUrl = retry?.checkoutInput.successUrl
  const storedCancelUrl = retry?.checkoutInput.cancelUrl
  if (typeof storedSuccessUrl !== "string" || typeof storedCancelUrl !== "string") {
    throw new Error("expected the stored checkout urls")
  }
  const secondInput: TicketCheckoutCreateInput = {
    ...input,
    checkoutKey,
    successUrl: storedSuccessUrl,
    cancelUrl: storedCancelUrl,
  }
  ticketCheckoutRetryStore({
    checkoutInput: secondInput,
    checkoutKey,
    guestAccessToken: retry?.guestAccessToken ?? guestAccessToken,
  })

  const loaded = ticketCheckoutRetryStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data).toHaveLength(1)
  expect(loaded.data[0]?.checkoutKey).toBe(input.checkoutKey)
  expect(loaded.data[0]?.guestAccessToken).toBe(guestAccessToken)
  expect(loaded.data[0]?.checkoutInput.successUrl).toBe(input.successUrl)
  expect(loaded.data[0]?.checkoutInput.cancelUrl).toBe(input.cancelUrl)
})

test("code-free orders are never stored and leave the retry path untouched", () => {
  const input = freeInput()
  expect(ticketCheckoutRetryHasCode(input)).toBe(false)
  expect(ticketCheckoutRetryHasCode(codeInput())).toBe(true)

  ticketCheckoutRetryStore({ checkoutInput: input, checkoutKey: input.checkoutKey })
  expect(storage.getItem(ticketCheckoutRetryKey)).toBeNull()
  expect(ticketCheckoutRetryLoad(input)).toBeUndefined()
})

test("material key ignores ticket order and the hold credential while staying byte-stable", () => {
  const input = codeInput()
  const firstTicket = input.tickets[0]
  if (!firstTicket) throw new Error("expected a ticket line in the fixture")
  const reordered: TicketCheckoutCreateInput = {
    ...input,
    tickets: [
      { tierKey: "standard", quantity: 1, participantNames: ["Bo"] },
      { ...firstTicket, activationCodeHoldToken: "hold-token-rotated-0123456789" },
    ],
  }
  expect(ticketCheckoutRetryMaterialKey(input)).toBe(
    ticketCheckoutRetryMaterialKey({ ...input, tickets: [...input.tickets] }),
  )
  expect(ticketCheckoutRetryMaterialKey(reordered)).not.toBe(ticketCheckoutRetryMaterialKey(input))
})

test("denied storage disables the retry without failing the purchase", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => {
        throw new Error("blocked")
      },
      setItem: () => {
        throw new Error("blocked")
      },
      removeItem: () => {
        throw new Error("blocked")
      },
    },
  })
  const input = codeInput()
  ticketCheckoutRetryStore({ checkoutInput: input, checkoutKey: input.checkoutKey })
  expect(ticketCheckoutRetryLoad(input)).toBeUndefined()
  expect(ticketCheckoutRetryStorageLoad().success).toBe(false)
})
