import { describe, expect, test } from "bun:test"
import type { FunctionReference } from "convex/server"
import { mock } from "bun:test"
const solidJsClientPath = "solid-js/dist/solid.js"
type SolidJsModule = typeof import("solid-js")
const solidJsClient = (await import(solidJsClientPath)) as unknown as SolidJsModule
mock.module("solid-js", () => solidJsClient)
const { createRoot, getOwner } = solidJsClient
import { createResult, createResultError } from "#result"
const { eventorenAuthContext } = await import("#src/auth/ui/eventorenAuthContext.ts")
const { convexClientContext } = await import("./convexClientContext.ts")
const { mutationCreate } = await import("./mutationCreate.ts")
mock.restore()

const mutation = {} as FunctionReference<"mutation">

describe("mutationCreate", () => {
  test("passes the latest validated token and preserves the backend Result", async () => {
    let token = "validated-token"
    const backendResult = createResult({ changed: true })
    let receivedArgs: unknown
    const client = {
      mutation: async (_mutation: unknown, args: unknown) => {
        receivedArgs = args
        return backendResult
      },
    }
    let runMutation: ((args: { itemId: string }) => Promise<unknown>) | undefined
    const dispose = createRoot((disposeRoot) => {
      const owner = getOwner()!
      owner.context = {
        [convexClientContext.id]: client,
        [eventorenAuthContext.id]: { token: () => token, ready: () => true },
      }
      runMutation = mutationCreate(mutation)
      return disposeRoot
    })

    expect(await runMutation?.({ itemId: "item-1" })).toBe(backendResult)
    expect(receivedArgs).toEqual({ itemId: "item-1", token: "validated-token" })
    token = "validated-token-2"
    await runMutation?.({ itemId: "item-2" })
    expect(receivedArgs).toEqual({ itemId: "item-2", token: "validated-token-2" })
    dispose()
  })

  test("converts transport rejection into a local Result failure", async () => {
    let runMutation: ((args: { itemId: string }) => Promise<unknown>) | undefined
    const dispose = createRoot((disposeRoot) => {
      const owner = getOwner()!
      owner.context = {
        [convexClientContext.id]: { mutation: async () => Promise.reject(new Error("offline")) },
        [eventorenAuthContext.id]: { token: () => "token", ready: () => true },
      }
      runMutation = mutationCreate(mutation)
      return disposeRoot
    })

    await expect(runMutation?.({ itemId: "item-1" })).resolves.toEqual(createResultError("mutationCreate", "offline"))
    dispose()
  })

  test("does not invoke Convex before auth bootstrap is ready", async () => {
    let wasCalled = false
    let runMutation: ((args: { itemId: string }) => Promise<unknown>) | undefined
    const dispose = createRoot((disposeRoot) => {
      const owner = getOwner()!
      owner.context = {
        [convexClientContext.id]: { mutation: async () => (wasCalled = true) },
        [eventorenAuthContext.id]: { token: () => null, ready: () => false },
      }
      runMutation = mutationCreate(mutation)
      return disposeRoot
    })

    await expect(runMutation?.({ itemId: "item-1" })).resolves.toEqual(
      createResultError("mutationCreate", "No validated session token"),
    )
    expect(wasCalled).toBe(false)
    dispose()
  })
})
