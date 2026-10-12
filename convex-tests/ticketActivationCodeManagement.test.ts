/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "ticket-activation-code-management-test-secret"
process.env.AUTH_SECRET = authSecret

async function userTokenCreate(t: ReturnType<typeof convexTest>, role: "admin" | "organizer") {
  const now = new Date().toISOString()
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: `${role} user`,
      role,
      createdAt: now,
      updatedAt: now,
    }),
  )
  const token = await createToken(userId, authSecret)
  await t.run(async (ctx) =>
    ctx.db.insert("authSessions", {
      userId,
      loginMethod: "dev",
      token,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    }),
  )
  return token
}

function eventArgs(token: string, eventKey = "code-event") {
  return {
    eventKey,
    title: "Codeveranstaltung",
    subtitle: "Eine veröffentlichte Veranstaltung",
    description: "Eine Code-Testveranstaltung",
    category: "konzerte" as const,
    startsAt: "2026-11-01T18:00:00.000Z",
    endsAt: "2026-11-01T22:00:00.000Z",
    doorsAt: "2026-11-01T17:00:00.000Z",
    venue: "Test hall",
    city: "Berlin",
    address: "Teststraße 1",
    organizer: "Eventoren",
    imageUrl: "/images/test.webp",
    imageAlt: "Testveranstaltung",
    tags: ["test"],
    token,
  }
}

function tierArgs(token: string, overrides: Record<string, unknown> = {}) {
  return {
    eventKey: "code-event",
    tierKey: "standard",
    name: "Standard",
    description: "Freie Platzwahl",
    startsAt: "2026-11-01T18:00:00.000Z",
    doorsAt: "2026-11-01T17:00:00.000Z",
    endsAt: "2026-11-01T22:00:00.000Z",
    priceCents: 2500,
    feeCents: 250,
    capacity: 100,
    token,
    ...overrides,
  }
}

async function setupPublished(t: ReturnType<typeof convexTest>, token: string) {
  await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token))
  await t.mutation(api.catalog.catalogTicketTierUpsertMutation, tierArgs(token))
  await t.mutation(api.catalog.catalogEventPublishMutation, { eventKey: "code-event", token })
}

test("admin generation creates unique eight-character codes with sequential numbers", async () => {
  const t = convexTest(schema, modules)
  const token = await userTokenCreate(t, "admin")
  await setupPublished(t, token)

  const generated = await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "code-event",
    tierKey: "standard",
    count: 25,
    token,
  })
  expect(generated.success).toBe(true)
  if (!generated.success) return
  expect(generated.data.generated).toHaveLength(25)
  expect(generated.data.lastNumber).toBe(25)
  const numbers = generated.data.generated.map((entry) => entry.number)
  expect(numbers).toEqual(Array.from({ length: 25 }, (_, index) => index + 1))
  const codes = generated.data.generated.map((entry) => entry.code)
  expect(new Set(codes).size).toBe(25)
  for (const code of codes) expect(code).toMatch(/^[A-Z0-9]{8}$/)
})

test("repeated generation continues the per-product numbering and stays globally unique", async () => {
  const t = convexTest(schema, modules)
  const token = await userTokenCreate(t, "admin")
  await setupPublished(t, token)
  await t.mutation(api.catalog.catalogTicketTierUpsertMutation, tierArgs(token, { tierKey: "vip", name: "VIP" }))

  const first = await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "code-event",
    tierKey: "standard",
    count: 3,
    token,
  })
  const second = await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "code-event",
    tierKey: "standard",
    count: 2,
    token,
  })
  const other = await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "code-event",
    tierKey: "vip",
    count: 4,
    token,
  })
  expect(first.success && second.success && other.success).toBe(true)
  if (!first.success || !second.success || !other.success) return
  expect(second.data.generated.map((entry) => entry.number)).toEqual([4, 5])
  expect(second.data.lastNumber).toBe(5)
  expect(other.data.generated.map((entry) => entry.number)).toEqual([1, 2, 3, 4])
  const all = [...first.data.generated, ...second.data.generated, ...other.data.generated].map((entry) => entry.code)
  expect(new Set(all).size).toBe(all.length)
})

test("generation validates the count and never enables the product requirement flag", async () => {
  const t = convexTest(schema, modules)
  const token = await userTokenCreate(t, "admin")
  await setupPublished(t, token)

  for (const count of [0, -1, 501, 1.5]) {
    const rejected = await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
      eventKey: "code-event",
      tierKey: "standard",
      count,
      token,
    })
    expect(rejected.success).toBe(false)
  }
  const missing = await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "code-event",
    tierKey: "unknown",
    count: 1,
    token,
  })
  expect(missing.success).toBe(false)

  await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "code-event",
    tierKey: "standard",
    count: 1,
    token,
  })
  const stored = await t.run(async (ctx) => (await ctx.db.query("catalogTicketTiers").first())?.activationCodeRequired)
  expect(stored).toBe(false)
})

