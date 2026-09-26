/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import type { Doc } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"
import { scannerLinkEventAuthorizeFn } from "../src/organizer/convex/scannerLinkEventAuthorizeFn.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "scanner-links-test-secret"
process.env.AUTH_SECRET = authSecret
const future = () => Date.now() + 30 * 24 * 60 * 60 * 1000
const page = { numItems: 10, cursor: null }
type EventInsert = Omit<Doc<"catalogEvents">, "_id" | "_creationTime">

function eventInsert(eventKey: string, status: EventInsert["status"] = "published"): EventInsert {
  return {
    eventKey,
    title: `Event ${eventKey}`,
    subtitle: "",
    description: "",
    category: "concert",
    startsAt: "2026-10-01T18:00:00Z",
    endsAt: "2026-10-01T22:00:00Z",
    doorsAt: "2026-10-01T17:00:00Z",
    venue: "Hall",
    city: "Berlin",
    address: "Road 1",
    organizer: "Org",
    imageUrl: "",
    imageAlt: "",
    tags: [],
    status,
    catalogVersion: 1,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  }
}

async function setup() {
  const t = convexTest(schema, modules)
  const tokens: Record<"admin" | "user", string> = { admin: "", user: "" }
  for (const role of ["admin", "user"] as const) {
    const id = await t.run((ctx) =>
      ctx.db.insert("users", {
        name: role,
        role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    )
    tokens[role] = await createToken(id, authSecret)
  }
  await t.run(async (ctx) => {
    await ctx.db.insert("catalogEvents", eventInsert("one"))
    await ctx.db.insert("catalogEvents", eventInsert("two"))
    await ctx.db.insert("catalogEvents", eventInsert("draft", "draft"))
  })
  return { t, tokens }
}

test("only administrators create and retrieve organizer secrets; public context contains no secret", async () => {
  const { t, tokens } = await setup()
  const input = { name: "  Lead  ", eventKeys: ["one", "two"], expiresAt: future() }
  expect(
    (await t.mutation(api.scannerLinks.scannerLinkAdminCreateMutation, { ...input, token: tokens.user })).success,
  ).toBe(false)
  expect(
    (await t.query(api.scannerLinks.scannerLinkAdminListQuery, { token: tokens.user, paginationOpts: page })).success,
  ).toBe(false)
  const created = await t.mutation(api.scannerLinks.scannerLinkAdminCreateMutation, { ...input, token: tokens.admin })
  expect(created.success).toBe(true)
  if (!created.success) return
  expect(created.data.code).toMatch(/^[a-f0-9]{64}$/)
  const list = await t.query(api.scannerLinks.scannerLinkAdminListQuery, { token: tokens.admin, paginationOpts: page })
  expect(list.success && list.data.page[0]?.code).toBe(created.data.code)
  const context = await t.query(api.scannerLinks.scannerLinkContextQuery, { code: created.data.code })
  expect(context).toEqual({
    success: true,
    data: {
      name: "Lead",
      role: "organizer",
      expiresAt: input.expiresAt,
      events: [
        { eventKey: "one", title: "Event one" },
        { eventKey: "two", title: "Event two" },
      ],
    },
  })
  expect(JSON.stringify(context)).not.toContain(created.data.code)
  expect((await t.query(api.scannerLinks.scannerLinkContextQuery, { code: "bad" })).success).toBe(false)
  await t.run(async (ctx) => {
    const admin = await ctx.db.query("users").first()
    if (admin) await ctx.db.patch("users", admin._id, { deletedAt: new Date().toISOString() })
  })
  expect(
    (await t.query(api.scannerLinks.scannerLinkAdminListQuery, { token: tokens.admin, paginationOpts: page })).success,
  ).toBe(false)
})

test("creation requires real published, distinct scoped events and bounded future expiry", async () => {
  const { t, tokens } = await setup()
  const create = (eventKeys: string[], expiresAt: number, name = "Lead") =>
    t.mutation(api.scannerLinks.scannerLinkAdminCreateMutation, { token: tokens.admin, name, eventKeys, expiresAt })
  for (const keys of [[], ["one", "one"], ["missing"], ["draft"]]) {
    expect((await create(keys, future())).success).toBe(false)
  }
  for (const expiry of [Date.now() - 1, Date.now() + 366 * 86400000, 0]) {
    expect((await create(["one"], expiry)).success).toBe(false)
  }
  expect((await create(["one"], future(), " ")).success).toBe(false)
})

test("an unpublished event does not block helper management for the parent's remaining published events", async () => {
  const { t, tokens } = await setup()
  const expiresAt = future()
  const parent = await t.mutation(api.scannerLinks.scannerLinkAdminCreateMutation, {
    token: tokens.admin,
    name: "Lead",
    eventKeys: ["one", "two"],
    expiresAt,
  })
  if (!parent.success) throw new Error("fixture parent missing")
  await t.run(async (ctx) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", "two"))
      .unique()
    if (!event) throw new Error("fixture event missing")
    await ctx.db.patch("catalogEvents", event._id, { status: "draft" })
  })
  const context = await t.query(api.scannerLinks.scannerLinkContextQuery, { code: parent.data.code })
  expect(context).toMatchObject({ success: true, data: { events: [{ eventKey: "one", title: "Event one" }] } })
  expect(
    (
      await t.mutation(api.scannerLinks.scannerLinkHelperCreateMutation, {
        code: parent.data.code,
        name: "Gate helper",
        eventKeys: ["one"],
        expiresAt,
      })
    ).success,
  ).toBe(true)
  expect(
    (await t.query(api.scannerLinks.scannerLinkEventGetQuery, { code: parent.data.code, eventKey: "two" })).success,
  ).toBe(false)
})

test("organizer can manage only own scoped helpers; helper cannot manage or extend parent expiry", async () => {
  const { t, tokens } = await setup()
  const expiresAt = future()
  const parent = await t.mutation(api.scannerLinks.scannerLinkAdminCreateMutation, {
    token: tokens.admin,
    name: "Lead",
    eventKeys: ["one"],
    expiresAt,
  })
  const other = await t.mutation(api.scannerLinks.scannerLinkAdminCreateMutation, {
    token: tokens.admin,
    name: "Other",
    eventKeys: ["two"],
    expiresAt,
  })
  if (!parent.success || !other.success) throw new Error("fixture link missing")
  const create = (code: string, eventKeys: string[], expiry = expiresAt) =>
    t.mutation(api.scannerLinks.scannerLinkHelperCreateMutation, { code, name: "Helper", eventKeys, expiresAt: expiry })
  expect((await create(parent.data.code, ["two"])).success).toBe(false)
  expect((await create(parent.data.code, ["one"], expiresAt + 1)).success).toBe(false)
  const helper = await create(parent.data.code, ["one"])
  expect(helper.success).toBe(true)
  if (!helper.success) return
  expect((await create(helper.data.code, ["one"])).success).toBe(false)
  const own = await t.query(api.scannerLinks.scannerLinkHelperListQuery, {
    code: parent.data.code,
    paginationOpts: page,
  })
  expect(own.success && own.data.page[0]?.code).toBe(helper.data.code)
  const foreign = await t.query(api.scannerLinks.scannerLinkHelperListQuery, {
    code: other.data.code,
    paginationOpts: page,
  })
  expect(foreign.success && foreign.data.page).toEqual([])
  expect(
    (await t.query(api.scannerLinks.scannerLinkHelperListQuery, { code: helper.data.code, paginationOpts: page }))
      .success,
  ).toBe(false)
  expect(
    (await t.mutation(api.scannerLinks.scannerLinkHelperRevokeMutation, { code: other.data.code, id: helper.data.id }))
      .success,
  ).toBe(false)
  expect(
    (await t.mutation(api.scannerLinks.scannerLinkHelperRevokeMutation, { code: helper.data.code, id: helper.data.id }))
      .success,
  ).toBe(false)
  expect(
    (await t.mutation(api.scannerLinks.scannerLinkAdminRevokeMutation, { token: tokens.user, id: parent.data.id }))
      .success,
  ).toBe(false)
  expect(
    (await t.mutation(api.scannerLinks.scannerLinkAdminRevokeMutation, { token: tokens.admin, id: helper.data.id }))
      .success,
  ).toBe(false)
  expect(
    (await t.mutation(api.scannerLinks.scannerLinkHelperRevokeMutation, { code: parent.data.code, id: helper.data.id }))
      .success,
  ).toBe(true)
  expect((await t.query(api.scannerLinks.scannerLinkContextQuery, { code: helper.data.code })).success).toBe(false)
  const revoked = await t.query(api.scannerLinks.scannerLinkHelperListQuery, {
    code: parent.data.code,
    paginationOpts: page,
  })
  expect(revoked.success && revoked.data.page[0]?.code).toBe(helper.data.code)
  expect(revoked.success && revoked.data.page[0]?.revokedAt).toEqual(expect.any(Number))
})

test("administrators create, list, and revoke helpers for any organizer link", async () => {
  const { t, tokens } = await setup()
  const expiresAt = future()
  const parents = await Promise.all(
    ["one", "two"].map((eventKey, index) =>
      t.mutation(api.scannerLinks.scannerLinkAdminCreateMutation, {
        token: tokens.admin,
        name: `Organizer ${index}`,
        eventKeys: [eventKey],
        expiresAt,
      }),
    ),
  )
  if (!parents[0]?.success || !parents[1]?.success) throw new Error("fixture organizer links missing")
  const [firstParent, secondParent] = parents.map((result) => (result.success ? result.data : undefined))
  if (!firstParent || !secondParent) throw new Error("fixture organizer links missing")

  const createInput = { name: "Admin helper", eventKeys: ["one"], expiresAt }
  expect(
    (
      await t.mutation(api.scannerLinks.scannerLinkAdminHelperCreateMutation, {
        token: tokens.user,
        parentId: firstParent.id,
        ...createInput,
      })
    ).success,
  ).toBe(false)
  const created = await t.mutation(api.scannerLinks.scannerLinkAdminHelperCreateMutation, {
    token: tokens.admin,
    parentId: firstParent.id,
    ...createInput,
  })
  expect(created.success).toBe(true)
  if (!created.success) return

  const listInput = { token: tokens.admin, paginationOpts: page }
  const firstList = await t.query(api.scannerLinks.scannerLinkAdminHelperListQuery, {
    ...listInput,
    parentId: firstParent.id,
  })
  const secondList = await t.query(api.scannerLinks.scannerLinkAdminHelperListQuery, {
    ...listInput,
    parentId: secondParent.id,
  })
  expect(firstList.success && firstList.data.page.map((link) => link._id)).toEqual([created.data.id])
  expect(secondList.success && secondList.data.page).toEqual([])
  expect(
    (
      await t.query(api.scannerLinks.scannerLinkAdminHelperListQuery, {
        ...listInput,
        token: tokens.user,
        parentId: firstParent.id,
      })
    ).success,
  ).toBe(false)

  expect(
    (
      await t.mutation(api.scannerLinks.scannerLinkAdminHelperRevokeMutation, {
        token: tokens.user,
        id: created.data.id,
      })
    ).success,
  ).toBe(false)
  expect(
    (
      await t.mutation(api.scannerLinks.scannerLinkAdminHelperRevokeMutation, {
        token: tokens.admin,
        id: firstParent.id,
      })
    ).success,
  ).toBe(false)
  expect(
    (
      await t.mutation(api.scannerLinks.scannerLinkAdminHelperRevokeMutation, {
        token: tokens.admin,
        id: created.data.id,
      })
    ).success,
  ).toBe(true)
  const afterRevoke = await t.query(api.scannerLinks.scannerLinkAdminHelperListQuery, {
    ...listInput,
    parentId: firstParent.id,
  })
  expect(afterRevoke.success && afterRevoke.data.page[0]?.revokedAt).toEqual(expect.any(Number))
  expect((await t.query(api.scannerLinks.scannerLinkContextQuery, { code: created.data.code })).success).toBe(false)
})

test("administrator helper creation enforces organizer parent, event scope, and parent expiry", async () => {
  const { t, tokens } = await setup()
  const expiresAt = future()
  const parent = await t.mutation(api.scannerLinks.scannerLinkAdminCreateMutation, {
    token: tokens.admin,
    name: "Lead",
    eventKeys: ["one"],
    expiresAt,
  })
  if (!parent.success) throw new Error("fixture organizer link missing")
  const helper = (parentId: typeof parent.data.id, eventKeys: string[], expiry: number) =>
    t.mutation(api.scannerLinks.scannerLinkAdminHelperCreateMutation, {
      token: tokens.admin,
      parentId,
      name: "Helper",
      eventKeys,
      expiresAt: expiry,
    })
  expect((await helper(parent.data.id, ["two"], expiresAt)).success).toBe(false)
  expect((await helper(parent.data.id, ["one"], expiresAt + 1)).success).toBe(false)

  const child = await t.mutation(api.scannerLinks.scannerLinkAdminHelperCreateMutation, {
    token: tokens.admin,
    parentId: parent.data.id,
    name: "Helper",
    eventKeys: ["one"],
    expiresAt,
  })
  if (!child.success) throw new Error("fixture helper link missing")
  expect((await helper(child.data.id as typeof parent.data.id, ["one"], expiresAt)).success).toBe(false)
  await t.run((ctx) => ctx.db.patch("scannerLinks", parent.data.id, { revokedAt: Date.now() }))
  expect((await helper(parent.data.id, ["one"], expiresAt)).success).toBe(false)
})

test("every access enforces event scope, current publication, parent revocation and expiry", async () => {
  const { t, tokens } = await setup()
  const expiresAt = future()
  const parent = await t.mutation(api.scannerLinks.scannerLinkAdminCreateMutation, {
    token: tokens.admin,
    name: "Lead",
    eventKeys: ["one"],
    expiresAt,
  })
  if (!parent.success) throw new Error("fixture parent missing")
  const helper = await t.mutation(api.scannerLinks.scannerLinkHelperCreateMutation, {
    code: parent.data.code,
    name: "Helper",
    eventKeys: ["one"],
    expiresAt,
  })
  if (!helper.success) throw new Error("fixture helper missing")
  expect((await t.run((ctx) => scannerLinkEventAuthorizeFn(ctx, helper.data.code, "two"))).success).toBe(false)
  await t.run(async (ctx) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", "one"))
      .unique()
    if (event) await ctx.db.patch("catalogEvents", event._id, { status: "archived" })
  })
  expect((await t.run((ctx) => scannerLinkEventAuthorizeFn(ctx, helper.data.code, "one"))).success).toBe(false)
  await t.run(async (ctx) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", "one"))
      .unique()
    if (event) await ctx.db.patch("catalogEvents", event._id, { status: "published" })
  })
  await t.run((ctx) => ctx.db.patch("scannerLinks", helper.data.id, { expiresAt: Date.now() - 1 }))
  expect((await t.query(api.scannerLinks.scannerLinkContextQuery, { code: helper.data.code })).success).toBe(false)
  await t.run((ctx) => ctx.db.patch("scannerLinks", helper.data.id, { expiresAt }))
  await t.run((ctx) => ctx.db.patch("scannerLinks", parent.data.id, { eventKeys: ["two"] }))
  expect((await t.query(api.scannerLinks.scannerLinkContextQuery, { code: helper.data.code })).success).toBe(false)
  await t.run((ctx) => ctx.db.patch("scannerLinks", parent.data.id, { eventKeys: ["one"] }))
  expect(
    (await t.mutation(api.scannerLinks.scannerLinkAdminRevokeMutation, { token: tokens.admin, id: parent.data.id }))
      .success,
  ).toBe(true)
  const adminList = await t.query(api.scannerLinks.scannerLinkAdminListQuery, {
    token: tokens.admin,
    paginationOpts: page,
  })
  expect(adminList.success && adminList.data.page[0]?.code).toBe(parent.data.code)
  expect((await t.query(api.scannerLinks.scannerLinkContextQuery, { code: helper.data.code })).success).toBe(false)
  expect(
    (await t.query(api.scannerLinks.scannerLinkHelperListQuery, { code: parent.data.code, paginationOpts: page }))
      .success,
  ).toBe(false)
  await t.run((ctx) =>
    ctx.db.patch("scannerLinks", parent.data.id, { revokedAt: undefined, expiresAt: Date.now() - 1 }),
  )
  expect((await t.query(api.scannerLinks.scannerLinkContextQuery, { code: helper.data.code })).success).toBe(false)
})
