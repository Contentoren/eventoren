/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const secret = "e2e-legacy-technical-cleanup-test-secret"

const attemptId = "12345678-1234-1234-1234-123456789abc"
const nativeRunId = "mtest-run"
const nativeEventKey = `native-auth-${attemptId}`
const nativeTitle = `[native-auth-e2e:${nativeRunId}:${attemptId}] lifecycle edited`

const readinessKey = "readiness-technical-draft-20260914"
const technicalKey = "technischer-checkout-test-keine-veranstaltung-e879ab05"

const pilatesKey = "pilates-christmas-event-2027-final"

type Fixture = ReturnType<typeof convexTest>

async function adminTokenFor(t: Fixture) {
  const now = new Date().toISOString()
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "admin", role: "admin", createdAt: now, updatedAt: now }),
  )
  return { token: await testAuthSessionTokenCreate(t, userId, secret), userId }
}

function baseEvent(now: string, overrides: Record<string, unknown>) {
  return {
    title: "Fixture",
    subtitle: "",
    description: "",
    category: "test",
    startsAt: now,
    endsAt: now,
    doorsAt: now,
    venue: "Test",
    city: "Berlin",
    address: "Test",
    organizer: "Test organizer",
    imageUrl: "",
    imageAlt: "",
    tags: [],
    status: "published" as const,
    catalogVersion: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

async function scannerLinkInsert(
  t: Fixture,
  nowMs: number,
  input: { code: string; name: string; eventKeys: string[] },
) {
  return t.run((ctx) =>
    ctx.db.insert("scannerLinks", {
      code: input.code,
      name: input.name,
      role: "organizer" as const,
      eventKeys: input.eventKeys,
      expiresAt: nowMs + 3600_000,
      createdAt: nowMs,
    }),
  )
}

async function liveOrderGraph(
  t: Fixture,
  now: string,
  input: { eventKey: string; tierId: string; tierKey: string; checkoutKey: string; status: "paid" | "reserved" },
) {
  const orderId = await t.run((ctx) =>
    ctx.db.insert("ticketOrders", {
      checkoutKey: input.checkoutKey,
      customerGivenName: "Technik",
      customerFamilyName: "Checkout-Test",
      customerEmail: "technik@example.com",
      contactSnapshotJson: "{}",
      eventKey: input.eventKey,
      eventTitle: "Technischer Checkout-Test (keine Veranstaltung)",
      eventSubtitle: "",
      eventDescription: "Fiktiver technischer Checkout-Test",
      eventStartsAt: now,
      eventEndsAt: now,
      eventDoorsAt: now,
      venue: "Test",
      city: "Berlin",
      address: "Test",
      organizer: "Eventoren Technik",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 100,
      feeCents: 0,
      totalCents: 100,
      checkoutContextJson: "{}",
      paymentReference: `pay-${input.checkoutKey}`,
      stripeMode: "live" as const,
      status: input.status,
      paymentStatus: input.status === "paid" ? ("paid" as const) : ("pending" as const),
      reservationExpiresAt: 0,
      createdAt: now,
      updatedAt: now,
    }),
  )
  await t.run((ctx) =>
    ctx.db.insert("ticketOrderLines", {
      orderId,
      tierId: input.tierId as never,
      eventKey: input.eventKey,
      tierKey: input.tierKey,
      tierName: "Test-Ticket fiktiv",
      tierDescription: "Fiktiver Test-Tarif",
      quantity: 1,
      participantNamesJson: JSON.stringify(["Technik Gast"]),
      priceCents: 100,
      feeCents: 0,
      createdAt: now,
    }),
  )
  await t.run((ctx) =>
    ctx.db.insert("ticketReservations", {
      orderId,
      tierId: input.tierId as never,
      quantity: 1,
      participantNamesJson: JSON.stringify(["Technik Gast"]),
      status: input.status === "paid" ? ("consumed" as const) : ("active" as const),
      expiresAt: 0,
      createdAt: now,
    }),
  )
  await t.run((ctx) =>
    ctx.db.insert("ticketPaymentAttempts", {
      orderId,
      paymentReference: `pay-${input.checkoutKey}`,
      stripeMode: "live" as const,
      status: input.status === "paid" ? ("paid" as const) : ("pending" as const),
      createdAt: now,
      updatedAt: now,
    }),
  )
  await t.run((ctx) =>
    ctx.db.insert("ticketOrderDeliveries", {
      orderId,
      accessTokenSnapshot: "snapshot",
      createdAt: now,
      updatedAt: now,
    }),
  )
  await t.run((ctx) =>
    ctx.db.insert("ticketFulfillmentWork", {
      orderId,
      paymentReference: `pay-${input.checkoutKey}`,
      billingOrderReference: `billing-${input.checkoutKey}`,
      stripeMode: "live" as const,
      requestSnapshotJson: "{}",
      status: "prepared" as const,
      attemptCount: 1,
      nextAttemptAt: 0,
      createdAt: now,
      updatedAt: now,
    }),
  )
  let ticketId: unknown = null
  if (input.status === "paid") {
    ticketId = await t.run((ctx) =>
      ctx.db.insert("ticketIssued", {
        orderId,
        sequence: 1,
        code: `TKT-${input.checkoutKey}`,
        eventKey: input.eventKey,
        eventTitle: "Technischer Checkout-Test (keine Veranstaltung)",
        eventStartsAt: now,
        eventDoorsAt: now,
        venue: "Test",
        city: "Berlin",
        address: "Test",
        tierKey: input.tierKey,
        tierName: "Test-Ticket fiktiv",
        priceCents: 100,
        feeCents: 0,
        participantName: "Technik Gast",
        issuedAt: now,
      }),
    )
    await t.run((ctx) =>
      ctx.db.insert("ticketCheckInHistory", {
        ticketId: ticketId as never,
        orderId,
        eventKey: input.eventKey,
        ticketNumber: "1",
        action: "check_in" as const,
        occurredAt: now,
        checkInAt: now,
        operatorName: "Admin",
        participantName: "Technik Gast",
        buyerName: "Technik",
        buyerEmail: "technik@example.com",
      }),
    )
  }
  return { orderId, ticketId }
}

test("native-auth archived draft sweeps recent with exclusive link deletion and mixed link pruning", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const nowMs = Date.now()
  const { token } = await adminTokenFor(t)
  const eventId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: nativeEventKey,
        title: nativeTitle,
        organizer: "Eventoren Native Auth",
        status: "archived",
      }),
    ),
  )
  const pilatesId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: pilatesKey,
        title: "Pilates Christmas Event",
        organizer: "Jennifer Kalus Hair Boutique",
        description: "Weihnachts-Pilates mit Flora Bonn",
        status: "published",
      }),
    ),
  )
  const exclusiveId = await scannerLinkInsert(t, nowMs, {
    code: "native-exclusive",
    name: "native",
    eventKeys: [nativeEventKey],
  })
  const mixedId = await scannerLinkInsert(t, nowMs, {
    code: "native-mixed",
    name: "mixed",
    eventKeys: [nativeEventKey, pilatesKey],
  })
  const swept = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token })
  expect(swept.success).toBe(true)
  if (!swept.success) return
  expect(swept.data.isDone).toBe(true)
  expect(swept.data.cleaned).toHaveLength(1)
  expect(swept.data.cleaned[0]).toMatchObject({
    eventKey: nativeEventKey,
    kind: "native-auth",
    deletedScannerLinks: 1,
    prunedScannerLinks: 1,
  })
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", eventId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("scannerLinks", exclusiveId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("scannerLinks", mixedId))).toMatchObject({ eventKeys: [pilatesKey] })
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", pilatesId))).toMatchObject({ eventKey: pilatesKey })
  const resweep = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token, staleAfterMs: 0 })
  expect(resweep).toMatchObject({ success: true, data: { cleaned: [], skipped: [] } })
})

