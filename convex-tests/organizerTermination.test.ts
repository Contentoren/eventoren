/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { authEmailSend } from "../src/auth/convex/email/authEmailSend.ts"

vi.mock("../src/auth/convex/email/authEmailSend.ts", () => ({ authEmailSend: vi.fn() }))
const modules = import.meta.glob("../convex/**/*.ts")
beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})
const input = {
  kind: "kuendigung" as const,
  legalName: "Example GmbH",
  email: "user@example.org",
  contractReference: "An existing organization / any free-text reference",
  requestedDate: "2027-03-28",
  extraordinaryReason: "Wichtiger Grund",
  requestKey: "a".repeat(64),
  receiptToken: "b".repeat(64),
}

test("public declaration is persisted immutably, idempotent and never mutates organizations", async () => {
  const t = convexTest(schema, modules)
  const before = await t.run((ctx) => ctx.db.query("organizerDashboardOrganizations").collect())
  const created = await t.mutation(api.organizerTermination.organizerTerminationSubmitMutation, input)
  expect(created.success).toBe(true)
  const row = (await t.run((ctx) => ctx.db.query("organizerTerminationRequests").unique()))!
  expect(row.requestedDate).toBe("2027-03-28")
  expect(row.receivedAt).toMatch(/Z$/)
  expect(row.declaration).toContain("außerordentlich zum 2027-03-28")
  expect(await t.mutation(api.organizerTermination.organizerTerminationSubmitMutation, input)).toEqual(created)
  expect(
    (await t.mutation(api.organizerTermination.organizerTerminationSubmitMutation, { ...input, legalName: "Changed" }))
      .success,
  ).toBe(false)
  expect(
    (
      await t.mutation(api.organizerTermination.organizerTerminationSubmitMutation, {
        ...input,
        receiptToken: "c".repeat(64),
      })
    ).success,
  ).toBe(false)
  expect(await t.run((ctx) => ctx.db.query("organizerTerminationRequests").unique())).toEqual(row)
  expect(await t.run((ctx) => ctx.db.query("organizerDashboardOrganizations").collect())).toEqual(before)
  expect(await t.run((ctx) => ctx.db.query("organizerTerminationDeliveries").unique())).toMatchObject({
    status: "pending",
    attempts: 0,
  })
})

test("malformed fields and impossible date-only values are rejected before persistence", async () => {
  const t = convexTest(schema, modules)
  for (const change of [
    { email: "invalid" },
    { legalName: " " },
    { contractReference: "" },
    { requestedDate: "2027-02-30" },
    { requestedDate: "2027-03-28T00:00:00Z" },
    { kind: "widerruf" as const },
    { requestKey: "guessable" },
  ]) {
    const result = await t.mutation(api.organizerTermination.organizerTerminationSubmitMutation, {
      ...input,
      ...change,
    })
    expect(result.success).toBe(false)
  }
  expect(await t.run((ctx) => ctx.db.query("organizerTerminationRequests").unique())).toBeNull()
})

test("receipt and retry require the unguessable receipt token, never email or organization lookup", async () => {
  const t = convexTest(schema, modules)
  await t.mutation(api.organizerTermination.organizerTerminationSubmitMutation, input)
  const credentials = { requestKey: input.requestKey, receiptToken: input.receiptToken }
  expect(await t.query(api.organizerTermination.organizerTerminationReceiptQuery, credentials)).toMatchObject({
    declaration: expect.stringContaining(input.legalName),
  })
  expect(
    await t.query(api.organizerTermination.organizerTerminationReceiptQuery, {
      ...credentials,
      receiptToken: "c".repeat(64),
    }),
  ).toBeNull()
  expect(
    await t.query(api.organizerTermination.organizerTerminationReceiptQuery, {
      ...credentials,
      requestKey: "d".repeat(64),
    }),
  ).toBeNull()
  expect(
    (
      await t.mutation(api.organizerTermination.organizerTerminationRetryMutation, {
        ...credentials,
        receiptToken: "c".repeat(64),
      })
    ).success,
  ).toBe(false)
})

test("SMTP failure is durable and retried to both recipients without modifying the declaration", async () => {
  const t = convexTest(schema, modules)
  await t.mutation(api.organizerTermination.organizerTerminationSubmitMutation, input)
  const row = (await t.run((ctx) => ctx.db.query("organizerTerminationRequests").unique()))!
  const smtp = vi.mocked(authEmailSend)
  smtp.mockReset()
  smtp
    .mockResolvedValueOnce({ success: false, op: "smtp", errorMessage: "SMTP unavailable" })
    .mockResolvedValueOnce({ success: true, data: null })
  await t.action(internal.organizerTerminationEmail.organizerTerminationEmailInternalAction, { requestId: row._id })
  const delivery = (await t.run((ctx) => ctx.db.query("organizerTerminationDeliveries").unique()))!
  expect(delivery).toMatchObject({
    status: "failed",
    attempts: 1,
    userSent: false,
    operatorSent: true,
    lastError: expect.any(String),
  })
  expect(smtp.mock.calls.map((call) => call[0].toEmail)).toEqual([input.email, "kontakt@semesterkur.de"])
  for (const [mail] of smtp.mock.calls) {
    expect(mail.text).toContain(row.declaration)
    expect(mail.text).toContain(row.receivedAt)
    expect(mail.text).toContain(row._id)
  }
  smtp.mockResolvedValueOnce({ success: true, data: null })
  await t.action(internal.organizerTerminationEmail.organizerTerminationEmailInternalAction, { requestId: row._id })
  expect(smtp).toHaveBeenCalledTimes(3)
  expect(await t.run((ctx) => ctx.db.query("organizerTerminationDeliveries").unique())).toMatchObject({
    status: "sent",
    attempts: 2,
    userSent: true,
    operatorSent: true,
  })
  expect(await t.run((ctx) => ctx.db.get(row._id))).toEqual(row)
})

test("receipt-authorized retry is throttled, requeues failed delivery and preserves immutable receipt", async () => {
  const t = convexTest(schema, modules)
  await t.mutation(api.organizerTermination.organizerTerminationSubmitMutation, input)
  const credentials = { requestKey: input.requestKey, receiptToken: input.receiptToken }
  expect((await t.mutation(api.organizerTermination.organizerTerminationRetryMutation, credentials)).success).toBe(
    false,
  )
  const row = (await t.run((ctx) => ctx.db.query("organizerTerminationRequests").unique()))!
  const delivery = (await t.run((ctx) => ctx.db.query("organizerTerminationDeliveries").unique()))!
  await t.run((ctx) =>
    ctx.db.patch(delivery._id, { status: "failed", attempts: 8, userSent: true, updatedAt: Date.now() - 301_000 }),
  )
  expect((await t.mutation(api.organizerTermination.organizerTerminationRetryMutation, credentials)).success).toBe(true)
  expect(await t.run((ctx) => ctx.db.get(delivery._id))).toMatchObject({
    status: "pending",
    attempts: 0,
    userSent: true,
    operatorSent: false,
  })
  expect(await t.run((ctx) => ctx.db.get(row._id))).toEqual(row)
  expect((await t.mutation(api.organizerTermination.organizerTerminationRetryMutation, credentials)).success).toBe(
    false,
  )
})
