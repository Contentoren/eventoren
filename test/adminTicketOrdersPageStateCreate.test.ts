import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import type { AdminTicketOrderDetails } from "../src/admin/AdminTicketOrderDetails.ts"
import type { AdminTicketOrderListPage } from "../src/admin/AdminTicketOrderListPage.ts"
import { adminTicketOrdersPageStateCreate } from "../src/admin/adminTicketOrdersPageStateCreate.ts"

test("a late detail response cannot replace a newer order or reopen a closed detail", async () => {
  await createRoot(async (dispose) => {
    const pending = new Map<string, (value: { success: true; data: AdminTicketOrderDetails }) => void>()
    const state = adminTicketOrdersPageStateCreate({
      getDetails: ({ orderId }) =>
        new Promise((resolve) => {
          pending.set(orderId, resolve)
        }),
    })

    const first = state.orderOpen("first")
    const second = state.orderOpen("second")
    expect(state.selectedOrderId()).toBe("second")
    pending.get("first")?.({ success: true, data: { id: "first" } as AdminTicketOrderDetails })
    await first
    expect(state.details()).toBeNull()
    expect(state.detailsLoading()).toBe(true)

    pending.get("second")?.({ success: true, data: { id: "second" } as AdminTicketOrderDetails })
    await second
    expect(state.details()?.id).toBe("second")
    expect(state.selectedOrderId()).toBe("second")

    const third = state.orderOpen("third")
    state.orderClose()
    pending.get("third")?.({ success: true, data: { id: "third" } as AdminTicketOrderDetails })
    await third
    expect(state.details()).toBeNull()
    expect(state.selectedOrderId()).toBeNull()
    expect(state.detailsLoading()).toBe(false)
    expect(state.detailsError()).toBe("")
    dispose()
  })
})

test("a late page response cannot replace orders after changing the event", async () => {
  await createRoot(async (dispose) => {
    const pending: ((value: { success: true; data: AdminTicketOrderListPage }) => void)[] = []
    const state = adminTicketOrdersPageStateCreate({
      list: () => new Promise((resolve) => pending.push(resolve)),
    })
    const oldRequest = state.loadMore()
    state.eventSignal.set("new-event")
    state.reload()
    pending[0]?.({
      success: true,
      data: { page: [{ id: "old" } as AdminTicketOrderListPage["page"][number]], continueCursor: "old", isDone: true },
    })
    await oldRequest
    expect(state.orders()).toEqual([])
    pending[1]?.({
      success: true,
      data: { page: [{ id: "new" } as AdminTicketOrderListPage["page"][number]], continueCursor: "new", isDone: true },
    })
    await Promise.resolve()
    expect(state.orders().map((order) => order.id)).toEqual(["new"])
    dispose()
  })
})

test("calculates available tickets count and labels for all and filtered events", () => {
  createRoot((dispose) => {
    const mockEvents = [
      {
        id: "ev-1",
        title: "Event One",
        status: "published" as const,
        tiers: [
          { id: "t1", name: "Tier 1", description: "", priceCents: 1000, feeCents: 100, capacity: 100, available: 45 },
          { id: "t2", name: "Tier 2", description: "", priceCents: 2000, feeCents: 200, capacity: 50, available: 5 },
        ],
      },
      {
        id: "ev-2",
        title: "Event Two",
        status: "published" as const,
        tiers: [
          { id: "t3", name: "Tier 3", description: "", priceCents: 1000, feeCents: 100, capacity: 10, available: 10 },
        ],
      },
    ]

    const state = adminTicketOrdersPageStateCreate({
      events: () => mockEvents as any,
    })

    // All events: 45 + 5 + 10 = 60
    expect(state.availableTicketsCount()).toBe(60)
    expect(state.availableTicketsLabel()).toBe("60 Tickets zum Kauf verfügbar")

    // Filter to Event 1: 45 + 5 = 50
    state.eventSignal.set("ev-1")
    expect(state.availableTicketsCount()).toBe(50)
    expect(state.availableTicketsLabel()).toBe("50 Tickets zum Kauf verfügbar")

    // Order specific availability
    const orderOne = { id: "ord-1", eventKey: "ev-1" } as any
    const orderTwo = { id: "ord-2", eventKey: "ev-2" } as any
    const orderUnknown = { id: "ord-3", eventKey: "unknown" } as any

    expect(state.availableTicketsForOrder(orderOne)).toBe(50)
    expect(state.availableTicketsLabelForOrder(orderOne)).toBe("50 Tickets zum Kauf verfügbar")
    expect(state.availableTicketsForOrder(orderTwo)).toBe(10)
    expect(state.availableTicketsLabelForOrder(orderTwo)).toBe("10 Tickets zum Kauf verfügbar")
    expect(state.availableTicketsForOrder(orderUnknown)).toBeUndefined()
    expect(state.availableTicketsLabelForOrder(orderUnknown)).toBeUndefined()

    // orderToggle opens and closes
    state.orderToggle("ord-1")
    expect(state.selectedOrderId()).toBe("ord-1")
    state.orderToggle("ord-1")
    expect(state.selectedOrderId()).toBeNull()

    dispose()
  })
})
