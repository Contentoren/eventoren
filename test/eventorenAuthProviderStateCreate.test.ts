import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { createResult, createResultError } from "#result"
import type { EventorenAuthIdentity } from "../src/auth/model/EventorenAuthIdentity.ts"
import { eventorenAuthProviderStateCreate } from "../src/auth/ui/eventorenAuthProviderStateCreate.ts"

test("uses the root cookie identity without a browser-session fallback", async () => {
  const identity = identityCreate("cookie-user")
  let readCount = 0
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      initialIdentityResult: () => createResult(identity),
      currentUserRead: async () => {
        readCount += 1
        return createResult(null)
      },
    })
    return () => undefined
  })

  try {
    const result = await state.bootstrap()

    expect(result).toEqual({ success: true, data: identity })
    expect(readCount).toBe(0)
    expect(state.context.identity()).toEqual(identity)
    expect(state.context.ready()).toBe(true)
  } finally {
    dispose()
  }
})

test("keeps an absent cookie anonymous without attempting session adoption", async () => {
  let readCount = 0
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      currentUserRead: async () => {
        readCount += 1
        return createResult(null)
      },
    })
    return () => undefined
  })

  try {
    await state.bootstrap()

    expect(state.context.identity()).toBeNull()
    expect(state.context.ready()).toBe(true)
    expect(readCount).toBe(1)
  } finally {
    dispose()
  }
})

test("does not read production cookie state for demo routes", async () => {
  let readCount = 0
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      isDemo: () => true,
      initialIdentity: () => identityCreate("production-user"),
      currentUserRead: async () => {
        readCount += 1
        return createResult(identityCreate("production-user"))
      },
    })
    return () => undefined
  })

  try {
    await state.bootstrap()
    const refresh = await state.context.refresh()

    expect(refresh).toEqual({ success: true, data: null })
    expect(state.context.identity()).toBeNull()
    expect(state.context.ready()).toBe(true)
    expect(readCount).toBe(0)
  } finally {
    dispose()
  }
})

test("clears the rendered identity after cookie-only logout", async () => {
  const identity = identityCreate("logout-user")
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      initialIdentity: () => identity,
      currentUserRead: async () => createResult(identity),
    })
    return () => undefined
  })

  try {
    await state.bootstrap()
    expect(state.context.identity()).toEqual(identity)

    state.context.clear()

    expect(state.context.identity()).toBeNull()
    expect(state.context.ready()).toBe(true)
  } finally {
    dispose()
  }
})

test("keeps the provider unavailable when the initial cookie lookup fails", async () => {
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      initialIdentityResult: () => createResultError("currentUserRead", "temporary lookup failure"),
      currentUserRead: async () => createResult(null),
    })
    return () => undefined
  })

  try {
    const result = await state.bootstrap()

    expect(result).toEqual({ success: false, op: "currentUserRead", errorMessage: "temporary lookup failure" })
    expect(state.context.identity()).toBeNull()
    expect(state.context.ready()).toBe(false)
  } finally {
    dispose()
  }
})

function identityCreate(userId: string): EventorenAuthIdentity {
  return { userId, name: "Ada", email: `${userId}@example.test`, role: "admin" }
}
