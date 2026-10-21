import { Hono } from "hono"
import type { Result } from "#result"
import { organizerDashboardBackendDispatchRequest } from "./organizerDashboardBackendDispatchRequest.ts"
import { organizerDashboardBearerTokenRead } from "./organizerDashboardBearerTokenRead.ts"
import type { OrganizerDashboardHttpBackend } from "./organizerDashboardConvexBackendCreate.ts"
import { organizerDashboardErrorCatalog } from "./organizerDashboardErrorCatalog.ts"
import { organizerDashboardErrorEnvelopeCreate } from "./organizerDashboardErrorEnvelopeCreate.ts"
import { organizerDashboardRequestMaxBytes } from "./organizerDashboardRequestMaxBytes.ts"
import { organizerDashboardRequestParse } from "./organizerDashboardRequestParse.ts"

type BackendFailure = {
  readonly op: string
  readonly errorMessage: string
  readonly code?: string
}

const transportMessage = "Backend transport failed"

/**
 * Hono app for POST /api/veranstalter. One JSON operation per request from an
 * explicit allowlist (covering foundation, profile, orders, events, admin,
 * migration, contracts, team, finance, pricing, overview, exports, and public);
 * arbitrary Convex function names are never
 * accepted. Auth is Authorization Bearer only (RFC 7235 case-insensitive
 * scheme); the credential never appears in logs or error bodies.
 *
 * The body is read as a bounded byte stream (max 512 KiB): a present
 * Content-Length above the bound is rejected before reading, a missing or
 * lying Content-Length cannot evade the streaming byte count, and invalid
 * UTF-8 is a 400. The reader is cancelled as soon as the bound is exceeded.
 *
 * Backend Result rejections carry no typed code today unless they already
 * carry an authoritative catalog code, so they map to platform.internal/500
 * otherwise. Codes and statuses always come from the explicit catalog, never
 * from parsing the message; transport throws are sanitized to a constant
 * message. (No MCP surface exists in this repo, so none is built here; see
 * the route wiring for the deviation note.)
 */
export function organizerDashboardHonoCreate(backend: OrganizerDashboardHttpBackend): Hono {
  const app = new Hono()

  app.notFound((c) => {
    const requestId = crypto.randomUUID()
    const envelope = organizerDashboardErrorEnvelopeCreate({
      code: "organizer-dashboard.unknown-operation",
      message: "Unknown operation",
      requestId,
      errorOp: "organizerDashboardHonoCreate",
    })
    return c.json(envelope, envelope.error.status)
  })

  app.post("/api/veranstalter", async (c) => {
    const requestId = crypto.randomUUID()
    const failure = (code: string, message: string, errorOp: string) => {
      const envelope = organizerDashboardErrorEnvelopeCreate({ code, message, requestId, errorOp })
      return c.json(envelope, envelope.error.status)
    }

    const authorization = c.req.header("authorization")
    const token = organizerDashboardBearerTokenRead(authorization)
    if (token === undefined) {
      return failure(
        "organizer-dashboard.unauthenticated",
        "Authorization Bearer is required",
        "organizerDashboardHonoCreate",
      )
    }

    const raw = c.req.raw
    const bodyResult = await organizerDashboardBodyRead(raw)
    if (!bodyResult.success) {
      return failure("organizer-dashboard.invalid-body", bodyResult.errorMessage, "organizerDashboardHonoCreate")
    }
    let body: unknown
    try {
      body = bodyResult.data.length === 0 ? undefined : (JSON.parse(bodyResult.data) as unknown)
    } catch {
      return failure("organizer-dashboard.invalid-body", "Invalid JSON body", "organizerDashboardHonoCreate")
    }

    const parsed = organizerDashboardRequestParse(body)
    if (!parsed.success) {
      const reason = parsed.errorData === "unknown-operation" ? "unknown-operation" : "invalid-body"
      return failure(
        reason === "unknown-operation" ? "organizer-dashboard.unknown-operation" : "organizer-dashboard.invalid-body",
        reason === "unknown-operation" ? "Unknown operation" : parsed.errorMessage,
        parsed.op,
      )
    }

    let result: Result<unknown>
    try {
      result = await organizerDashboardBackendDispatchRequest(backend, token, parsed.data)
    } catch {
      return failure("organizer-dashboard.transport-unavailable", transportMessage, "organizerDashboardHonoCreate")
    }
    if (!result.success) {
      const failureError = result as BackendFailure
      const code =
        typeof failureError.code === "string" && Object.hasOwn(organizerDashboardErrorCatalog, failureError.code)
          ? failureError.code
          : "platform.internal"
      const envelope = organizerDashboardErrorEnvelopeCreate({
        code,
        message: failureError.errorMessage,
        requestId,
        errorOp: failureError.op,
      })
      return c.json(envelope, envelope.error.status)
    }
    return c.json({ data: result.data }, 200)
  })

  return app
}

/**
 * Bounded body reader: counts raw bytes (not string characters) while
 * streaming, rejects before the full drain when the bound is exceeded, and
 * cancels the reader. A present Content-Length above the bound short-circuits
 * before any read; a missing or lying Content-Length cannot evade the
 * streaming count. Decoding uses fatal UTF-8, so invalid bytes are a 400.
 */
async function organizerDashboardBodyRead(
  request: Request,
): Promise<
  { readonly success: true; readonly data: string } | { readonly success: false; readonly errorMessage: string }
> {
  const contentLength = request.headers.get("content-length")
  if (contentLength !== null) {
    const declared = Number(contentLength)
    if (!Number.isFinite(declared) || declared < 0) {
      return { success: false, errorMessage: "Invalid Content-Length" }
    }
    if (declared > organizerDashboardRequestMaxBytes) {
      return { success: false, errorMessage: "Request body too large" }
    }
  }
  if (request.body === null) return { success: true, data: "" }
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const next = await reader.read()
    if (next.done) break
    total += next.value.byteLength
    if (total > organizerDashboardRequestMaxBytes) {
      await reader.cancel().catch(() => undefined)
      return { success: false, errorMessage: "Request body too large" }
    }
    chunks.push(next.value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return { success: true, data: new TextDecoder("utf-8", { fatal: true }).decode(bytes) }
  } catch {
    await reader.cancel().catch(() => undefined)
    return { success: false, errorMessage: "Request body must be valid UTF-8" }
  }
}
