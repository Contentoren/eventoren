import { createHmac } from "node:crypto"
import * as v from "valibot"
import { createResult, createResultError } from "#result"
import { type E2eCheckpoint, e2eCheckpointSchema } from "../checkpoint/e2eCheckpointSchema.ts"
import type { ticketPurchasePaymentProofCheck } from "../workflows/ticketPurchase/ticketPurchasePaymentProofCheck.ts"
import { e2eStripeTestClientCreate } from "./e2eStripeTestClientCreate.ts"

const eventEnvelope = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  data: v.object({ object: v.object({ id: v.string() }) }),
})
const eventPage = v.object({ data: v.array(eventEnvelope), has_more: v.boolean() })
const completedEvent = v.object({
  id: v.pipe(v.string(), v.regex(/^evt_[A-Za-z0-9]+$/u)),
  type: v.literal("checkout.session.completed"),
  livemode: v.literal(false),
  created: v.pipe(v.number(), v.integer()),
  data: v.object({
    object: v.object({
      id: v.string(),
      livemode: v.literal(false),
      status: v.literal("complete"),
      payment_status: v.literal("paid"),
      mode: v.literal("payment"),
      subscription: v.null(),
      customer: v.string(),
      payment_intent: v.string(),
      metadata: v.record(v.string(), v.string()),
    }),
  }),
})

