/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import type { Doc } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "pilates-image-test-secret"
process.env.AUTH_SECRET = authSecret
const eventKey = "pilates-christmas-event-2027-final"
const now = "2026-09-30T12:00:00.000Z"
const savedImage = {
  imageUrl: "https://example.com/saved-detail.webp",
  imageVariants: {
    assetId: "saved-asset",
    detail: "https://example.com/saved-detail.webp",
    card: "https://example.com/saved-card.webp",
    organizer: "https://example.com/saved-organizer.webp",
  },
  imageAlt: "Saved Pilates image description",
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(now))
})
afterEach(() => {
  vi.useRealTimers()
})

function eventInsert(overrides: Partial<Doc<"catalogEvents">> = {}) {
  return {
    eventKey,
    title: "Pilates Christmas Event",
    subtitle: "Christmas Pilates",
    description: "Existing description",
    category: "sport",
    startsAt: "2027-12-01T18:00:00.000Z",
    endsAt: "2027-12-01T20:00:00.000Z",
    doorsAt: "2027-12-01T17:00:00.000Z",
    venue: "Existing venue",
    city: "Bonn",
    address: "Existing address",
    organizer: "Existing organizer",
    imageUrl: "",
    imageAlt: "",
    tags: ["pilates"],
    status: "published" as const,
    catalogVersion: 7,
    eventRevision: 3,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

async function fixtureCreate(t: ReturnType<typeof convexTest>, overrides: Partial<Doc<"catalogEvents">> = {}) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Admin", role: "admin", createdAt: now, updatedAt: now })
    const eventId = await ctx.db.insert("catalogEvents", eventInsert(overrides))
    const otherId = await ctx.db.insert("catalogEvents", eventInsert({ eventKey: "another-blank-event" }))
    const tierId = await ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "standard",
      name: "Standard",
      description: "Existing ticket",
      priceCents: 2000,
      feeCents: 100,
      capacity: 20,
      reserved: 2,
      sold: 3,
      sortOrder: 0,
      catalogVersion: 7,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version: 7,
      status: "synced",
      syncedVersion: 7,
      attempts: 0,
      lastChangedByUserId: userId,
      updatedAt: now,
    })
    return { userId, eventId, otherId, tierId }
  })
}

async function persistedStateGet(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ({
    events: await ctx.db.query("catalogEvents").collect(),
    tiers: await ctx.db.query("catalogTicketTiers").collect(),
    sync: await ctx.db.query("catalogSyncStates").collect(),
    snapshots: await ctx.db.query("catalogSyncSnapshots").collect(),
    scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
  }))
}

