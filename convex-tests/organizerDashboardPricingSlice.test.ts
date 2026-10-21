/// <reference types="vite/client" />
import { type ApiFromModules, makeFunctionReference } from "convex/server"
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import schema from "../convex/schema.ts"
import * as operations from "../convex/organizerDashboardPricing.ts"
import * as financeOperations from "../convex/organizerDashboardFinance.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = { ...import.meta.glob("../convex/**/*.ts") }
type PricingApi = ApiFromModules<{ organizerDashboardPricing: typeof operations }>["organizerDashboardPricing"]
type FinanceApi = ApiFromModules<{ organizerDashboardFinance: typeof financeOperations }>["organizerDashboardFinance"]
function pricingRef<K extends keyof PricingApi>(key: K): PricingApi[K] {
  return makeFunctionReference(`organizerDashboardPricing:${key}`) as PricingApi[K]
}
function financeRef<K extends keyof FinanceApi>(key: K): FinanceApi[K] {
  return makeFunctionReference(`organizerDashboardFinance:${key}`) as FinanceApi[K]
}

const phaseList = pricingRef("organizerDashboardPhaseListQuery")
const phaseUpsert = pricingRef("organizerDashboardPhaseUpsertMutation")
const phaseArchive = pricingRef("organizerDashboardPhaseArchiveMutation")
const codeList = pricingRef("organizerDashboardCodeListQuery")
const codeCreate = pricingRef("organizerDashboardCodeCreateMutation")
const codeUpdate = pricingRef("organizerDashboardCodeUpdateMutation")
const codeDelete = pricingRef("organizerDashboardCodeDeleteMutation")
const voucherList = pricingRef("organizerDashboardVoucherListQuery")
const voucherIssue = pricingRef("organizerDashboardVoucherIssueMutation")
const voucherRedeem = pricingRef("organizerDashboardVoucherRedeemMutation")
const voucherDeactivate = pricingRef("organizerDashboardVoucherDeactivateMutation")
const payoutRecord = financeRef("organizerDashboardPayoutRecordMutation")
const payoutStatusUpdate = financeRef("organizerDashboardPayoutStatusUpdateMutation")

const now = "2026-10-01T10:00:00.000Z"
const secret = "pricing-test-secret-only"

afterEach(() => vi.unstubAllEnvs())

async function seed() {
  vi.stubEnv("AUTH_SECRET", secret)
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("orgs", { orgHandle: "a", name: "A", createdAt: now, updatedAt: now })
    const otherOrg = await ctx.db.insert("orgs", { orgHandle: "b", name: "B", createdAt: now, updatedAt: now })
    const users = {} as Record<"inhaber" | "finanzen" | "einlass", Awaited<ReturnType<typeof ctx.db.insert<"users">>>>
    for (const role of ["inhaber", "finanzen", "einlass"] as const) {
      const userId = await ctx.db.insert("users", { name: role, role: "customer", createdAt: now, updatedAt: now })
      users[role] = userId
      await ctx.db.insert("orgMembers", {
        userId,
        orgId,
        orgHandle: "a",
        role: "member",
        organizerRole: role,
        invitedBy: userId,
        createdAt: now,
        updatedAt: now,
      })
    }
    await ctx.db.insert("organizerDashboardOrganizations", {
      orgId,
      status: "aktiv",
      profile: { name: "Org", slug: "org", kind: "verein" },
      tax: { status: "regel", defaultRateBps: 1900 },
      fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
      contracts: { termsAcceptedAt: now, dpaAcceptedAt: now },
      configurationConfirmed: true,
      createdAt: now,
      updatedAt: now,
    })
    const eventId = await ctx.db.insert("catalogEvents", {
      eventKey: "event-a",
      title: "Sommerfest",
      subtitle: "",
      description: "",
      category: "festival",
      startsAt: now,
      endsAt: now,
      doorsAt: now,
      venue: "Ort",
      city: "Berlin",
      address: "",
      organizer: "Org",
      imageUrl: "",
      imageAlt: "",
      tags: [],
      status: "published",
      orgId,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    for (const [tierKey, name] of [
      ["standard", "Standard"],
      ["schueler", "Schüler"],
    ] as const) {
      await ctx.db.insert("catalogTicketTiers", {
        eventId,
        tierKey,
        name,
        description: "",
        priceCents: 1000,
        feeCents: 0,
        capacity: 100,
        reserved: 0,
        sold: 0,
        sortOrder: 0,
        catalogVersion: 1,
        createdAt: now,
        updatedAt: now,
      })
    }
    return { orgId, otherOrg, users }
  })
  const tokens = {
    inhaber: await testAuthSessionTokenCreate(t, ids.users.inhaber, secret),
    finanzen: await testAuthSessionTokenCreate(t, ids.users.finanzen, secret),
    einlass: await testAuthSessionTokenCreate(t, ids.users.einlass, secret),
  }
  return { t, ...ids, tokens }
}

