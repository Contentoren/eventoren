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
