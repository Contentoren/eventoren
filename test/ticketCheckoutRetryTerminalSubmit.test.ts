import { afterEach, beforeEach, expect, test } from "bun:test"
import type { TicketCheckoutCreateInput } from "../src/ticketing/TicketCheckoutCreateInput.ts"
import type { TicketCheckoutCreateResponse } from "../src/ticketing/TicketCheckoutCreateResponse.ts"
import { ticketCheckoutCancelUrlCreate } from "../src/ticketing/ticketCheckoutCancelUrlCreate.ts"
import { ticketCheckoutRetryMemoryStore } from "../src/ticketing/ticketCheckoutRetryMemoryStore.ts"
import { ticketCheckoutRetryProbeUrlsRead } from "../src/ticketing/ticketCheckoutRetryProbeUrlsRead.ts"
import { ticketCheckoutRetryStorageLoad } from "../src/ticketing/ticketCheckoutRetryStorageLoad.ts"
import { ticketCheckoutRetryLoad, ticketCheckoutRetryStore } from "../src/ticketing/ticketCheckoutRetryStore.ts"
import { ticketCheckoutRetryTerminalSubmit } from "../src/ticketing/ticketCheckoutRetryTerminalSubmit.ts"
import { ticketCheckoutReturnUrlCreate } from "../src/ticketing/ticketCheckoutReturnUrlCreate.ts"
import { createResult } from "../src/ui/createResult.ts"

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
  ticketCheckoutRetryMemoryStore.clear()
  storage = new MemoryStorage()
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage })
})

afterEach(() => {
  ticketCheckoutRetryMemoryStore.clear()
  if (previousLocalStorage) Object.defineProperty(globalThis, "localStorage", previousLocalStorage)
  else Reflect.deleteProperty(globalThis, "localStorage")
})

const appOrigin = "https://eventoren.test"
const guestAccessToken = "guestToken0123456789abcdef0123456789abcd"
const storedHoldToken = "hold-token-stored-0123456789abcdef"
const currentHoldToken = "hold-token-current-0123456789abcdef"

