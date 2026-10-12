import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import type { EventItem } from "../src/events/EventItem.ts"
import type { TicketCart } from "../src/ticketing/TicketCart.ts"
import { ticketActivationCodeMissing } from "../src/ticketing/ticketActivationCodeMissing.ts"
import { ticketBagQuantityAllowed } from "../src/ticketing/ticketBagQuantityAllowed.ts"
import { ticketTierSelectorStateCreate } from "../src/ticketing/ticketTierSelectorStateCreate.ts"
import { createResult } from "../src/ui/createResult.ts"
import { createResultError } from "../src/ui/createResultError.ts"
import type { Result } from "../src/ui/Result.ts"

type ValidateResult = Result<{ readonly valid: boolean }>

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

async function waitFor(condition: () => boolean, label: string) {
  for (let index = 0; index < 200; index++) {
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error(`timeout waiting for ${label}`)
}

function gateEvent(): EventItem {
  return {
    id: "gate-event",
    catalogVersion: 1,
    title: "Gate Event",
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
      {
        id: "second-protected",
        name: "Backstage",
        description: "",
        priceCents: 9000,
        feeCents: 0,
        capacity: 10,
        available: 10,
        maxPerOrder: 3,
        activationCodeRequired: true,
      },
      {
        id: "standard",
        name: "Standard",
        description: "",
        priceCents: 2000,
        feeCents: 0,
        capacity: 10,
        available: 10,
        maxPerOrder: 3,
      },
    ],
  }
}

function setup(
  validate: (input: { eventKey: string; tierKey: string; code: string }) => Promise<ValidateResult>,
  initialCart?: TicketCart,
) {
  let cart: TicketCart = initialCart ?? { eventId: "gate-event", lines: [] }
  const seen: TicketCart[] = []
  const state = ticketTierSelectorStateCreate({
    event: gateEvent,
    cart: () => cart,
    onCartChange: (next) => {
      cart = next
      seen.push(next)
    },
    validate,
  })
  return {
    state,
    cart: () => cart,
    seen,
  }
}

const validCode = (): Promise<ValidateResult> => Promise.resolve(createResult({ valid: true as const }))
const invalidCode = (): Promise<ValidateResult> => Promise.resolve(createResult({ valid: false as const }))
const networkError = (): Promise<ValidateResult> =>
  Promise.resolve(
    createResultError("ticketActivationCodeValidate", "Der Freischaltungscode konnte nicht geprüft werden."),
  )

test("protected products block increase before validation while open products behave normally", () => {
  createRoot((dispose) => {
    try {
      const fixture = setup(validCode)
      const rows = () => fixture.state.rows()
      expect(rows().find((row) => row.id === "vip")?.activationCodeRequired).toBe(true)
      expect(rows().find((row) => row.id === "standard")?.activationCodeRequired).toBe(false)
      expect(rows().find((row) => row.id === "standard")?.activationCodeMessage).toBe("")

      fixture.state.increaseTier("vip")
      expect(fixture.cart().lines).toEqual([])
      expect(rows().find((row) => row.id === "vip")?.canIncrease).toBe(false)

      fixture.state.increaseTier("standard")
      expect(fixture.cart().lines).toEqual([{ tierId: "standard", quantity: 1 }])
    } finally {
      dispose()
    }
  })
})

test("a valid code unlocks increase and attaches the code on the very first selection", async () => {
  await createRoot(async (dispose) => {
    try {
      const fixture = setup(validCode)
      fixture.state.activationCodeChange("vip", "abcdefgh")
      await waitFor(
        () => fixture.state.rows().find((row) => row.id === "vip")?.activationCodeStatus === "valid",
        "valid code",
      )
      expect(fixture.state.rows().find((row) => row.id === "vip")?.activationCodeMessage).toBe("Code akzeptiert.")

      fixture.state.increaseTier("vip")
      expect(fixture.cart().lines).toEqual([{ tierId: "vip", quantity: 1, activationCode: "ABCDEFGH" }])

      fixture.state.increaseTier("vip")
      fixture.state.increaseTier("vip")
      expect(fixture.cart().lines).toEqual([{ tierId: "vip", quantity: 3, activationCode: "ABCDEFGH" }])

      fixture.state.increaseTier("vip")
      expect(fixture.cart().lines).toEqual([{ tierId: "vip", quantity: 3, activationCode: "ABCDEFGH" }])
    } finally {
      dispose()
    }
  })
  await flush()
})