test("readiness draft sweeps recent with technical sync corroboration while uncorroborated rows are retained", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const { token } = await adminTokenFor(t)
  const eventId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: readinessKey,
        title: readinessKey,
        organizer: "",
        description: "Technische Synchronisations-Vorlage, kein öffentliches Angebot",
        imageUrl: "https://eventoren.contentoren.de/readiness-technical-draft.png",
        status: "draft",
      }),
    ),
  )
  const swept = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token })
  expect(swept.success).toBe(true)
  if (!swept.success) return
  expect(swept.data.cleaned).toMatchObject([{ eventKey: readinessKey, kind: "readiness" }])
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", eventId))).toBeNull()

  const t2 = convexTest(schema, modules)
  const { token: token2 } = await adminTokenFor(t2)
  const genuineId = await t2.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: readinessKey,
        title: "Sommerfestival",
        organizer: "Stadt Bonn",
        description: "Sommerfestival im Park mit Live-Musik",
        imageUrl: "https://example.com/sommer.webp",
        status: "published",
      }),
    ),
  )
  const similarId = await t2.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, { eventKey: "readiness-technical-draft-20260915", title: "Test", status: "draft" }),
    ),
  )
  const retained = await t2.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, {
    token: token2,
    staleAfterMs: 0,
  })
  expect(retained.success).toBe(true)
  if (!retained.success) return
  expect(retained.data.cleaned).toEqual([])
  expect(retained.data.skipped.map((entry: { eventKey: string }) => entry.eventKey)).toContain(readinessKey)
  expect(await t2.run((ctx) => ctx.db.get("catalogEvents", genuineId))).not.toBeNull()
  expect(await t2.run((ctx) => ctx.db.get("catalogEvents", similarId))).not.toBeNull()
})

