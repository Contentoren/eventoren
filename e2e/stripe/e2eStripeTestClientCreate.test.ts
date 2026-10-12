import { expect, test } from "@rstest/core"
import { e2eStripeTestClientCreate } from "./e2eStripeTestClientCreate.ts"

test("customer GET schema refuses live, missing and ambiguous ownership metadata", async () => {
  for (const body of [
    { id: "cus_test", livemode: true, metadata: {} },
    { id: "cus_test", livemode: false },
    { id: "cus_test", livemode: false, metadata: { organization_id: null } },
  ]) {
    const calls: string[] = []
    const client = e2eStripeTestClientCreate("sk_test_dummy", (async (_url: unknown, init?: RequestInit) => {
      calls.push(init?.method ?? "GET")
      return Response.json(body)
    }) as typeof fetch)
    expect((await client.get("customer", "customers/cus_test")).success).toBe(false)
    expect(calls).toEqual(["GET"])
  }
})

test("session schema preserves explicit null and optional legacy payment_intent distinctly", async () => {
  for (const fields of [{}, { payment_intent: null }, { payment_intent: "pi_test" }]) {
    const client = e2eStripeTestClientCreate("sk_test_dummy", (async () =>
      Response.json({
        id: "cs_test_123",
        livemode: false,
        mode: "payment",
        status: "open",
        payment_status: "unpaid",
        customer: "cus_test",
        subscription: null,
        metadata: {},
        ...fields,
      })) as typeof fetch)
    const result = await client.get("session", "checkout/sessions/cs_test_123")
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.payment_intent).toBe(fields.payment_intent)
  }
})