/** Forward only the original, independently verified Stripe TEST event to the fixed development webhook. */
export async function e2eStripeDevelopmentWebhookForward(input: {
  checkpoint: E2eCheckpoint
  organizationId: string
  accountId: string
  key: string
  secret: string
  orderProof: Parameters<typeof ticketPurchasePaymentProofCheck>[0]["orderProof"]
  fetcher?: typeof fetch
  now?: () => number
  delay?: (ms: number) => Promise<void>
}) {
  const op = "e2eStripeDevelopmentWebhookForward"
  const fail = (stage: string) => createResultError(op, `Development webhook forwarding failed: ${stage}`)
  const { checkpoint: c, organizationId, accountId, key, secret } = input
  const now = input.now ?? Date.now
  const delay = input.delay ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const ticket = c?.ticket
  if (
    !v.safeParse(e2eCheckpointSchema, c).success ||
    c.target !== "development" ||
    c.baseUrl !== "https://eventoren.wonder1.de" ||
    c.phase !== "ticket-unreconciled" ||
    !ticket ||
    ticket.step !== "payment" ||
    ticket.status !== "started" ||
    ticket.eventKey !== `ticket-e2e-${c.runId}` ||
    ticket.eventTitle !== `Ticket E2E ${c.runId}` ||
    ticket.participantName !== `E2E Participant ${c.runId}` ||
    (ticket.eventId !== undefined && ticket.eventId !== ticket.eventKey) ||
    !ticket.orderId ||
    !ticket.stripeSession ||
    !organizationId ||
    !/^(sk|rk)_test_[A-Za-z0-9]+$/u.test(key) ||
    !/^acct_[A-Za-z0-9]+$/u.test(accountId) ||
    !/^whsec_[A-Za-z0-9]+$/u.test(secret) ||
    !Number.isFinite(now()) ||
    c.createdAt > now()
  )
    return fail("invalid input")

  // Bound even a mocked fetch or response body reader which ignores AbortSignal.
  const bounded = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
    if (ms <= 0) throw new Error("timeout")
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("timeout")), ms)
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
  const send = input.fetcher ?? fetch
  const boundedFetcher: typeof fetch = async (url, init) => {
    return bounded(
      (async () => {
        const response = await send(url, { ...init, redirect: "error" })
        const text = await response.text()
        return new Response(text, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        })
      })(),
      15_000,
    )
  }
  let stage = "order proof"
  try {
    const proof = await bounded(input.orderProof(ticket.orderId, ticket.eventKey, c.runId, c.createdAt), 15_000)
    const data = proof?.data
    if (
      !proof?.success ||
      !data ||
      typeof data.paymentReference !== "string" ||
      !data.paymentReference ||
      typeof data.orderReference !== "string" ||
      !data.orderReference ||
      !(
        (data.status === "paid" && data.paymentStatus === "paid") ||
        (["checkout_created", "reserved"].includes(data.status) && data.paymentStatus === "pending")
      )
    )
      return fail(stage)
    stage = "Stripe ownership proof"
    const stripe = e2eStripeTestClientCreate(key, boundedFetcher)
    const account = await stripe.account()
    if (!account.success || account.data !== accountId) return fail(stage)
    const session = await stripe.get("session", `checkout/sessions/${encodeURIComponent(ticket.stripeSession)}`)
    const owned = (m: Record<string, string>) =>
      m.source === "eventoren_ticket" &&
      m.event_key === ticket.eventKey &&
      m.organization_id === organizationId &&
      m.stripe_mode === "test" &&
      m.payment_reference === data.paymentReference &&
      m.order_reference === data.orderReference
    if (
      !session.success ||
      session.data.id !== ticket.stripeSession ||
      session.data.status !== "complete" ||
      session.data.payment_status !== "paid" ||
      session.data.mode !== "payment" ||
      session.data.subscription !== null ||
      !session.data.customer ||
      typeof session.data.payment_intent !== "string" ||
      !/^pi_[A-Za-z0-9]+$/u.test(session.data.payment_intent) ||
      !owned(session.data.metadata)
    )
      return fail(stage)
    const customerId = session.data.customer
    const customer = await stripe.get("customer", `customers/${encodeURIComponent(customerId)}`)
    if (
      !customer.success ||
      customer.data.id !== customerId ||
      customer.data.deleted === true ||
      customer.data.metadata.source !== "eventoren_ticket" ||
      customer.data.metadata.organization_id !== organizationId ||
      customer.data.metadata.stripe_mode !== "test"
    )
      return fail(stage)

    stage = "event discovery"
    const deadline = now() + 30_000
    let selected: unknown
    while (now() < deadline) {
      const matches: unknown[] = []
      const seen = new Set<string>()
      let cursor: string | undefined
      for (let page = 0; page < 10; page++) {
        const remaining = deadline - now()
        if (remaining <= 0) return fail("event discovery timeout")
        const params = new URLSearchParams({
          type: "checkout.session.completed",
          "created[gte]": String(Math.floor(c.createdAt / 1000)),
          limit: "100",
        })
        if (cursor) params.set("starting_after", cursor)
        const timeout = Math.min(15_000, remaining)
        const raw = await bounded(
          (async () => {
            const response = await send(`https://api.stripe.com/v1/events?${params}`, {
              method: "GET",
              redirect: "error",
              headers: { Authorization: `Bearer ${key}` },
              signal: AbortSignal.timeout(timeout),
            })
            if (!response.ok) throw new Error("provider")
            return (await response.json()) as unknown
          })(),
          timeout,
        )
        const parsed = v.safeParse(eventPage, raw)
        if (!parsed.success) return fail("invalid event list")
        const rawData = (raw as { data: unknown[] }).data
        parsed.output.data.forEach((event, index) => {
          if (event.data.object.id === ticket.stripeSession) matches.push(rawData[index])
        })
        if (!parsed.output.has_more) break
        const next = parsed.output.data.at(-1)?.id
        if (page === 9 || !next || seen.has(next)) return fail("event pagination incomplete")
        seen.add(next)
        cursor = next
      }
      if (matches.length > 1) return fail("conflicting events")
      if (matches.length === 1) {
        selected = matches[0]
        break
      }
      const remaining = deadline - now()
      if (remaining <= 0) break
      await bounded(delay(Math.min(2_000, remaining)), remaining)
    }
    if (!selected) return fail("event not found")
    const event = v.safeParse(completedEvent, selected)
    if (
      !event.success ||
      event.output.created < Math.floor(c.createdAt / 1000) ||
      event.output.data.object.id !== ticket.stripeSession ||
      event.output.data.object.customer !== customerId ||
      event.output.data.object.payment_intent !== session.data.payment_intent ||
      !owned(event.output.data.object.metadata)
    )
      return fail("event validation")
    const body = JSON.stringify(selected)
    const timestamp = Math.floor(now() / 1000)
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")
    stage = "webhook delivery"
    const delivery = await bounded(
      (async () => {
        const response = await send("https://billing.wonder1.de/stripe/webhook", {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(120_000),
          headers: { "content-type": "application/json", "stripe-signature": `t=${timestamp},v1=${signature}` },
          body,
        })
        if (!response.ok) {
          stage = `webhook HTTP ${response.status}`
          return false
        }
        stage = "webhook response"
        const parsed = v.safeParse(v.object({ ok: v.literal(true) }), await response.json())
        return parsed.success
      })(),
      120_000,
    )
    return delivery ? createResult(true) : fail(stage)
  } catch {
    return fail(stage)
  }
}