test("technical checkout deletes the live order graph while the genuine Pilates event stays untouched", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const nowMs = Date.now()
  const { token } = await adminTokenFor(t)
  const eventId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: technicalKey,
        title: "Technischer Checkout-Test (keine Veranstaltung)",
        organizer: "Eventoren Technik",
        description: "Fiktiver technischer Checkout-Test, keine Veranstaltung, keine echten Tickets",
        status: "published",
      }),
    ),
  )
  const tierId = await t.run((ctx) =>
    ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "test-fiktiv",
      name: "Test-Ticket fiktiv",
      description: "Fiktiver Test-Tarif für den technischen Checkout",
      priceCents: 100,
      feeCents: 0,
      capacity: 100,
      reserved: 0,
      sold: 1,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )
  const paid = await liveOrderGraph(t, now, {
    eventKey: technicalKey,
    tierId: tierId as unknown as string,
    tierKey: "test-fiktiv",
    checkoutKey: "tech-paid",
    status: "paid",
  })
  const reserved = await liveOrderGraph(t, now, {
    eventKey: technicalKey,
    tierId: tierId as unknown as string,
    tierKey: "test-fiktiv",
    checkoutKey: "tech-reserved",
    status: "reserved",
  })
  const linkId = await scannerLinkInsert(t, nowMs, { code: "tech-link", name: "tech", eventKeys: [technicalKey] })
  const pilatesId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: pilatesKey,
        title: "Pilates Christmas Event",
        organizer: "Jennifer Kalus Hair Boutique",
        description: "Weihnachts-Pilates mit Flora Bonn",
        status: "published",
      }),
    ),
  )
  const swept = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token })
  expect(swept.success).toBe(true)
  if (!swept.success) return
  expect(swept.data.cleaned).toHaveLength(1)
  expect(swept.data.cleaned[0]).toMatchObject({
    eventKey: technicalKey,
    kind: "technical-checkout",
    deletedOrders: 2,
    deletedTickets: 1,
    deletedCheckInHistory: 1,
    deletedScannerLinks: 1,
    paidHistory: "deleted",
  })
  expect(swept.data.skipped).toEqual([])
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", eventId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogTicketTiers", tierId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("ticketOrders", paid.orderId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("ticketOrders", reserved.orderId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("scannerLinks", linkId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", pilatesId))).toMatchObject({
    eventKey: pilatesKey,
    status: "published",
  })
  const residual = await t.run(async (ctx) => ({
    orders: await ctx.db
      .query("ticketOrders")
      .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", technicalKey))
      .take(2),
    tickets: await ctx.db
      .query("ticketIssued")
      .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", technicalKey))
      .take(2),
  }))
  expect(residual).toMatchObject({ orders: [], tickets: [] })
})

