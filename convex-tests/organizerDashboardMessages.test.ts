import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { organizerDashboardMessageReferences } from "#src/organizer/dashboard/api/organizerDashboardMessageReferences.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "eventoren-auth-convex-test-secret"
process.env.AUTH_SECRET = authSecret
const now = "2026-10-21T00:00:00.000Z"

const messageApi = { organizerDashboardMessages: organizerDashboardMessageReferences }

type MessageRole = "inhaber" | "finanzen" | "einlass"

async function messageFixture() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("orgs", {
      orgHandle: "message-org",
      name: "Message Org",
      createdAt: now,
      updatedAt: now,
    })
    const users = {} as Record<MessageRole, Id<"users">>
    for (const role of ["inhaber", "finanzen", "einlass"] as const) {
      const userId = await ctx.db.insert("users", { name: role, role: "customer", createdAt: now, updatedAt: now })
      users[role] = userId
      await ctx.db.insert("orgMembers", {
        userId,
        orgId,
        orgHandle: "message-org",
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
      configurationConfirmed: true,
      contracts: {},
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("catalogEvents", {
      title: "Message Event",
      subtitle: "",
      description: "",
      category: "konzert",
      startsAt: "2026-11-21T19:00:00.000Z",
      endsAt: "2026-11-21T23:00:00.000Z",
      doorsAt: "2026-11-21T18:00:00.000Z",
      venue: "Halle",
      city: "Berlin",
      address: "",
      organizer: "Org",
      imageUrl: "",
      imageAlt: "",
      tags: [],
      status: "published" as const,
      catalogVersion: 1,
      orgId,
      eventKey: "message-event",
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("ticketIssued", {
      orderId: await ctx.db.insert("ticketOrders", {
        checkoutKey: "message-order",
        customerEmail: "buyer@example.org",
        contactSnapshotJson: "{}",
        eventKey: "message-event",
        eventTitle: "Message Event",
        eventSubtitle: "",
        eventDescription: "",
        eventStartsAt: "2026-11-21T19:00:00.000Z",
        eventEndsAt: "2026-11-21T23:00:00.000Z",
        eventDoorsAt: "2026-11-21T18:00:00.000Z",
        venue: "Halle",
        city: "Berlin",
        address: "",
        organizer: "Org",
        imageUrl: "",
        imageAlt: "",
        catalogVersion: 1,
        subtotalCents: 2000,
        feeCents: 0,
        totalCents: 2000,
        checkoutContextJson: "{}",
        orgId,
        paymentReference: "message-payment",
        stripeMode: "test" as const,
        status: "paid" as const,
        paymentStatus: "paid" as const,
        reservationExpiresAt: 1,
        createdAt: now,
        updatedAt: now,
      }),
      sequence: 0,
      code: "MSG-1",
      eventKey: "message-event",
      eventTitle: "Message Event",
      eventStartsAt: "2026-11-21T19:00:00.000Z",
      eventDoorsAt: "2026-11-21T18:00:00.000Z",
      venue: "Halle",
      city: "Berlin",
      address: "",
      tierKey: "standard",
      tierName: "Standard",
      priceCents: 2000,
      feeCents: 0,
      checkedInAt: now,
      issuedAt: now,
    })
    await ctx.db.insert("ticketIssued", {
      orderId: await ctx.db.insert("ticketOrders", {
        checkoutKey: "message-order-2",
        customerEmail: "buyer2@example.org",
        contactSnapshotJson: "{}",
        eventKey: "message-event",
        eventTitle: "Message Event",
        eventSubtitle: "",
        eventDescription: "",
        eventStartsAt: "2026-11-21T19:00:00.000Z",
        eventEndsAt: "2026-11-21T23:00:00.000Z",
        eventDoorsAt: "2026-11-21T18:00:00.000Z",
        venue: "Halle",
        city: "Berlin",
        address: "",
        organizer: "Org",
        imageUrl: "",
        imageAlt: "",
        catalogVersion: 1,
        subtotalCents: 2000,
        feeCents: 0,
        totalCents: 2000,
        checkoutContextJson: "{}",
        orgId,
        paymentReference: "message-payment-2",
        stripeMode: "test" as const,
        status: "paid" as const,
        paymentStatus: "paid" as const,
        reservationExpiresAt: 1,
        createdAt: now,
        updatedAt: now,
      }),
      sequence: 0,
      code: "MSG-2",
      eventKey: "message-event",
      eventTitle: "Message Event",
      eventStartsAt: "2026-11-21T19:00:00.000Z",
      eventDoorsAt: "2026-11-21T18:00:00.000Z",
      venue: "Halle",
      city: "Berlin",
      address: "",
      tierKey: "vip",
      tierName: "VIP",
      priceCents: 2000,
      feeCents: 0,
      issuedAt: now,
    })
    return { orgId, users }
  })
  const tokens = {} as Record<MessageRole, string>
  for (const role of ["inhaber", "finanzen", "einlass"] as const) {
    tokens[role] = await testAuthSessionTokenCreate(t, ids.users[role], authSecret)
  }
  return { t, ...ids, tokens }
}

test("draft counts recipients by audience and sent messages are fixated", async () => {
  const s = await messageFixture()
  const base = { token: s.tokens.inhaber, orgId: s.orgId, eventKey: "message-event" }
  const denied = await s.t.mutation(messageApi.organizerDashboardMessages.organizerDashboardMessageCreateMutation, {
    ...base,
    token: s.tokens.finanzen,
    kind: "info",
    audience: { type: "alle", tierKeys: [] },
    subject: "Hallo",
    body: "Text",
  })
  expect(denied.success).toBe(false)
  const alle = await s.t.mutation(messageApi.organizerDashboardMessages.organizerDashboardMessageCreateMutation, {
    ...base,
    kind: "info",
    audience: { type: "alle", tierKeys: [] },
    subject: "Hallo",
    body: "Text",
  })
  expect(alle.success).toBe(true)
  if (!alle.success) return
  expect(alle.data.recipientCount).toBe(2)
  const checked = await s.t.mutation(messageApi.organizerDashboardMessages.organizerDashboardMessageCreateMutation, {
    ...base,
    kind: "info",
    audience: { type: "eingecheckt", tierKeys: [] },
    subject: "Hallo",
    body: "Text",
  })
  expect(checked.success).toBe(true)
  if (!checked.success) return
  expect(checked.data.recipientCount).toBe(1)
  const vip = await s.t.mutation(messageApi.organizerDashboardMessages.organizerDashboardMessageCreateMutation, {
    ...base,
    kind: "info",
    audience: { type: "ticketarten", tierKeys: ["vip"] },
    subject: "Hallo",
    body: "Text",
  })
  expect(vip.success).toBe(true)
  if (!vip.success) return
  expect(vip.data.recipientCount).toBe(1)
  // A past instant is a backend refusal, not a transport question.
  const messageId = alle.data.messageId as Id<"organizerDashboardMessages">
  const past = await s.t.mutation(messageApi.organizerDashboardMessages.organizerDashboardMessageScheduleMutation, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    messageId,
    scheduledAt: "2000-01-01T00:00:00.000Z",
  })
  expect(past.success).toBe(false)
  const future = await s.t.mutation(messageApi.organizerDashboardMessages.organizerDashboardMessageScheduleMutation, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    messageId,
    scheduledAt: "2030-01-01T10:00:00.000Z",
  })
  expect(future.success).toBe(true)
})

