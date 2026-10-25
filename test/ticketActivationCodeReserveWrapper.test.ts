import { afterEach, beforeEach, expect, test } from "bun:test"
import type { ConvexHttpClient } from "convex/browser"
import { ticketActivationCodeHoldKey } from "../src/ticketing/ticketActivationCodeHoldKey.ts"
import { ticketActivationCodeHoldMemoryStore } from "../src/ticketing/ticketActivationCodeHoldMemoryStore.ts"
import { ticketActivationCodeHoldStorageLoad } from "../src/ticketing/ticketActivationCodeHoldStorageLoad.ts"
import { ticketActivationCodeValidate } from "../src/ticketing/ticketActivationCodeValidate.ts"
import { ticketCheckoutTicketsCreate } from "../src/ticketing/ticketCheckoutTicketsCreate.ts"

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
  ticketActivationCodeHoldMemoryStore.clear()
})

afterEach(() => {
  if (previousLocalStorage) Object.defineProperty(globalThis, "localStorage", previousLocalStorage)
  else Reflect.deleteProperty(globalThis, "localStorage")
  ticketActivationCodeHoldMemoryStore.clear()
})

const input = { eventKey: "gate-event", tierKey: "vip", code: "abcdefgh" }
const holdToken = "hold-token-0123456789abcdef"
const expiresAt = Date.now() + 15 * 60 * 1000

function reserveClient(calls: unknown[], answer: { valid: boolean; holdToken?: string; expiresAt?: number }) {
  return {
    mutation: async (_reference: unknown, args: unknown) => {
      calls.push(args)
      return { success: true as const, data: answer }
    },
    query: async () => {
      throw new Error("validate query must not be used while the reservation answers")
    },
  } as unknown as ConvexHttpClient
}

test("a successful reservation keeps the boolean contract and stores the own credential separately", async () => {
  const calls: unknown[] = []
  const client = reserveClient(calls, { valid: true, holdToken, expiresAt })
  const result = await ticketActivationCodeValidate(input, client)

  expect(result).toEqual({ success: true, data: { valid: true } })
  expect(calls).toHaveLength(1)
  expect(calls[0]).toEqual({ eventKey: "gate-event", tierKey: "vip", code: "abcdefgh" })

  const loaded = ticketActivationCodeHoldStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data).toEqual([
    {
      eventKey: "gate-event",
      tierKey: "vip",
      code: "ABCDEFGH",
      holdToken,
      expiresAt,
      savedAt: expect.any(Number),
    },
  ])
  expect(storage.getItem(ticketActivationCodeHoldKey)).not.toBeNull()
})

test("a repeated entry reuses the stored credential without extending the deadline client-side", async () => {
  const firstCalls: unknown[] = []
  const first = reserveClient(firstCalls, { valid: true, holdToken, expiresAt })
  expect((await ticketActivationCodeValidate(input, first)).success).toBe(true)

  const secondCalls: unknown[] = []
  const second = reserveClient(secondCalls, { valid: true, holdToken, expiresAt })
  const result = await ticketActivationCodeValidate(input, second)

  expect(result).toEqual({ success: true, data: { valid: true } })
  expect(secondCalls).toEqual([{ eventKey: "gate-event", tierKey: "vip", code: "abcdefgh", holdToken }])
})

test("a foreign rejection keeps the gate locked with the same generic invalid answer", async () => {
  const calls: unknown[] = []
  const client = reserveClient(calls, { valid: false })
  const result = await ticketActivationCodeValidate(input, client)

  expect(result).toEqual({ success: true, data: { valid: false } })
  expect(ticketActivationCodeHoldStorageLoad()).toEqual({ success: true, data: [] })
})

test("a reservation outage fails closed and never claims a reservation through the read-only query", async () => {
  const calls: unknown[] = []
  const queries: unknown[] = []
  const client = {
    mutation: async (_reference: unknown, args: unknown) => {
      calls.push(args)
      return { success: false as const, errorMessage: "reserve unavailable", op: "ticketActivationCodeReserve" }
    },
    query: async (_reference: unknown, args: unknown) => {
      queries.push(args)
      return { success: true as const, data: { valid: true } }
    },
  } as unknown as ConvexHttpClient

  const result = await ticketActivationCodeValidate(input, client)
  expect(result.success).toBe(false)
  if (result.success) return
  expect(result.errorMessage).toBe("Der Freischaltungscode konnte nicht geprüft werden.")
  expect(calls).toHaveLength(1)
  expect(queries).toHaveLength(0)
})

test("a denied credential store keeps the credential for the next entry and for the checkout", async () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded")
      },
      removeItem: () => {},
    },
  })
  const firstCalls: unknown[] = []
  const first = reserveClient(firstCalls, { valid: true, holdToken, expiresAt })
  expect(await ticketActivationCodeValidate(input, first)).toEqual({ success: true, data: { valid: true } })
  expect(firstCalls).toEqual([{ eventKey: "gate-event", tierKey: "vip", code: "abcdefgh" }])
  const savedAt = ticketActivationCodeHoldMemoryStore.records()[0]?.savedAt

  const secondCalls: unknown[] = []
  const second = reserveClient(secondCalls, { valid: true, holdToken, expiresAt })
  expect(await ticketActivationCodeValidate(input, second)).toEqual({ success: true, data: { valid: true } })
  expect(secondCalls).toEqual([{ eventKey: "gate-event", tierKey: "vip", code: "abcdefgh", holdToken }])
  expect(ticketActivationCodeHoldMemoryStore.records()[0]?.expiresAt).toBe(expiresAt)
  expect(ticketActivationCodeHoldMemoryStore.records()[0]?.savedAt).toBe(savedAt)

  const tickets = ticketCheckoutTicketsCreate(
    { eventId: "gate-event", lines: [{ tierId: "vip", quantity: 1, activationCode: "abcdefgh" }] },
    {},
  )
  expect(tickets).toEqual([
    {
      tierKey: "vip",
      quantity: 1,
      activationCode: "ABCDEFGH",
      activationCodeHoldToken: holdToken,
      participantNames: [],
    },
  ])
})
