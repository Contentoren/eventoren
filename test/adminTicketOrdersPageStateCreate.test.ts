import { expect, mock, test } from "bun:test"
import type { AdminTicketOrderDetails } from "../src/admin/AdminTicketOrderDetails.ts"
import type { AdminTicketOrderListPage } from "../src/admin/AdminTicketOrderListPage.ts"

const solidJsClientPath = "solid-js/dist/solid.js"
const solid = (await import(solidJsClientPath)) as unknown as typeof import("solid-js")
mock.module("solid-js", () => solid)
const { createRenderEffect, createRoot, createSignal, getOwner, untrack } = solid
const { eventorenAuthContext } = await import("../src/auth/ui/eventorenAuthContext.ts")
const { convexClientContext } = await import("../src/utils/convex_client/convexClientContext.ts")
const { adminTicketOrdersPageStateCreate } = await import("../src/admin/adminTicketOrdersPageStateCreate.ts")
mock.restore()

test("native details load order B after closing A, including cached subscription results in a provider", async () => {
  let dispose: () => void = () => undefined
  let state!: ReturnType<typeof adminTicketOrdersPageStateCreate>
  const calls: { args: Record<string, any>; update: (value: any) => void; unsubscribed: boolean }[] = []
  createRoot((rootDispose) => {
    dispose = rootDispose
    getOwner()!.context = {
      [eventorenAuthContext.id]: {
        token: () => "admin-a",
        ready: () => true,
      },
      [convexClientContext.id]: {
        onUpdate: (_query: unknown, args: Record<string, any>, update: (value: any) => void) => {
          const call = { args, update, unsubscribed: false }
          calls.push(call)
          if (args.orderId) update({ success: true, data: { id: args.orderId, paymentReference: args.orderId } })
          return () => {
            call.unsubscribed = true
          }
        },
      },
    }
    createRenderEffect(() =>
      untrack(() => {
        state = adminTicketOrdersPageStateCreate({ useNativeQueries: true })
      }),
    )
  })
  try {
    await state.orderOpen("A")
    expect(state.details()?.id).toBe("A")
    expect(state.detailsLoading()).toBe(false)
    state.orderClose()
    expect(state.details()).toBeNull()
    expect(state.detailsLoading()).toBe(false)
    await state.orderOpen("B")
    expect(state.selectedOrderId()).toBe("B")
    expect(state.details()?.id).toBe("B")
    expect(state.detailsLoading()).toBe(false)
    const old = calls.find((call) => call.args.orderId === "A")!
    expect(old.unsubscribed).toBe(true)
    old.update({ success: true, data: { id: "A", paymentReference: "A" } })
    expect(state.details()?.id).toBe("B")
  } finally {
    dispose()
  }
})

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

test("submitting search restarts pagination while preserving the event and ignores an earlier response", async () => {
  await createRoot(async (dispose) => {
    const pending: ((value: { success: true; data: AdminTicketOrderListPage }) => void)[] = []
    const calls: { eventKey?: string; search?: string; paginationOpts: { cursor: string | null } }[] = []
    const state = adminTicketOrdersPageStateCreate({
      list: (input) => {
        calls.push(input)
        return new Promise((resolve) => pending.push(resolve))
      },
    })
    state.eventSignal.set("selected")
    const first = state.loadMore()
    state.searchInput.set("  TEST-00001  ")
    state.searchSubmit()
    expect(calls[1]).toMatchObject({ eventKey: "selected", search: "TEST-00001", paginationOpts: { cursor: null } })
    pending[0]?.({
      success: true,
      data: { page: [{ id: "old" } as AdminTicketOrderListPage["page"][number]], continueCursor: "old", isDone: false },
    })
    await first
    expect(state.orders()).toEqual([])
    pending[1]?.({ success: true, data: { page: [], continueCursor: "next", isDone: false } })
    await Promise.resolve()
    expect(calls[2]).toMatchObject({ eventKey: "selected", search: "TEST-00001", paginationOpts: { cursor: "next" } })
    pending[2]?.({
      success: true,
      data: {
        page: [{ id: "match" } as AdminTicketOrderListPage["page"][number]],
        continueCursor: "end",
        isDone: true,
      },
    })
    await Promise.resolve()
    expect(state.orders().map((order) => order.id)).toEqual(["match"])
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

test("native admin orders react to filters and discard accumulated rows when auth changes", async () => {
  const calls: { args: Record<string, any>; update: (value: any) => void }[] = []
  const client = {
    onUpdate: (_query: unknown, args: Record<string, any>, update: (value: any) => void) => {
      const call = { args, update }
      calls.push(call)
      return () => undefined
    },
  }

  await new Promise<void>((resolve) => {
    createRoot((dispose) => {
      const [token, setToken] = createSignal<string | null>("admin-a")
      const [search, setSearch] = createSignal("")
      getOwner()!.context = {
        [eventorenAuthContext.id]: {
          identity: () => null,
          token,
          ready: () => true,
          identityApply: () => undefined,
          refresh: async () => ({ success: true as const, data: null }),
          clear: () => setToken(null),
        },
        [convexClientContext.id]: client,
      }
      const state = adminTicketOrdersPageStateCreate({
        useNativeQueries: true,
        searchSignal: { get: search, set: setSearch },
      })
      void Promise.resolve().then(async () => {
        const first = calls.find((call) => call.args.token === "admin-a")
        expect(first?.args.paginationOpts.cursor).toBeNull()
        first?.update({
          success: true,
          data: { page: [{ id: "private-a" }], continueCursor: "next", isDone: false },
        })
        expect(state.orders().map((order) => order.id)).toEqual(["private-a"])

        setSearch("booking")
        await Promise.resolve()
        expect(calls.some((call) => call.args.search === "booking" && call.args.paginationOpts.cursor === null)).toBe(
          true,
        )
        setToken("admin-b")
        await Promise.resolve()
        expect(state.orders()).toEqual([])
        dispose()
        resolve()
      })
    })
  })
})
