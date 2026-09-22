import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { createResult, createResultError } from "#result"
import type { EventorenAuthIdentity } from "../src/auth/model/EventorenAuthIdentity.ts"
import type { UserSession } from "../src/auth/model/UserSession.ts"
import { eventorenAuthProviderStateCreate } from "../src/auth/ui/eventorenAuthProviderStateCreate.ts"

test("reuses one cookie identity bootstrap across child navigation", async () => {
  const identity = identityCreate("user-cookie")
  let readCount = 0
  let legacyReadCount = 0
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      currentUserRead: async () => {
        readCount += 1
        await Promise.resolve()
        return createResult(identity)
      },
      sessionAdopt: async () => createResult(identity),
      legacySessionRead: () => {
        legacyReadCount += 1
        return null
      },
    })
    return () => undefined
  })

  try {
    const results = await Promise.all([state.bootstrap(), state.bootstrap()])

    expect(results).toEqual([
      { success: true, data: identity },
      { success: true, data: identity },
    ])
    expect(readCount).toBe(1)
    expect(legacyReadCount).toBe(0)
    expect(state.context.identity()).toEqual(identity)
    expect(state.context.ready()).toBe(true)
  } finally {
    dispose()
  }
})

test("reuses the safe identity rendered by the root request without another cookie read", async () => {
  const identity = identityCreate("root-user")
  let readCount = 0
  let legacyReadCount = 0
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      initialIdentity: () => identity,
      currentUserRead: async () => {
        readCount += 1
        return createResult(null)
      },
      sessionAdopt: async () => createResult(identity),
      legacySessionRead: () => {
        legacyReadCount += 1
        return null
      },
    })
    return () => undefined
  })

  try {
    const result = await state.bootstrap()

    expect(result).toEqual({ success: true, data: identity })
    expect(readCount).toBe(0)
    expect(legacyReadCount).toBe(0)
    expect(state.context.identity()).toEqual(identity)
    expect(state.context.ready()).toBe(true)
  } finally {
    dispose()
  }
})

test("does not read or adopt production auth state for demo routes", async () => {
  let readCount = 0
  let adoptionCount = 0
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      isDemo: () => true,
      initialIdentity: () => identityCreate("production-user"),
      currentUserRead: async () => {
        readCount += 1
        return createResult(identityCreate("production-user"))
      },
      sessionAdopt: async () => {
        adoptionCount += 1
        return createResult(identityCreate("production-user"))
      },
      legacySessionRead: () => sessionCreate("legacy-user"),
    })
    return () => undefined
  })

  try {
    await state.bootstrap()
    await state.context.refresh()
    await state.context.adoptSession(sessionCreate("demo-user"))

    expect(state.context.identity()).toBeNull()
    expect(state.context.ready()).toBe(true)
    expect(readCount).toBe(0)
    expect(adoptionCount).toBe(0)
  } finally {
    dispose()
  }
})

test("keeps an absent cookie and absent browser session anonymous", async () => {
  let adoptionCount = 0
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      currentUserRead: async () => createResult(null),
      legacySessionRead: () => null,
      sessionAdopt: async () => {
        adoptionCount += 1
        return createResultError("test", "must not adopt")
      },
    })
    return () => undefined
  })

  try {
    await state.bootstrap()

    expect(state.context.identity()).toBeNull()
    expect(state.context.ready()).toBe(true)
    expect(adoptionCount).toBe(0)
  } finally {
    dispose()
  }
})

test("does not adopt browser session data when the root cookie lookup fails", async () => {
  const staleSession = sessionCreate("stale-user")
  let adoptionCount = 0
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      initialIdentityResult: () => createResultError("currentUserRead", "temporary lookup failure"),
      currentUserRead: async () => createResult(null),
      legacySessionRead: () => staleSession,
      sessionAdopt: async () => {
        adoptionCount += 1
        return createResult(identityCreate("stale-user"))
      },
    })
    return () => undefined
  })

  try {
    const result = await state.bootstrap()

    expect(result).toEqual({ success: false, op: "currentUserRead", errorMessage: "temporary lookup failure" })
    expect(state.context.identity()).toBeNull()
    expect(state.context.ready()).toBe(false)
    expect(adoptionCount).toBe(0)
  } finally {
    dispose()
  }
})

