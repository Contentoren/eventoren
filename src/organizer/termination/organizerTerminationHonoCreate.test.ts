import { expect, test } from "bun:test"
import type { ConvexHttpClient } from "convex/browser"
import { organizerTerminationHonoCreate } from "./organizerTerminationHonoCreate.ts"

test("public Hono validates the same declaration schema, bounds bodies and never requires a login", async () => {
  const calls: unknown[] = []
  const app = organizerTerminationHonoCreate({
    mutation: async (...args: unknown[]) => {
      calls.push(args)
      return { success: true, data: null }
    },
    query: async () => null,
  } as unknown as ConvexHttpClient)
  const request = (body: string) =>
    app.request("/api/veranstalter-vertrag-beenden", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    })
  expect((await request("not json")).status).toBe(400)
  expect((await request("x".repeat(17000))).status).toBe(400)
  expect((await request(JSON.stringify({ operation: "submit", args: { email: "invalid" } }))).status).toBe(400)
  expect(calls).toHaveLength(0)
  const response = await request(
    JSON.stringify({
      operation: "submit",
      args: {
        kind: "widerruf",
        legalName: "Example",
        email: "test@example.org",
        contractReference: "Org 123",
        requestKey: "a".repeat(64),
        receiptToken: "b".repeat(64),
      },
    }),
  )
  expect(response.status).toBe(200)
  expect(response.headers.get("cache-control")).toBe("no-store")
  expect(calls).toHaveLength(1)
})
