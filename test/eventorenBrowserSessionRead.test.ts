import { expect, test } from "bun:test"
import { eventorenBrowserSessionRead } from "../src/auth/ui/eventorenBrowserSessionRead.ts"

test("browser session bootstrap accepts only a validated, unexpired session", async () => {
  const originalFetch = globalThis.fetch
  const session = {
    token: "application-token",
    expiresAt: Date.now() + 60_000,
    profile: {
      userId: "user_12345678",
      name: "Alex Example",
      role: "user" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  }
  try {
    globalThis.fetch = (async (_input, init) => {
      expect(init).toMatchObject({ credentials: "same-origin", cache: "no-store" })
      return Response.json({ session })
    }) as typeof fetch
    const result = await eventorenBrowserSessionRead()
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toMatchObject(session)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("browser session bootstrap rejects malformed session payloads", async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = (async () => Response.json({ session: { token: "bad" } })) as unknown as typeof fetch
    const result = await eventorenBrowserSessionRead()
    expect(result.success).toBe(false)
  } finally {
    globalThis.fetch = originalFetch
  }
})