test("an invalid code keeps the gate locked with a generic message", async () => {
  await createRoot(async (dispose) => {
    try {
      const fixture = setup(invalidCode)
      fixture.state.activationCodeChange("vip", "ZZZZ9999")
      await waitFor(
        () => fixture.state.rows().find((row) => row.id === "vip")?.activationCodeStatus === "invalid",
        "invalid code",
      )
      expect(fixture.state.rows().find((row) => row.id === "vip")?.activationCodeMessage).toBe(
        "Dieser Code ist ungültig.",
      )
      fixture.state.increaseTier("vip")
      expect(fixture.cart().lines).toEqual([])
    } finally {
      dispose()
    }
  })
  await flush()
})

test("a network error never unlocks the gate", async () => {
  await createRoot(async (dispose) => {
    try {
      const fixture = setup(networkError)
      fixture.state.activationCodeChange("vip", "ABCDEFGH")
      await waitFor(
        () => fixture.state.rows().find((row) => row.id === "vip")?.activationCodeStatus === "invalid",
        "network error",
      )
      fixture.state.increaseTier("vip")
      expect(fixture.cart().lines).toEqual([])
    } finally {
      dispose()
    }
  })
  await flush()
})

test("a stale validation response is ignored after the input was edited", async () => {
  await createRoot(async (dispose) => {
    try {
      const resolvers: Array<(result: ValidateResult) => void> = []
      const calls: string[] = []
      const fixture = setup((input) => {
        calls.push(input.code)
        return new Promise<ValidateResult>((resolve) => {
          resolvers.push(resolve)
        })
      })
      fixture.state.activationCodeChange("vip", "AAAAAAAA")
      await waitFor(() => resolvers.length === 1, "first request")
      fixture.state.activationCodeChange("vip", "BBBBBBBB")
      await waitFor(() => resolvers.length === 2, "second request")

      resolvers[0]?.(createResult({ valid: true as const }))
      await flush()
      expect(fixture.state.rows().find((row) => row.id === "vip")?.activationCodeStatus).toBe("checking")

      resolvers[1]?.(createResult({ valid: true as const }))
      await waitFor(
        () => fixture.state.rows().find((row) => row.id === "vip")?.activationCodeStatus === "valid",
        "second response",
      )
      expect(calls).toEqual(["AAAAAAAA", "BBBBBBBB"])
      fixture.state.increaseTier("vip")
      expect(fixture.cart().lines).toEqual([{ tierId: "vip", quantity: 1, activationCode: "BBBBBBBB" }])
    } finally {
      dispose()
    }
  })
  await flush()
})

test("editing an accepted code invalidates the gate and detaches the old code from the cart", async () => {
  await createRoot(async (dispose) => {
    try {
      const fixture = setup(validCode)
      fixture.state.activationCodeChange("vip", "ABCDEFGH")
      await waitFor(
        () => fixture.state.rows().find((row) => row.id === "vip")?.activationCodeStatus === "valid",
        "valid code",
      )
      fixture.state.increaseTier("vip")
      expect(fixture.cart().lines).toEqual([{ tierId: "vip", quantity: 1, activationCode: "ABCDEFGH" }])

      fixture.state.activationCodeChange("vip", "ABCDEFGX")
      expect(fixture.state.rows().find((row) => row.id === "vip")?.activationCodeStatus).not.toBe("valid")
      expect(fixture.state.rows().find((row) => row.id === "vip")?.canIncrease).toBe(false)
      expect(fixture.cart().lines).toEqual([{ tierId: "vip", quantity: 1 }])

      fixture.state.increaseTier("vip")
      expect(fixture.cart().lines).toEqual([{ tierId: "vip", quantity: 1 }])
    } finally {
      dispose()
    }
  })
  await flush()
})