test("generation and listing require the admin role", async () => {
  const t = convexTest(schema, modules)
  const adminToken = await userTokenCreate(t, "admin")
  const organizerToken = await userTokenCreate(t, "organizer")
  await setupPublished(t, adminToken)

  const deniedGenerate = await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "code-event",
    tierKey: "standard",
    count: 1,
    token: organizerToken,
  })
  expect(deniedGenerate.success).toBe(false)
  const deniedList = await t.query(api.ticketing.ticketActivationCodeListAdminQuery, {
    eventKey: "code-event",
    tierKey: "standard",
    paginationOpts: { cursor: null, numItems: 10 },
    token: organizerToken,
  })
  expect(deniedList.success).toBe(false)
  const invalidToken = await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "code-event",
    tierKey: "standard",
    count: 1,
    token: "invalid-token",
  })
  expect(invalidToken.success).toBe(false)
})

test("admin listing returns numbers in order without order association for fresh codes", async () => {
  const t = convexTest(schema, modules)
  const token = await userTokenCreate(t, "admin")
  await setupPublished(t, token)
  await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "code-event",
    tierKey: "standard",
    count: 3,
    token,
  })

  const listed = await t.query(api.ticketing.ticketActivationCodeListAdminQuery, {
    eventKey: "code-event",
    tierKey: "standard",
    paginationOpts: { cursor: null, numItems: 2 },
    token,
  })
  expect(listed.success).toBe(true)
  if (!listed.success) return
  expect(listed.data.page.map((entry) => entry.number)).toEqual([1, 2])
  expect(listed.data.isDone).toBe(false)
  for (const entry of listed.data.page) {
    expect(entry.status).toBe("available")
    expect(entry.orderId).toBeNull()
    expect(entry.customerEmail).toBeNull()
  }
  const rest = await t.query(api.ticketing.ticketActivationCodeListAdminQuery, {
    eventKey: "code-event",
    tierKey: "standard",
    paginationOpts: { cursor: listed.data.continueCursor, numItems: 2 },
    token,
  })
  expect(rest.success).toBe(true)
  if (!rest.success) return
  expect(rest.data.page.map((entry) => entry.number)).toEqual([3])
  expect(rest.data.isDone).toBe(true)

  const filtered = await t.query(api.ticketing.ticketActivationCodeListAdminQuery, {
    eventKey: "code-event",
    tierKey: "standard",
    status: "consumed",
    paginationOpts: { cursor: null, numItems: 10 },
    token,
  })
  expect(filtered.success).toBe(true)
  if (!filtered.success) return
  expect(filtered.data.page).toHaveLength(0)
  expect(filtered.data.isDone).toBe(true)
})

test("public validation accepts only available codes of the same product", async () => {
  const t = convexTest(schema, modules)
  const token = await userTokenCreate(t, "admin")
  await setupPublished(t, token)
  const generated = await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "code-event",
    tierKey: "standard",
    count: 2,
    token,
  })
  expect(generated.success).toBe(true)
  if (!generated.success) return
  const [first, second] = generated.data.generated.map((entry) => entry.code)
  if (!first || !second) throw new Error("codes missing")

  const valid = await t.query(api.ticketing.ticketActivationCodeValidateQuery, {
    eventKey: "code-event",
    tierKey: "standard",
    code: `  ${first.toLowerCase()} `,
  })
  expect(valid).toMatchObject({ success: true, data: { valid: true } })

  // Mark the second code reserved: the public answer stays a generic invalid.
  await t.run(async (ctx) => {
    const stored = await ctx.db
      .query("ticketActivationCodes")
      .withIndex("code", (q) => q.eq("code", second))
      .unique()
    if (!stored) throw new Error("code missing")
    await ctx.db.patch("ticketActivationCodes", stored._id, { status: "reserved" })
  })
  for (const input of [
    { eventKey: "code-event", tierKey: "standard", code: second },
    { eventKey: "code-event", tierKey: "standard", code: "UNKNOWN1" },
    { eventKey: "code-event", tierKey: "standard", code: "short" },
    { eventKey: "code-event", tierKey: "vip", code: first },
    { eventKey: "other-event", tierKey: "standard", code: first },
  ]) {
    const checked = await t.query(api.ticketing.ticketActivationCodeValidateQuery, input)
    expect(checked).toMatchObject({ success: true, data: { valid: false } })
  }
})

test("public validation stays invalid for unpublished events", async () => {
  const t = convexTest(schema, modules)
  const token = await userTokenCreate(t, "admin")
  await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token))
  await t.mutation(api.catalog.catalogTicketTierUpsertMutation, tierArgs(token))
  const generated = await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "code-event",
    tierKey: "standard",
    count: 1,
    token,
  })
  expect(generated.success).toBe(true)
  if (!generated.success) return
  const code = generated.data.generated[0]?.code
  if (!code) throw new Error("code missing")
  const checked = await t.query(api.ticketing.ticketActivationCodeValidateQuery, {
    eventKey: "code-event",
    tierKey: "standard",
    code,
  })
  expect(checked).toMatchObject({ success: true, data: { valid: false } })
})
