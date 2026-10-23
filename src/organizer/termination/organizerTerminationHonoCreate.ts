import { Hono } from "hono"
import * as v from "valibot"
import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { organizerTerminationRequestSchema } from "./organizerTerminationRequestSchema.ts"
import { organizerTerminationReceiptSchema } from "./organizerTerminationReceiptSchema.ts"

export function organizerTerminationHonoCreate(client: ConvexHttpClient) {
  const app = new Hono()
  app.post("/api/veranstalter-vertrag-beenden", async (c) => {
    c.header("Cache-Control", "no-store")
    const fail = (message: string, status: 400 | 503) =>
      c.json(
        {
          error: {
            code: status === 400 ? "termination.invalid-input" : "termination.unavailable",
            message,
            op: "organizerTerminationHttp",
            status,
            retryable: status === 503,
          },
        },
        status,
      )
    try {
      // Bound actual decoded bytes, not just the untrusted Content-Length header.
      const reader = c.req.raw.body?.getReader()
      if (!reader) return fail("JSON body required", 400)
      const chunks: Uint8Array[] = []
      let size = 0
      while (true) {
        const item = await reader.read()
        if (item.done) break
        size += item.value.byteLength
        if (size > 16_384) {
          await reader.cancel()
          return fail("Request too large", 400)
        }
        chunks.push(item.value)
      }
      const bytes = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.length
      }
      let body: unknown
      try {
        body = JSON.parse(new TextDecoder().decode(bytes))
      } catch {
        return fail("Invalid JSON", 400)
      }
      const request = v.safeParse(
        v.variant("operation", [
          v.strictObject({ operation: v.literal("submit"), args: organizerTerminationRequestSchema }),
          v.strictObject({ operation: v.literal("receipt"), args: organizerTerminationReceiptSchema }),
          v.strictObject({ operation: v.literal("retry"), args: organizerTerminationReceiptSchema }),
        ]),
        body,
      )
      if (!request.success) return fail(v.summarize(request.issues), 400)
      const input = request.output
      console.info("organizerTerminationHttp", { operation: input.operation })
      if (input.operation === "receipt")
        return c.json(await client.query(api.organizerTermination.organizerTerminationReceiptQuery, input.args))
      const result =
        input.operation === "submit"
          ? await client.mutation(api.organizerTermination.organizerTerminationSubmitMutation, input.args)
          : await client.mutation(api.organizerTermination.organizerTerminationRetryMutation, input.args)
      if (!result.success) return fail(result.errorMessage, 400)
      return c.json(result)
    } catch (error) {
      console.error("organizerTerminationHttp", error)
      return fail("Service unavailable", 503)
    }
  })
  return app
}