test("clearing the field locks the gate and detaches the code", async () => {
  await createRoot(async (dispose) => {
    try {
      const fixture = setup(validCode)
      fixture.state.activationCodeChange("vip", "ABCDEFGH")
      await waitFor(
        () => fixture.state.rows().find((row) => row.id === "vip")?.activationCodeStatus === "valid",
        "valid code",
      )
      fixture.state.increaseTier("vip")
      fixture.state.activationCodeChange("vip", "")
      expect(fixture.state.rows().find((row) => row.id === "vip")?.activationCodeStatus).toBe("idle")
      expect(fixture.state.rows().find((row) => row.id === "vip")?.canIncrease).toBe(false)
      expect(fixture.cart().lines).toEqual([{ tierId: "vip", quantity: 1 }])
    } finally {
      dispose()
    }
  })
  await flush()
})

test("a restored draft code is seeded but requires revalidation before increase", async () => {
  await createRoot(async (dispose) => {
    try {
      let calls = 0
      const fixture = setup(
        () => {
          calls += 1
          return validCode()
        },
        { eventId: "gate-event", lines: [{ tierId: "vip", quantity: 1, activationCode: "abcdefgh" }] },
      )
      expect(fixture.state.rows().find((row) => row.id === "vip")?.activationCodeValue).toBe("ABCDEFGH")
      expect(fixture.state.rows().find((row) => row.id === "vip")?.canIncrease).toBe(false)
      await waitFor(
        () => fixture.state.rows().find((row) => row.id === "vip")?.activationCodeStatus === "valid",
        "revalidation",
      )
      expect(calls).toBeGreaterThanOrEqual(1)
      expect(fixture.state.rows().find((row) => row.id === "vip")?.canIncrease).toBe(true)
    } finally {
      dispose()
    }
  })
  await flush()
})

test("a restored draft code with a failing revalidation stays locked", async () => {
  await createRoot(async (dispose) => {
    try {
      const fixture = setup(invalidCode, {
        eventId: "gate-event",
        lines: [{ tierId: "vip", quantity: 1, activationCode: "ZZZZ9999" }],
      })
      await waitFor(
        () => fixture.state.rows().find((row) => row.id === "vip")?.activationCodeStatus === "invalid",
        "failed revalidation",
      )
      expect(fixture.state.rows().find((row) => row.id === "vip")?.canIncrease).toBe(false)
    } finally {
      dispose()
    }
  })
  await flush()
})

test("validation is isolated per product", async () => {
  await createRoot(async (dispose) => {
    try {
      const fixture = setup((input) =>
        Promise.resolve(input.tierKey === "vip" ? createResult({ valid: true }) : createResult({ valid: false })),
      )
      fixture.state.activationCodeChange("vip", "ABCDEFGH")
      await waitFor(
        () => fixture.state.rows().find((row) => row.id === "vip")?.activationCodeStatus === "valid",
        "vip valid",
      )
      expect(fixture.state.rows().find((row) => row.id === "second-protected")?.canIncrease).toBe(false)
      fixture.state.increaseTier("second-protected")
      expect(fixture.cart().lines.some((line) => line.tierId === "second-protected")).toBe(false)
    } finally {
      dispose()
    }
  })
  await flush()
})

test("missing protected codes are reported for checkout while usable codes pass", () => {
  const event = gateEvent()
  expect(ticketActivationCodeMissing(event, { eventId: event.id, lines: [{ tierId: "vip", quantity: 2 }] })).toEqual([
    { tierId: "vip", tierName: "VIP" },
  ])
  expect(
    ticketActivationCodeMissing(event, {
      eventId: event.id,
      lines: [{ tierId: "vip", quantity: 2, activationCode: "abcdefgh" }],
    }),
  ).toEqual([])
  expect(
    ticketActivationCodeMissing(event, { eventId: event.id, lines: [{ tierId: "standard", quantity: 2 }] }),
  ).toEqual([])
})

test("the cart route cannot increase protected products and may always decrease", () => {
  const event = gateEvent()
  expect(ticketBagQuantityAllowed(event, "vip", 1, 2)).toBe(false)
  expect(ticketBagQuantityAllowed(event, "vip", 1, 1)).toBe(true)
  expect(ticketBagQuantityAllowed(event, "vip", 1, 0)).toBe(true)
  expect(ticketBagQuantityAllowed(event, "standard", 1, 2)).toBe(true)
  expect(ticketBagQuantityAllowed(undefined, "vip", 1, 2)).toBe(true)
})