test("price phases upsert, resolve the active phase and archive out of resolution", async () => {
  const s = await seed()
  const base = { token: s.tokens.inhaber, orgId: s.orgId, eventKey: "event-a", tierKey: "standard" }
  const early = await s.t.mutation(phaseUpsert, {
    ...base,
    name: "Early Bird",
    priceCents: 1500,
    endsAt: "2026-11-01T00:00:00.000Z",
    quota: 100,
  })
  expect(early.success).toBe(true)
  const regular = await s.t.mutation(phaseUpsert, { ...base, name: "Regulär", priceCents: 2200 })
  expect(regular.success).toBe(true)
  const listed = await s.t.query(phaseList, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    eventKey: "event-a",
    tierKey: "standard",
  })
  expect(listed.success).toBe(true)
  if (!listed.success) return
  expect(listed.data).toHaveLength(1)
  expect(listed.data[0]?.activePhaseKey).not.toBeNull()
  expect(listed.data[0]?.phases.map((phase) => phase.name)).toEqual(["Early Bird", "Regulär"])

  if (!early.success) return
  const archived = await s.t.mutation(phaseArchive, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    phaseId: String(early.data.phaseId),
  })
  expect(archived.success).toBe(true)
  const relisted = await s.t.query(phaseList, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    eventKey: "event-a",
    tierKey: "standard",
  })
  expect(relisted.success).toBe(true)
  if (!relisted.success) return
  expect(relisted.data[0]?.phases.map((phase) => phase.name)).toEqual(["Regulär"])
})

test("price phases refuse foreign events and denied roles", async () => {
  const s = await seed()
  const foreign = await s.t.mutation(phaseUpsert, {
    token: s.tokens.inhaber,
    orgId: s.otherOrg,
    eventKey: "event-a",
    tierKey: "standard",
    name: "Early Bird",
    priceCents: 1500,
  })
  expect(foreign.success).toBe(false)
  const denied = await s.t.query(phaseList, { token: s.tokens.einlass, orgId: s.orgId, eventKey: "event-a" })
  expect(denied.success).toBe(false)
})

test("codes create singly and in bulk, enforce business rules and delete only when unused", async () => {
  const s = await seed()
  const single = await s.t.mutation(codeCreate, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    eventKey: "event-a",
    kind: "rabatt",
    code: "jazz10",
    discountType: "prozent",
    discountValue: 1000,
    maxTickets: 50,
  })
  expect(single.success).toBe(true)
  if (!single.success) return
  expect(single.data.codes).toEqual(["JAZZ10"])
  const duplicate = await s.t.mutation(codeCreate, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    eventKey: "event-a",
    kind: "rabatt",
    code: "JAZZ10",
    discountType: "prozent",
    discountValue: 1000,
  })
  expect(duplicate.success).toBe(false)

  const bulk = await s.t.mutation(codeCreate, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    eventKey: "event-a",
    kind: "zugang",
    prefix: "ABI-",
    count: 3,
    tierKeys: ["schueler"],
    maxTickets: 60,
  })
  expect(bulk.success).toBe(true)
  if (!bulk.success) return
  expect(bulk.data.codes).toHaveLength(3)

  const noTiers = await s.t.mutation(codeCreate, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    eventKey: "event-a",
    kind: "zugang",
    code: "PRESSE-1",
  })
  expect(noTiers.success).toBe(false)
  const overHundred = await s.t.mutation(codeCreate, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    eventKey: "event-a",
    kind: "rabatt",
    code: "VIEL-99",
    discountType: "prozent",
    discountValue: 20000,
  })
  expect(overHundred.success).toBe(false)

  const listed = await s.t.query(codeList, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    eventKey: "event-a",
    paginationOpts: { cursor: null, numItems: 25 },
  })
  expect(listed.success).toBe(true)
  if (!listed.success) return
  const stored = listed.data.page.find((row) => row.code === "JAZZ10")
  expect(stored?.discountValue).toBe(1000)
  const toggled = await s.t.mutation(codeUpdate, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    codeId: String(stored?.codeId),
    active: false,
  })
  expect(toggled.success).toBe(true)

  await s.t.run(async (ctx) => {
    const row = await ctx.db
      .query("organizerDashboardCodes")
      .withIndex("orgIdAndEventKeyAndCode", (q) =>
        q.eq("orgId", s.orgId).eq("eventKey", "event-a").eq("code", "JAZZ10"),
      )
      .unique()
    if (row) await ctx.db.patch(row._id, { usedTickets: 2 })
  })
  const usedDelete = await s.t.mutation(codeDelete, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    codeId: String(stored?.codeId),
  })
  expect(usedDelete.success).toBe(false)
  const bulkRow = listed.data.page.find((row) => row.code.startsWith("ABI-"))
  const unusedDelete = await s.t.mutation(codeDelete, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    codeId: String(bulkRow?.codeId),
  })
  expect(unusedDelete.success).toBe(true)
})

