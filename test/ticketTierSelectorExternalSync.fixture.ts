import { expect, test } from "bun:test"
import { createRoot, createSignal } from "solid-js"
import type { EventItem } from "../src/events/EventItem.ts"
import type { TicketCart } from "../src/ticketing/TicketCart.ts"
import { ticketTierSelectorStateCreate } from "../src/ticketing/ticketTierSelectorStateCreate.ts"
import { createResult } from "../src/ui/createResult.ts"
import type { Result } from "../src/ui/Result.ts"

// Isolated real-Solid-client fixture. Runs in its own subprocess via
// `bun --conditions=browser test ticketTierSelectorExternalSync.fixture.ts`
// so the reactive cart/context effects genuinely execute. No mock.module and
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

function protectedTier(id = "vip") {
  return {
    id,
    name: "VIP",
    description: "",
    priceCents: 5000,
    feeCents: 0,
    capacity: 10,
    available: 10,
    maxPerOrder: 3,
    activationCodeRequired: true as const,
  }
}

function openTier() {
  return {
    id: "standard",
    name: "Standard",
    description: "",
    priceCents: 2000,
    feeCents: 0,
    capacity: 10,
    available: 10,
    maxPerOrder: 3,
  }
}

function makeEvent(id: string, tiers: EventItem["tiers"]): EventItem {
  return {
    id,
    catalogVersion: 1,
    title: id,
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
    tiers,
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

const rowOf = (state: ReturnType<typeof ticketTierSelectorStateCreate>, id: string) =>
  state.rows().find((row) => row.id === id)

test("an external clear locks the second instance without resurrecting the old code", async () => {
  await createRoot(async (dispose) => {
    try {
      const event = makeEvent("gate-event", [protectedTier()])
      const [cart, setCart] = createSignal<TicketCart>({ eventId: event.id, lines: [] })
      const apply = (next: TicketCart) => {
        setCart(next)
      }
      const validate = (input: ValidateInput) => Promise.resolve(createResult({ valid: input.code === "ABCDEFGH" }))
      const first = ticketTierSelectorStateCreate({ event: () => event, cart, onCartChange: apply, validate })
      const second = ticketTierSelectorStateCreate({ event: () => event, cart, onCartChange: apply, validate })

      first.activationCodeChange("vip", "ABCDEFGH")
      await waitFor(() => rowOf(first, "vip")?.activationCodeStatus === "valid", "first valid")
      first.increaseTier("vip")
      expect(cart().lines).toEqual([{ tierId: "vip", quantity: 1, activationCode: "ABCDEFGH" }])

      // The shared cart sync adopts the accepted code without manual calls.
      await waitFor(() => rowOf(second, "vip")?.activationCodeStatus === "valid", "second synced valid")
      expect(rowOf(second, "vip")?.activationCodeValue).toBe("ABCDEFGH")

      first.activationCodeChange("vip", "")
      await waitFor(() => rowOf(second, "vip")?.activationCodeStatus === "idle", "second locked")
      expect(rowOf(second, "vip")?.activationCodeValue).toBe("")
      expect(rowOf(second, "vip")?.canIncrease).toBe(false)
      expect(cart().lines).toEqual([{ tierId: "vip", quantity: 1 }])

      second.increaseTier("vip")
      expect(cart().lines).toEqual([{ tierId: "vip", quantity: 1 }])
      second.decreaseTier("vip")
      expect(cart().lines).toEqual([])
      expect(cart().lines.some((line) => line.activationCode === "ABCDEFGH")).toBe(false)
    } finally {
      dispose()
    }
  })
  await flush()
})

test("an externally replaced code is adopted and the old code cannot reattach", async () => {
  await createRoot(async (dispose) => {
    try {
      const event = makeEvent("gate-event", [protectedTier()])
      const [cart, setCart] = createSignal<TicketCart>({ eventId: event.id, lines: [] })
      const seen: TicketCart[] = []
      const apply = (next: TicketCart) => {
        seen.push(structuredClone(next))
        setCart(next)
      }
      const validate = (input: ValidateInput) =>
        Promise.resolve(createResult({ valid: input.code === "ABCDEFGH" || input.code === "BBBBBBBB" }))
      const first = ticketTierSelectorStateCreate({ event: () => event, cart, onCartChange: apply, validate })
      const second = ticketTierSelectorStateCreate({ event: () => event, cart, onCartChange: apply, validate })

      first.activationCodeChange("vip", "ABCDEFGH")
      await waitFor(() => rowOf(first, "vip")?.activationCodeStatus === "valid", "first valid")
      first.increaseTier("vip")
      await waitFor(() => rowOf(second, "vip")?.activationCodeStatus === "valid", "second synced valid")

      const replacementIndex = seen.length
      apply({ eventId: event.id, lines: [{ tierId: "vip", quantity: 1, activationCode: "BBBBBBBB" }] })
      await waitFor(() => rowOf(first, "vip")?.activationCodeValue === "BBBBBBBB", "first adopts replacement")
      await waitFor(() => rowOf(second, "vip")?.activationCodeStatus === "valid", "second revalidates")
      expect(rowOf(second, "vip")?.activationCodeValue).toBe("BBBBBBBB")
      expect(cart().lines).toEqual([{ tierId: "vip", quantity: 1, activationCode: "BBBBBBBB" }])

      first.increaseTier("vip")
      expect(cart().lines).toEqual([{ tierId: "vip", quantity: 2, activationCode: "BBBBBBBB" }])
      for (const snapshot of seen.slice(replacementIndex)) {
        expect(snapshot.lines.some((line) => line.activationCode === "ABCDEFGH")).toBe(false)
      }
    } finally {
      dispose()
    }
  })
  await flush()
})

test("typing before the first increment is never erased by the empty cart", async () => {
  await createRoot(async (dispose) => {
    try {
      const event = makeEvent("gate-event", [protectedTier()])
      const [cart, setCart] = createSignal<TicketCart>({ eventId: event.id, lines: [] })
      const validate = (input: ValidateInput) => Promise.resolve(createResult({ valid: input.code === "ABCDEFGH" }))
      const state = ticketTierSelectorStateCreate({
        event: () => event,
        cart,
        onCartChange: setCart,
        validate,
      })

      // No cart line exists yet; partial input must survive effect cycles.
      state.activationCodeChange("vip", "abc")
      await flush()
      await flush()
      expect(rowOf(state, "vip")?.activationCodeValue).toBe("ABC")
      expect(rowOf(state, "vip")?.activationCodeStatus).toBe("idle")
      expect(cart().lines).toEqual([])

      state.activationCodeChange("vip", "ABCDEFGH")
      await waitFor(() => rowOf(state, "vip")?.activationCodeStatus === "valid", "typed code valid")
      expect(cart().lines).toEqual([])

      state.increaseTier("vip")
      expect(cart().lines).toEqual([{ tierId: "vip", quantity: 1, activationCode: "ABCDEFGH" }])
    } finally {
      dispose()
    }
  })
  await flush()
})

test("external cart codes seed and validate through the reactive sync alone", async () => {
  await createRoot(async (dispose) => {
    try {
      const event = makeEvent("gate-event", [protectedTier()])
      const [cart, setCart] = createSignal<TicketCart>({ eventId: event.id, lines: [] })
      const validate = (input: ValidateInput) => Promise.resolve(createResult({ valid: input.code === "ABCDEFGH" }))
      const state = ticketTierSelectorStateCreate({
        event: () => event,
        cart,
        onCartChange: setCart,
        validate,
      })
      await flush()
      expect(rowOf(state, "vip")?.activationCodeStatus).toBe("idle")

      // No activationCodeChange/activationCodeValidate call here: the cart
      // effect alone must seed and revalidate before unlocking.
      setCart({ eventId: event.id, lines: [{ tierId: "vip", quantity: 1, activationCode: "abcdefgh" }] })
      await waitFor(() => rowOf(state, "vip")?.activationCodeStatus === "valid", "externally seeded valid")
      expect(rowOf(state, "vip")?.activationCodeValue).toBe("ABCDEFGH")
      expect(rowOf(state, "vip")?.canIncrease).toBe(true)
    } finally {
      dispose()
    }
  })
  await flush()
})

test("a late response for a previous event never unlocks the current event", async () => {
  await createRoot(async (dispose) => {
    try {
      const [event, setEvent] = createSignal(makeEvent("event-one", [protectedTier()]))
      const [cart, setCart] = createSignal<TicketCart>({ eventId: "event-one", lines: [] })
      const deferred = deferredValidate()
      const state = ticketTierSelectorStateCreate({
        event,
        cart,
        onCartChange: setCart,
        validate: deferred.validate,
      })

      state.activationCodeChange("vip", "AAAAAAAA")
      await waitFor(() => deferred.resolvers.length === 1, "first request")

      setEvent(makeEvent("event-two", [protectedTier()]))
      await flush()
      await flush()
      expect(rowOf(state, "vip")?.activationCodeValue).toBe("")
      expect(rowOf(state, "vip")?.canIncrease).toBe(false)

      deferred.resolvers[0]?.(createResult({ valid: true as const }))
      await flush()
      await flush()
      expect(rowOf(state, "vip")?.activationCodeStatus).not.toBe("valid")
      expect(rowOf(state, "vip")?.canIncrease).toBe(false)
      expect(cart().lines).toEqual([])

      state.activationCodeChange("vip", "BBBBBBBB")
      await waitFor(() => deferred.resolvers.length === 2, "second request")
      expect(deferred.calls[1]).toMatchObject({ eventKey: "event-two", code: "BBBBBBBB" })
      deferred.resolvers[1]?.(createResult({ valid: true as const }))
      await waitFor(() => rowOf(state, "vip")?.activationCodeStatus === "valid", "new context valid")
      state.increaseTier("vip")
      expect(cart().lines).toEqual([{ tierId: "vip", quantity: 1, activationCode: "BBBBBBBB" }])
    } finally {
      dispose()
    }
  })
  await flush()
})

test("a removed and re-added tier starts locked and revalidates", async () => {
  await createRoot(async (dispose) => {
    try {
      const withVip = makeEvent("gate-event", [protectedTier(), openTier()])
      const withoutVip = makeEvent("gate-event", [openTier()])
      const [event, setEvent] = createSignal(withVip)
      const [cart, setCart] = createSignal<TicketCart>({ eventId: "gate-event", lines: [] })
      const seen: TicketCart[] = []
      const deferred = deferredValidate()
      const state = ticketTierSelectorStateCreate({
        event,
        cart,
        onCartChange: (next) => {
          seen.push(structuredClone(next))
          setCart(next)
        },
        validate: deferred.validate,
      })

      state.activationCodeChange("vip", "ABCDEFGH")
      await waitFor(() => deferred.resolvers.length === 1, "initial request")
      deferred.resolvers[0]?.(createResult({ valid: true as const }))
      await waitFor(() => rowOf(state, "vip")?.activationCodeStatus === "valid", "initial valid")
      state.increaseTier("vip")
      expect(cart().lines).toEqual([{ tierId: "vip", quantity: 1, activationCode: "ABCDEFGH" }])

      // In-progress replacement detaches the old code, then the tier vanishes.
      state.activationCodeChange("vip", "ZZZZ9999")
      await waitFor(() => deferred.resolvers.length === 2, "replacement request")
      setEvent(withoutVip)
      await flush()
      await flush()
      expect(state.rows().some((row) => row.id === "vip")).toBe(false)
      const callsBeforeResolve = seen.length
      deferred.resolvers[1]?.(createResult({ valid: true as const }))
      await flush()
      await flush()
      expect(seen.length).toBe(callsBeforeResolve)
      expect(cart().lines).toEqual([{ tierId: "vip", quantity: 1 }])

      // Re-added tier adopts the codeless line as locked and revalidates.
      setEvent(withVip)
      await flush()
      await flush()
      expect(rowOf(state, "vip")?.activationCodeValue).toBe("")
      expect(rowOf(state, "vip")?.activationCodeStatus).not.toBe("valid")
      expect(rowOf(state, "vip")?.canIncrease).toBe(false)
      state.increaseTier("vip")
      expect(cart().lines).toEqual([{ tierId: "vip", quantity: 1 }])

      state.activationCodeChange("vip", "ABCDEFGH")
      await waitFor(() => deferred.resolvers.length === 3, "re-added request")
      deferred.resolvers[2]?.(createResult({ valid: true as const }))
      await waitFor(() => rowOf(state, "vip")?.activationCodeStatus === "valid", "re-added valid")
      state.increaseTier("vip")
      expect(cart().lines).toEqual([{ tierId: "vip", quantity: 2, activationCode: "ABCDEFGH" }])
    } finally {
      dispose()
    }
  })
  await flush()
})

test("toggling the code requirement off and on locks the gate until revalidation", async () => {
  await createRoot(async (dispose) => {
    try {
      const required = makeEvent("gate-event", [protectedTier()])
      const optional = makeEvent("gate-event", [{ ...protectedTier(), activationCodeRequired: undefined }])
      const [event, setEvent] = createSignal(required)
      const [cart, setCart] = createSignal<TicketCart>({ eventId: "gate-event", lines: [] })
      const deferred = deferredValidate()
      const state = ticketTierSelectorStateCreate({
        event,
        cart,
        onCartChange: setCart,
        validate: deferred.validate,
      })

      state.activationCodeChange("vip", "ABCDEFGH")
      await waitFor(() => deferred.resolvers.length === 1, "initial request")
      deferred.resolvers[0]?.(createResult({ valid: true as const }))
      await waitFor(() => rowOf(state, "vip")?.activationCodeStatus === "valid", "initial valid")
      state.increaseTier("vip")
      expect(cart().lines).toEqual([{ tierId: "vip", quantity: 1, activationCode: "ABCDEFGH" }])

      setEvent(optional)
      await flush()
      await flush()
      expect(rowOf(state, "vip")?.activationCodeRequired).toBe(false)

      setEvent(required)
      await flush()
      await flush()
      // The restored cart code reseeds but must revalidate before unlocking.
      expect(rowOf(state, "vip")?.activationCodeRequired).toBe(true)
      expect(rowOf(state, "vip")?.canIncrease).toBe(false)
      await waitFor(() => deferred.calls.length === 2, "revalidation request")
      expect(deferred.calls[1]).toMatchObject({ code: "ABCDEFGH" })
      deferred.resolvers[1]?.(createResult({ valid: true as const }))
      await waitFor(() => rowOf(state, "vip")?.activationCodeStatus === "valid", "revalidated")
      expect(rowOf(state, "vip")?.canIncrease).toBe(true)
    } finally {
      dispose()
    }
  })
  await flush()
})

test("a pending validation that resolves after disposal never touches the cart", async () => {
  const [cart, setCart] = createSignal<TicketCart>({ eventId: "gate-event", lines: [] })
  const seen: TicketCart[] = []
  const deferred = deferredValidate()
  let resolveLater: (() => void) | undefined
  await createRoot(async (dispose) => {
    const event = makeEvent("gate-event", [protectedTier()])
    const state = ticketTierSelectorStateCreate({
      event: () => event,
      cart,
      onCartChange: (next) => {
        seen.push(structuredClone(next))
        setCart(next)
      },
      validate: deferred.validate,
    })
    state.activationCodeChange("vip", "ABCDEFGH")
    await waitFor(() => deferred.resolvers.length === 1, "pending request")
    resolveLater = () => {
      dispose()
      deferred.resolvers[0]?.(createResult({ valid: true as const }))
    }
  })
  resolveLater?.()
  await flush()
  await flush()
  expect(seen).toEqual([])
  expect(cart().lines).toEqual([])
})