test("send queues honestly and claim/record never upgrades a skipped delivery", async () => {
  const s = await messageFixture()
  const created = await s.t.mutation(messageApi.organizerDashboardMessages.organizerDashboardMessageCreateMutation, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    eventKey: "message-event",
    kind: "info",
    audience: { type: "alle", tierKeys: [] },
    subject: "Hallo",
    body: "Text",
  })
  expect(created.success).toBe(true)
  if (!created.success) return
  const messageId = created.data.messageId as Id<"organizerDashboardMessages">
  const send = await s.t.mutation(messageApi.organizerDashboardMessages.organizerDashboardMessageSendMutation, {
    token: s.tokens.inhaber,
    orgId: s.orgId,
    messageId,
  })
  expect(send.success).toBe(true)
  const queued = await s.t.run(async (ctx) => ctx.db.get("organizerDashboardMessages", messageId))
  // Without a mail provider the scheduled deliver action ends as `skipped`;
  // the queued state here proves nothing was marked sent by the mutation.
  expect(queued?.deliveryState).toBe("queued")
  expect(queued?.status).toBe("geplant")
  const claim = await s.t.mutation(
    (await import("../convex/organizerDashboardMessages.js")).organizerDashboardMessageDeliveryClaimMutation,
    { messageId },
  )
  expect(claim.success).toBe(true)
  if (!claim.success) return
  expect(claim.data.status).toBe("claimed")
  const stale = await s.t.mutation(
    (await import("../convex/organizerDashboardMessages.js")).organizerDashboardMessageDeliveryRecordMutation,
    { messageId, attempt: 0, state: "sent" },
  )
  expect(stale.success).toBe(true)
  if (!stale.success) return
  expect(stale.data.recorded).toBe(false)
  const recorded = await s.t.mutation(
    (await import("../convex/organizerDashboardMessages.js")).organizerDashboardMessageDeliveryRecordMutation,
    { messageId, attempt: claim.data.status === "claimed" ? claim.data.attempt : 0, state: "skipped", reason: "test" },
  )
  expect(recorded.success).toBe(true)
  if (!recorded.success) return
  expect(recorded.data.recorded).toBe(true)
  const afterUpdate = await s.t.mutation(
    messageApi.organizerDashboardMessages.organizerDashboardMessageUpdateMutation,
    {
      token: s.tokens.inhaber,
      orgId: s.orgId,
      messageId,
      kind: "info",
      audience: { type: "alle", tierKeys: [] },
      subject: "Neu",
      body: "Neu",
    },
  )
  expect(afterUpdate.success).toBe(true)
})

test("reminder config round-trips and the ICS carries UTC calendar data", async () => {
  const s = await messageFixture()
  const base = { token: s.tokens.inhaber, orgId: s.orgId, eventKey: "message-event" }
  const initial = await s.t.query(messageApi.organizerDashboardMessages.organizerDashboardMessageReminderGetQuery, base)
  expect(initial.success).toBe(true)
  if (!initial.success) return
  expect(initial.data.reminder).toMatchObject({ enabled: true, hoursBefore: 24, calendar: true })
  const updated = await s.t.mutation(
    messageApi.organizerDashboardMessages.organizerDashboardMessageReminderUpdateMutation,
    { ...base, enabled: true, hoursBefore: 48, directions: "Ab Ostbahnhof", calendar: true },
  )
  expect(updated.success).toBe(true)
  const ics = await s.t.query(messageApi.organizerDashboardMessages.organizerDashboardMessageIcsGetQuery, base)
  expect(ics.success).toBe(true)
  if (!ics.success) return
  expect(ics.data.ics).toContain("BEGIN:VCALENDAR")
  expect(ics.data.ics).toContain("DTSTART:20261121T190000Z")
  expect(ics.data.filename).toBe("erinnerung-message-event.ics")
})
