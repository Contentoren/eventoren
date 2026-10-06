import { expect, mock, test } from "bun:test"
import type { FunctionArgs, FunctionReference } from "convex/server"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import { createResult, type Result } from "#result"

const solidJsClientPath = "solid-js/dist/solid.js"
const solid = (await import(solidJsClientPath)) as unknown as typeof import("solid-js")
mock.module("solid-js", () => solid)
const { createRoot, createSignal, getOwner } = solid
const { eventorenAuthContext } = await import("#src/auth/ui/eventorenAuthContext.ts")
const { convexClientContext } = await import("#src/utils/convex_client/convexClientContext.ts")
const { adminScannerLinksStateCreate } = await import("#src/admin/adminScannerLinksStateCreate.ts")
mock.restore()

type Page = { page: readonly Doc<"scannerLinks">[]; continueCursor: string; isDone: boolean }
type QueryArgs = { token: string; paginationOpts: { numItems: number; cursor: string | null } }
type Call = {
  args: QueryArgs & { parentId?: Id<"scannerLinks"> }
  update: (result: Result<Page>) => void
  error: (error: Error) => void
  unsubscribed: boolean
}
const organizerQuery = {} as FunctionReference<"query", "public", QueryArgs, Result<Page>>
class FakeClient {
  calls: Call[] = []
  onUpdate(_query: unknown, args: FunctionArgs<typeof organizerQuery>, update: Call["update"], error: Call["error"]) {
    const call = { args, update, error, unsubscribed: false } as Call
    call.args = { ...args, parentId: (args as typeof call.args).parentId }
    this.calls.push(call)
    return () => {
      call.unsubscribed = true
    }
  }
}
const makeLink = (id: string) => ({ _id: id as Id<"scannerLinks">, role: "organizer" }) as Doc<"scannerLinks">
const page = (items: readonly Doc<"scannerLinks">[], cursor: string, isDone = false) =>
  createResult<Page>({ page: items, continueCursor: cursor, isDone })

test("native scanner lists use unbounded 25-item live pagination and clear protected data on logout", () => {
  const client = new FakeClient()
  const [token, setToken] = createSignal<string | null>("session-one")
  const [ready] = createSignal(true)
  let state!: ReturnType<typeof adminScannerLinksStateCreate>
  const dispose = createRoot((done) => {
    getOwner()!.context = {
      [convexClientContext.id]: client,
      [eventorenAuthContext.id]: { token, ready },
    }
    state = adminScannerLinksStateCreate(() => ({ success: true, data: [] }))
    return done
  })
  try {
    for (let index = 0; index < 101; index += 1) {
      const call = client.calls[index]
      expect(call).toBeDefined()
      expect(call!.args.paginationOpts.numItems).toBe(25)
      expect(call!.args.paginationOpts.cursor).toBe(index === 0 ? null : `cursor-${index}`)
      call!.update(page([makeLink(`link-${index}`)], `cursor-${index + 1}`, index === 100))
      expect(state.organizers()).toHaveLength(index + 1)
      if (index < 100) state.loadMoreOrganizers()
    }
    expect(client.calls).toHaveLength(101)
    expect(state.organizerHasMore()).toBe(false)
    expect(state.organizers()).toHaveLength(101)

    const parent = state.organizers()[0]!._id
    state.selectParent(parent)
    const helperCall = client.calls.find((call) => call.args.parentId === parent)
    expect(helperCall?.args.paginationOpts).toEqual({ numItems: 25, cursor: null })
    helperCall!.update(page([makeLink("private-helper")], "helper-cursor", true))
    expect(state.helpers()).toHaveLength(1)

    setToken(null)
    expect(state.organizers()).toEqual([])
    expect(state.helpers()).toEqual([])
    expect(client.calls.every((call) => call.unsubscribed)).toBe(true)
  } finally {
    dispose()
  }
})
