/// <reference types="vite/client" />

import { type ApiFromModules, makeFunctionReference } from "convex/server"
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import type { EventItem } from "../src/events/EventItem.ts"
import { organizerDashboardEventCreateMutation } from "../src/organizer/dashboard/events/convex/organizerDashboardEventCreateMutation.ts"
import { organizerDashboardEventGetQuery } from "../src/organizer/dashboard/events/convex/organizerDashboardEventGetQuery.ts"
import {
  organizerDashboardEventArchiveMutation,
  organizerDashboardEventPublishMutation,
} from "../src/organizer/dashboard/events/convex/organizerDashboardEventLifecycleMutation.ts"
import { organizerDashboardEventListQuery } from "../src/organizer/dashboard/events/convex/organizerDashboardEventListQuery.ts"
import { organizerDashboardEventUpdateMutation } from "../src/organizer/dashboard/events/convex/organizerDashboardEventUpdateMutation.ts"
import {
  organizerDashboardTierArchiveMutation,
  organizerDashboardTierUpsertMutation,
} from "../src/organizer/dashboard/events/convex/organizerDashboardTierMutation.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

type EventsTestApi = ApiFromModules<{
  organizerDashboardEventsTest: {
    organizerDashboardEventListQuery: typeof organizerDashboardEventListQuery
    organizerDashboardEventGetQuery: typeof organizerDashboardEventGetQuery
    organizerDashboardEventCreateMutation: typeof organizerDashboardEventCreateMutation
    organizerDashboardEventUpdateMutation: typeof organizerDashboardEventUpdateMutation
    organizerDashboardEventPublishMutation: typeof organizerDashboardEventPublishMutation
    organizerDashboardEventArchiveMutation: typeof organizerDashboardEventArchiveMutation
    organizerDashboardTierUpsertMutation: typeof organizerDashboardTierUpsertMutation
    organizerDashboardTierArchiveMutation: typeof organizerDashboardTierArchiveMutation
  }
}>
const eventsListQuery: EventsTestApi["organizerDashboardEventsTest"]["organizerDashboardEventListQuery"] =
  makeFunctionReference("organizerDashboardEventsTest:organizerDashboardEventListQuery")
const eventsGetQuery: EventsTestApi["organizerDashboardEventsTest"]["organizerDashboardEventGetQuery"] =
  makeFunctionReference("organizerDashboardEventsTest:organizerDashboardEventGetQuery")
const eventsCreateMutation: EventsTestApi["organizerDashboardEventsTest"]["organizerDashboardEventCreateMutation"] =
  makeFunctionReference("organizerDashboardEventsTest:organizerDashboardEventCreateMutation")
const eventsUpdateMutation: EventsTestApi["organizerDashboardEventsTest"]["organizerDashboardEventUpdateMutation"] =
  makeFunctionReference("organizerDashboardEventsTest:organizerDashboardEventUpdateMutation")
const eventsPublishMutation: EventsTestApi["organizerDashboardEventsTest"]["organizerDashboardEventPublishMutation"] =
  makeFunctionReference("organizerDashboardEventsTest:organizerDashboardEventPublishMutation")
const eventsArchiveMutation: EventsTestApi["organizerDashboardEventsTest"]["organizerDashboardEventArchiveMutation"] =
  makeFunctionReference("organizerDashboardEventsTest:organizerDashboardEventArchiveMutation")
const tierUpsertMutation: EventsTestApi["organizerDashboardEventsTest"]["organizerDashboardTierUpsertMutation"] =
  makeFunctionReference("organizerDashboardEventsTest:organizerDashboardTierUpsertMutation")
const tierArchiveMutation: EventsTestApi["organizerDashboardEventsTest"]["organizerDashboardTierArchiveMutation"] =
  makeFunctionReference("organizerDashboardEventsTest:organizerDashboardTierArchiveMutation")

const modules = {
  ...import.meta.glob("../convex/**/*.ts"),
  "../convex/organizerDashboardEventsTest.ts": async () => ({
    organizerDashboardEventListQuery,
    organizerDashboardEventGetQuery,
    organizerDashboardEventCreateMutation,
    organizerDashboardEventUpdateMutation,
    organizerDashboardEventPublishMutation,
    organizerDashboardEventArchiveMutation,
    organizerDashboardTierUpsertMutation,
    organizerDashboardTierArchiveMutation,
  }),
}

const catalogGetPublished = makeFunctionReference<"query", { eventKey: string }, EventItem | null>(
  "catalog:catalogEventGetPublishedQuery",
)
const catalogGetPublishedSummary = makeFunctionReference<"query", { eventKey: string }, EventItem | null>(
  "catalog:catalogEventGetPublishedSummaryQuery",
)

