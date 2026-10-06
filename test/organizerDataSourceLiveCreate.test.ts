import { expect, mock, test } from "bun:test"
import type { FunctionReference } from "convex/server"
import type { OrganizerReactiveQuery } from "../src/organizer/OrganizerDataSource.ts"
import type { OrganizerTicket } from "../src/organizer/OrganizerTicket.ts"
import type { OrganizerTicketListPage } from "../src/organizer/OrganizerTicketListPage.ts"

const solidJsClientPath = "solid-js/dist/solid.js"
const solidJsClient = (await import(solidJsClientPath)) as typeof import("solid-js")
mock.module("solid-js", () => solidJsClient)
const { createRoot, getOwner } = solidJsClient
const { eventorenAuthContext } = await import("../src/auth/ui/eventorenAuthContext.ts")
const { convexClientContext } = await import("../src/utils/convex_client/convexClientContext.ts")
const { organizerDataSourceLiveCreate } = await import("../src/organizer/organizerDataSourceLiveCreate.ts")
mock.restore()

test("organizer live source subscribes with the validated token and cleans up", () => {
  const client = new FakeConvexClient()
  let result!: ReturnType<typeof organizerDataSourceLiveCreate>["eventGetResult"]
  let dispose!: () => void

  createRoot((rootDispose) => {
    dispose = rootDispose
    getOwner()!.context = {
      [convexClientContext.id]: client,
      [eventorenAuthContext.id]: { token: () => "session-token", ready: () => true },
    }
    result = organizerDataSourceLiveCreate().eventGetResult
    if (!result) throw new Error("eventGetResult should be available")
    result(() => "summer-event")
  })

  expect(client.subscriptions).toHaveLength(1)
  expect(client.subscriptions[0]?.args).toEqual({ eventKey: "summer-event", token: "session-token" })
  expect(client.mutations).toHaveLength(0)
  dispose()
  expect(client.subscriptions[0]?.unsubscribed).toBe(true)
})

test("organizer actions use native mutations rather than server functions", async () => {
  const client = new FakeConvexClient()
  let checkIn!: ReturnType<typeof organizerDataSourceLiveCreate>["ticketCheckIn"]
  let checkInCode!: ReturnType<typeof organizerDataSourceLiveCreate>["ticketCheckInCode"]
  let reset!: ReturnType<typeof organizerDataSourceLiveCreate>["ticketReset"]
  let dispose!: () => void

  createRoot((rootDispose) => {
    dispose = rootDispose
    getOwner()!.context = {
      [convexClientContext.id]: client,
      [eventorenAuthContext.id]: { token: () => "session-token", ready: () => true },
    }
    const source = organizerDataSourceLiveCreate()
    checkIn = source.ticketCheckIn
    checkInCode = source.ticketCheckInCode
    reset = source.ticketReset
  })

  try {
    expect(await checkIn("event", "ticket" as never)).toEqual({ success: true, data: client.ticket })
    expect(await checkInCode("event", "code")).toEqual({ success: true, data: client.ticket })
    expect(await reset("event", "ticket" as never)).toEqual({ success: true, data: client.ticket })
    expect(client.mutations.map((call) => call.args)).toEqual([
      { eventKey: "event", ticketId: "ticket", token: "session-token" },
      { eventKey: "event", ticketCode: "code", token: "session-token" },
      { eventKey: "event", ticketId: "ticket", token: "session-token" },
    ])
  } finally {
    dispose()
  }
})

test("ticket pages keep the organizer cursor and completion metadata while loading more", () => {
  const client = new FakeConvexClient()
  let list!: OrganizerReactiveQuery<OrganizerTicketListPage>
  let dispose!: () => void

  createRoot((rootDispose) => {
    dispose = rootDispose
    getOwner()!.context = {
      [convexClientContext.id]: client,
      [eventorenAuthContext.id]: { token: () => "session-token", ready: () => true },
    }
    const source = organizerDataSourceLiveCreate()
    list = source.ticketListResult!(
      () => "summer-event",
      () => " Ada ",
    )
  })

  try {
    expect(client.subscriptions[0]?.args).toEqual({
      eventKey: "summer-event",
      search: "Ada",
      paginationOpts: { numItems: 50, cursor: null },
      token: "session-token",
    })
    client.subscriptions[0]?.update({
      success: true,
      data: { page: [], isDone: false, continueCursor: "organizer-cursor" },
    })
    expect(list.result()).toEqual({
      success: true,
      data: { page: [], isDone: false, continueCursor: "organizer-cursor" },
    })

    list.loadMore()
    expect(client.subscriptions[1]?.args).toEqual({
      eventKey: "summer-event",
      search: "Ada",
      paginationOpts: { numItems: 50, cursor: "organizer-cursor" },
      token: "session-token",
    })
    client.subscriptions[1]?.update({
      success: true,
      data: { page: [], isDone: true, continueCursor: "organizer-done" },
    })
    expect(list.result()).toEqual({
      success: true,
      data: { page: [], isDone: true, continueCursor: "organizer-done" },
    })
  } finally {
    dispose()
  }
})

class FakeConvexClient {
  readonly subscriptions: {
    readonly args: unknown
    readonly update: (value: unknown) => void
    unsubscribed: boolean
  }[] = []
  readonly mutations: { readonly args: unknown }[] = []
  readonly ticket = { id: "ticket" } as OrganizerTicket

  onUpdate(_query: FunctionReference<"query">, args: unknown, update: (value: unknown) => void) {
    const subscription = { args, update, unsubscribed: false }
    this.subscriptions.push(subscription)
    return () => {
      subscription.unsubscribed = true
    }
  }

  async mutation(_mutation: FunctionReference<"mutation">, args: unknown) {
    this.mutations.push({ args })
    return { success: true, data: { ticket: this.ticket } }
  }
}
