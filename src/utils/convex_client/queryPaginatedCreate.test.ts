import { describe, expect, mock, test } from "bun:test"
import type { FunctionReference, PaginationOptions } from "convex/server"
import { createResult, createResultError, type Result } from "#result"

const solidJsClientPath = "solid-js/dist/solid.js"
const solid = (await import(solidJsClientPath)) as unknown as typeof import("solid-js")
mock.module("solid-js", () => solid)
const { createRoot, createSignal, getOwner } = solid
const { eventorenAuthContext } = await import("#src/auth/ui/eventorenAuthContext.ts")
const { convexClientContext } = await import("./convexClientContext.ts")
const { queryPaginatedCreate } = await import("./queryPaginatedCreate.ts")
mock.restore()

type Item = { id: string; checkedIn: boolean }
type Page = {
  page: readonly Item[]
  isDone: boolean
  continueCursor: string
  splitCursor?: string | null
  pageStatus?: "SplitRecommended" | "SplitRequired" | null
}
type Args = { token: string; eventKey: string; search?: string; paginationOpts: PaginationOptions }
const query = {} as FunctionReference<"query", "public", Args, Result<Page>>
type Call = {
  args: Args
  update: (result: Result<Page>) => void
  error: (error: Error) => void
  unsubscribed: boolean
  unsubscribeCount: number
}
class FakeClient {
  calls: Call[] = []
  onUpdate(_query: unknown, args: Args, update: Call["update"], error: Call["error"]) {
    const call: Call = { args, update, error, unsubscribed: false, unsubscribeCount: 0 }
    this.calls.push(call)
    return () => {
      call.unsubscribed = true
      call.unsubscribeCount += 1
    }
  }
  active() {
    return this.calls.filter((call) => !call.unsubscribed)
  }
}
const item = (id: string, checkedIn = false): Item => ({ id, checkedIn })
const page = (items: readonly Item[], continueCursor: string, isDone = false): Result<Page> =>
  createResult({ page: items, continueCursor, isDone })

function setup(options: { allPages?: boolean; pageSize?: number; noClient?: boolean } = {}) {
  const client = new FakeClient()
  const [token, setToken] = createSignal<string | null>("first-token")
  const [ready, setReady] = createSignal(true)
  const [args, setArgs] = createSignal<Omit<Args, "token" | "paginationOpts"> | undefined>({ eventKey: "one" })
  let state!: ReturnType<typeof queryPaginatedCreate<typeof query>>
  const dispose = createRoot((disposeRoot) => {
    getOwner()!.context = {
      ...(!options.noClient ? { [convexClientContext.id]: client } : {}),
      [eventorenAuthContext.id]: { token, ready },
    }
    state = queryPaginatedCreate(query, args, options)
    return disposeRoot
  })
  return { client, state, setArgs, setToken, setReady, dispose }
}