const now = "2026-10-02T00:00:00.000Z"
const authSecret = "organizer-dashboard-events-test-secret"

afterEach(() => vi.unstubAllEnvs())

type Seed = {
  t: ReturnType<typeof convexTest>
  orgA: Id<"orgs">
  orgB: Id<"orgs">
  managerToken: string
  financeToken: string
  entryToken: string
  outsiderToken: string
  nomemberToken: string
}

async function eventsSeedCreate(): Promise<Seed> {
  vi.stubEnv("AUTH_SECRET", authSecret)
  process.env.AUTH_SECRET = authSecret
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const manager = await ctx.db.insert("users", { name: "Manager", role: "customer", createdAt: now, updatedAt: now })
    const finance = await ctx.db.insert("users", { name: "Finance", role: "customer", createdAt: now, updatedAt: now })
    const entry = await ctx.db.insert("users", { name: "Entry", role: "customer", createdAt: now, updatedAt: now })
    const outsider = await ctx.db.insert("users", {
      name: "Outsider",
      role: "customer",
      createdAt: now,
      updatedAt: now,
    })
    const nomember = await ctx.db.insert("users", {
      name: "NoMember",
      role: "customer",
      createdAt: now,
      updatedAt: now,
    })
    const orgA = await ctx.db.insert("orgs", { orgHandle: "org-a", name: "Org A", createdAt: now, updatedAt: now })
    const orgB = await ctx.db.insert("orgs", { orgHandle: "org-b", name: "Org B", createdAt: now, updatedAt: now })
    for (const [userId, orgId, organizerRole] of [
      [manager, orgA, "eventmanager"],
      [finance, orgA, "finanzen"],
      [entry, orgA, "einlass"],
      [outsider, orgB, "eventmanager"],
    ] as const) {
      await ctx.db.insert("orgMembers", {
        userId,
        orgId,
        orgHandle: orgId === orgA ? "org-a" : "org-b",
        role: "member",
        organizerRole,
        invitedBy: manager,
        createdAt: now,
        updatedAt: now,
      })
    }
    for (const [orgId, status] of [
      [orgA, "aktiv"],
      [orgB, "aktiv"],
    ] as const) {
      await ctx.db.insert("organizerDashboardOrganizations", {
        orgId,
        status,
        profile: { name: orgId === orgA ? "Org A" : "Org B", slug: orgId === orgA ? "org-a" : "org-b", kind: "verein" },
        tax: { status: "regel", defaultRateBps: 1900 },
        fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
        contracts: { termsAcceptedAt: now, dpaAcceptedAt: now },
        configurationConfirmed: true,
        createdAt: now,
        updatedAt: now,
      })
    }
    return { manager, finance, entry, outsider, nomember, orgA, orgB }
  })
  const managerToken = await testAuthSessionTokenCreate(t, ids.manager, authSecret)
  const financeToken = await testAuthSessionTokenCreate(t, ids.finance, authSecret)
  const entryToken = await testAuthSessionTokenCreate(t, ids.entry, authSecret)
  const outsiderToken = await testAuthSessionTokenCreate(t, ids.outsider, authSecret)
  const nomemberToken = await testAuthSessionTokenCreate(t, ids.nomember, authSecret)
  return { t, orgA: ids.orgA, orgB: ids.orgB, managerToken, financeToken, entryToken, outsiderToken, nomemberToken }
}

function draftInput(orgId: Id<"orgs">, token: string, overrides: Record<string, unknown> = {}) {
  return {
    orgId,
    token,
    title: "Sommerfest",
    subtitle: "Open Air",
    description: "Ein Fest im Park",
    category: "festival",
    startsAt: "2026-11-01T18:00:00.000Z",
    endsAt: "2026-11-01T22:00:00.000Z",
    doorsAt: "2026-11-01T17:00:00.000Z",
    venue: "Stadtpark",
    city: "Berlin",
    address: "Parkallee 1",
    organizer: "Org A",
    imageUrl: "/images/sommerfest.webp",
    imageAlt: "Bühne im Stadtpark bei Sonnenuntergang",
    tags: ["open-air"],
    ...overrides,
  }
}

function tierInput(orgId: Id<"orgs">, token: string, eventKey: string, overrides: Record<string, unknown> = {}) {
  return {
    orgId,
    eventKey,
    token,
    name: "Standard",
    description: "Freie Platzwahl",
    startsAt: "2026-11-01T18:00:00.000Z",
    doorsAt: "2026-11-01T17:00:00.000Z",
    endsAt: "2026-11-01T22:00:00.000Z",
    priceCents: 2500,
    capacity: 100,
    ...overrides,
  }
}