async function projectionsExpect(
  t: ReturnType<typeof convexTest>,
  token: string,
  image: Pick<Doc<"catalogEvents">, "imageUrl" | "imageVariants" | "imageAlt">,
) {
  const published = await t.query(api.catalog.catalogEventGetPublishedQuery, { eventKey })
  const detail = await t.query(api.organizer.organizerEventGetQuery, { eventKey, token })
  const list = await t.query(api.organizer.organizerEventListQuery, {
    token,
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(detail.success).toBe(true)
  expect(list.success).toBe(true)
  if (!detail.success || !list.success) return
  const listed = list.data.page.find((event) => event.eventKey === eventKey)
  for (const event of [published, detail.data, listed]) {
    expect(event).toMatchObject({ imageUrl: image.imageUrl, imageAlt: image.imageAlt })
    expect(event?.imageVariants).toEqual(image.imageVariants)
  }
}

test("Pilates backfill previews without writes, repairs only its blank image, syncs once and is idempotent", async () => {
  const t = convexTest(schema, modules)
  const ids = await fixtureCreate(t)
  const before = await persistedStateGet(t)
  const preview = await t.mutation(internal.catalog.catalogPilatesImageBackfillInternalMutation, { userId: ids.userId })
  expect(preview).toMatchObject({ success: true, data: { eventKey, outcome: "would-backfill" } })
  expect(await persistedStateGet(t)).toEqual(before)

  const applied = await t.mutation(internal.catalog.catalogPilatesImageBackfillInternalMutation, {
    userId: ids.userId,
    dryRun: false,
  })
  expect(applied).toMatchObject({ success: true, data: { outcome: "backfilled", catalogVersion: 8, eventRevision: 4 } })
  const after = await persistedStateGet(t)
  expect(after.events.find((event) => event._id === ids.otherId)).toEqual(
    before.events.find((event) => event._id === ids.otherId),
  )
  expect(after.tiers).toEqual(before.tiers)
  const repaired = after.events.find((event) => event._id === ids.eventId)!
  expect(repaired).toEqual({
    ...before.events.find((event) => event._id === ids.eventId),
    imageUrl: "https://assets-service-public.contentoren.de/eventoren/public/images/pilates/detail_default_v1.avif",
    imageVariants: {
      assetId: "asset-upload-edf48a71-81be-4699-9ed1-1db32db0a3da",
      detail: "https://assets-service-public.contentoren.de/eventoren/public/images/pilates/detail_default_v1.avif",
      card: "https://assets-service-public.contentoren.de/eventoren/public/images/pilates/card_default_v1.avif",
      organizer: "https://assets-service-public.contentoren.de/eventoren/public/images/pilates/card_default_v1.avif",
    },
    imageAlt: "Pilates Christmas Event von Jennifer Kalus Hair Boutique und Flora Bonn mit Weihnachtsbaum",
    catalogVersion: 8,
    eventRevision: 4,
    updatedAt: now,
  })
  expect(after.sync).toMatchObject([{ version: 8, status: "pending", lastChangedByUserId: ids.userId }])
  expect(after.snapshots).toMatchObject([{ version: 8, status: "building" }])
  expect(after.scheduled).toHaveLength(1)
  expect(after.scheduled[0]).toMatchObject({ name: "catalog:catalogSyncPushAction", args: [{ requestedVersion: 8 }] })
  const token = await createToken(ids.userId, authSecret)
  await projectionsExpect(t, token, {
    imageUrl: repaired.imageUrl,
    imageVariants: repaired.imageVariants!,
    imageAlt: repaired.imageAlt,
  })

  expect(
    await t.mutation(internal.catalog.catalogPilatesImageBackfillInternalMutation, {
      userId: ids.userId,
      dryRun: false,
    }),
  ).toMatchObject({ success: true, data: { outcome: "unchanged" } })
  expect(await persistedStateGet(t)).toEqual(after)
})

test.each([{ imageUrl: savedImage.imageUrl }, { imageVariants: savedImage.imageVariants }, { deletedAt: now }])(
  "Pilates backfill preserves configured or deleted records without sync writes: %j",
  async (overrides) => {
    const t = convexTest(schema, modules)
    const ids = await fixtureCreate(t, overrides)
    const before = await persistedStateGet(t)
    expect(
      await t.mutation(internal.catalog.catalogPilatesImageBackfillInternalMutation, {
        userId: ids.userId,
        dryRun: false,
      }),
    ).toMatchObject({ success: true, data: { outcome: "unchanged" } })
    expect(await persistedStateGet(t)).toEqual(before)
  },
)

test("Pilates backfill does not create an absent record or accept a non-admin audit user", async () => {
  const t = convexTest(schema, modules)
  const ids = await fixtureCreate(t)
  await t.run(async (ctx) => ctx.db.delete(ids.eventId))
  const before = await persistedStateGet(t)
  expect(
    await t.mutation(internal.catalog.catalogPilatesImageBackfillInternalMutation, {
      userId: ids.userId,
      dryRun: false,
    }),
  ).toMatchObject({ success: true, data: { outcome: "not-found" } })
  expect(await persistedStateGet(t)).toEqual(before)
  await t.run(async (ctx) => ctx.db.patch("users", ids.userId, { role: "customer" }))
  expect(
    await t.mutation(internal.catalog.catalogPilatesImageBackfillInternalMutation, {
      userId: ids.userId,
      dryRun: false,
    }),
  ).toMatchObject({ success: false, errorMessage: "Admin role required" })
  expect(await persistedStateGet(t)).toEqual(before)
})

test("saving new Pilates image metadata persists into public and organizer list/detail projections", async () => {
  const t = convexTest(schema, modules)
  const ids = await fixtureCreate(t)
  const token = await createToken(ids.userId, authSecret)
  const { catalogVersion: _, eventRevision: __, createdAt: ___, updatedAt: ____, ...input } = eventInsert()
  const saved = await t.mutation(api.catalog.catalogEventUpsertMutation, { ...input, ...savedImage, token })
  expect(saved.success).toBe(true)
  await projectionsExpect(t, token, savedImage)

  const manualImage = { imageUrl: "https://example.com/replacement.webp", imageAlt: "New administrator description" }
  expect((await t.mutation(api.catalog.catalogEventUpsertMutation, { ...input, ...manualImage, token })).success).toBe(
    true,
  )
  await projectionsExpect(t, token, manualImage)
  const before = await persistedStateGet(t)
  expect(
    await t.mutation(internal.catalog.catalogPilatesImageBackfillInternalMutation, {
      userId: ids.userId,
      dryRun: false,
    }),
  ).toMatchObject({ success: true, data: { outcome: "unchanged" } })
  expect(await persistedStateGet(t)).toEqual(before)
})
