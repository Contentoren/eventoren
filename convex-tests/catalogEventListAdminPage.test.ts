/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import type { Doc } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "catalog-admin-list-test-secret"
process.env.AUTH_SECRET = authSecret

type CatalogEventInsert = Omit<Doc<"catalogEvents">, "_id" | "_creationTime">

function catalogEventInsert(status: CatalogEventInsert["status"]): CatalogEventInsert {
  return {
    eventKey: `event-${status}`,
    title: `${status} event`,
    subtitle: "Subtitle",
    description: "Description",
    category: "konzerte",
    startsAt: `2026-10-0${status === "draft" ? "1" : status === "published" ? "2" : "3"}T18:00:00.000Z`,
    endsAt: "2026-10-03T22:00:00.000Z",
    doorsAt: "2026-10-03T17:00:00.000Z",
    venue: "Test hall",
    city: "Berlin",
    address: "Teststraße 1",
    organizer: "Eventoren",
    imageUrl: "/images/test.webp",
    imageAlt: "Test event",
    tags: [status],
    status,
    catalogVersion: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  }
}

async function userTokenCreate(t: ReturnType<typeof convexTest>, role: "user" | "admin") {
  const now = new Date().toISOString()
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: `${role} user`,
      role,
      createdAt: now,
      updatedAt: now,
    }),
  )
  return createToken(userId, authSecret)
}

test("authorized admin event loading includes every status and ticket data needed by the editor", async () => {
  const t = convexTest(schema, modules)
  const token = await userTokenCreate(t, "admin")
  await t.run(async (ctx) => {
    for (const status of ["draft", "published", "archived"] as const) {
      const eventId = await ctx.db.insert("catalogEvents", catalogEventInsert(status))
      if (status !== "draft") continue
      await ctx.db.insert("catalogTicketTiers", {
        eventId,
        tierKey: "standard",
        name: "Standard",
        description: "Freie Platzwahl",
        priceCents: 2500,
        feeCents: 250,
        capacity: 10,
        reserved: 2,
        sold: 3,
        sortOrder: 0,
        catalogVersion: 1,
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      })
    }
  })

  const result = await t.query(api.catalog.catalogEventListAdminPageQuery, {
    token,
    paginationOpts: { numItems: 50, cursor: null },
  })

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.page.map((event) => [event.id, event.status])).toEqual([
    ["event-draft", "draft"],
    ["event-published", "published"],
    ["event-archived", "archived"],
  ])
  expect(result.data.page[0]?.tiers).toEqual([
    {
      id: "standard",
      name: "Standard",
      description: "Freie Platzwahl",
      priceCents: 2500,
      feeCents: 250,
      capacity: 10,
      available: 5,
      sortOrder: 0,
    },
  ])
})

test("admin event loading rejects missing tokens and non-admin users", async () => {
  const t = convexTest(schema, modules)
  const userToken = await userTokenCreate(t, "user")

  const missingToken = await t.query(api.catalog.catalogEventListAdminPageQuery, {
    token: "",
    paginationOpts: { numItems: 50, cursor: null },
  })
  const regularUser = await t.query(api.catalog.catalogEventListAdminPageQuery, {
    token: userToken,
    paginationOpts: { numItems: 50, cursor: null },
  })

  expect(missingToken.success).toBe(false)
  expect(regularUser.success).toBe(false)
})

test("public catalog loading remains published-only after adding the admin query", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    for (const status of ["draft", "published", "archived"] as const) {
      await ctx.db.insert("catalogEvents", catalogEventInsert(status))
    }
  })

  const publicEvents = await t.query(api.catalog.catalogEventListPublishedQuery, {})

  expect(publicEvents.map((event) => event.id)).toEqual(["event-published"])
})
