import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { language } from "../src/app/i18n/language.ts"
import { languageSignal } from "../src/app/i18n/languageSignal.ts"
import { demoCatalogEvents } from "../src/demo/fixtures/demoCatalogEvents.ts"
import { demoCartStore } from "../src/demo/state/demoCartStore.ts"
import { demoCheckoutFormStateCreate } from "../src/demo/state/demoCheckoutFormStateCreate.ts"

test("numbers demo tickets uniquely across ticket tiers", async () => {
  languageSignal.set(language.en)
  demoCartStore.clear()
  demoCartStore.addOrUpdate({
    eventId: "kraftklub-arena-berlin",
    lines: [
      { tierId: "innenraum", quantity: 2 },
      { tierId: "early-entry", quantity: 1 },
    ],
  })

  let state: ReturnType<typeof demoCheckoutFormStateCreate> | undefined
  let dispose: (() => void) | undefined
  createRoot((rootDispose) => {
    dispose = rootDispose
    state = demoCheckoutFormStateCreate({ events: demoCatalogEvents })
  })

  try {
    if (!state) throw new Error("demo checkout state was not created")
    for (const field of state.participantFields()) {
      state.participantNameChange(
        field.eventId,
        field.tierId,
        field.ticketIndex,
        `${field.tierName} ${field.ticketIndex + 1}`,
      )
    }
    state.legalAcceptanceChange(true)
    await state.confirmPayment()

    const tickets = state.completedOrders()[0]?.tickets ?? []
    expect(tickets.map((ticket) => ticket.code)).toEqual([
      "DEMO-kraftklub-arena-berlin-1",
      "DEMO-kraftklub-arena-berlin-2",
      "DEMO-kraftklub-arena-berlin-3",
    ])
    expect(tickets.map((ticket) => ticket.sequence)).toEqual([1, 2, 3])
  } finally {
    dispose?.()
    demoCartStore.clear()
    languageSignal.set(language.en)
  }
})

test("completes a direct fixture checkout without form or legal input", async () => {
  demoCartStore.clear()
  demoCartStore.addOrUpdate({
    eventId: "kraftklub-arena-berlin",
    lines: [{ tierId: "innenraum", quantity: 1 }],
  })

  let state: ReturnType<typeof demoCheckoutFormStateCreate> | undefined
  let dispose: (() => void) | undefined
  createRoot((rootDispose) => {
    dispose = rootDispose
    state = demoCheckoutFormStateCreate({ events: demoCatalogEvents, skipForm: true })
  })

  try {
    if (!state) throw new Error("demo checkout state was not created")
    await state.confirmPayment()

    expect(state.completedOrders()).toHaveLength(1)
    expect(state.completedOrders()[0]?.tickets[0]?.participantName).toBeUndefined()
  } finally {
    dispose?.()
    demoCartStore.clear()
  }
})