test("vouchers issue, redeem atomically to zero and deactivate", async () => {
  const s = await seed()
  const issued = await s.t.mutation(voucherIssue, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    code: "dank-2026",
    initialCents: 5000,
    validity: "1-jahr",
    recipientName: "Lea Schneider",
  })
  expect(issued.success).toBe(true)
  if (!issued.success) return
  expect(issued.data.code).toBe("DANK-2026")

  const partial = await s.t.mutation(voucherRedeem, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    code: "DANK-2026",
    amountCents: 2000,
    orderRef: "EV-0001",
  })
  expect(partial.success).toBe(true)
  if (!partial.success) return
  expect(partial.data.balanceCents).toBe(3000)

  const over = await s.t.mutation(voucherRedeem, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    code: "DANK-2026",
    amountCents: 4000,
    orderRef: "EV-0002",
  })
  expect(over.success).toBe(false)

  const rest = await s.t.mutation(voucherRedeem, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    code: "DANK-2026",
    amountCents: 3000,
    orderRef: "EV-0002",
  })
  expect(rest.success).toBe(true)
  const listed = await s.t.query(voucherList, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    paginationOpts: { cursor: null, numItems: 25 },
  })
  expect(listed.success).toBe(true)
  if (!listed.success) return
  expect(listed.data.page.find((row) => row.code === "DANK-2026")?.status).toBe("eingeloest")

  const second = await s.t.mutation(voucherIssue, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    initialCents: 1000,
    validity: "unbegrenzt",
  })
  expect(second.success).toBe(true)
  if (!second.success) return
  const deactivated = await s.t.mutation(voucherDeactivate, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    voucherId: String(second.data.voucherId),
  })
  expect(deactivated.success).toBe(true)
  const redeemedAfterDeactivate = await s.t.mutation(voucherRedeem, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    code: second.data.code,
    amountCents: 500,
    orderRef: "EV-0003",
  })
  expect(redeemedAfterDeactivate.success).toBe(false)
})

test("vouchers and payouts refuse foreign organizations", async () => {
  const s = await seed()
  const foreign = await s.t.mutation(voucherIssue, {
    token: s.tokens.inhaber,
    orgId: s.otherOrg,
    initialCents: 1000,
    validity: "unbegrenzt",
  })
  expect(foreign.success).toBe(false)
  const denied = await s.t.query(voucherList, {
    token: s.tokens.einlass,
    orgId: s.orgId,
    paginationOpts: { cursor: null, numItems: 25 },
  })
  expect(denied.success).toBe(false)
})

test("payout status moves monotonically from vorgemerkt to ausgezahlt", async () => {
  const s = await seed()
  await s.t.run(async (ctx) => {
    await ctx.db.insert("ticketOrders", {
      checkoutKey: "pricing_payout_checkout",
      customerEmail: "buyer@example.org",
      contactSnapshotJson: "{}",
      checkoutContextJson: "{}",
      eventKey: "event-a",
      eventTitle: "Sommerfest",
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: now,
      eventEndsAt: now,
      eventDoorsAt: now,
      venue: "Ort",
      city: "Berlin",
      address: "",
      organizer: "Org",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      orgId: s.orgId,
      subtotalCents: 2000,
      feeCents: 100,
      totalCents: 2100,
      paymentReference: "pricing_pay",
      stripeMode: "test",
      status: "paid",
      paymentStatus: "paid",
      reservationExpiresAt: 1,
      createdAt: now,
      updatedAt: now,
      paidAt: now,
    })
  })
  const recorded = await s.t.mutation(payoutRecord, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    eventKey: "event-a",
    amountCents: 500,
  })
  expect(recorded.success).toBe(true)
  if (!recorded.success) return
  const paid = await s.t.mutation(payoutStatusUpdate, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    payoutId: String(recorded.data.payoutId),
    status: "ausgezahlt",
  })
  expect(paid.success).toBe(true)
  const back = await s.t.mutation(payoutStatusUpdate, {
    token: s.tokens.finanzen,
    orgId: s.orgId,
    payoutId: String(recorded.data.payoutId),
    status: "vorgemerkt",
  })
  expect(back.success).toBe(false)
})
