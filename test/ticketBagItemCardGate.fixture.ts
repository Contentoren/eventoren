import { expect, test } from "bun:test"
import { createRoot, createSignal } from "solid-js"
import type { TicketBagItem } from "../src/ticketing/TicketBagItem.ts"
import { ticketBagItemCardStateCreate } from "../src/ticketing/ticketBagItemCardStateCreate.ts"
import { createResult } from "../src/ui/createResult.ts"
import type { Result } from "../src/ui/Result.ts"

// Isolated real-Solid-client fixture. Runs in its own subprocess via
// `bun --conditions=browser test ticketBagItemCardGate.fixture.ts`
// so the reactive event/item effects genuinely execute. No mock.module and
// no global state leak into other tests.

type ValidateResult = Result<{ readonly valid: boolean }>
type ValidateInput = { eventKey: string; tierKey: string; code: string }

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

async function waitFor(condition: () => boolean, label: string) {
  for (let index = 0; index < 200; index++) {
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error(`timeout waiting for ${label}`)
}

function bagItem(overrides: Partial<TicketBagItem> = {}): TicketBagItem {
  return {
    tierId: "vip",
    tierName: "VIP",
    tierDescription: "",
    quantity: 1,
    unitPriceCents: 5000,
    unitPriceLabel: "50 €",
    totalPriceCents: 5000,
    totalPriceLabel: "50 €",
    maxQuantity: 3,
    activationCodeRequired: true,
    activationCode: "",
    ...overrides,
  }
}

function deferredValidate() {
  const resolvers: Array<(result: ValidateResult) => void> = []
  const calls: ValidateInput[] = []
  return {
    resolvers,
    calls,
    validate: (input: ValidateInput) => {
      calls.push(input)
      return new Promise<ValidateResult>((resolve) => {
        resolvers.push(resolve)
      })
    },
  }
}

test("a missing code blocks increases while decreases stay allowed", async () => {
  await createRoot(async (dispose) => {
    try {
      const [eventId] = createSignal("event-one")
      const [item] = createSignal(bagItem({ quantity: 1, activationCode: "" }))
      const calls: ValidateInput[] = []
      const state = ticketBagItemCardStateCreate({
        eventId,
        item,
        validate: (input) => {
          calls.push(input)
          return Promise.resolve(createResult({ valid: true as const }))
        },
      })
      await flush()
      expect(calls).toEqual([])
      expect(state.status()).toBe("idle")
      expect(state.quantityAllowed(2)).toBe(false)
      expect(state.quantityAllowed(1)).toBe(true)
      expect(state.quantityAllowed(0)).toBe(true)
      expect(state.visibleMaxQuantity()).toBe(1)
      expect(state.optionDisabled(1)).toBe(false)
      expect(state.optionDisabled(2)).toBe(true)
    } finally {
      dispose()
    }
  })
  await flush()
})

test("a pending validation blocks increases while decreases stay allowed", async () => {
  await createRoot(async (dispose) => {
    try {
      const [eventId] = createSignal("event-one")
      const [item] = createSignal(bagItem({ quantity: 1, activationCode: "ABCDEFGH" }))
      const deferred = deferredValidate()
      const state = ticketBagItemCardStateCreate({ eventId, item, validate: deferred.validate })
      await waitFor(() => deferred.resolvers.length === 1, "pending request")
      expect(state.status()).toBe("checking")
      expect(state.quantityAllowed(2)).toBe(false)
      expect(state.quantityAllowed(1)).toBe(true)
      expect(state.quantityAllowed(0)).toBe(true)
      expect(state.visibleMaxQuantity()).toBe(1)
      expect(state.optionDisabled(2)).toBe(true)
      deferred.resolvers[0]?.(createResult({ valid: true as const }))
      await waitFor(() => state.status() === "valid", "settled valid")
    } finally {
      dispose()
    }
  })
  await flush()
})

test("an invalid code blocks increases while decreases stay allowed", async () => {
  await createRoot(async (dispose) => {
    try {
      const [eventId] = createSignal("event-one")
      const [item] = createSignal(bagItem({ quantity: 2, activationCode: "ZZZZ9999" }))
      const state = ticketBagItemCardStateCreate({
        eventId,
        item,
        validate: () => Promise.resolve(createResult({ valid: false as const })),
      })
      await waitFor(() => state.status() === "invalid", "settled invalid")
      expect(state.quantityAllowed(3)).toBe(false)
      expect(state.quantityAllowed(2)).toBe(true)
      expect(state.quantityAllowed(1)).toBe(true)
      expect(state.visibleMaxQuantity()).toBe(2)
      expect(state.optionDisabled(2)).toBe(false)
      expect(state.optionDisabled(3)).toBe(true)
    } finally {
      dispose()
    }
  })
  await flush()
})

test("a valid code allows increases up to the existing maxQuantity", async () => {
  await createRoot(async (dispose) => {
    try {
      const [eventId] = createSignal("event-one")
      const [item] = createSignal(bagItem({ quantity: 2, maxQuantity: 3, activationCode: "ABCDEFGH" }))
      const state = ticketBagItemCardStateCreate({
        eventId,
        item,
        validate: (input) => Promise.resolve(createResult({ valid: input.code === "ABCDEFGH" })),
      })
      await waitFor(() => state.status() === "valid", "settled valid")
      expect(state.gateOpen()).toBe(true)
      expect(state.quantityAllowed(3)).toBe(true)
      expect(state.quantityAllowed(4)).toBe(false)
      expect(state.quantityAllowed(2)).toBe(true)
      expect(state.quantityAllowed(1)).toBe(true)
      expect(state.visibleMaxQuantity()).toBe(3)
      expect(state.optionDisabled(3)).toBe(false)
    } finally {
      dispose()
    }
  })
  await flush()
})

test("a late response for a replaced code never unlocks the gate", async () => {
  await createRoot(async (dispose) => {
    try {
      const [eventId] = createSignal("event-one")
      const [item, setItem] = createSignal(bagItem({ quantity: 1, activationCode: "AAAAAAAA" }))
      const deferred = deferredValidate()
      const state = ticketBagItemCardStateCreate({ eventId, item, validate: deferred.validate })
      await waitFor(() => deferred.resolvers.length === 1, "first request")
      expect(deferred.calls[0]).toMatchObject({ code: "AAAAAAAA" })

      setItem(bagItem({ quantity: 1, activationCode: "BBBBBBBB" }))
      await waitFor(() => deferred.resolvers.length === 2, "second request")
      expect(deferred.calls[1]).toMatchObject({ code: "BBBBBBBB" })

      deferred.resolvers[0]?.(createResult({ valid: true as const }))
      await flush()
      await flush()
      expect(state.status()).not.toBe("valid")
      expect(state.quantityAllowed(2)).toBe(false)

      deferred.resolvers[1]?.(createResult({ valid: true as const }))
      await waitFor(() => state.status() === "valid", "replacement valid")
      expect(state.quantityAllowed(2)).toBe(true)
    } finally {
      dispose()
    }
  })
  await flush()
})

test("a late response for a previous event never unlocks the current event", async () => {
  await createRoot(async (dispose) => {
    try {
      const [eventId, setEventId] = createSignal("event-one")
      const [item] = createSignal(bagItem({ quantity: 1, activationCode: "ABCDEFGH" }))
      const deferred = deferredValidate()
      const state = ticketBagItemCardStateCreate({ eventId, item, validate: deferred.validate })
      await waitFor(() => deferred.resolvers.length === 1, "first request")
      expect(deferred.calls[0]).toMatchObject({ eventKey: "event-one" })

      setEventId("event-two")
      await waitFor(() => deferred.resolvers.length === 2, "second request")
      expect(deferred.calls[1]).toMatchObject({ eventKey: "event-two" })

      deferred.resolvers[0]?.(createResult({ valid: true as const }))
      await flush()
      await flush()
      expect(state.status()).not.toBe("valid")
      expect(state.quantityAllowed(2)).toBe(false)

      deferred.resolvers[1]?.(createResult({ valid: true as const }))
      await waitFor(() => state.status() === "valid", "current event valid")
      expect(state.quantityAllowed(2)).toBe(true)
    } finally {
      dispose()
    }
  })
  await flush()
})

test("an unprotected product never queries and keeps the normal max", async () => {
  await createRoot(async (dispose) => {
    try {
      const [eventId] = createSignal("event-one")
      const [item] = createSignal(bagItem({ quantity: 1, activationCodeRequired: false, activationCode: "" }))
      const calls: ValidateInput[] = []
      const state = ticketBagItemCardStateCreate({
        eventId,
        item,
        validate: (input) => {
          calls.push(input)
          return Promise.resolve(createResult({ valid: true as const }))
        },
      })
      await flush()
      await flush()
      expect(calls).toEqual([])
      expect(state.gateOpen()).toBe(true)
      expect(state.quantityAllowed(2)).toBe(true)
      expect(state.quantityAllowed(3)).toBe(true)
      expect(state.quantityAllowed(4)).toBe(false)
      expect(state.visibleMaxQuantity()).toBe(3)
      expect(state.optionDisabled(2)).toBe(false)
      expect(state.message()).toBe("")
    } finally {
      dispose()
    }
  })
  await flush()
})

test("a pending validation that resolves after disposal never settles", async () => {
  const [eventId] = createSignal("event-one")
  const [item] = createSignal(bagItem({ quantity: 1, activationCode: "ABCDEFGH" }))
  const deferred = deferredValidate()
  let captured: ReturnType<typeof ticketBagItemCardStateCreate> | undefined
  await createRoot(async (dispose) => {
    captured = ticketBagItemCardStateCreate({ eventId, item, validate: deferred.validate })
    await waitFor(() => deferred.resolvers.length === 1, "pending request")
    dispose()
    deferred.resolvers[0]?.(createResult({ valid: true as const }))
  })
  await flush()
  await flush()
  expect(captured?.status()).toBe("checking")
  expect(captured?.quantityAllowed(1)).toBe(true)
})