test("does not adopt browser session data when a direct cookie lookup fails", async () => {
  let adoptionCount = 0
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      currentUserRead: async () => createResultError("currentUserRead", "temporary lookup failure"),
      legacySessionRead: () => sessionCreate("stale-user"),
      sessionAdopt: async () => {
        adoptionCount += 1
        return createResult(identityCreate("stale-user"))
      },
    })
    return () => undefined
  })

  try {
    const result = await state.bootstrap()

    expect(result).toEqual({ success: false, op: "currentUserRead", errorMessage: "temporary lookup failure" })
    expect(state.context.identity()).toBeNull()
    expect(state.context.ready()).toBe(false)
    expect(adoptionCount).toBe(0)
  } finally {
    dispose()
  }
})

test("clears stale browser session data when legacy adoption is rejected", async () => {
  const staleSession = sessionCreate("stale-user")
  let clearCount = 0
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      currentUserRead: async () => createResult(null),
      legacySessionRead: () => staleSession,
      sessionAdopt: async () => createResultError("eventorenSessionAdopt", "session is stale"),
      legacySessionClear: () => {
        clearCount += 1
      },
    })
    return () => undefined
  })

  try {
    await state.bootstrap()

    expect(state.context.identity()).toBeNull()
    expect(state.context.ready()).toBe(true)
    expect(clearCount).toBe(1)
  } finally {
    dispose()
  }
})

test("does not migrate a browser session over a different valid cookie identity", async () => {
  const identity = identityCreate("cookie-user")
  let legacyReadCount = 0
  let adoptionCount = 0
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      currentUserRead: async () => createResult(identity),
      legacySessionRead: () => {
        legacyReadCount += 1
        return sessionCreate("browser-user")
      },
      sessionAdopt: async () => {
        adoptionCount += 1
        return createResult(identity)
      },
    })
    return () => undefined
  })

  try {
    await state.bootstrap()

    expect(state.context.identity()).toEqual(identity)
    expect(legacyReadCount).toBe(0)
    expect(adoptionCount).toBe(0)
  } finally {
    dispose()
  }
})

test("adopts a validated login identity, clears it on logout, and exposes no token", async () => {
  const identity = identityCreate("login-user")
  const session = sessionCreate("login-user")
  let state!: ReturnType<typeof eventorenAuthProviderStateCreate>
  const dispose = createRoot(() => {
    state = eventorenAuthProviderStateCreate({
      currentUserRead: async () => createResult(null),
      legacySessionRead: () => null,
      sessionAdopt: async (candidate, mode) => {
        expect(candidate.token).toBe(session.token)
        expect(mode).toBe("replace")
        return createResult(identity)
      },
    })
    return () => undefined
  })

  try {
    const adoption = await state.context.adoptSession(session)
    expect(adoption).toEqual({ success: true, data: identity })
    expect(state.context.identity()).toEqual(identity)
    expect(JSON.stringify(state.context.identity())).not.toContain("token")

    state.context.clear()
    expect(state.context.identity()).toBeNull()
    expect(state.context.ready()).toBe(true)
  } finally {
    dispose()
  }
})

function identityCreate(userId: string): EventorenAuthIdentity {
  return { userId, name: "Ada", email: `${userId}@example.test`, role: "admin" }
}

function sessionCreate(userId: string): UserSession {
  const now = new Date().toISOString()
  return {
    token: `${userId}-token`,
    profile: { userId, name: "Ada", email: `${userId}@example.test`, role: "admin", createdAt: now, updatedAt: now },
    hasPw: true,
    signedInMethod: "password",
    signedInAt: now,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  }
}