test("foreign and live ticket-e2e fixtures are refused while orphan scanner links are pruned", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const nowMs = Date.now()
  const { token } = await adminTokenFor(t)
  const pilatesId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: pilatesKey,
        title: "Pilates Christmas Event",
        organizer: "Jennifer Kalus Hair Boutique",
        description: "Weihnachts-Pilates mit Flora Bonn",
        status: "published",
      }),
    ),
  )
  const fakeNativeId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, { eventKey: "native-auth-not-a-uuid", title: "Test", status: "draft" }),
    ),
  )
  const plainTestId = await t.run((ctx) =>
    ctx.db.insert("catalogEvents", baseEvent(now, { eventKey: "some-test-event", title: "Test", status: "published" })),
  )
  const orphanExclusiveId = await scannerLinkInsert(t, nowMs, {
    code: "orphan-exclusive",
    name: "orphan",
    eventKeys: [readinessKey],
  })
  const orphanMixedId = await scannerLinkInsert(t, nowMs, {
    code: "orphan-mixed",
    name: "orphan-mixed",
    eventKeys: [readinessKey, pilatesKey],
  })
  const swept = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token, staleAfterMs: 0 })
  expect(swept.success).toBe(true)
  if (!swept.success) return
  expect(swept.data.cleaned).toEqual([])
  expect(swept.data.orphanScannerLinksDeleted).toBe(1)
  expect(swept.data.orphanScannerLinksPruned).toBe(1)
  expect(await t.run((ctx) => ctx.db.get("scannerLinks", orphanExclusiveId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("scannerLinks", orphanMixedId))).toMatchObject({ eventKeys: [pilatesKey] })
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", pilatesId))).not.toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", fakeNativeId))).not.toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", plainTestId))).not.toBeNull()
})

