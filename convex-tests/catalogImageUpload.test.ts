/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"
import { catalogImageBytesValidate } from "../src/catalog/convex/catalogImageBytesValidate.ts"
import { catalogImageValidate } from "../src/catalog/convex/catalogImageValidate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const secret = "event-image-test-secret"
process.env.AUTH_SECRET = secret

async function userCreate(t: ReturnType<typeof convexTest>, role: "admin" | "user") {
  const id = await t.run((ctx) =>
    ctx.db.insert("users", {
      name: role,
      role,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    }),
  )
  return createToken(id, secret)
}

const input = { filename: "concert.png", mediaType: "image/png", byteSize: 8 }
const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

test("HTTP upload requires a private admin bearer and leaves no unowned stage", async () => {
  const t = convexTest(schema, modules)
  const user = await userCreate(t, "user")
  const upload = (token?: string) =>
    t.fetch("/api/catalog/image-upload", {
      method: "POST",
      body: imageBytes,
      headers: {
        "Content-Type": "image/png",
        "X-Image-Size": "8",
        "X-Image-Filename": "concert.png",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  expect((await upload()).status).toBe(401)
  expect((await upload(user)).status).toBe(403)
  expect(await t.run((ctx) => ctx.db.query("catalogImageStages").first())).toBeNull()
  expect(await t.run((ctx) => ctx.db.system.query("_storage").first())).toBeNull()
})

test("admin HTTP upload binds its own blob and cleans it after byte validation fails", async () => {
  const t = convexTest(schema, modules)
  const admin = await userCreate(t, "admin")
  const response = await t.fetch("/api/catalog/image-upload", {
    method: "POST",
    body: new Uint8Array(8),
    headers: {
      Authorization: `Bearer ${admin}`,
      "Content-Type": "image/png",
      "X-Image-Size": "8",
      "X-Image-Filename": "concert.png",
    },
  })
  expect(response.status).toBe(400)
  expect(await t.run((ctx) => ctx.db.query("catalogImageStages").first())).toBeNull()
  expect(await t.run((ctx) => ctx.db.system.query("_storage").first())).toBeNull()
})

test("only an administrator can bind a stored image to an internal upload stage", async () => {
  const t = convexTest(schema, modules)
  const user = await userCreate(t, "user")
  const admin = await userCreate(t, "admin")
  const storageId = await t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array(8)], { type: "image/png" })))
  expect(
    (await t.mutation(internal.catalog.catalogImageStageCreateMutation, { token: user, storageId, ...input })).success,
  ).toBe(false)
  const created = await t.mutation(internal.catalog.catalogImageStageCreateMutation, {
    token: admin,
    storageId,
    ...input,
  })
  expect(created.success).toBe(true)
  if (created.success) expect(created.data.stageId).toBeTruthy()
})

test("internal binding rejects reuse and prevents another admin from claiming or deleting a blob", async () => {
  const t = convexTest(schema, modules)
  const owner = await userCreate(t, "admin")
  const other = await userCreate(t, "admin")
  const storageId = await t.run((ctx) =>
    ctx.storage.store(new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" })),
  )
  const metadata = await t.run((ctx) => ctx.db.system.get("_storage", storageId))
  expect(metadata).toMatchObject({ size: 8 })
  const created = await t.mutation(internal.catalog.catalogImageStageCreateMutation, {
    token: owner,
    storageId,
    ...input,
  })
  expect(created.success).toBe(true)
  if (!created.success) return
  const args = { stageId: created.data.stageId, storageId }
  expect(
    (await t.mutation(internal.catalog.catalogImageStageCreateMutation, { token: other, storageId, ...input })).success,
  ).toBe(false)
  expect((await t.mutation(internal.catalog.catalogImageStageClaimMutation, { token: other, ...args })).success).toBe(
    false,
  )
  const otherBlob = await t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array(8)], { type: "image/png" })))
  expect(
    (
      await t.mutation(internal.catalog.catalogImageStageClaimMutation, {
        token: owner,
        stageId: args.stageId,
        storageId: otherBlob,
      })
    ).success,
  ).toBe(false)
  expect(await t.run((ctx) => ctx.db.system.get("_storage", otherBlob))).not.toBeNull()
  expect((await t.mutation(internal.catalog.catalogImageStageClaimMutation, { token: owner, ...args })).success).toBe(
    true,
  )
  expect((await t.mutation(internal.catalog.catalogImageStageClaimMutation, { token: owner, ...args })).success).toBe(
    false,
  )
  await t.mutation(internal.catalog.catalogImageStageExpireMutation, { stageId: args.stageId, force: true })
  expect(await t.run((ctx) => ctx.db.system.get("_storage", storageId))).toBeNull()
})

test("rejects oversized, mismatched and disguised image uploads", () => {
  expect(catalogImageValidate("huge.png", "image/png", 11 * 1024 * 1024).success).toBe(false)
  expect(catalogImageValidate("wrong.jpg", "image/png", 8).success).toBe(false)
  expect(catalogImageBytesValidate(new TextEncoder().encode("fake png"), "image/png").success).toBe(false)
  expect(catalogImageBytesValidate(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "image/png").success).toBe(true)
})

test("upsert retains uploaded variants in admin projections and snapshots, then clears them on manual URL edit", async () => {
  const t = convexTest(schema, modules)
  const token = await userCreate(t, "admin")
  const event = {
    token,
    eventKey: "image-event",
    title: "Event",
    subtitle: "",
    description: "",
    category: "konzerte",
    startsAt: "2026-10-01",
    endsAt: "2026-10-02",
    doorsAt: "2026-10-01",
    venue: "Hall",
    city: "Berlin",
    address: "",
    organizer: "Eventoren",
    imageUrl: "https://cdn.example/detail.avif",
    imageAlt: "Concert",
    tags: [],
  }
  const variants = {
    assetId: "asset-1",
    detail: event.imageUrl,
    card: "https://cdn.example/card.avif",
    organizer: "https://cdn.example/organizer.avif",
  }
  const saved = await t.mutation(api.catalog.catalogEventUpsertMutation, { ...event, imageVariants: variants })
  expect(saved.success).toBe(true)
  if (!saved.success) return
  const listing = await t.query(api.catalog.catalogEventListAdminPageQuery, {
    token,
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(listing.success && listing.data.page[0]?.imageVariants).toEqual(variants)
  const snapshot = await t.mutation(internal.catalog.catalogSyncSnapshotBuildMutation, {
    requestedVersion: saved.data.catalogVersion,
  })
  expect(snapshot.success && snapshot.data.status).toBe("ready")
  const page = await t.query(internal.catalog.catalogSyncSnapshotQuery, {
    requestedVersion: saved.data.catalogVersion,
  })
  expect(page?.events[0]?.imageVariants).toEqual(variants)
  const changed = await t.mutation(api.catalog.catalogEventUpsertMutation, { ...event, imageUrl: "/other.webp" })
  expect(changed.success).toBe(true)
  const after = await t.query(api.catalog.catalogEventListAdminPageQuery, {
    token,
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(after.success && after.data.page[0]?.imageVariants).toBeUndefined()
})