test("manager creates a draft, patches details, and paginates only the owning org scope", async () => {
  const { t, orgA, orgB, managerToken, outsiderToken } = await eventsSeedCreate()
  const first = await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken, { title: "Alpha" }))
  expect(first.success).toBe(true)
  if (!first.success) return
  const second = await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken, { title: "Beta" }))
  expect(second.success).toBe(true)
  if (!second.success) return

  const patched = await t.mutation(eventsUpdateMutation, {
    orgId: orgA,
    eventKey: first.data.eventKey,
    token: managerToken,
    description: "Aktualisierte Beschreibung",
  })
  expect(patched.success).toBe(true)
  if (!patched.success) return
  expect(patched.data.description).toBe("Aktualisierte Beschreibung")

  const page = await t.query(eventsListQuery, {
    orgId: orgA,
    token: managerToken,
    paginationOpts: { numItems: 1, cursor: null },
  })
  expect(page.success).toBe(true)
  if (!page.success) return
  expect(page.data.page).toHaveLength(1)
  expect(page.data.isDone).toBe(false)

  const otherOrg = await t.mutation(eventsCreateMutation, draftInput(orgB, outsiderToken, { title: "Fremd" }))
  expect(otherOrg.success).toBe(true)
  if (!otherOrg.success) return
  const crossRead = await t.query(eventsGetQuery, {
    orgId: orgA,
    eventKey: otherOrg.data.eventKey,
    token: managerToken,
  })
  expect(crossRead.success).toBe(false)
  const crossPatch = await t.mutation(eventsUpdateMutation, {
    orgId: orgA,
    eventKey: otherOrg.data.eventKey,
    token: managerToken,
    title: "Angriff",
  })
  expect(crossPatch.success).toBe(false)
})

test("finance and entry roles read events but are denied event and tier writes, publish stays blocked without tiers or approval", async () => {
  const { t, orgA, managerToken, financeToken, entryToken } = await eventsSeedCreate()
  const created = await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken))
  expect(created.success).toBe(true)
  if (!created.success) return

  expect(
    (
      await t.mutation(eventsUpdateMutation, {
        orgId: orgA,
        eventKey: created.data.eventKey,
        token: financeToken,
        title: "X",
      })
    ).success,
  ).toBe(false)
  expect(
    (
      await t.mutation(eventsUpdateMutation, {
        orgId: orgA,
        eventKey: created.data.eventKey,
        token: entryToken,
        title: "X",
      })
    ).success,
  ).toBe(false)
  const financeList = await t.query(eventsListQuery, {
    orgId: orgA,
    token: financeToken,
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(financeList.success).toBe(true)
  const entryList = await t.query(eventsListQuery, {
    orgId: orgA,
    token: entryToken,
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(entryList.success).toBe(true)
  const financeGet = await t.query(eventsGetQuery, {
    orgId: orgA,
    eventKey: created.data.eventKey,
    token: financeToken,
  })
  expect(financeGet.success).toBe(true)
  const entryGet = await t.query(eventsGetQuery, { orgId: orgA, eventKey: created.data.eventKey, token: entryToken })
  expect(entryGet.success).toBe(true)
  expect((await t.mutation(tierUpsertMutation, tierInput(orgA, financeToken, created.data.eventKey))).success).toBe(
    false,
  )

  const publishWithoutTier = await t.mutation(eventsPublishMutation, {
    orgId: orgA,
    eventKey: created.data.eventKey,
    token: managerToken,
  })
  expect(publishWithoutTier.success).toBe(false)

  const tier = await t.mutation(tierUpsertMutation, tierInput(orgA, managerToken, created.data.eventKey))
  expect(tier.success).toBe(true)
  if (!tier.success) return

  await t.run(async (ctx) => {
    const config = await ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", orgA))
      .unique()
    if (!config) throw new Error("organization config missing")
    await ctx.db.patch("organizerDashboardOrganizations", config._id, { status: "pruefung" })
  })
  const publishPendingOrg = await t.mutation(eventsPublishMutation, {
    orgId: orgA,
    eventKey: created.data.eventKey,
    token: managerToken,
  })
  expect(publishPendingOrg.success).toBe(false)
})

test("entry role sees no prices while finance role sees server-derived fees", async () => {
  const { t, orgA, managerToken, financeToken, entryToken } = await eventsSeedCreate()
  const created = await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken))
  expect(created.success).toBe(true)
  if (!created.success) return
  const tier = await t.mutation(tierUpsertMutation, tierInput(orgA, managerToken, created.data.eventKey))
  expect(tier.success).toBe(true)
  if (!tier.success) return

  const financeGet = await t.query(eventsGetQuery, {
    orgId: orgA,
    eventKey: created.data.eventKey,
    token: financeToken,
  })
  expect(financeGet.success).toBe(true)
  if (!financeGet.success) return
  expect(financeGet.data.tiers).toHaveLength(1)
  expect(financeGet.data.tiers[0]?.priceCents).toBe(2500)
  expect(financeGet.data.tiers[0]?.feeCents).toBe(0)

  const entryGet = await t.query(eventsGetQuery, { orgId: orgA, eventKey: created.data.eventKey, token: entryToken })
  expect(entryGet.success).toBe(true)
  if (!entryGet.success) return
  expect(entryGet.data.tiers).toHaveLength(1)
  expect(entryGet.data.tiers[0]).not.toHaveProperty("priceCents")
  expect(entryGet.data.tiers[0]).not.toHaveProperty("feeCents")
  expect(entryGet.data.tiers[0]?.capacity).toBe(100)
})

