import { expect, test } from "bun:test"
import { eventorenLogoutResponse } from "../src/auth/server/eventorenLogoutResponse.ts"

test("revokes the cookie session and clears auth state without accepting a browser token", async () => {
  const previousConvexUrl = process.env.VITE_CONVEX_URL
  const previousAuthSecret = process.env.AUTH_SECRET
  const previousFetch = globalThis.fetch
  const requests: Array<{ readonly token: string }> = []
  process.env.VITE_CONVEX_URL = "https://convex.example.test"
  process.env.AUTH_SECRET = "eventoren-logout-test-secret"
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const body = (await request.json()) as { args?: Array<{ token?: unknown }> }
      const token = body.args?.[0]?.token
      if (typeof token === "string") requests.push({ token })
      return Response.json({})
    },
    { preconnect: previousFetch.preconnect },
  )

  try {
    const response = await eventorenLogoutResponse(
      new Request("https://eventoren.example.test/logout", {
        method: "POST",
        headers: { cookie: "eventoren-session=cookie-token", "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    )

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("/")
    expect(response.headers.get("set-cookie")).toContain("eventoren-logout=1")
    expect(requests).toEqual([{ token: "cookie-token" }])
  } finally {
    globalThis.fetch = previousFetch
    restore("VITE_CONVEX_URL", previousConvexUrl)
    restore("AUTH_SECRET", previousAuthSecret)
  }
})

function restore(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
