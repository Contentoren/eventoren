import { createResult, createResultError } from "#result"
import * as v from "valibot"

const metadata = v.record(v.string(), v.string())
const session = v.object({
  id: v.string(),
  livemode: v.literal(false),
  mode: v.string(),
  status: v.string(),
  payment_status: v.string(),
  customer: v.nullable(v.string()),
  subscription: v.nullable(v.string()),
  metadata,
})
const customer = v.object({ id: v.string(), livemode: v.literal(false), deleted: v.optional(v.boolean()), metadata })
const subscription = v.object({
  id: v.string(),
  livemode: v.literal(false),
  customer: v.string(),
  status: v.string(),
  metadata,
})
const paymentIntent = v.object({
  id: v.string(),
  livemode: v.literal(false),
  customer: v.nullable(v.string()),
  metadata,
})
const invoice = v.object({ id: v.string(), livemode: v.literal(false), customer: v.nullable(v.string()) })
const charge = v.object({ id: v.string(), livemode: v.literal(false), customer: v.nullable(v.string()) })

const schemas = { session, customer, subscription, paymentIntent, invoice, charge } as const
type Kind = keyof typeof schemas
type Entity<K extends Kind> = v.InferOutput<(typeof schemas)[K]>

/** Narrow Stripe TEST adapter; fixed API origin, no provider body or credentials in errors. */
export function e2eStripeTestClientCreate(key: string, fetcher: typeof fetch = fetch) {
  const request = async (path: string, method = "GET") => {
    const op = "e2eStripeTestClientCreate"
    try {
      const response = await fetcher(`https://api.stripe.com/v1/${path}`, {
        method,
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) return createResultError(op, `Stripe ${method} failed with HTTP ${response.status}`)
      return createResult((await response.json()) as unknown)
    } catch {
      return createResultError(op, `Stripe ${method} could not be verified`)
    }
  }
  const get = async <K extends Kind>(kind: K, path: string) => {
    const result = await request(path)
    if (!result.success) return result
    const parsed = v.safeParse(schemas[kind], result.data)
    if (!parsed.success)
      return createResultError("e2eStripeTestClientCreate", `Invalid test-mode Stripe ${kind} response`)
    return createResult(parsed.output as Entity<K>)
  }
  const list = async <K extends Kind>(kind: K, path: string) => {
    const op = "e2eStripeTestClientCreate"
    const entries: Entity<K>[] = []
    let cursor: string | undefined
    do {
      const result = await request(
        `${path}${path.includes("?") ? "&" : "?"}limit=100${cursor ? `&starting_after=${encodeURIComponent(cursor)}` : ""}`,
      )
      if (!result.success) return result
      const parsed = v.safeParse(v.object({ data: v.array(schemas[kind]), has_more: v.boolean() }), result.data)
      if (!parsed.success) return createResultError(op, `Invalid test-mode Stripe ${kind} list`)
      entries.push(...(parsed.output.data as Entity<K>[]))
      if (!parsed.output.has_more) break
      const last = parsed.output.data.at(-1)
      if (!last?.id || last.id === cursor || entries.length > 10_000)
        return createResultError(op, "Stripe pagination cannot be proven complete")
      cursor = last.id
    } while (true)
    return createResult(entries)
  }
  return {
    account: async () => {
      const response = await request("account")
      if (!response.success) return response
      const parsed = v.safeParse(v.object({ id: v.string() }), response.data)
      return parsed.success
        ? createResult(parsed.output.id)
        : createResultError("e2eStripeTestClientCreate", "Invalid Stripe account")
    },
    get,
    list,
    expire: async (id: string) => request(`checkout/sessions/${encodeURIComponent(id)}/expire`, "POST"),
    cancel: async (id: string) => request(`subscriptions/${encodeURIComponent(id)}`, "DELETE"),
    deleteCustomer: async (id: string) => request(`customers/${encodeURIComponent(id)}`, "DELETE"),
    customerDeleted: async (id: string) => {
      const response = await request(`customers/${encodeURIComponent(id)}`)
      if (!response.success) return response
      const parsed = v.safeParse(v.object({ id: v.string(), deleted: v.literal(true) }), response.data)
      return parsed.success && parsed.output.id === id
        ? createResult(true)
        : createResultError("e2eStripeTestClientCreate", "Customer deletion not verified")
    },
  }
}