test("outsiders and members without org membership are denied reads and writes", async () => {
  const { t, orgA, managerToken, outsiderToken, nomemberToken } = await eventsSeedCreate()
  const created = await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken))
  expect(created.success).toBe(true)
  if (!created.success) return

  expect(
    (
      await t.query(eventsListQuery, {
        orgId: orgA,
        token: outsiderToken,
        paginationOpts: { numItems: 10, cursor: null },
      })
    ).success,
  ).toBe(false)
  expect(
    (await t.query(eventsGetQuery, { orgId: orgA, eventKey: created.data.eventKey, token: outsiderToken })).success,
  ).toBe(false)
  expect(
    (await t.query(eventsGetQuery, { orgId: orgA, eventKey: created.data.eventKey, token: nomemberToken })).success,
  ).toBe(false)
  expect(
    (
      await t.mutation(eventsUpdateMutation, {
        orgId: orgA,
        eventKey: created.data.eventKey,
        token: outsiderToken,
        title: "X",
      })
    ).success,
  ).toBe(false)
  expect((await t.mutation(tierUpsertMutation, tierInput(orgA, outsiderToken, created.data.eventKey))).success).toBe(
    false,
  )
})

test("pagination cursor is bound to user, org, and filters", async () => {
  const { t, orgA, orgB, managerToken, outsiderToken } = await eventsSeedCreate()
  await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken, { title: "Alpha" }))
  await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken, { title: "Beta" }))
  const first = await t.query(eventsListQuery, {
    orgId: orgA,
    token: managerToken,
    paginationOpts: { numItems: 1, cursor: null },
  })
  expect(first.success).toBe(true)
  if (!first.success) return
  expect(first.data.page).toHaveLength(1)
  expect(first.data.isDone).toBe(false)

  const next = await t.query(eventsListQuery, {
    orgId: orgA,
    token: managerToken,
    paginationOpts: { numItems: 1, cursor: first.data.continueCursor },
  })
  expect(next.success).toBe(true)
  if (!next.success) return
  expect(next.data.page).toHaveLength(1)
  expect(next.data.page[0]?.eventKey).not.toBe(first.data.page[0]?.eventKey)

  expect(
    (
      await t.query(eventsListQuery, {
        orgId: orgA,
        token: managerToken,
        paginationOpts: { numItems: 1, cursor: "kein-json" },
      })
    ).success,
  ).toBe(false)
  expect(
    (
      await t.query(eventsListQuery, {
        orgId: orgA,
        token: managerToken,
        search: "Beta",
        paginationOpts: { numItems: 1, cursor: first.data.continueCursor },
      })
    ).success,
  ).toBe(false)
  expect(
    (
      await t.query(eventsListQuery, {
        orgId: orgB,
        token: outsiderToken,
        paginationOpts: { numItems: 1, cursor: first.data.continueCursor },
      })
    ).success,
  ).toBe(false)
})

