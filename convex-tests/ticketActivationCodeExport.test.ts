/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "ticket-activation-code-export-test-secret"
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

function eventArgs(token: string, eventKey = "export-event") {
  return {
    eventKey,
    title: "Exportveranstaltung",
    subtitle: "Eine veröffentlichte Veranstaltung",
    description: "Eine Export-Testveranstaltung",
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
    eventKey: "export-event",
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
  await t.mutation(api.catalog.catalogEventPublishMutation, { eventKey: "export-event", token })
}

test("export returns all codes of the selected product in stable number order", async () => {
  const t = convexTest(schema, modules)
  const token = await userTokenCreate(t, "admin")
  await setupPublished(t, token)
  // Two batches: numbering continues, export must cover more than one list page.
  await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "export-event",
    tierKey: "standard",
    count: 3,
    token,
  })
  await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "export-event",
    tierKey: "standard",
    count: 5,
    token,
  })

  const exported = await t.query(api.ticketing.ticketActivationCodeExportAdminQuery, {
    eventKey: "export-event",
    tierKey: "standard",
    token,
  })
  expect(exported.success).toBe(true)
  if (!exported.success) return
  expect(exported.data.eventName).toBe("Exportveranstaltung")
  expect(exported.data.productName).toBe("Standard")
  expect(exported.data.codes.map((entry) => entry.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  const codes = exported.data.codes.map((entry) => entry.code)
  expect(new Set(codes).size).toBe(8)
  for (const code of codes) expect(code).toMatch(/^[A-Z0-9]{8}$/)
})

test("export rows carry only number and code, never statuses or customer contact", async () => {
  const t = convexTest(schema, modules)
  const token = await userTokenCreate(t, "admin")
  await setupPublished(t, token)
  await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "export-event",
    tierKey: "standard",
    count: 2,
    token,
  })

  const exported = await t.query(api.ticketing.ticketActivationCodeExportAdminQuery, {
    eventKey: "export-event",
    tierKey: "standard",
    token,
  })
  expect(exported.success).toBe(true)
  if (!exported.success) return
  expect(exported.data.codes).toHaveLength(2)
  for (const entry of exported.data.codes) expect(Object.keys(entry).sort()).toEqual(["code", "number"])
  expect(JSON.stringify(exported.data)).not.toContain("customerEmail")
  expect(JSON.stringify(exported.data)).not.toContain("reserved")
})

test("export stays scoped to the requested event and product", async () => {
  const t = convexTest(schema, modules)
  const token = await userTokenCreate(t, "admin")
  await setupPublished(t, token)
  await t.mutation(api.catalog.catalogTicketTierUpsertMutation, tierArgs(token, { tierKey: "vip", name: "VIP" }))
  await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "export-event",
    tierKey: "standard",
    count: 2,
    token,
  })
  await t.mutation(api.ticketing.ticketActivationCodeGenerateMutation, {
    eventKey: "export-event",
    tierKey: "vip",
    count: 3,
    token,
  })

  const standard = await t.query(api.ticketing.ticketActivationCodeExportAdminQuery, {
    eventKey: "export-event",
    tierKey: "standard",
    token,
  })
  expect(standard.success).toBe(true)
  if (!standard.success) return
  expect(standard.data.productName).toBe("Standard")
  expect(standard.data.codes.map((entry) => entry.number)).toEqual([1, 2])

  const vip = await t.query(api.ticketing.ticketActivationCodeExportAdminQuery, {
    eventKey: "export-event",
    tierKey: "vip",
    token,
  })
  expect(vip.success).toBe(true)
  if (!vip.success) return
  expect(vip.data.codes.map((entry) => entry.number)).toEqual([1, 2, 3])
  const standardCodes = new Set(standard.data.codes.map((entry) => entry.code))
  for (const entry of vip.data.codes) expect(standardCodes.has(entry.code)).toBe(false)

  for (const input of [
    { eventKey: "unknown-event", tierKey: "standard", token },
    { eventKey: "export-event", tierKey: "unknown", token },
  ]) {
    const missing = await t.query(api.ticketing.ticketActivationCodeExportAdminQuery, input)
    expect(missing.success).toBe(false)
  }
})

test("export requires the admin role and a valid session token", async () => {
  const t = convexTest(schema, modules)
  const adminToken = await userTokenCreate(t, "admin")
  const organizerToken = await userTokenCreate(t, "organizer")
  await setupPublished(t, adminToken)

  const denied = await t.query(api.ticketing.ticketActivationCodeExportAdminQuery, {
    eventKey: "export-event",
    tierKey: "standard",
    token: organizerToken,
  })
  expect(denied.success).toBe(false)
  const invalid = await t.query(api.ticketing.ticketActivationCodeExportAdminQuery, {
    eventKey: "export-event",
    tierKey: "standard",
    token: "invalid-token",
  })
  expect(invalid.success).toBe(false)
})