describe("queryPaginatedCreate", () => {
  test("load-more keeps each accumulated page live, preserves native Result metadata, and waits for demand", () => {
    const { client, state, dispose } = setup()
    expect(client.calls).toHaveLength(1)
    expect(client.calls[0]!.args).toEqual({
      eventKey: "one",
      token: "first-token",
      paginationOpts: { numItems: 50, cursor: null },
    })
    expect(state.result()).toBeUndefined()
    expect(state.isLoading()).toBe(true)
    state.loadMore()
    expect(client.calls).toHaveLength(1)
    const first = createResult<Page>({
      page: [item("a")],
      continueCursor: "c1",
      isDone: false,
      splitCursor: null,
      pageStatus: null,
    })
    client.calls[0]!.update(first)
    expect(state.pages()[0]).toBe(first)
    expect(state.result()).toEqual(createResult([item("a")]))
    expect(state.isLoading()).toBe(false)
    expect(client.calls).toHaveLength(1)
    state.loadMore()
    state.loadMore()
    expect(client.calls).toHaveLength(2)
    expect(client.calls[1]!.args.paginationOpts).toEqual({ numItems: 50, cursor: "c1" })
    expect(state.result()).toEqual(createResult([item("a")]))
    expect(state.isLoading()).toBe(true)
    client.calls[1]!.update(page([item("b")], "c2", true))
    expect(state.result()).toEqual(createResult([item("a"), item("b")]))
    expect(state.isDone()).toBe(true)
    client.calls[0]!.update(page([item("a", true)], "c1"))
    client.calls[1]!.update(page([item("b", true)], "c2", true))
    expect(state.result()).toEqual(createResult([item("a", true), item("b", true)]))
    expect(client.calls).toHaveLength(2)
    state.loadMore()
    expect(client.calls).toHaveLength(2)
    dispose()
    expect(client.active()).toHaveLength(0)
    expect(state.pages()).toEqual([])
    expect(state.result()).toBeUndefined()
    for (const call of client.calls) expect(call.unsubscribeCount).toBe(1)
  })

  test("all-pages subscriptions exceed the old 100-page limit and continue through empty filtered pages", () => {
    const { client, state, dispose } = setup({ allPages: true, pageSize: 1 })
    for (let index = 0; index < 125; index += 1) {
      expect(client.calls).toHaveLength(index + 1)
      const items = index % 3 === 0 ? [] : [item(String(index))]
      client.calls[index]!.update(page(items, `c${index + 1}`, index === 124))
      if (index < 124) expect(state.result()).toBeUndefined()
    }
    const result = state.result()
    expect(result?.success).toBe(true)
    if (result?.success) expect(result.data).toHaveLength(83)
    expect(state.pages()).toHaveLength(125)
    expect(state.isDone()).toBe(true)
    expect(state.isLoading()).toBe(false)
    client.calls[2]!.update(page([item("2", true)], "c3"))
    const updated = state.result()
    if (updated?.success) expect(updated.data).toContainEqual(item("2", true))
    expect(client.active()).toHaveLength(125)
    dispose()
    expect(client.active()).toHaveLength(0)
  })

  test("changed page boundaries discard stale downstream owners and rebuild the previously requested depth", () => {
    const { client, state, dispose } = setup()
    client.calls[0]!.update(page([item("a")], "c1"))
    state.loadMore()
    client.calls[1]!.update(page([item("b")], "c2"))
    state.loadMore()
    client.calls[2]!.update(page([item("c")], "c3", true))
    client.calls[0]!.update(page([item("new-a")], "new-c1"))
    expect(client.calls[1]!.unsubscribed).toBe(true)
    expect(client.calls[2]!.unsubscribed).toBe(true)
    expect(client.active()).toHaveLength(2)
    expect(state.result()).toEqual(createResult([item("new-a")]))
    expect(state.pages()).toHaveLength(2)
    client.calls[1]!.update(page([item("stale-b")], "c2"))
    client.calls[2]!.error(new Error("stale error"))
    expect(state.result()).toEqual(createResult([item("new-a")]))
    expect(client.calls[3]!.args.paginationOpts.cursor).toBe("new-c1")
    client.calls[3]!.update(page([item("new-b")], "new-c2"))
    expect(client.calls[4]!.args.paginationOpts.cursor).toBe("new-c2")
    client.calls[4]!.update(page([item("new-c")], "new-c3", true))
    expect(state.result()).toEqual(createResult([item("new-a"), item("new-b"), item("new-c")]))
    client.calls[0]!.update(page([item("only")], "end", true))
    expect(state.result()).toEqual(createResult([item("only")]))
    expect(state.pages()).toHaveLength(1)
    expect(client.active()).toHaveLength(1)
    // An exhausted page can grow again after a mutation: retained demand recovers.
    client.calls[0]!.update(page([item("only")], "grown"))
    expect(client.active()).toHaveLength(2)
    expect(state.isDone()).toBe(false)
    dispose()
    expect(client.active()).toHaveLength(0)
  })

  test("token, readiness, argument changes and logout clear all page owners and private results", () => {
    const { client, state, setArgs, setToken, setReady, dispose } = setup()
    client.calls[0]!.update(page([item("private")], "c1"))
    state.loadMore()
    client.calls[1]!.update(page([item("more-private")], "c2", true))
    setArgs({ eventKey: "one" })
    expect(client.calls).toHaveLength(2)
    setToken("rotated-token")
    expect(client.calls[0]!.unsubscribed).toBe(true)
    expect(client.calls[1]!.unsubscribed).toBe(true)
    expect(state.result()).toBeUndefined()
    expect(state.pages()).toEqual([undefined])
    expect(client.calls[2]!.args.token).toBe("rotated-token")
    client.calls[0]!.update(page([item("late-private")], "c1"))
    expect(state.result()).toBeUndefined()
    client.calls[2]!.update(page([item("new-private")], "c1"))
    setArgs({ eventKey: "two", search: "filter" })
    expect(client.calls[2]!.unsubscribed).toBe(true)
    expect(client.calls[3]!.args).toEqual({
      eventKey: "two",
      search: "filter",
      token: "rotated-token",
      paginationOpts: { numItems: 50, cursor: null },
    })
    expect(state.result()).toBeUndefined()
    setReady(false)
    expect(client.active()).toHaveLength(0)
    expect(state.pages()).toEqual([])
    expect(state.isLoading()).toBe(false)
    setReady(true)
    expect(client.calls).toHaveLength(5)
    setArgs(undefined)
    expect(client.active()).toHaveLength(0)
    setArgs({ eventKey: "three" })
    expect(client.calls).toHaveLength(6)
    setToken(null)
    expect(client.active()).toHaveLength(0)
    expect(state.result()).toBeUndefined()
    state.loadMore()
    expect(client.calls).toHaveLength(6)
    client.calls[5]!.update(page([item("logged-out")], "end", true))
    expect(state.result()).toBeUndefined()
    setToken("logged-back-in")
    expect(client.calls).toHaveLength(7)
    expect(client.calls[6]!.args.paginationOpts.cursor).toBeNull()
    dispose()
    expect(client.active()).toHaveLength(0)
    expect(state.result()).toBeUndefined()
  })

  test("backend and transport errors propagate as Results, discard downstream pages and recover live", () => {
    const { client, state, dispose } = setup({ allPages: true })
    client.calls[0]!.update(page([item("a")], "c1"))
    client.calls[1]!.update(page([item("b")], "c2", true))
    const denied = createResultError("backend-auth", "Session revoked")
    client.calls[0]!.update(denied)
    expect(state.result()).toBe(denied)
    expect(state.pages()).toEqual([denied])
    expect(client.calls[1]!.unsubscribed).toBe(true)
    expect(client.active()).toHaveLength(1)
    expect(state.isLoading()).toBe(false)
    client.calls[0]!.update(page([item("recovered")], "new-c1"))
    expect(state.result()).toBeUndefined()
    client.calls[2]!.error(new Error("offline"))
    expect(state.result()).toEqual(createResultError("queryCreate", "offline"))
    client.calls[2]!.update(page([item("online")], "end", true))
    expect(state.result()).toEqual(createResult([item("recovered"), item("online")]))
    dispose()
  })

  test("repeated cursors fail explicitly instead of creating an infinite all-pages chain", () => {
    const { client, state, dispose } = setup({ allPages: true })
    client.calls[0]!.update(page([], "same"))
    client.calls[1]!.update(page([], "same"))
    expect(client.calls).toHaveLength(2)
    expect(state.result()).toEqual(createResultError("queryPaginatedCreate", "Pagination cursor did not advance"))
    expect(state.isLoading()).toBe(false)
    dispose()
  })

  test("invalid page size returns a local Result without subscribing", () => {
    const { client, state, dispose } = setup({ pageSize: 0 })
    expect(client.calls).toHaveLength(0)
    expect(state.result()).toEqual(createResultError("queryPaginatedCreate", "pageSize must be a positive integer"))
    dispose()
  })

  test("invalid SDK argument encoding returns a Result and disposes the existing page", () => {
    const { client, state, setArgs, dispose } = setup()
    client.calls[0]!.update(page([item("private")], "end", true))
    setArgs({ eventKey: new Date() as unknown as string })
    expect(client.active()).toHaveLength(0)
    const result = state.result()
    expect(result?.success).toBe(false)
    if (result && !result.success) expect(result.op).toBe("queryPaginatedCreate")
    expect(state.pages()).toEqual([])
    dispose()
  })

  test("required splits fetch both bounded halves atomically before exhausting an all-pages list", () => {
    const { client, state, dispose } = setup({ allPages: true })
    const incomplete = createResult<Page>({
      page: [item("partial")],
      isDone: true,
      continueCursor: "end",
      splitCursor: "split",
      pageStatus: "SplitRequired",
    })
    client.calls[0]!.update(incomplete)
    expect(state.pages()[0]).toBe(incomplete)
    expect(state.result()).toBeUndefined()
    expect(state.isLoading()).toBe(true)
    expect(state.isDone()).toBe(false)
    expect(client.calls[1]!.args.paginationOpts).toEqual({ numItems: 50, cursor: null, endCursor: "split" })
    expect(client.calls[2]!.args.paginationOpts).toEqual({ numItems: 50, cursor: "split", endCursor: "end" })
    const left = page([item("a")], "split")
    const right = page([item("b")], "end", true)
    client.calls[1]!.update(left)
    expect(state.result()).toBeUndefined()
    expect(client.calls[0]!.unsubscribed).toBe(false)
    client.calls[2]!.update(right)
    expect(state.result()).toEqual(createResult([item("a"), item("b")]))
    expect(state.pages()).toEqual([left, right])
    expect(client.calls[0]!.unsubscribed).toBe(true)
    expect(state.isDone()).toBe(true)
    client.calls[0]!.update(incomplete)
    client.calls[1]!.update(page([item("a", true)], "split"))
    expect(state.result()).toEqual(createResult([item("a", true), item("b")]))
    dispose()
    for (const call of client.calls) expect(call.unsubscribeCount).toBe(1)
  })

  test("recommended splits retain complete data and load-more follows the right half's continuation", () => {
    const { client, state, dispose } = setup()
    const original = createResult<Page>({
      page: [item("a"), item("b")],
      isDone: false,
      continueCursor: "end",
      splitCursor: "split",
      pageStatus: "SplitRecommended",
    })
    client.calls[0]!.update(original)
    expect(state.pages()).toEqual([original])
    expect(state.result()).toEqual(createResult([item("a"), item("b")]))
    expect(state.isLoading()).toBe(false)
    client.calls[2]!.update(page([item("b")], "end"))
    expect(state.pages()).toEqual([original])
    // More demand may arrive while the recommended split is still pending.
    state.loadMore()
    expect(client.calls[3]!.args.paginationOpts).toEqual({ numItems: 50, cursor: "end" })
    client.calls[3]!.update(page([item("c")], "next"))
    client.calls[1]!.update(page([item("a")], "split"))
    expect(state.result()).toEqual(createResult([item("a"), item("b"), item("c")]))
    expect(client.calls[3]!.unsubscribed).toBe(false)
    expect(client.calls).toHaveLength(4)
    state.loadMore()
    expect(client.calls[4]!.args.paginationOpts).toEqual({ numItems: 50, cursor: "next" })
    client.calls[4]!.update(page([item("d")], "done", true))
    expect(state.result()).toEqual(createResult([item("a"), item("b"), item("c"), item("d")]))
    dispose()
  })

  test("live split boundary changes cancel stale halves and required splits retain only the complete prefix", () => {
    const { client, state, dispose } = setup()
    client.calls[0]!.update(page([item("prefix")], "start"))
    state.loadMore()
    const incomplete = (splitCursor: string, continueCursor: string) =>
      createResult<Page>({
        page: [item("partial")],
        isDone: false,
        splitCursor,
        continueCursor,
        pageStatus: "SplitRequired",
      })
    client.calls[1]!.update(incomplete("old-split", "old-end"))
    expect(state.result()).toEqual(createResult([item("prefix")]))
    expect(state.isLoading()).toBe(true)
    state.loadMore()
    expect(client.calls).toHaveLength(4)
    client.calls[2]!.update(page([item("stale-left")], "old-split"))
    client.calls[1]!.update(incomplete("new-split", "new-end"))
    expect(client.calls[2]!.unsubscribed).toBe(true)
    expect(client.calls[3]!.unsubscribed).toBe(true)
    expect(client.calls[4]!.args.paginationOpts).toEqual({ numItems: 50, cursor: "start", endCursor: "new-split" })
    expect(client.calls[5]!.args.paginationOpts).toEqual({ numItems: 50, cursor: "new-split", endCursor: "new-end" })
    client.calls[3]!.update(page([item("stale-right")], "old-end", true))
    const left = page([item("left")], "new-split")
    const right = page([item("right")], "new-end")
    client.calls[4]!.update(left)
    client.calls[5]!.update(right)
    expect(state.pages().slice(1)).toEqual([left, right])
    expect(state.result()).toEqual(createResult([item("prefix"), item("left"), item("right")]))
    expect(client.calls).toHaveLength(6)
    state.loadMore()
    expect(client.calls[6]!.args.paginationOpts.cursor).toBe("new-end")
    client.calls[6]!.update(page([item("last")], "done", true))
    // Changing an earlier live boundary rebuilds the already requested depth.
    client.calls[0]!.update(page([item("new-prefix")], "changed-start"))
    expect(client.calls.slice(4, 7).every((call) => call.unsubscribed)).toBe(true)
    expect(client.calls[7]!.args.paginationOpts).toEqual({ numItems: 50, cursor: "changed-start" })
    expect(state.result()).toEqual(createResult([item("new-prefix")]))
    dispose()
    for (const call of client.calls) expect(call.unsubscribeCount).toBe(1)
  })

  test("bounded halves may require recursive splitting without exposing incomplete child items", () => {
    const { client, state, dispose } = setup({ allPages: true })
    client.calls[0]!.update(
      createResult<Page>({
        page: [],
        isDone: true,
        continueCursor: "end",
        splitCursor: "middle",
        pageStatus: "SplitRequired",
      }),
    )
    client.calls[1]!.update(
      createResult<Page>({
        page: [item("incomplete")],
        isDone: false,
        continueCursor: "middle",
        splitCursor: "quarter",
        pageStatus: "SplitRequired",
      }),
    )
    client.calls[2]!.update(page([item("c")], "end", true))
    expect(client.calls[3]!.args.paginationOpts).toEqual({ numItems: 50, cursor: null, endCursor: "quarter" })
    expect(client.calls[4]!.args.paginationOpts).toEqual({ numItems: 50, cursor: "quarter", endCursor: "middle" })
    expect(state.result()).toBeUndefined()
    client.calls[4]!.update(page([item("b")], "middle"))
    client.calls[3]!.update(page([item("a")], "quarter"))
    expect(state.result()).toEqual(createResult([item("a"), item("b"), item("c")]))
    expect(state.isDone()).toBe(true)
    dispose()
  })

  test("malformed required split metadata fails rather than publishing partial data or looping", () => {
    const { client, state, dispose } = setup({ allPages: true })
    for (const splitCursor of [undefined, "end"]) {
      client.calls[0]!.update(
        createResult<Page>({
          page: [item("partial")],
          isDone: true,
          continueCursor: "end",
          splitCursor,
          pageStatus: "SplitRequired",
        }),
      )
      expect(state.result()).toEqual(
        createResultError("queryPaginatedCreate", "Pagination split cursor did not advance"),
      )
      expect(state.isDone()).toBe(false)
      expect(client.calls).toHaveLength(1)
    }
    dispose()
  })

  test("live recovery and logout dispose pending split queries and ignore their late private results", () => {
    const { client, state, setToken, dispose } = setup({ allPages: true })
    const incomplete = createResult<Page>({
      page: [item("partial-private")],
      isDone: true,
      continueCursor: "end",
      splitCursor: "split",
      pageStatus: "SplitRequired",
    })
    client.calls[0]!.update(incomplete)
    client.calls[0]!.update(page([item("complete")], "end", true))
    expect(client.calls[1]!.unsubscribed).toBe(true)
    expect(client.calls[2]!.unsubscribed).toBe(true)
    expect(state.result()).toEqual(createResult([item("complete")]))
    client.calls[0]!.update(incomplete)
    expect(client.active()).toHaveLength(3)
    setToken(null)
    expect(client.active()).toHaveLength(0)
    expect(state.result()).toBeUndefined()
    expect(state.pages()).toEqual([])
    for (const call of client.calls) call.update(page([item("late-private")], "end", true))
    expect(state.result()).toBeUndefined()
    dispose()
    for (const call of client.calls) expect(call.unsubscribeCount).toBe(1)
  })

  test("split child errors propagate as Results and recover on their live subscriptions", () => {
    const { client, state, dispose } = setup({ allPages: true })
    client.calls[0]!.update(
      createResult<Page>({
        page: [],
        isDone: true,
        continueCursor: "end",
        splitCursor: "split",
        pageStatus: "SplitRequired",
      }),
    )
    const denied = createResultError("backend-auth", "Session revoked")
    client.calls[2]!.update(denied)
    client.calls[1]!.update(page([item("left")], "split"))
    expect(state.result()).toBe(denied)
    expect(state.isLoading()).toBe(false)
    client.calls[2]!.update(page([item("right")], "end", true))
    expect(state.result()).toEqual(createResult([item("left"), item("right")]))
    dispose()
  })

  test("missing shared client produces the queryCreate Result and SSR without auth stays disabled", () => {
    const { state, dispose } = setup({ noClient: true })
    expect(state.result()).toEqual(createResultError("queryCreate", "No Convex client"))
    dispose()
    let ssr!: ReturnType<typeof queryPaginatedCreate<typeof query>>
    const disposeSsr = createRoot((disposeRoot) => {
      ssr = queryPaginatedCreate(query, { eventKey: "ssr" }, { allPages: true })
      return disposeRoot
    })
    expect(ssr.result()).toBeUndefined()
    expect(ssr.pages()).toEqual([])
    expect(ssr.isLoading()).toBe(false)
    disposeSsr()
  })
})