const codeInput = (): TicketCheckoutCreateInput => ({
  checkoutKey: "checkoutKey0123456789abcdef0123456789abcdef01",
  eventKey: "event-1",
  catalogVersion: 3,
  eventRevision: 2,
  tickets: [
    {
      tierKey: "vip",
      quantity: 2,
      activationCode: "AB12CD34",
      activationCodeHoldToken: storedHoldToken,
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
})

/** Material input of the current attempt, without a key and without URLs. */
const materialOf = (input: TicketCheckoutCreateInput) => ({
  eventKey: input.eventKey,
  catalogVersion: input.catalogVersion,
  eventRevision: input.eventRevision,
  tickets: input.tickets,
  locale: input.locale,
  customer: input.customer,
  legalContext: input.legalContext,
})

const probeUrlsOf = (input: TicketCheckoutCreateInput) => ticketCheckoutRetryProbeUrlsRead(appOrigin, input.eventKey)

const cancelUrlOf = (input: TicketCheckoutCreateInput) => {
  const cancelUrl = ticketCheckoutCancelUrlCreate(appOrigin, input.eventKey)
  if (!cancelUrl.success) throw new Error("expected a cancel url")
  return cancelUrl.data
}

/** Stores the first-submit snapshot of a code order and returns it. */
const storeStored = (input: TicketCheckoutCreateInput) => {
  const returnUrl = ticketCheckoutReturnUrlCreate(appOrigin, input.checkoutKey)
  if (!returnUrl.success) throw new Error("expected a return url")
  const storedInput: TicketCheckoutCreateInput = {
    ...input,
    successUrl: returnUrl.data,
    cancelUrl: cancelUrlOf(input),
  }
  ticketCheckoutRetryStore({ checkoutInput: storedInput, checkoutKey: input.checkoutKey, guestAccessToken })
  return storedInput
}

const checkoutResponse = (): TicketCheckoutCreateResponse => ({
  orderId: "order-1",
  paymentReference: "payment_checkoutKey0123456789abcdef0123456789abcdef01",
  stripeMode: "test",
  status: "checkout_created",
  paymentStatus: "pending",
  url: "https://eventoren.test/pay",
  fulfillmentEligible: true,
  replayed: false,
})

/** Terminal contract of the backend for a checkout key that reached a final status. */
const terminalFailure = () => ({
  success: false as const,
  op: "ticketCheckoutPrepareMutation",
  errorMessage: "The checkout is no longer retryable",
})

/** The same terminal contract as it reaches the browser through the wrapper. */
const terminalFailureThroughWrapper = () => ({
  success: false as const,
  op: "ticketCheckoutCreate",
  errorMessage: "The checkout is no longer retryable",
  rawData: {
    success: false,
    op: "ticketCheckoutPrepareMutation",
    errorMessage: "The checkout is no longer retryable",
  },
})

const ownershipFailure = () => ({
  success: false as const,
  op: "ticketCheckoutPrepareMutation",
  errorMessage: "The checkout key was reused with different ownership or checkout evidence",
})

const transientFailure = () => ({
  success: false as const,
  op: "ticketCheckoutCreate",
  errorMessage: "Checkout konnte nicht erstellt werden.",
})

type SubmitCall = {
  readonly input: Omit<TicketCheckoutCreateInput, "token" | "guestAccessToken">
  readonly guestAccessToken: string | undefined
}

test("an exact terminal retry failure removes the stored key and starts one fresh checkout", async () => {
  const input = codeInput()
  storeStored(input)
  const retry = ticketCheckoutRetryLoad(materialOf(input), probeUrlsOf(input))
  expect(retry?.checkoutKey).toBe(input.checkoutKey)
  const currentMaterial = {
    ...materialOf(input),
    tickets: input.tickets.map((ticket) => ({ ...ticket, activationCodeHoldToken: currentHoldToken })),
  }

  const calls: SubmitCall[] = []
  const outcome = await ticketCheckoutRetryTerminalSubmit({
    failed: terminalFailure(),
    retry,
    failedCheckoutKey: input.checkoutKey,
    appOrigin,
    material: currentMaterial,
    authenticated: false,
    submit: async (submitted, submittedGuestAccessToken) => {
      calls.push({ input: submitted, guestAccessToken: submittedGuestAccessToken })
      return createResult(checkoutResponse())
    },
  })

  expect(outcome.kind).toBe("attempted")
  if (outcome.kind !== "attempted") return
  expect(calls).toHaveLength(1)
  expect(outcome.result.success).toBe(true)
  // The fresh attempt uses a new key, a new guest credential and the current
  // URLs; the terminal key is never sent again.
  expect(outcome.checkoutKey).not.toBe(input.checkoutKey)
  expect(outcome.guestAccessToken).not.toBe(guestAccessToken)
  expect(calls[0]?.input.checkoutKey).toBe(outcome.checkoutKey)
  expect(calls[0]?.guestAccessToken).toBe(outcome.guestAccessToken)
  expect(calls[0]?.input.successUrl).toContain(outcome.checkoutKey)
  expect(calls[0]?.input.successUrl).not.toContain(input.checkoutKey)
  expect(calls[0]?.input.cancelUrl).toBe(cancelUrlOf(input))
  expect(calls[0]?.input.tickets[0]?.activationCodeHoldToken).toBe(currentHoldToken)

  const loaded = ticketCheckoutRetryStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data).toHaveLength(1)
  expect(loaded.data[0]?.checkoutKey).toBe(outcome.checkoutKey)
  expect(loaded.data[0]?.guestAccessToken).toBe(outcome.guestAccessToken)
  expect(loaded.data[0]?.checkoutInput.successUrl).toBe(calls[0]?.input.successUrl)
  expect(loaded.data[0]?.checkoutInput.cancelUrl).toBe(calls[0]?.input.cancelUrl)
})

test("the terminal contract of the browser wrapper starts the same fresh checkout", async () => {
  const input = codeInput()
  storeStored(input)
  const retry = ticketCheckoutRetryLoad(materialOf(input), probeUrlsOf(input))

  const calls: SubmitCall[] = []
  const outcome = await ticketCheckoutRetryTerminalSubmit({
    failed: terminalFailureThroughWrapper(),
    retry,
    failedCheckoutKey: input.checkoutKey,
    appOrigin,
    material: materialOf(input),
    authenticated: false,
    submit: async (submitted, submittedGuestAccessToken) => {
      calls.push({ input: submitted, guestAccessToken: submittedGuestAccessToken })
      return createResult(checkoutResponse())
    },
  })

  expect(outcome.kind).toBe("attempted")
  expect(calls).toHaveLength(1)
})

test("a transient failure keeps the stored retry record and starts no fresh checkout", async () => {
  const input = codeInput()
  storeStored(input)
  const retry = ticketCheckoutRetryLoad(materialOf(input), probeUrlsOf(input))

  const calls: SubmitCall[] = []
  const outcome = await ticketCheckoutRetryTerminalSubmit({
    failed: transientFailure(),
    retry,
    failedCheckoutKey: input.checkoutKey,
    appOrigin,
    material: materialOf(input),
    authenticated: false,
    submit: async (submitted, submittedGuestAccessToken) => {
      calls.push({ input: submitted, guestAccessToken: submittedGuestAccessToken })
      return createResult(checkoutResponse())
    },
  })

  expect(outcome.kind).toBe("not_applicable")
  expect(calls).toHaveLength(0)
  const loaded = ticketCheckoutRetryStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data).toHaveLength(1)
  expect(loaded.data[0]?.checkoutKey).toBe(input.checkoutKey)
})

