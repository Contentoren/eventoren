import * as v from "valibot"
import { createResult, createResultError } from "#result"

/** HTTP envelope documented by assets-service 0.6.5; avoid its Bun-only root runtime in Convex Node actions. */
export async function catalogImageServiceRequest<T extends v.GenericSchema>(input: {
  apiUrl: string
  accessToken: string
  path: string
  schema: T
  method?: "GET" | "POST" | "PUT"
  body?: unknown
}) {
  const op = "catalogImageServiceRequest"
  try {
    const base = new URL(input.apiUrl)
    if (base.protocol !== "https:" && !(base.protocol === "http:" && base.hostname === "localhost"))
      return createResultError(op, "Event image service URL must use HTTPS")
    const origin = base
      .toString()
      .replace(/\/+$/u, "")
      .replace(/\/api\/v1$/u, "")
    const response = await fetch(`${origin}/api/v1${input.path}`, {
      method: input.method ?? "GET",
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        accept: "application/json",
        ...(input.body === undefined ? {} : { "content-type": "application/json; charset=UTF-8" }),
      },
      ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) }),
    })
    const envelope = v.safeParse(v.object({ ok: v.boolean(), data: v.optional(v.unknown()) }), await response.json())
    if (!response.ok || !envelope.success || !envelope.output.ok)
      return createResultError(op, `Event image service rejected the request (${response.status})`)
    const parsed = v.safeParse(input.schema, envelope.output.data)
    if (!parsed.success) return createResultError(op, "Event image service returned an invalid response")
    return createResult(parsed.output)
  } catch {
    return createResultError(op, "Event image service could not be reached")
  }
}
