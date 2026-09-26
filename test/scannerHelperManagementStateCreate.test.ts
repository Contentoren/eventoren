import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { scannerHelperManagementStateCreate } from "../src/organizer/scannerHelperManagementStateCreate.ts"
import { scannerLinkDataSourceLiveCreate } from "../src/organizer/scannerLinkDataSourceLiveCreate.ts"

test("only organizer links load helpers and can create a subset with expiry within the parent", async () => {
  const calls: unknown[] = []
  const expiry = Date.now() + 86400000
  const source = {
    linkContext: async () => ({
      success: true,
      data: { name: "Host", role: "organizer", expiresAt: expiry, events: [{ eventKey: "a", title: "A" }] },
    }),
    helperList: async () => ({ success: true, data: { page: [], continueCursor: "", isDone: true } }),
    helperCreate: async (...args: unknown[]) => {
      calls.push(args)
      return { success: true, data: { id: "id", code: "secret" } }
    },
    helperRevoke: async () => ({ success: true, data: { id: "id" } }),
  } as unknown as ReturnType<typeof scannerLinkDataSourceLiveCreate>
  let state!: ReturnType<typeof scannerHelperManagementStateCreate>
  const dispose = createRoot((rootDispose) => {
    state = scannerHelperManagementStateCreate(() => "parent", source)
    return rootDispose
  })
  try {
    await state.reload()
    state.name.set("Helper")
    state.selectedEvents.set(["other"])
    state.expiry.set(new Date(expiry + 60000).toISOString())
    await state.create()
    expect(calls).toHaveLength(0)
    expect(state.actionError()).toContain("erlaubtes Event")
    state.selectedEvents.set(["a"])
    state.expiry.set(new Date(Date.now() + 3600000).toISOString())
    await state.create()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual(["Helper", ["a"], expect.any(Number)])
    expect(state.name.get()).toBe("")
  } finally {
    dispose()
  }
})

test("helper and revoked parent contexts never expose management operations", async () => {
  let role: "helper" | "organizer" = "helper"
  let revoked = false
  let listCalls = 0
  const source = {
    linkContext: async () =>
      revoked
        ? { success: false, errorMessage: "Link unavailable" }
        : { success: true, data: { name: "Link", role, expiresAt: Date.now() + 3600000, events: [] } },
    helperList: async () => {
      listCalls++
      return { success: true, data: { page: [], continueCursor: "", isDone: true } }
    },
  } as unknown as ReturnType<typeof scannerLinkDataSourceLiveCreate>
  let state!: ReturnType<typeof scannerHelperManagementStateCreate>
  const dispose = createRoot((rootDispose) => {
    state = scannerHelperManagementStateCreate(() => "parent", source)
    return rootDispose
  })
  try {
    await state.reload()
    expect(state.active()).toBe(false)
    expect(listCalls).toBe(0)
    role = "organizer"
    await state.reload()
    expect(state.active()).toBe(true)
    expect(listCalls).toBe(1)
    revoked = true
    await state.reload()
    expect(state.active()).toBe(false)
    expect(state.error()).toContain("widerrufen")
  } finally {
    dispose()
  }
})
