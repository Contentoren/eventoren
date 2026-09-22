import { expect, mock, test } from "bun:test"
import { createRoot, createSignal } from "solid-js"
import { createResult } from "../src/ui/createResult.ts"
import type { TicketOrderListPage } from "../src/ticketing/TicketOrderListPage.ts"
import type { TicketOrderProjection } from "../src/ticketing/TicketOrderProjection.ts"
import type { TicketOrderSummary } from "../src/ticketing/TicketOrderSummary.ts"
import { ticketOrderHistoryPageStateCreate } from "../src/ticketing/ticketOrderHistoryPageStateCreate.ts"

const summaryCreate = (id: string): TicketOrderSummary => ({
  id,
  checkoutKey: `checkout-${id}`,
  eventKey: `event-${id}`,
  eventTitle: `Event ${id}`,
  eventSubtitle: "",
  eventStartsAt: "2026-10-01T18:00:00.000Z",
  eventEndsAt: "2026-10-01T20:00:00.000Z",
  eventDoorsAt: "2026-10-01T17:00:00.000Z",
  venue: "Halle",
  city: "Köln",
  address: "Straße 1",
  organizer: "Eventoren",
  imageUrl: "",
  imageAlt: "",
  catalogVersion: 1,
  subtotalCents: 1000,
  feeCents: 100,
  totalCents: 1100,
  status: "paid",
  paymentStatus: "paid",
  createdAt: "2026-09-15T08:00:00.000Z",
  updatedAt: "2026-09-15T08:00:00.000Z",
})

const pageCreate = (
  page: readonly TicketOrderSummary[],
  continueCursor: string,
  isDone: boolean,
): TicketOrderListPage => ({
  page,
  continueCursor,
  isDone,
})

const detailCreate = (id: string): TicketOrderProjection => ({
  ...summaryCreate(id),
  eventDescription: "",
  contact: { email: "test@example.com", givenName: "Test", familyName: "User", phone: "" },
  paymentReference: `payment-${id}`,
  stripeMode: "test",
  lines: [],
  tickets: [],
})

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

test("loads summaries page-by-page with the required page size", async () => {
  const calls: Array<{ token: string; cursor: string | null; numItems: number }> = []
  const listMine = mock(
    async (input: { token: string; paginationOpts: { cursor: string | null; numItems: number } }) => {
      calls.push({ token: input.token, ...input.paginationOpts })
      return createResult(
        input.paginationOpts.cursor === null
          ? pageCreate([summaryCreate("one")], "next", false)
          : pageCreate([summaryCreate("two")], "done", true),
      )
    },
  )

  await new Promise<void>((resolve) => {
    createRoot((dispose) => {
      const state = ticketOrderHistoryPageStateCreate({ token: () => "token-a", listMine })
      state.sessionSync()
      void flush().then(async () => {
        expect(state.orders().map((order) => order.id)).toEqual(["one"])
        state.loadMore()
        await flush()
        expect(state.orders().map((order) => order.id)).toEqual(["one", "two"])
        expect(calls).toEqual([
          { token: "token-a", cursor: null, numItems: 50 },
          { token: "token-a", cursor: "next", numItems: 50 },
        ])
        dispose()
        resolve()
      })
    })
  })
})

test("loads authenticated history without a browser session token", async () => {
  const listMine = mock(
    async (input: { token: string; paginationOpts: { cursor: string | null; numItems: number } }) => {
      expect(input.token).toBe("")
      return createResult(pageCreate([summaryCreate("cookie-order")], "done", true))
    },
  )

  await new Promise<void>((resolve) => {
    createRoot((dispose) => {
      const state = ticketOrderHistoryPageStateCreate({
        authenticated: () => true,
        ready: () => true,
        listMine,
      })
      state.sessionSync()
      void flush().then(() => {
        expect(state.orders().map((order) => order.id)).toEqual(["cookie-order"])
        dispose()
        resolve()
      })
    })
  })
})

test("ignores stale pages and details after the authenticated user changes", async () => {
  let firstPageResolve: ((value: ReturnType<typeof createResult<TicketOrderListPage>>) => void) | undefined
  const firstPage = new Promise<ReturnType<typeof createResult<TicketOrderListPage>>>((resolve) => {
    firstPageResolve = resolve
  })
  const listMine = mock(async (input: { token: string }) => {
    if (input.token === "token-a") return firstPage
    return createResult(pageCreate([summaryCreate("new-user")], "done", true))
  })
  const getOrder = mock(async () => createResult(detailCreate("unused")))

  await new Promise<void>((resolve) => {
    createRoot((dispose) => {
      const [token, setToken] = createSignal("token-a")
      const state = ticketOrderHistoryPageStateCreate({ token, listMine, getOrder })
      state.sessionSync()
      void flush().then(async () => {
        setToken("token-b")
        state.sessionSync()
        await flush()
        firstPageResolve?.(createResult(pageCreate([summaryCreate("stale")], "stale", true)))
        await flush()
        expect(state.orders().map((order) => order.id)).toEqual(["new-user"])
        expect(state.selectedOrder()).toBeNull()
        dispose()
        resolve()
      })
    })
  })
})

test("loads ticket details only for the latest selected order", async () => {
  let firstDetailResolve: ((value: ReturnType<typeof createResult<TicketOrderProjection>>) => void) | undefined
  const firstDetail = new Promise<ReturnType<typeof createResult<TicketOrderProjection>>>((resolve) => {
    firstDetailResolve = resolve
  })
  const getOrder = mock(async (input: { orderId: string }) => {
    if (input.orderId === "one") return firstDetail
    return createResult(detailCreate(input.orderId))
  })
  const listMine = mock(async () =>
    createResult(pageCreate([summaryCreate("one"), summaryCreate("two")], "done", true)),
  )

  await new Promise<void>((resolve) => {
    createRoot((dispose) => {
      const state = ticketOrderHistoryPageStateCreate({ token: () => "token-a", listMine, getOrder })
      state.sessionSync()
      void flush().then(async () => {
        expect(getOrder).toHaveBeenCalledTimes(0)
        void state.selectOrder("one")
        void state.selectOrder("two")
        await flush()
        firstDetailResolve?.(createResult(detailCreate("one")))
        await flush()
        expect(state.selectedOrderId()).toBe("two")
        expect(state.selectedOrder()?.id).toBe("two")
        expect(getOrder).toHaveBeenCalledTimes(2)
        dispose()
        resolve()
      })
    })
  })
})

test("clears summaries and an open detail when authentication is removed", async () => {
  const listMine = mock(async () => createResult(pageCreate([summaryCreate("one")], "done", true)))
  const getOrder = mock(async () => createResult(detailCreate("one")))

  await new Promise<void>((resolve) => {
    createRoot((dispose) => {
      const [token, setToken] = createSignal("token-a")
      const state = ticketOrderHistoryPageStateCreate({ token, listMine, getOrder })
      state.sessionSync()
      void flush().then(async () => {
        await state.selectOrder("one")
        expect(state.orders().map((order) => order.id)).toEqual(["one"])
        expect(state.selectedOrder()?.id).toBe("one")

        setToken("")
        state.sessionSync()

        expect(state.isAuthenticated()).toBe(false)
        expect(state.orders()).toEqual([])
        expect(state.selectedOrderId()).toBeNull()
        expect(state.selectedOrder()).toBeNull()
        expect(state.isLoading()).toBe(false)
        expect(state.isDetailLoading()).toBe(false)
        dispose()
        resolve()
      })
    })
  })
})