test("date bounds filter on the org index, reversed bounds fail, offsets normalize to UTC", async () => {
  const { t, orgA, managerToken } = await eventsSeedCreate()
  const november = await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken, { title: "November" }))
  expect(november.success).toBe(true)
  if (!november.success) return
  const december = await t.mutation(
    eventsCreateMutation,
    draftInput(orgA, managerToken, {
      title: "Dezember",
      startsAt: "2026-12-01T18:00:00.000Z",
      endsAt: "2026-12-01T22:00:00.000Z",
      doorsAt: "2026-12-01T17:00:00.000Z",
    }),
  )
  expect(december.success).toBe(true)
  if (!december.success) return

  const fromOnly = await t.query(eventsListQuery, {
    orgId: orgA,
    token: managerToken,
    fromStartsAt: "2026-11-15T00:00:00.000Z",
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(fromOnly.success).toBe(true)
  if (!fromOnly.success) return
  expect(fromOnly.data.page.map((event) => event.title)).toEqual(["Dezember"])

  const toOnly = await t.query(eventsListQuery, {
    orgId: orgA,
    token: managerToken,
    toStartsAt: "2026-11-15T00:00:00.000Z",
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(toOnly.success).toBe(true)
  if (!toOnly.success) return
  expect(toOnly.data.page.map((event) => event.title)).toEqual(["November"])

  expect(
    (
      await t.query(eventsListQuery, {
        orgId: orgA,
        token: managerToken,
        fromStartsAt: "2026-12-01T00:00:00.000Z",
        toStartsAt: "2026-11-01T00:00:00.000Z",
        paginationOpts: { numItems: 10, cursor: null },
      })
    ).success,
  ).toBe(false)
  expect(
    (
      await t.query(eventsListQuery, {
        orgId: orgA,
        token: managerToken,
        fromStartsAt: "kein-datum",
        paginationOpts: { numItems: 10, cursor: null },
      })
    ).success,
  ).toBe(false)

  const offset = await t.mutation(
    eventsCreateMutation,
    draftInput(orgA, managerToken, {
      title: "Offset",
      startsAt: "2026-11-01T20:00:00+02:00",
      endsAt: "2026-11-02T00:00:00+02:00",
      doorsAt: "2026-11-01T19:00:00+02:00",
    }),
  )
  expect(offset.success).toBe(true)
  if (!offset.success) return
  expect(offset.data.startsAt).toBe("2026-11-01T18:00:00.000Z")
})

test("reversed windows and admission after start are rejected on create and update", async () => {
  const { t, orgA, managerToken } = await eventsSeedCreate()
  expect(
    (
      await t.mutation(
        eventsCreateMutation,
        draftInput(orgA, managerToken, { startsAt: "2026-11-01T22:00:00.000Z", endsAt: "2026-11-01T18:00:00.000Z" }),
      )
    ).success,
  ).toBe(false)
  expect(
    (await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken, { doorsAt: "2026-11-01T19:00:00.000Z" })))
      .success,
  ).toBe(false)

  const created = await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken))
  expect(created.success).toBe(true)
  if (!created.success) return
  expect(
    (
      await t.mutation(eventsUpdateMutation, {
        orgId: orgA,
        eventKey: created.data.eventKey,
        token: managerToken,
        endsAt: "2026-11-01T10:00:00.000Z",
      })
    ).success,
  ).toBe(false)
  expect(
    (
      await t.mutation(eventsUpdateMutation, {
        orgId: orgA,
        eventKey: created.data.eventKey,
        token: managerToken,
        doorsAt: "2026-11-01T19:00:00.000Z",
      })
    ).success,
  ).toBe(false)
})

test("client feeCents are rejected, server derives the buyer fee from the org config", async () => {
  const { t, orgA, managerToken } = await eventsSeedCreate()
  const created = await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken))
  expect(created.success).toBe(true)
  if (!created.success) return

  await t.run(async (ctx) => {
    const config = await ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", orgA))
      .unique()
    if (!config) throw new Error("organization config missing")
    await ctx.db.patch("organizerDashboardOrganizations", config._id, {
      fee: { percentBps: 1000, fixedCents: 50, payer: "kaeufer" },
    })
  })

  await expect(
    t.mutation(tierUpsertMutation, tierInput(orgA, managerToken, created.data.eventKey, { feeCents: 1 }) as never),
  ).rejects.toThrow()

  const priced = await t.mutation(
    tierUpsertMutation,
    tierInput(orgA, managerToken, created.data.eventKey, { tierKey: "bezahlt" }),
  )
  expect(priced.success).toBe(true)
  if (!priced.success) return
  const free = await t.mutation(
    tierUpsertMutation,
    tierInput(orgA, managerToken, created.data.eventKey, { tierKey: "frei", name: "Frei", priceCents: 0 }),
  )
  expect(free.success).toBe(true)
  if (!free.success) return

  const detail = await t.query(eventsGetQuery, { orgId: orgA, eventKey: created.data.eventKey, token: managerToken })
  expect(detail.success).toBe(true)
  if (!detail.success) return
  const byKey = new Map(detail.data.tiers.map((tier) => [tier.tierKey, tier]))
  expect(byKey.get("bezahlt")?.feeCents).toBe(300)
  expect(byKey.get("frei")?.feeCents).toBe(0)

  await t.run(async (ctx) => {
    const config = await ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", orgA))
      .unique()
    if (!config) throw new Error("organization config missing")
    await ctx.db.patch("organizerDashboardOrganizations", config._id, {
      fee: { percentBps: 1000, fixedCents: 50, payer: "veranstalter" },
    })
  })
  const organizerPays = await t.mutation(
    tierUpsertMutation,
    tierInput(orgA, managerToken, created.data.eventKey, { tierKey: "org-zahlt", name: "Org zahlt" }),
  )
  expect(organizerPays.success).toBe(true)
  if (!organizerPays.success) return
  const afterPayer = await t.query(eventsGetQuery, {
    orgId: orgA,
    eventKey: created.data.eventKey,
    token: managerToken,
  })
  expect(afterPayer.success).toBe(true)
  if (!afterPayer.success) return
  expect(afterPayer.data.tiers.find((tier) => tier.tierKey === "org-zahlt")?.feeCents).toBe(0)
  const tooSmall = await t.mutation(
    tierUpsertMutation,
    tierInput(orgA, managerToken, created.data.eventKey, { tierKey: "too-small", priceCents: 1 }),
  )
  expect(tooSmall.success).toBe(false)
  if (!tooSmall.success) expect(tooSmall.errorMessage).toContain("übersteigt den Ticketpreis")
  const freeOrganizer = await t.mutation(
    tierUpsertMutation,
    tierInput(orgA, managerToken, created.data.eventKey, { tierKey: "free-organizer", priceCents: 0 }),
  )
  expect(freeOrganizer.success).toBe(true)
})