test("technical checkout with live row shape deletes the full 8-order live graph despite an ordinary tier label", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const nowMs = Date.now()
  const { token } = await adminTokenFor(t)
  // Actual sanitized production row shape: exact event key plus explicitly
  // fictitious description/subtitle; the second tier carries the ordinary live
  // label that the previous per-tier wording check refused.
  const eventId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: technicalKey,
        title: "Technischer Checkout-Test – keine Veranstaltung",
        subtitle: "FIKTIVER TECHNIKTEST – keine echte Veranstaltung",
        organizer: "Eventoren",
        description:
          "Dies ist ausschließlich ein fiktiver technischer Produktionstest des LIVE-Zahlungs-Checkouts. Es findet keine echte Veranstaltung statt. Der Kauf kann eine echte Zahlung von 1,00 EUR auslösen; bitte nicht bezahlen. Testveranstaltung, keine Leistung oder Teilnahme.",
        venue: "Technischer Testort (fiktiv)",
        status: "draft",
      }),
    ),
  )
  const liveTierId = await t.run((ctx) =>
    ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "ticket-1",
      name: "Technischer Checkout-Test – 1 Ticket",
      description: "Fiktiver technischer Checkout-Test; keine Veranstaltung. LIVE-Zahlungen belasten echtes Geld.",
      priceCents: 100,
      feeCents: 0,
      capacity: 100,
      reserved: 0,
      sold: 2,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )
  const ordinaryTierId = await t.run((ctx) =>
    ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "ticket-2",
      name: "Name",
      description: "asdas das awd as dsadas d",
      priceCents: 100,
      feeCents: 0,
      capacity: 100,
      reserved: 0,
      sold: 6,
      sortOrder: 1,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )
  // Mirror the live graph size: 8 live-mode orders, 2 paid with issued tickets.
  const tierRefs = [
    { tierId: liveTierId as unknown as string, tierKey: "ticket-1" },
    { tierId: ordinaryTierId as unknown as string, tierKey: "ticket-2" },
  ]
  const paid: { orderId: unknown }[] = []
  for (let index = 0; index < 2; index++) {
    const ref = tierRefs[index % tierRefs.length]!
    paid.push(
      await liveOrderGraph(t, now, {
        eventKey: technicalKey,
        tierId: ref.tierId,
        tierKey: ref.tierKey,
        checkoutKey: `tech-live-paid-${index}`,
        status: "paid",
      }),
    )
  }
  for (let index = 0; index < 6; index++) {
    const ref = tierRefs[index % tierRefs.length]!
    await liveOrderGraph(t, now, {
      eventKey: technicalKey,
      tierId: ref.tierId,
      tierKey: ref.tierKey,
      checkoutKey: `tech-live-held-${index}`,
      status: "reserved",
    })
  }
  const linkId = await scannerLinkInsert(t, nowMs, { code: "tech-live-link", name: "tech", eventKeys: [technicalKey] })
  const pilatesId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: pilatesKey,
        title: "Pilates Christmas Event",
        organizer: "Jennifer Kalus Hair Boutique",
        description: "Weihnachts-Pilates mit Flora Bonn",
        status: "published",
      }),
    ),
  )
  // Near-foreign key (one character off the approved exact key) must be retained.
  const nearForeignId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: "technischer-checkout-test-keine-veranstaltung-e879ab06",
        title: "Technischer Checkout-Test – keine Veranstaltung",
        description: "Fiktiver technischer Checkout-Test, keine Veranstaltung",
        status: "published",
      }),
    ),
  )
  const swept = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token })
  expect(swept.success).toBe(true)
  if (!swept.success) return
  expect(swept.data.cleaned).toHaveLength(1)
  expect(swept.data.cleaned[0]).toMatchObject({
    eventKey: technicalKey,
    kind: "technical-checkout",
    deletedOrders: 8,
    deletedTickets: 2,
    deletedCheckInHistory: 2,
    deletedScannerLinks: 1,
    paidHistory: "deleted",
  })
  expect(swept.data.skipped).toEqual([])
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", eventId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogTicketTiers", liveTierId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogTicketTiers", ordinaryTierId))).toBeNull()
  for (const entry of paid) expect(await t.run((ctx) => ctx.db.get("ticketOrders", entry.orderId as never))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("scannerLinks", linkId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", pilatesId))).toMatchObject({ eventKey: pilatesKey })
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", nearForeignId))).not.toBeNull()
  const residual = await t.run(async (ctx) => ({
    orders: await ctx.db
      .query("ticketOrders")
      .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", technicalKey))
      .take(2),
    tickets: await ctx.db
      .query("ticketIssued")
      .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", technicalKey))
      .take(2),
  }))
  expect(residual).toMatchObject({ orders: [], tickets: [] })
})