test("an ownership or context mismatch keeps the stored retry record and starts no fresh checkout", async () => {
  const input = codeInput()
  storeStored(input)
  const retry = ticketCheckoutRetryLoad(materialOf(input), probeUrlsOf(input))

  const calls: SubmitCall[] = []
  const outcome = await ticketCheckoutRetryTerminalSubmit({
    failed: ownershipFailure(),
    retry,
    failedCheckoutKey: input.checkoutKey,
    appOrigin,
    material: materialOf(input),
    authenticated: false,
    submit: async (submitted, submittedGuestAccessToken) => {
      calls.push({ input: submitted, guestAccessToken: submittedGuestAccessToken })
      return createResult(checkoutResponse())
    },
  })

  expect(outcome.kind).toBe("not_applicable")
  expect(calls).toHaveLength(0)
  const loaded = ticketCheckoutRetryStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data).toHaveLength(1)
  expect(loaded.data[0]?.checkoutKey).toBe(input.checkoutKey)
})

test("a purchase without a stored retry starts no fresh checkout", async () => {
  const input = codeInput()
  const calls: SubmitCall[] = []
  const outcome = await ticketCheckoutRetryTerminalSubmit({
    failed: terminalFailure(),
    retry: undefined,
    failedCheckoutKey: input.checkoutKey,
    appOrigin,
    material: materialOf(input),
    authenticated: false,
    submit: async (submitted, submittedGuestAccessToken) => {
      calls.push({ input: submitted, guestAccessToken: submittedGuestAccessToken })
      return createResult(checkoutResponse())
    },
  })

  expect(outcome.kind).toBe("not_applicable")
  expect(calls).toHaveLength(0)
  const loaded = ticketCheckoutRetryStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data).toHaveLength(0)
})

test("a successful checkout keeps the stored retry record and starts no fresh checkout", async () => {
  const input = codeInput()
  storeStored(input)
  const retry = ticketCheckoutRetryLoad(materialOf(input), probeUrlsOf(input))

  const calls: SubmitCall[] = []
  const outcome = await ticketCheckoutRetryTerminalSubmit({
    failed: createResult(checkoutResponse()),
    retry,
    failedCheckoutKey: input.checkoutKey,
    appOrigin,
    material: materialOf(input),
    authenticated: false,
    submit: async (submitted, submittedGuestAccessToken) => {
      calls.push({ input: submitted, guestAccessToken: submittedGuestAccessToken })
      return createResult(checkoutResponse())
    },
  })

  expect(outcome.kind).toBe("not_applicable")
  expect(calls).toHaveLength(0)
  const loaded = ticketCheckoutRetryStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data).toHaveLength(1)
  expect(loaded.data[0]?.checkoutKey).toBe(input.checkoutKey)
  expect(loaded.data[0]?.guestAccessToken).toBe(guestAccessToken)
})

test("a failed fresh attempt is not repeated and keeps the fresh snapshot", async () => {
  const input = codeInput()
  storeStored(input)
  const retry = ticketCheckoutRetryLoad(materialOf(input), probeUrlsOf(input))

  const calls: SubmitCall[] = []
  const outcome = await ticketCheckoutRetryTerminalSubmit({
    failed: terminalFailure(),
    retry,
    failedCheckoutKey: input.checkoutKey,
    appOrigin,
    material: materialOf(input),
    authenticated: false,
    submit: async (submitted, submittedGuestAccessToken) => {
      calls.push({ input: submitted, guestAccessToken: submittedGuestAccessToken })
      return {
        success: false as const,
        op: "ticketCheckoutCreate",
        errorMessage: "Checkout konnte nicht erstellt werden.",
      }
    },
  })

  expect(outcome.kind).toBe("attempted")
  if (outcome.kind !== "attempted") return
  expect(calls).toHaveLength(1)
  expect(outcome.result.success).toBe(false)
  const loaded = ticketCheckoutRetryStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data).toHaveLength(1)
  expect(loaded.data[0]?.checkoutKey).toBe(outcome.checkoutKey)
})
