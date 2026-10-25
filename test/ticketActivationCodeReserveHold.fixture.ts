import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import type { EventItem } from "../src/events/EventItem.ts"
import { ticketActivationCodeHoldStorageLoad } from "../src/ticketing/ticketActivationCodeHoldStorageLoad.ts"
import { ticketTierSelectorStateCreate } from "../src/ticketing/ticketTierSelectorStateCreate.ts"
import { createResult } from "../src/ui/createResult.ts"
import type { Result } from "../src/ui/Result.ts"

// Isolated real-Solid-client fixture. Runs in its own subprocess via
// `bun --conditions=browser test ticketActivationCodeReserveHold.fixture.ts`
// so the reactive validation effects genuinely execute. No mock.module and
// no global state leak into other tests. The credential store itself is
// covered by the storage unit tests; this fixture pins the visible gate:
// texts, statuses, and unlock behavior stay exactly as before.

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
    ],
  }
}

test("the visible gate behavior is unchanged by the reserve-backed wrapper", async () => {
  await createRoot(async (dispose) => {
    try {
      const calls: unknown[] = []
      const reserve = (input: { eventKey: string; tierKey: string; code: string; holdToken?: string }) => {
        calls.push(input)
        // The default wrapper behind the tier selector stores the credential
        // returned by the reserve client itself.
        return Promise.resolve(createResult({ valid: true as const }))
      }
      const state = ticketTierSelectorStateCreate({
        event: gateEvent,
        cart: () => ({ eventId: "gate-event", lines: [] }),
        onCartChange: () => {},
        validate: reserve,
      })
      state.activationCodeChange("vip", "abcdefgh")
      await waitFor(() => state.rows().find((row) => row.id === "vip")?.activationCodeStatus === "valid", "valid code")
      await flush()
      expect(state.rows().find((row) => row.id === "vip")?.activationCodeMessage).toBe("Code akzeptiert.")
      expect(calls).toEqual([{ eventKey: "gate-event", tierKey: "vip", code: "ABCDEFGH" }])
      expect(ticketActivationCodeHoldStorageLoad()).toEqual({ success: true, data: [] })
    } finally {
      dispose()
    }
  })
  await flush()
})

test("an invalid code stores no credential and keeps the invalid UI state", async () => {
  await createRoot(async (dispose) => {
    try {
      const reserve = (): Promise<Result<{ readonly valid: boolean }>> =>
        Promise.resolve(createResult({ valid: false as const }))
      const state = ticketTierSelectorStateCreate({
        event: gateEvent,
        cart: () => ({ eventId: "gate-event", lines: [] }),
        onCartChange: () => {},
        validate: reserve,
      })
      state.activationCodeChange("vip", "ZZZZ9999")
      await waitFor(
        () => state.rows().find((row) => row.id === "vip")?.activationCodeStatus === "invalid",
        "invalid code",
      )
      expect(ticketActivationCodeHoldStorageLoad()).toEqual({ success: true, data: [] })
      expect(state.rows().find((row) => row.id === "vip")?.activationCodeMessage).toBe("Dieser Code ist ungültig.")
    } finally {
      dispose()
    }
  })
  await flush()
})
