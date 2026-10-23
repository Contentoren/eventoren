/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { authEmailSend } from "../src/auth/convex/email/authEmailSend.ts"
import { organizerContractDocuments } from "../src/organizer/dashboard/contracts/organizerContractDocuments.ts"
import { organizerContractPartyConsentFixture } from "../test/organizerContractPartyConsent.fixture.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

vi.mock("../src/auth/convex/email/authEmailSend.ts", () => ({ authEmailSend: vi.fn() }))
const modules = import.meta.glob("../convex/**/*.ts")

test("confirmation action persists SMTP failure, retries with immutable evidence and records final success", async () => {
  process.env.AUTH_SECRET = "contract-email-test-secret"
  const t = convexTest(schema, modules)
  const now = "2026-10-23T12:00:00.000Z"
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "Owner", role: "customer", createdAt: now, updatedAt: now }),
  )
  const token = await testAuthSessionTokenCreate(t, userId, process.env.AUTH_SECRET)
  const created = await t.mutation(api.organizerDashboard.organizerDashboardOrganizationCreateMutation, {
    token,
    name: "Email Org",
    slug: "email-org",
    kind: "verein",
    ...organizerContractPartyConsentFixture,
    termsAccepted: true,
    dpaAccepted: true,
    termsRevision: organizerContractDocuments.terms.revision,
    dpaRevision: organizerContractDocuments.dpa.revision,
  })
  expect(created.success).toBe(true)
  const delivery = (await t.run((ctx) => ctx.db.query("organizerDashboardContractDeliveries").unique()))!
  const evidence = (await t.run((ctx) => ctx.db.get("organizerDashboardContractConsents", delivery.evidenceId)))!
  // An administrator's current view must never change what is confirmed by email.
  await t.run(async (ctx) => {
    const org = (await ctx.db.query("organizerDashboardOrganizations").unique())!
    await ctx.db.patch("organizerDashboardOrganizations", org._id, {
      fee: { percentBps: 999, fixedCents: 999, payer: "veranstalter" },
      contracts: { ...org.contracts, party: { ...org.contracts.party!, email: "changed@example.org" } },
    })
  })
  const smtp = vi.mocked(authEmailSend)
  smtp.mockResolvedValueOnce({ success: false, op: "authEmailSend", errorMessage: "SMTP unavailable" })
  await t.action(internal.organizerContractEmail.organizerContractConfirmationSendInternalAction, {
    deliveryId: delivery._id,
  })
  expect(await t.run((ctx) => ctx.db.get("organizerDashboardContractDeliveries", delivery._id))).toMatchObject({
    status: "pending",
    attempts: 1,
    lastError: "SMTP delivery failed",
  })
  const sent = smtp.mock.calls[0]![0]
  expect(sent.toEmail).toBe(evidence.party!.email)
  expect(sent.text).toContain("3.9 % + 0.49 EUR")
  expect(sent.text).toContain("Europe/Berlin")
  expect(sent.text).toContain(evidence.termsRevision)
  expect(sent.text).toContain(evidence.dpaRevision)
  for (const section of [...evidence.termsSnapshot, ...evidence.dpaSnapshot]) expect(sent.text).toContain(section.body)
  await t.run((ctx) => ctx.db.patch("organizerDashboardContractDeliveries", delivery._id, { nextAttemptAt: 0 }))
  smtp.mockResolvedValueOnce({ success: true, data: null })
  await t.action(internal.organizerContractEmail.organizerContractConfirmationSendInternalAction, {
    deliveryId: delivery._id,
  })
  expect(await t.run((ctx) => ctx.db.get("organizerDashboardContractDeliveries", delivery._id))).toMatchObject({
    status: "sent",
    attempts: 2,
  })
  expect(smtp.mock.calls[1]![0]).toEqual(sent)
  expect(await t.run((ctx) => ctx.db.get("organizerDashboardContractConsents", delivery.evidenceId))).toEqual(evidence)
})
