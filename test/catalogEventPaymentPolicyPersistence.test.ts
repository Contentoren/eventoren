import { expect, test } from "bun:test"
import { defineTestApp } from "convex-test"
import schema from "../convex/schema.ts"
import { testAuthSessionTokenCreate } from "../convex-tests/testAuthSessionTokenCreate.ts"
import type { CatalogEventUpsertInput } from "../src/catalog/client/CatalogEventUpsertInput.ts"
import { catalogEventUpsertMutation } from "../src/catalog/convex/catalogEventUpsertMutation.ts"
import { catalogEventToEventItem } from "../src/catalog/convex/catalogEventToEventItem.ts"

const app = defineTestApp({ schema })
const { api, createTest } = app.defineModules({
  catalog: {
    catalogEventUpsertMutation,
    // This increment tests persistence, not the scheduled Billing synchronization.
    catalogSyncPushAction: app.internalAction({ handler: async () => null }),
  },
})

async function fixtureCreate() {
  const t = createTest()
  const secret = "catalog-payment-policy-test-secret"
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", { name: "Admin", role: "admin", createdAt: now, updatedAt: now }),
  )
  const token = await testAuthSessionTokenCreate(t, userId, secret)
  const input: CatalogEventUpsertInput = {
    eventKey: "payment-policy-event",
    title: "Payment policy event",
    subtitle: "",
    description: "",
    category: "konzerte",
    startsAt: "2026-11-01T18:00:00.000Z",
    endsAt: "2026-11-01T22:00:00.000Z",
    doorsAt: "2026-11-01T17:00:00.000Z",
    venue: "Hall",
    city: "Berlin",
    address: "Street 1",
    organizer: "Eventoren",
    imageUrl: "",
    imageAlt: "",
    tags: [],
    highlights: [],
    token,
  }
  const save = (policy?: CatalogEventUpsertInput["allowedStripePaymentMethods"]) =>
    t.mutation(api.catalog.catalogEventUpsertMutation, { ...input, allowedStripePaymentMethods: policy })
  const read = () =>
    t.run(async (ctx) =>
      ctx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", input.eventKey))
        .unique(),
    )
  return { t, input, save, read }
}

test("round-trips a deduplicated policy in Billing's canonical order through storage and EventItem", async () => {
  const { save, read } = await fixtureCreate()
  const result = await save(["bancontact", "ideal", "customer_balance", "sepa_debit", "klarna", "paypal", "card"])
  expect(result).toEqual({
    success: true,
    data: { eventKey: "payment-policy-event", catalogVersion: 1, eventRevision: 1 },
  })
  const expected: NonNullable<CatalogEventUpsertInput["allowedStripePaymentMethods"]> = [
    "card",
    "paypal",
    "klarna",
    "sepa_debit",
    "customer_balance",
    "ideal",
    "bancontact",
  ]
  const event = (await read())!
  expect(event.allowedStripePaymentMethods).toEqual(expected)
  expect(catalogEventToEventItem(event, []).allowedStripePaymentMethods).toEqual(expected)

  expect((await save(["sepa_debit", "card", "sepa_debit"])).success).toBe(true)
  expect((await read())?.allowedStripePaymentMethods).toEqual(["card", "sepa_debit"])
})

test("increments event and catalog revisions only for policy changes, including removing the override", async () => {
  const { t, save, read } = await fixtureCreate()
  const first = await save(["card", "sepa_debit"])
  const reordered = await save(["sepa_debit", "card", "card"])
  expect(reordered).toEqual(first)
  expect((await read())?.allowedStripePaymentMethods).toEqual(["card", "sepa_debit"])

  const changed = await save(["sepa_debit"])
  expect(changed).toEqual({
    success: true,
    data: { eventKey: "payment-policy-event", catalogVersion: 2, eventRevision: 2 },
  })
  const cleared = await save()
  expect(cleared).toEqual({
    success: true,
    data: { eventKey: "payment-policy-event", catalogVersion: 3, eventRevision: 3 },
  })
  expect((await read())!).not.toHaveProperty("allowedStripePaymentMethods")
  expect(await save([])).toEqual(cleared)
  expect(
    (
      await t.run(async (ctx) =>
        ctx.db
          .query("catalogSyncStates")
          .withIndex("key", (q) => q.eq("key", "catalog"))
          .unique(),
      )
    )?.version,
  ).toBe(3)
})

test.each([{ policy: undefined }, { policy: [] }])(
  "leaves the default policy absent in storage and EventItem: $policy",
  async ({ policy }) => {
    const { save, read } = await fixtureCreate()
    expect((await save(policy ? [...policy] : undefined)).success).toBe(true)
    const event = (await read())!
    expect(event).not.toHaveProperty("allowedStripePaymentMethods")
    expect(catalogEventToEventItem(event, []).allowedStripePaymentMethods).toBeUndefined()
  },
)

test("preserves an absent legacy policy without changing its revision or catalog version", async () => {
  const { t, input, save, read } = await fixtureCreate()
  const { token: _token, ...eventData } = input
  const now = new Date().toISOString()
  await t.run(async (ctx) =>
    ctx.db.insert("catalogEvents", {
      ...eventData,
      status: "draft",
      catalogVersion: 7,
      createdAt: now,
      updatedAt: now,
    }),
  )

  expect(await save()).toEqual({
    success: true,
    data: { eventKey: input.eventKey, catalogVersion: 7, eventRevision: 1 },
  })
  expect((await read())!).not.toHaveProperty("allowedStripePaymentMethods")
})

test("clears a custom override when the UI sends its empty/default selection", async () => {
  const { save, read } = await fixtureCreate()
  await save(["sepa_debit"])
  expect(await save([])).toEqual({
    success: true,
    data: { eventKey: "payment-policy-event", catalogVersion: 2, eventRevision: 2 },
  })
  expect((await read())!).not.toHaveProperty("allowedStripePaymentMethods")
})

test.each(["wero", "allow_all", "unknown"])(
  "rejects unsupported persisted policy %s without creating an event",
  async (method) => {
    const { t, input, read } = await fixtureCreate()
    await expect(
      t.mutation(api.catalog.catalogEventUpsertMutation, {
        ...input,
        allowedStripePaymentMethods: ["card", method] as CatalogEventUpsertInput["allowedStripePaymentMethods"],
      }),
    ).rejects.toThrow()
    expect(await read()).toBeNull()
  },
)

test("rejects an oversized explicit list without storing it or advancing revisions", async () => {
  const { save, read } = await fixtureCreate()
  const original = await save(["card"])
  const result = await save(["card", "card", "card", "card", "card", "card", "card", "card"])
  expect(result.success).toBe(false)
  expect(await save(["card"])).toEqual(original)
  expect((await read())?.allowedStripePaymentMethods).toEqual(["card"])
})
