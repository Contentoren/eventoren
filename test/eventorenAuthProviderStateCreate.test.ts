import { afterEach, beforeEach, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { createResult, createResultError } from "#result"
import type { EventorenAuthIdentity } from "../src/auth/model/EventorenAuthIdentity.ts"
import type { EventorenBrowserSession } from "../src/auth/model/EventorenBrowserSession.ts"
import { eventorenAuthProviderStateCreate } from "../src/auth/ui/eventorenAuthProviderStateCreate.ts"

const originalDocument = globalThis.document
const originalWindow = globalThis.window

beforeEach(() => {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      cookie: "",
      visibilityState: "visible",
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    },
  })
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { addEventListener: () => undefined, removeEventListener: () => undefined },
  })
})

afterEach(() => {
  if (originalDocument === undefined) delete (globalThis as { document?: Document }).document
  else Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument })
  if (originalWindow === undefined) delete (globalThis as { window?: Window }).window
  else Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow })
})

test("bootstraps a validated browser session while preserving the SSR identity until it resolves", async () => {
  const identity = identityCreate("cookie-user")
  let readCount = 0
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      initialIdentityResult: () => createResult(identity),
      sessionRead: async () => {
        readCount += 1
        return createResult(sessionCreate("session-user"))
      },
    })
    return () => undefined
  })

  try {
    const result = await state.bootstrap()

    expect(result).toEqual({ success: true, data: identityCreate("session-user") })
    expect(readCount).toBe(1)
    expect(state.context.identity()).toEqual(identityCreate("session-user"))
    expect(state.context.token()).toBe("token-session-user")
    expect(state.context.ready()).toBe(true)
  } finally {
    dispose()
  }
})

test("keeps an absent cookie anonymous after browser session bootstrap", async () => {
  let readCount = 0
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      sessionRead: async () => {
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
      sessionRead: async () => {
        readCount += 1
        return createResult(sessionCreate("production-user"))
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
      sessionRead: async () => createResult(sessionCreate("logout-user")),
    })
    return () => undefined
  })

  try {
    await state.bootstrap()
    expect(state.context.identity()).toEqual(identity)
    expect(state.context.token()).toBe("token-logout-user")

    state.context.clear()

    expect(state.context.identity()).toBeNull()
    expect(state.context.token()).toBeNull()
    expect(state.context.ready()).toBe(true)
  } finally {
    dispose()
  }
})

test("keeps the provider anonymous when browser session bootstrap returns no session", async () => {
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({ sessionRead: async () => createResult(null) })
    return () => undefined
  })

  try {
    const result = await state.bootstrap()

    expect(result).toEqual({ success: true, data: null })
    expect(state.context.identity()).toBeNull()
    expect(state.context.ready()).toBe(true)
  } finally {
    dispose()
  }
})

test("clears an existing session when refresh cannot validate the session", async () => {
  let sessionReadCount = 0
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      sessionRead: async () => {
        sessionReadCount += 1
        return sessionReadCount === 1
          ? createResult(sessionCreate("refresh-user"))
          : createResultError("sessionRead", "Invalid session")
      },
    })
    return () => undefined
  })

  try {
    await state.bootstrap()
    expect(state.context.token()).toBe("token-refresh-user")

    const result = await state.context.refresh()

    expect(result.success).toBe(false)
    expect(state.context.identity()).toBeNull()
    expect(state.context.token()).toBeNull()
    expect(state.context.ready()).toBe(true)
  } finally {
    dispose()
  }
})

test("a newer refresh wins when concurrent session reads resolve out of order", async () => {
  const reads: Array<(result: ReturnType<typeof createResult<EventorenBrowserSession | null>>) => void> = []
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      sessionRead: () => new Promise((resolve) => reads.push(resolve)),
    })
    return () => undefined
  })

  try {
    const initialResolve = reads[0]
    if (!initialResolve) throw new Error("Expected the automatic bootstrap read to be pending")
    initialResolve(createResult<EventorenBrowserSession | null>(null))

    const olderRefresh = state.context.refresh()
    const newerRefresh = state.context.refresh()
    const resolveNewer = reads[2]
    if (!resolveNewer) throw new Error("Expected the newer session read to be pending")
    resolveNewer(createResult(sessionCreate("newer-user")))
    await newerRefresh
    const resolveOlder = reads[1]
    if (!resolveOlder) throw new Error("Expected the older session read to be pending")
    resolveOlder(createResult(sessionCreate("older-user")))
    await olderRefresh

    expect(state.context.identity()).toEqual(identityCreate("newer-user"))
    expect(state.context.token()).toBe("token-newer-user")
  } finally {
    dispose()
  }
})

test("logout prevents an in-flight refresh from restoring authorization", async () => {
  let resolveRead!: (result: ReturnType<typeof createResult<EventorenBrowserSession>>) => void
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      sessionRead: () => new Promise((resolve) => (resolveRead = resolve)),
    })
    return () => undefined
  })

  try {
    const refresh = state.context.refresh()
    state.context.clear()
    resolveRead(createResult(sessionCreate("logged-out-user")))
    await refresh

    expect(state.context.identity()).toBeNull()
    expect(state.context.token()).toBeNull()
  } finally {
    dispose()
  }
})

test("bootstrap re-reads after a previous bootstrap has settled", async () => {
  let readCount = 0
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      sessionRead: async () => {
        readCount += 1
        return createResult(sessionCreate(`bootstrap-${readCount}`))
      },
    })
    return () => undefined
  })

  try {
    await state.bootstrap()
    await state.bootstrap()

    expect(readCount).toBe(2)
    expect(state.context.identity()).toEqual(identityCreate("bootstrap-2"))
  } finally {
    dispose()
  }
})

function identityCreate(userId: string): EventorenAuthIdentity {
  return { userId, name: "Ada", email: `${userId}@example.test`, role: "admin" }
}

function sessionCreate(userId: string): EventorenBrowserSession {
  return {
    token: `token-${userId}`,
    profile: {
      ...identityCreate(userId),
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    expiresAt: Date.now() + 60_000,
  }
}