test("native-auth legacy single-marker and key-changed rows sweep while duplicates and near-foreign rows refuse", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const { token, userId } = await adminTokenFor(t)
  // Actual sanitized production rows: historical single-marker convention plus
  // the exactly-known key-changed legacy row from the same run lineage.
  const legacyRunId = "muwdpyqv-49622e87-f4ee-4cf8-a487-26c874d1283b"
  const legacyTitle = `[native-auth-e2e:${legacyRunId}] lifecycle edited`
  const singleMarkerId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: `native-auth-${legacyRunId}`,
        title: legacyTitle,
        organizer: "",
        status: "archived",
      }),
    ),
  )
  const keyChangedId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: "native-auth-a844f1f7-5c21-469f-bc8b-fe721ec05ec0",
        title: legacyTitle,
        organizer: "",
        status: "archived",
      }),
    ),
  )
  const pilatesId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: pilatesKey,
        title: "Pilates Christmas Event",
        organizer: "Jennifer Kalus Hair Boutique",
        description: "Weihnachts-Pilates mit Flora Bonn",
        status: "published",
      }),
    ),
  )
  // Duplicate title on a different key, UUID key with a generic title,
  // single-marker without UUID corroboration, and disagreed double markers.
  const duplicateTitleId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: "native-auth-bbbbbbbb-5c21-469f-bc8b-fe721ec05ec0",
        title: legacyTitle,
        status: "draft",
      }),
    ),
  )
  const genericTitleId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: "native-auth-aaaaaaaa-5c21-469f-bc8b-fe721ec05ec0",
        title: "Test",
        status: "draft",
      }),
    ),
  )
  const uncorroboratedSingleId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: "native-auth-manual-run",
        title: "[native-auth-e2e:manual-run] lifecycle draft",
        status: "draft",
      }),
    ),
  )
  const disagreedDoubleId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: "native-auth-cccccccc-5c21-469f-bc8b-fe721ec05ec0",
        title: "[native-auth-e2e:run-x:dddddddd-5c21-469f-bc8b-fe721ec05ec0] lifecycle edited",
        status: "draft",
      }),
    ),
  )
  const swept = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token })
  expect(swept.success).toBe(true)
  if (!swept.success) return
  expect(swept.data.cleaned.map((entry: { eventKey: string }) => entry.eventKey).sort()).toEqual(
    [`native-auth-${legacyRunId}`, "native-auth-a844f1f7-5c21-469f-bc8b-fe721ec05ec0"].sort(),
  )
  for (const entry of swept.data.cleaned)
    expect(entry).toMatchObject({ kind: "native-auth", deletedOrders: 0, deletedTickets: 0 })
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", singleMarkerId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", keyChangedId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", pilatesId))).not.toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", duplicateTitleId))).not.toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", genericTitleId))).not.toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", uncorroboratedSingleId))).not.toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", disagreedDoubleId))).not.toBeNull()
  // Auth identity elsewhere is untouched by fixture cleanup.
  expect(await t.run((ctx) => ctx.db.get("users", userId))).not.toBeNull()
  const resweep = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token, staleAfterMs: 0 })
  expect(resweep.success).toBe(true)
  if (!resweep.success) return
  expect(resweep.data.cleaned).toEqual([])
})