test("tier upserts are idempotent and capacity never drops below sold plus reserved", async () => {
  const { t, orgA, managerToken } = await eventsSeedCreate()
  const created = await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken))
  expect(created.success).toBe(true)
  if (!created.success) return
  const first = await t.mutation(
    tierUpsertMutation,
    tierInput(orgA, managerToken, created.data.eventKey, { tierKey: "einmalig", name: "Einmalig" }),
  )
  expect(first.success).toBe(true)
  if (!first.success) return
  const repeat = await t.mutation(
    tierUpsertMutation,
    tierInput(orgA, managerToken, created.data.eventKey, { tierKey: "einmalig", name: "Einmalig" }),
  )
  expect(repeat.success).toBe(true)
  if (!repeat.success) return
  expect(repeat.data.tierKey).toBe(first.data.tierKey)
  const tierCount = await t.run(async (ctx) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", created.data.eventKey))
      .unique()
    if (!event) throw new Error("event missing")
    return (
      await ctx.db
        .query("catalogTicketTiers")
        .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", "einmalig"))
        .collect()
    ).length
  })
  expect(tierCount).toBe(1)

  await t.run(async (ctx) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", created.data.eventKey))
      .unique()
    if (!event) throw new Error("event missing")
    const stored = await ctx.db
      .query("catalogTicketTiers")
      .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", first.data.tierKey))
      .unique()
    if (!stored) throw new Error("tier missing")
    await ctx.db.patch("catalogTicketTiers", stored._id, { sold: 40, reserved: 5 })
  })
  const shrink = await t.mutation(
    tierUpsertMutation,
    tierInput(orgA, managerToken, created.data.eventKey, { tierKey: first.data.tierKey, capacity: 44 }),
  )
  expect(shrink.success).toBe(false)
  const keep = await t.mutation(
    tierUpsertMutation,
    tierInput(orgA, managerToken, created.data.eventKey, { tierKey: first.data.tierKey, capacity: 45 }),
  )
  expect(keep.success).toBe(true)
  expect(keep.success ? keep.data.capacity : null).toBe(45)
})

test("upcoming published events cannot be archived and ended-event archive is idempotent", async () => {
  const { t, orgA, managerToken } = await eventsSeedCreate()
  const created = await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken))
  expect(created.success).toBe(true)
  if (!created.success) return
  const tier = await t.mutation(tierUpsertMutation, tierInput(orgA, managerToken, created.data.eventKey))
  expect(tier.success).toBe(true)
  if (!tier.success) return

  const published = await t.mutation(eventsPublishMutation, {
    orgId: orgA,
    eventKey: created.data.eventKey,
    token: managerToken,
  })
  expect(published.success).toBe(true)
  if (!published.success) return
  expect(published.data.status).toBe("published")

  const detail = await t.query(eventsGetQuery, { orgId: orgA, eventKey: created.data.eventKey, token: managerToken })
  expect(detail.success).toBe(true)
  if (!detail.success) return
  expect(detail.data.tiers).toHaveLength(1)
  expect(detail.data.tierOverflow).toBe(false)

  const rejected = await t.mutation(eventsArchiveMutation, {
    orgId: orgA,
    eventKey: created.data.eventKey,
    token: managerToken,
  })
  expect(rejected.success).toBe(false)
  await t.run(async (ctx) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", created.data.eventKey))
      .unique()
    if (!event) throw new Error("Missing test event")
    expect(event.status).toBe("published")
    expect(event.deletedAt).toBeUndefined()
    await ctx.db.patch("catalogEvents", event._id, {
      startsAt: "2020-01-01T18:00:00.000Z",
      doorsAt: "2020-01-01T17:30:00.000Z",
      endsAt: "2020-01-01T22:00:00.000Z",
    })
  })
  const archivedEvent = await t.mutation(eventsArchiveMutation, {
    orgId: orgA,
    eventKey: created.data.eventKey,
    token: managerToken,
  })
  expect(archivedEvent.success).toBe(true)
  if (!archivedEvent.success) return
  expect(archivedEvent.data.status).toBe("archived")
  const publicEvent = await t.run(async (ctx) =>
    ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", created.data.eventKey))
      .unique(),
  )
  expect(publicEvent?.status).toBe("archived")
  const repeated = await t.mutation(eventsArchiveMutation, {
    orgId: orgA,
    eventKey: created.data.eventKey,
    token: managerToken,
  })
  expect(repeated).toEqual(archivedEvent)
})

