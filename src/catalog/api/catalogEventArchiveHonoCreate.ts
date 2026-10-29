import type { ConvexHttpClient } from "convex/browser"
import { Hono } from "hono"
import * as v from "valibot"
import { catalogEventArchiveInputSchema } from "#src/catalog/catalogEventArchiveInputSchema.ts"
import { catalogEventArchive } from "#src/catalog/client/catalogEventArchive.ts"
import { organizerDashboardBearerTokenRead } from "#src/organizer/dashboard/api/organizerDashboardBearerTokenRead.ts"

export function catalogEventArchiveHonoCreate(client: ConvexHttpClient) {
  const app = new Hono()
  app.post("/api/admin-event-archive", async (c) => {
    c.header("Cache-Control", "no-store")
    const requestId = crypto.randomUUID()
    const fail = (code: string, message: string, status: 400 | 401 | 403 | 404 | 500 | 503) =>
      c.json(
        {
          error: {
            code,
            message,
            op: "catalogEventArchiveHttp",
            status,
            requestId,
            details: {},
            retryable: status === 503,
          },
        },
        status,
      )
    const token = organizerDashboardBearerTokenRead(c.req.header("authorization"))
    if (!token) return fail("catalog.unauthenticated", "Authorization Bearer is required", 401)
    const reader = c.req.raw.body?.getReader()
    if (!reader) return fail("catalog.invalid-input", "JSON body required", 400)
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.length
      if (size > 16384) {
        await reader.cancel()
        return fail("catalog.invalid-input", "Request too large", 400)
      }
      chunks.push(part.value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    let body: unknown
    try {
      body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))
    } catch {
      return fail("catalog.invalid-input", "Invalid JSON", 400)
    }
    const schema = v.omit(catalogEventArchiveInputSchema, ["token"])
    const parsed = v.safeParse(schema, body)
    if (!parsed.success) return fail("catalog.invalid-input", v.summarize(parsed.issues), 400)
    console.info("catalogEventArchiveHttp", { requestId })
    const result = await catalogEventArchive({ ...parsed.output, token }, client)
    if (!result.success) {
      if (result.op === "catalogAdminAuthorizeFn") return fail("catalog.forbidden", "Admin role required", 403)
      if (result.op.startsWith("auth")) return fail("catalog.unauthenticated", "Invalid credential", 401)
      if (result.errorMessage === "Event not found") return fail("catalog.not-found", result.errorMessage, 404)
      if (result.op === "catalogEventArchive") return fail("platform.unavailable", "Service unavailable", 503)
      return fail("platform.internal", "Archive operation failed", 500)
    }
    return c.json(result)
  })
  return app
}
