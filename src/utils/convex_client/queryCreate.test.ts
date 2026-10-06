import { describe, expect, test } from "bun:test"
import type { FunctionReference } from "convex/server"
import { mock } from "bun:test"
import { createResult, createResultError } from "#result"
const solidJsClientPath = "solid-js/dist/solid.js"
type SolidJsModule = typeof import("solid-js")
const solidJsClient = (await import(solidJsClientPath)) as unknown as SolidJsModule
mock.module("solid-js", () => solidJsClient)
const { createRoot, createSignal, getOwner } = solidJsClient
const { eventorenAuthContext } = await import("#src/auth/ui/eventorenAuthContext.ts")
const { convexClientContext } = await import("./convexClientContext.ts")
const { queryCreate } = await import("./queryCreate.ts")
mock.restore()

type Update = (value: unknown) => void
type UpdateError = (error: Error) => void

class FakeConvexClient {
  readonly calls: {
    args: unknown
    update: Update
    onError: UpdateError | undefined
    unsubscribed: boolean
    unsubscribe: () => void
  }[] = []

  onUpdate(_query: unknown, args: unknown, update: Update, onError?: UpdateError) {
    const call = {
      args,
      update,
      onError,
      unsubscribed: false,
      unsubscribe: () => {
        call.unsubscribed = true
      },
    }
    this.calls.push(call)
    return () => {
      call.unsubscribe()
    }
  }
}

const query = {} as FunctionReference<"query">

describe("queryCreate", () => {
  test("stays pending for skipped arguments and subscribes with the latest validated token", async () => {
    const client = new FakeConvexClient()
    const [token, setToken] = createSignal<string | null>(null)
    const [ready, setReady] = createSignal(false)
    const [args, setArgs] = createSignal<{ filter: string } | undefined>(undefined)
    let result: (() => unknown) | undefined
    const dispose = createRoot((disposeRoot) => {
      const owner = getOwner()!
      owner.context = {
        [convexClientContext.id]: client,
        [eventorenAuthContext.id]: { token, ready },
      }
      result = queryCreate(query, args)
      return disposeRoot
    })

    expect(result?.()).toBeUndefined()
    expect(client.calls).toHaveLength(0)
    setToken("validated-1")
    setArgs({ filter: "first" })
    expect(client.calls).toHaveLength(0)
    setReady(true)
    await Promise.resolve()
    expect(client.calls).toHaveLength(1)
    expect(client.calls[0]?.args).toEqual({ filter: "first", token: "validated-1" })
    const firstCallback = client.calls[0]!.update
    const firstResult = createResult("first")
    firstCallback(firstResult)
    expect(result?.()).toBe(firstResult)

    setToken("validated-2")
    await Promise.resolve()
    expect(client.calls).toHaveLength(2)
    expect(result?.()).toBeUndefined()
    expect(client.calls[1]?.args).toEqual({ filter: "first", token: "validated-2" })
    expect(client.calls[0]?.unsubscribed).toBe(true)
    firstCallback(createResult("stale"))
    expect(result?.()).toBeUndefined()
    dispose()
    expect(client.calls[1]?.unsubscribed).toBe(true)
    expect(result?.()).toBeUndefined()
  })

  test("clears on logout, skips undefined args, and resubscribes after re-authentication", () => {
    const client = new FakeConvexClient()
    const [token, setToken] = createSignal<string | null>("first-token")
    const [ready, setReady] = createSignal(true)
    const [args, setArgs] = createSignal<{ filter: string } | undefined>({ filter: "one" })
    let result: (() => unknown) | undefined
    const dispose = createRoot((disposeRoot) => {
      const owner = getOwner()!
      owner.context = {
        [convexClientContext.id]: client,
        [eventorenAuthContext.id]: { token, ready },
      }
      result = queryCreate(query, args)
      return disposeRoot
    })

    expect(client.calls).toHaveLength(1)
    const originalCallback = client.calls[0]!.update
    const originalError = client.calls[0]!.onError!
    originalCallback(createResult("private data"))
    expect(result?.()).toEqual(createResult("private data"))

    setToken(null)
    expect(client.calls[0]?.unsubscribed).toBe(true)
    expect(result?.()).toBeUndefined()
    originalCallback(createResult("late private data"))
    originalError(new Error("late transport error"))
    expect(result?.()).toBeUndefined()

    setToken("second-token")
    expect(client.calls).toHaveLength(2)
    expect(client.calls[1]?.args).toEqual({ filter: "one", token: "second-token" })
    setArgs({ filter: "changed" })
    expect(client.calls[1]?.unsubscribed).toBe(true)
    expect(client.calls).toHaveLength(3)
    expect(client.calls[2]?.args).toEqual({ filter: "changed", token: "second-token" })
    setReady(false)
    expect(client.calls[2]?.unsubscribed).toBe(true)
    expect(result?.()).toBeUndefined()
    setReady(true)
    expect(client.calls).toHaveLength(4)
    setArgs(undefined)
    expect(client.calls[3]?.unsubscribed).toBe(true)
    expect(result?.()).toBeUndefined()

    setArgs({ filter: "two" })
    expect(client.calls).toHaveLength(5)
    expect(client.calls[4]?.args).toEqual({ filter: "two", token: "second-token" })
    dispose()
  })

  test("maps active subscription transport errors to a Result failure", () => {
    const client = new FakeConvexClient()
    let result: (() => unknown) | undefined
    const dispose = createRoot((disposeRoot) => {
      const owner = getOwner()!
      owner.context = {
        [convexClientContext.id]: client,
        [eventorenAuthContext.id]: { token: () => "token", ready: () => true },
      }
      result = queryCreate(query, { filter: "any" })
      return disposeRoot
    })

    client.calls[0]?.onError?.(new Error("offline"))
    expect(result?.()).toEqual(createResultError("queryCreate", "offline"))
    dispose()
  })

  test("returns a local failure if the shared client is unavailable", () => {
    let result: (() => unknown) | undefined
    const dispose = createRoot((disposeRoot) => {
      const owner = getOwner()!
      owner.context = { [eventorenAuthContext.id]: { token: () => "token", ready: () => true } }
      result = queryCreate(query, { filter: "any" })
      return disposeRoot
    })
    expect(result?.()).toEqual(createResultError("queryCreate", "No Convex client"))
    dispose()
  })

  test("remains pending during SSR when auth bootstrap and the browser client are absent", () => {
    let result: (() => unknown) | undefined
    const dispose = createRoot((disposeRoot) => {
      result = queryCreate(query, { filter: "any" })
      return disposeRoot
    })

    expect(result?.()).toBeUndefined()
    dispose()
  })
})