test("technical-checkout orphans with fictitious snapshots sweep in test and live modes while Pilates stays", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const { token } = await adminTokenFor(t)
  const pilatesId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: pilatesKey,
        title: "Pilates Christmas Event",
        organizer: "Jennifer Kalus Hair Boutique",
        description: "Weihnachts-Pilates mit Flora Bonn",
        status: "published",
      }),
    ),
  )
  const pilatesTierId = await t.run((ctx) =>
    ctx.db.insert("catalogTicketTiers", {
      eventId: pilatesId,
      tierKey: "pilates-tier",
      name: "Pilates Tier",
      description: "Genuine Pilates tier",
      priceCents: 100,
      feeCents: 0,
      capacity: 100,
      reserved: 0,
      sold: 0,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )
  async function technicalOrphan(checkoutKey: string, stripeMode: "test" | "live", status: "paid" | "reserved") {
    const orderId = await t.run((ctx) =>
      ctx.db.insert("ticketOrders", {
        checkoutKey,
        customerGivenName: "Technik",
        customerFamilyName: "Checkout-Test",
        customerEmail: "technik@example.com",
        contactSnapshotJson: "{}",
        eventKey: technicalKey,
        eventTitle: "Technischer Checkout-Test (keine Veranstaltung)",
        eventSubtitle: "",
        eventDescription: "Fiktiver technischer Checkout-Test, keine Veranstaltung",
        eventStartsAt: now,
        eventEndsAt: now,
        eventDoorsAt: now,
        venue: "Test",
        city: "Berlin",
        address: "Test",
        organizer: "Eventoren Technik",
        imageUrl: "",
        imageAlt: "",
        catalogVersion: 1,
        subtotalCents: 100,
        feeCents: 0,
        totalCents: 100,
        checkoutContextJson: "{}",
        paymentReference: `pay-${checkoutKey}`,
        stripeMode,
        status,
        paymentStatus: status === "paid" ? ("paid" as const) : ("pending" as const),
        reservationExpiresAt: 0,
        createdAt: now,
        updatedAt: now,
      }),
    )
    await t.run((ctx) =>
      ctx.db.insert("ticketOrderLines", {
        orderId,
        tierId: pilatesTierId as never,
        eventKey: technicalKey,
        tierKey: "test-fiktiv",
        tierName: "Test-Ticket fiktiv",
        tierDescription: "Fiktiver Test-Tarif",
        quantity: 1,
        participantNamesJson: JSON.stringify(["Technik Gast"]),
        priceCents: 100,
        feeCents: 0,
        createdAt: now,
      }),
    )
    await t.run((ctx) =>
      ctx.db.insert("ticketPaymentAttempts", {
        orderId,
        paymentReference: `pay-${checkoutKey}`,
        stripeMode,
        status: status === "paid" ? ("paid" as const) : ("pending" as const),
        createdAt: now,
        updatedAt: now,
      }),
    )
    let ticketId: unknown = null
    if (status === "paid") {
      ticketId = await t.run((ctx) =>
        ctx.db.insert("ticketIssued", {
          orderId,
          sequence: 1,
          code: `TKT-${checkoutKey}`,
          eventKey: technicalKey,
          eventTitle: "Technischer Checkout-Test (keine Veranstaltung)",
          eventStartsAt: now,
          eventDoorsAt: now,
          venue: "Test",
          city: "Berlin",
          address: "Test",
          tierKey: "test-fiktiv",
          tierName: "Test-Ticket fiktiv",
          priceCents: 100,
          feeCents: 0,
          participantName: "Technik Gast",
          issuedAt: now,
        }),
      )
      await t.run((ctx) =>
        ctx.db.insert("ticketCheckInHistory", {
          ticketId: ticketId as never,
          orderId,
          eventKey: technicalKey,
          ticketNumber: "1",
          action: "check_in" as const,
          occurredAt: now,
          checkInAt: now,
          operatorName: "Admin",
          participantName: "Technik Gast",
          buyerName: "Technik",
          buyerEmail: "technik@example.com",
        }),
      )
    }
    return { orderId, ticketId }
  }
  const paidLive = await technicalOrphan("tech-orphan-paid-live", "live", "paid")
  const heldTest = await technicalOrphan("tech-orphan-held-test", "test", "reserved")
  const discovered = await t.query(api.catalog.catalogE2eHistoricalOrphanDiscoveryQuery, { token })
  expect(discovered.success).toBe(true)
  if (!discovered.success) return
  expect(
    discovered.data.candidates.filter((entry: { eventKey: string }) => entry.eventKey === technicalKey),
  ).toMatchObject([
    { eventKey: technicalKey, kind: "technical-checkout" },
    { eventKey: technicalKey, kind: "technical-checkout" },
  ])
  const swept = await t.mutation(api.catalog.catalogE2eHistoricalOrphanOrderCleanupMutation, {
    token,
    staleAfterMs: 0,
  })
  expect(swept).toMatchObject({ success: true, data: { isDone: true, orphanOrdersDeleted: 2 } })
  expect(await t.run((ctx) => ctx.db.get("ticketOrders", paidLive.orderId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("ticketOrders", heldTest.orderId))).toBeNull()
  if (paidLive.ticketId) expect(await t.run((ctx) => ctx.db.get("ticketIssued", paidLive.ticketId as never))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", pilatesId))).not.toBeNull()
})
