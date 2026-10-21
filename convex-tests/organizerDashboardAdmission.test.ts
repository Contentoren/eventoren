/// <reference types="vite/client" />
import { type ApiFromModules, type FunctionReturnType, makeFunctionReference } from "convex/server"
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import schema from "../convex/schema.ts"
import * as operations from "../convex/organizerDashboardAdmission.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = { ...import.meta.glob("../convex/**/*.ts") }
type Api = ApiFromModules<{ organizerDashboardAdmission: typeof operations }>["organizerDashboardAdmission"]
function ref<K extends keyof Api>(key: K): Api[K] {
  return makeFunctionReference(`organizerDashboardAdmission:${key}`) as Api[K]
}
const stats = ref("organizerDashboardAdmissionStatsQuery")
const checkin = ref("organizerDashboardAdmissionCheckInMutation")
const revoke = ref("organizerDashboardAdmissionCheckInRevokeMutation")
const linkList = ref("organizerDashboardAdmissionScannerLinkListQuery")
const linkCreate = ref("organizerDashboardAdmissionScannerLinkCreateMutation")
const linkRevoke = ref("organizerDashboardAdmissionScannerLinkRevokeMutation")
const now = "2026-10-01T10:00:00.000Z"
const roles = ["inhaber", "admin", "eventmanager", "finanzen", "einlass"] as const
const secret = "admission-test-secret-only"
afterEach(() => vi.unstubAllEnvs())

async function seed() {
  vi.stubEnv("AUTH_SECRET", secret)
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("orgs", { orgHandle: "a", name: "A", createdAt: now, updatedAt: now })
    const otherOrg = await ctx.db.insert("orgs", { orgHandle: "b", name: "B", createdAt: now, updatedAt: now })
    const users = {} as Record<(typeof roles)[number], Awaited<ReturnType<typeof ctx.db.insert<"users">>>>
    for (const role of roles) {
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
    for (const id of [orgId, otherOrg])
      await ctx.db.insert("organizerDashboardOrganizations", {
        orgId: id,
        status: "aktiv",
        profile: { name: "Org", slug: String(id), kind: "verein" },
        tax: { status: "regel", defaultRateBps: 1900 },
        fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
        contracts: { termsAcceptedAt: now, dpaAcceptedAt: now },
        configurationConfirmed: true,
        createdAt: now,
        updatedAt: now,
      })
    const eventData = {
      title: "Testevent",
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
      status: "published" as const,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }
    const eventId = await ctx.db.insert("catalogEvents", { ...eventData, orgId, eventKey: "event-a" })
    await ctx.db.insert("catalogEvents", { ...eventData, orgId: otherOrg, eventKey: "event-b" })
    await ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "standard",
      name: "Standard",
      description: "",
      priceCents: 1000,
      feeCents: 100,
      capacity: 100,
      reserved: 0,
      sold: 0,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    const orderBase = {
      checkoutKey: "key",
      ownerUserId: users.inhaber,
      customerEmail: "buyer@example.org",
      contactSnapshotJson: "{}",
      eventKey: "event-a",
      eventTitle: "Testevent",
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
      subtotalCents: 1000,
      feeCents: 100,
      totalCents: 1100,
      orgId,
      paymentReference: "pay",
      stripeMode: "test" as const,
      checkoutContextJson: "{}",
      status: "paid" as const,
      paymentStatus: "paid" as const,
      reservationExpiresAt: 1,
      createdAt: now,
      updatedAt: now,
    }
    const paidOrderId = await ctx.db.insert("ticketOrders", orderBase)
    const unpaidOrderId = await ctx.db.insert("ticketOrders", {
      ...orderBase,
      checkoutKey: "key-unpaid",
      status: "checkout_created" as const,
      paymentStatus: "pending" as const,
    })
    const ticketBase = {
      orderId: paidOrderId,
      sequence: 1,
      ownerUserId: users.inhaber,
      code: "TICKET-OK-1",
      eventKey: "event-a",
      eventTitle: "Testevent",
      eventStartsAt: now,
      eventDoorsAt: now,
      venue: "Ort",
      city: "Berlin",
      address: "",
      tierKey: "standard",
      tierName: "Standard",
      priceCents: 1000,
      feeCents: 100,
      participantName: "Holder",
      issuedAt: now,
    }
    const freshTicketId = await ctx.db.insert("ticketIssued", ticketBase)
    const unpaidTicketId = await ctx.db.insert("ticketIssued", {
      ...ticketBase,
      orderId: unpaidOrderId,
      code: "TICKET-UNPAID-1",
    })
    const cancelledTicketId = await ctx.db.insert("ticketIssued", {
      ...ticketBase,
      code: "TICKET-CANCELLED-1",
      cancelled: true,
    })
    return {
      orgId,
      otherOrg,
      users,
      eventId,
      paidOrderId,
      unpaidOrderId,
      freshTicketId,
      unpaidTicketId,
      cancelledTicketId,
    }
  })
  const tokens = {} as Record<(typeof roles)[number], string>
  for (const role of roles) tokens[role] = await testAuthSessionTokenCreate(t, ids.users[role], secret)
  return { t, ...ids, tokens }
}