test("more than fifty tiers surface an overflow flag instead of failing silently", async () => {
  const { t, orgA, managerToken } = await eventsSeedCreate()
  const created = await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken))
  expect(created.success).toBe(true)
  if (!created.success) return
  for (let index = 0; index < 51; index += 1) {
    const tier = await t.mutation(
      tierUpsertMutation,
      tierInput(orgA, managerToken, created.data.eventKey, { tierKey: `stufe-${index}`, name: `Stufe ${index}` }),
    )
    expect(tier.success).toBe(true)
    if (!tier.success) return
  }
  const detail = await t.query(eventsGetQuery, { orgId: orgA, eventKey: created.data.eventKey, token: managerToken })
  expect(detail.success).toBe(true)
  if (!detail.success) return
  expect(detail.data.tiers).toHaveLength(50)
  expect(detail.data.tierOverflow).toBe(true)
})

test("malformed dates and missing alt text fail loudly, archived tiers cannot be reused", async () => {
  const { t, orgA, managerToken } = await eventsSeedCreate()
  const malformed = await t.mutation(
    eventsCreateMutation,
    draftInput(orgA, managerToken, { startsAt: "kein-datum", imageAlt: "" }),
  )
  expect(malformed.success).toBe(false)

  const created = await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken, { imageAlt: "" }))
  expect(created.success).toBe(true)
  if (!created.success) return
  const tier = await t.mutation(tierUpsertMutation, tierInput(orgA, managerToken, created.data.eventKey))
  expect(tier.success).toBe(true)
  if (!tier.success) return
  const publishMissingAlt = await t.mutation(eventsPublishMutation, {
    orgId: orgA,
    eventKey: created.data.eventKey,
    token: managerToken,
  })
  expect(publishMissingAlt.success).toBe(false)

  const archived = await t.mutation(tierArchiveMutation, {
    orgId: orgA,
    eventKey: created.data.eventKey,
    tierKey: tier.data.tierKey,
    token: managerToken,
  })
  expect(archived.success).toBe(true)
  const reuse = await t.mutation(
    tierUpsertMutation,
    tierInput(orgA, managerToken, created.data.eventKey, { tierKey: tier.data.tierKey }),
  )
  expect(reuse.success).toBe(false)

  const archivedEvent = await t.mutation(eventsArchiveMutation, {
    orgId: orgA,
    eventKey: created.data.eventKey,
    token: managerToken,
  })
  expect(archivedEvent.success).toBe(true)
  if (!archivedEvent.success) return
  expect(archivedEvent.data.status).toBe("archived")
  const publicEvent = await t.run(async (ctx) =>
    ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", created.data.eventKey))
      .unique(),
  )
  expect(publicEvent?.status).toBe("archived")
})