for (const role of roles)
  test(`${role}: admission stats and manual check-in policy`, async () => {
    const s = await seed()
    const base = { token: s.tokens[role], orgId: s.orgId, eventKey: "event-a" }
    // Stats: entry roles (einlass.nutzen) and order readers (bestellungen.sehen, incl. finanzen).
    expect((await s.t.query(stats, base)).success).toBe(true)
    // Manual check-in/revoke and link listing need einlass.nutzen: finanzen is denied.
    const entry = role !== "finanzen"
    expect(
      (await s.t.mutation(checkin, { ...base, entrance: "Haupteingang", ticketCode: "TICKET-OK-1" })).success,
    ).toBe(entry)
    expect((await s.t.mutation(revoke, { ...base, entrance: "Haupteingang", ticketCode: "TICKET-OK-1" })).success).toBe(
      entry,
    )
    expect((await s.t.query(linkList, base)).success).toBe(entry)
    const created = await s.t.mutation(linkCreate, {
      ...base,
      label: "Hilfe 1",
      entrance: "Haupteingang",
      expiresAt: Date.now() + 3600_000,
    })
    // Helper-link grants need ticket rights; entry-only roles are denied.
    expect(created.success).toBe(role !== "einlass" && role !== "finanzen")
    if (created.success) {
      const listed = await s.t.query(linkList, base)
      expect(listed.success).toBe(true)
      if (listed.success) {
        expect(listed.data.links.map((link) => link.label)).toContain("Hilfe 1")
        const raw = JSON.stringify(listed.data)
        expect(raw.includes("code")).toBe(false)
        expect(
          (await s.t.mutation(linkRevoke, { token: s.tokens[role], orgId: s.orgId, linkId: created.data.linkId }))
            .success,
        ).toBe(true)
      }
    }
  })