test("FAQ and schedule persist, preserve IDs, reject foreign and read-only writes, and explicitly clear", async () => {
  const { t, orgA, orgB, managerToken, financeToken, outsiderToken } = await eventsSeedCreate()
  const faqs = [{ id: "faq-stable", question: "Wo?", answer: "Im Park" }]
  const schedule = [{ id: "slot-stable", time: "19:30", title: "Beginn", detail: "Hauptbühne" }]
  const created = await t.mutation(eventsCreateMutation, { ...draftInput(orgA, managerToken), faqs, schedule })
  expect(created.success).toBe(true)
  if (!created.success) return
  const eventKey = created.data.eventKey
  const detailArgs = { orgId: orgA, eventKey, token: managerToken }
  const initial = await t.query(eventsGetQuery, detailArgs)
  expect(initial).toMatchObject({ success: true, data: { faqs, schedule } })

  for (const args of [
    { orgId: orgA, token: financeToken },
    { orgId: orgA, token: outsiderToken },
    { orgId: orgB, token: outsiderToken },
  ]) {
    expect((await t.mutation(eventsUpdateMutation, { ...args, eventKey, faqs: [], schedule: [] })).success).toBe(false)
  }
  expect(await t.query(eventsGetQuery, detailArgs)).toEqual(initial)
  expect((await t.mutation(eventsUpdateMutation, { ...detailArgs, title: "Nur Titel" })).success).toBe(true)
  expect(await t.query(eventsGetQuery, detailArgs)).toMatchObject({ success: true, data: { faqs, schedule } })
  const editedFaqs = [{ ...faqs[0]!, answer: "Am See" }]
  const editedSchedule = [{ ...schedule[0]!, time: "02:30", title: "Nachts" }]
  expect(
    (await t.mutation(eventsUpdateMutation, { ...detailArgs, faqs: editedFaqs, schedule: editedSchedule })).success,
  ).toBe(true)
  expect(await t.query(eventsGetQuery, detailArgs)).toMatchObject({
    success: true,
    data: { faqs: editedFaqs, schedule: editedSchedule },
  })
  expect((await t.mutation(eventsUpdateMutation, { ...detailArgs, faqs: [], schedule: [] })).success).toBe(true)
  expect(await t.query(eventsGetQuery, detailArgs)).toMatchObject({ success: true, data: { faqs: [], schedule: [] } })
  const stored = await t.run((ctx) =>
    ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
      .unique(),
  )
  expect(stored).toMatchObject({ faqs: [], schedule: [] })
})

test("FAQ and schedule invalid bounds and HH:mm are rejected on create and update without writes", async () => {
  const { t, orgA, managerToken } = await eventsSeedCreate()
  const created = await t.mutation(eventsCreateMutation, draftInput(orgA, managerToken))
  expect(created.success).toBe(true)
  if (!created.success) return
  const scope = { orgId: orgA, token: managerToken, eventKey: created.data.eventKey }
  const before = await t.query(eventsGetQuery, scope)
  const faq = { id: "faq", question: "Wo?", answer: "Hier" }
  const slot = { id: "slot", time: "19:30", title: "Beginn" }
  for (const patch of [
    { schedule: [{ ...slot, time: "24:00" }] },
    { schedule: [{ ...slot, time: "9:30" }] },
    { schedule: [{ ...slot, title: "x".repeat(201) }] },
    { schedule: [{ ...slot, detail: "x".repeat(1001) }] },
    { schedule: Array.from({ length: 51 }, (_, i) => ({ ...slot, id: `s-${i}` })) },
    { faqs: [{ ...faq, answer: "x".repeat(1001) }] },
    { faqs: Array.from({ length: 21 }, (_, i) => ({ ...faq, id: `q-${i}` })) },
    { faqs: [faq, faq] },
  ]) {
    expect((await t.mutation(eventsCreateMutation, { ...draftInput(orgA, managerToken), ...patch })).success).toBe(
      false,
    )
    expect((await t.mutation(eventsUpdateMutation, { ...scope, ...patch })).success).toBe(false)
  }
  expect(await t.query(eventsGetQuery, scope)).toEqual(before)
  expect((await t.run((ctx) => ctx.db.query("catalogEvents").take(10))).length).toBe(1)
})

test("public catalog reads expose FAQ and Berlin schedule while legacy absence and explicit empty remain distinct", async () => {
  const { t, orgA, managerToken } = await eventsSeedCreate()
  const faqs = [{ id: "q-1", question: "Wo?", answer: "Hier" }]
  const schedule = [{ id: "s-1", time: "02:30", title: "Nachtprogramm" }]
  for (const content of [{}, { faqs, schedule }, { faqs: [], schedule: [] }]) {
    const created = await t.mutation(eventsCreateMutation, { ...draftInput(orgA, managerToken), ...content })
    expect(created.success).toBe(true)
    if (!created.success) return
    await t.run(async (ctx) => {
      const doc = await ctx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", created.data.eventKey))
        .unique()
      if (doc) await ctx.db.patch("catalogEvents", doc._id, { status: "published" })
    })
    const published = await t.query(catalogGetPublished, { eventKey: created.data.eventKey })
    const summary = await t.query(catalogGetPublishedSummary, { eventKey: created.data.eventKey })
    expect(summary?.faqs).toEqual(published?.faqs)
    expect(summary?.schedule).toEqual(published?.schedule)
    expect(published?.faqs).toEqual(content.faqs)
    expect(published?.schedule).toEqual(
      content.schedule?.map(({ time, ...item }) => ({ ...item, marker: `${time} Uhr (Europe/Berlin)` })),
    )
    if (content.faqs === undefined) {
      expect(published).not.toHaveProperty("faqs")
      expect(published).not.toHaveProperty("schedule")
    }
  }
})