test("manual check-in records ok and rejected scans with reasons", async () => {
  const s = await seed()
  const base = { token: s.tokens.inhaber, orgId: s.orgId, eventKey: "event-a" }
  const ok = await s.t.mutation(checkin, { ...base, entrance: "Haupteingang", ticketCode: "TICKET-OK-1" })
  expect(ok.success).toBe(true)
  const duplicate = await s.t.mutation(checkin, { ...base, entrance: "Haupteingang", ticketCode: "TICKET-OK-1" })
  expect(duplicate.success).toBe(false)
  const unknown = await s.t.mutation(checkin, { ...base, entrance: "Seite", ticketCode: "NOPE-1" })
  expect(unknown.success).toBe(false)
  const unpaid = await s.t.mutation(checkin, { ...base, entrance: "Seite", ticketCode: "TICKET-UNPAID-1" })
  expect(unpaid.success).toBe(false)
  const cancelled = await s.t.mutation(checkin, { ...base, entrance: "Seite", ticketCode: "TICKET-CANCELLED-1" })
  expect(cancelled.success).toBe(false)
  const wrongEvent = await s.t.mutation(checkin, {
    token: s.tokens.inhaber,
    orgId: s.otherOrg,
    eventKey: "event-b",
    entrance: "Seite",
    ticketCode: "TICKET-OK-1",
  })
  // Other org never owned event-a: scope denies before ticket resolution.
  expect(wrongEvent.success).toBe(false)
  const result = await s.t.query(stats, base)
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.totals).toEqual({ sold: 2, checkedIn: 1, rejected: 4 })
  expect(result.data.byTier).toEqual([
    { tierKey: "standard", tierName: "Standard", capacity: 100, sold: 2, checkedIn: 1, cancelled: 1 },
  ])
  const reasons = Object.fromEntries(result.data.rejected.map((row) => [row.result, row.count]))
  expect(reasons).toEqual({ doppelt: 1, unbekannt: 1, unbezahlt: 1, storniert: 1 })
  const entrances = Object.fromEntries(result.data.byEntrance.map((row) => [row.entrance, row]))
  expect(entrances["Haupteingang"]).toEqual({ entrance: "Haupteingang", checkedIn: 1, rejected: 1 })
})

test("revoke clears check-in and rejects double revoke", async () => {
  const s = await seed()
  const base = { token: s.tokens.einlass, orgId: s.orgId, eventKey: "event-a" }
  expect((await s.t.mutation(checkin, { ...base, entrance: "Tor", ticketCode: "TICKET-OK-1" })).success).toBe(true)
  expect((await s.t.mutation(revoke, { ...base, entrance: "Tor", ticketCode: "TICKET-OK-1" })).success).toBe(true)
  const again = await s.t.mutation(revoke, { ...base, entrance: "Tor", ticketCode: "TICKET-OK-1" })
  expect(again.success).toBe(false)
  const ticket = await s.t.run((ctx) => ctx.db.get("ticketIssued", s.freshTicketId))
  expect(ticket?.checkedInAt).toBeUndefined()
})

test("foreign org event and unpublished link targets are denied", async () => {
  const s = await seed()
  await s.t.run((ctx) =>
    ctx.db.insert("catalogEvents", {
      title: "Draft",
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
      status: "draft" as const,
      catalogVersion: 1,
      orgId: s.orgId,
      eventKey: "event-draft",
      createdAt: now,
      updatedAt: now,
    }),
  )
  const base = { token: s.tokens.inhaber, orgId: s.orgId }
  expect((await s.t.query(stats, { ...base, eventKey: "event-b" })).success).toBe(false)
  expect(
    (await s.t.mutation(linkCreate, { ...base, eventKey: "event-draft", label: "X", expiresAt: Date.now() + 1000 }))
      .success,
  ).toBe(false)
  const foreignLink = await s.t.run((ctx) =>
    ctx.db.insert("scannerLinks", {
      code: "foreign-link-code",
      name: "Fremd",
      role: "helper",
      eventKeys: ["event-a"],
      eventOrgIds: { "event-a": s.otherOrg },
      expiresAt: Date.now() + 3600_000,
      createdAt: Date.now(),
    }),
  )
  expect((await s.t.mutation(linkRevoke, { ...base, linkId: foreignLink })).success).toBe(false)
})

test("stats DTO carries inspected evidence shape", async () => {
  const s = await seed()
  const result = await s.t.query(stats, { token: s.tokens.inhaber, orgId: s.orgId, eventKey: "event-a" })
  expect(result.success).toBe(true)
  if (!result.success) return
  const data = result.data as unknown as Record<string, unknown>
  expect(Object.keys(data).sort()).toEqual(["byEntrance", "byTier", "eventKey", "rejected", "totals"])
  expect(JSON.stringify(data).includes("SECRET")).toBe(false)
})
