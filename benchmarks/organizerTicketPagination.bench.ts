/// <reference types="vite/client" />

import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"
import schema from "../convex/schema.js"
import { organizerTicketProjectionCreate } from "../src/organizer/convex/organizerTicketProjectionCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "eventoren-organizer-ticket-pagination-benchmark-secret"
const ticketCount = Number.parseInt(process.env.BENCHMARK_TICKET_COUNT ?? "1000", 10)
const repeatCount = Number.parseInt(process.env.BENCHMARK_REPEAT_COUNT ?? "3", 10)
const pageSize = 50
const outputPath = process.env.BENCHMARK_OUTPUT ?? "/tmp/eventoren-organizer-ticket-pagination.json"
process.env.AUTH_SECRET = authSecret

test("compares the unbounded organizer ticket read with a bounded first page", async () => {
  const t = convexTest(schema, modules)
  const fixture = await seedFixture(t)

  const before = await measure("before:collect-and-per-ticket-order-get", repeatCount, () =>
    t.run(async (ctx) => {
      const event = await ctx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", fixture.eventKey))
        .unique()
      if (!event) return []
      const tickets = await ctx.db
        .query("ticketIssued")
        .withIndex("eventKey", (q) => q.eq("eventKey", fixture.eventKey))
        .collect()
      const items = []
      for (const ticket of tickets) {
        const order = await ctx.db.get(ticket.orderId)
        if (order) items.push(organizerTicketProjectionCreate(ticket, order, event))
      }
      return items
    }),
  )
  const after = await measure("after:bounded-indexed-page", repeatCount, () =>
    t.query(api.organizer.organizerEventTicketListQuery, {
      eventKey: fixture.eventKey,
      token: fixture.token,
      paginationOpts: { numItems: pageSize, cursor: null },
    }),
  )

  const fullTraversal = await readAllPages(t, fixture)
  expect(before.recordCount).toBe(ticketCount)
  expect(after.recordCount).toBe(pageSize)
  expect(fullTraversal).toHaveLength(ticketCount)

  const result = {
    benchmark: "eventoren-organizer-ticket-pagination",
    fixture: { ticketCount, pageSize },
    runtime: {
      backend: "local convex-test/mock",
      hostedReadMetricsCaptured: false,
      note: "Before emulates the removed collect plus per-ticket order lookup path; after measures one bounded page.",
    },
    measurements: [before, after],
    fullTraversal: { recordCount: fullTraversal.length },
  }
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8")
  console.log(JSON.stringify(result, null, 2))
})

async function seedFixture(t: ReturnType<typeof convexTest>): Promise<{ eventKey: string; token: string }> {
  const eventKey = "organizer-pagination-benchmark-event"
  const now = "2026-09-15T12:00:00.000Z"
  const organizerId = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Pagination benchmark organizer",
      role: "organizer",
      organizerInvitedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    const eventId = await ctx.db.insert("catalogEvents", {
      eventKey,
      title: "Organizer pagination benchmark",
      subtitle: "Benchmark event",
      description: "Benchmark event",
      category: "konzerte",
      startsAt: now,
      endsAt: "2099-01-01T22:00:00.000Z",
      doorsAt: "2099-01-01T17:00:00.000Z",
      venue: "Benchmark hall",
      city: "Berlin",
      address: "Benchmark street 1",
      organizer: "Eventoren",
      imageUrl: "/images/benchmark.webp",
      imageAlt: "Benchmark event",
      tags: [],
      status: "published",
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    const orderId = await ctx.db.insert("ticketOrders", {
      checkoutKey: "organizer-pagination-benchmark-checkout",
      customerEmail: "benchmark@example.test",
      customerGivenName: "Benchmark",
      customerFamilyName: "Buyer",
      contactSnapshotJson: JSON.stringify({ givenName: "Benchmark", familyName: "Buyer" }),
      eventKey,
      eventTitle: "Organizer pagination benchmark",
      eventSubtitle: "Benchmark event",
      eventDescription: "Benchmark event",
      eventStartsAt: now,
      eventEndsAt: "2099-01-01T22:00:00.000Z",
      eventDoorsAt: "2099-01-01T17:00:00.000Z",
      venue: "Benchmark hall",
      city: "Berlin",
      address: "Benchmark street 1",
      organizer: "Eventoren",
      imageUrl: "/images/benchmark.webp",
      imageAlt: "Benchmark event",
      catalogVersion: 1,
      subtotalCents: ticketCount * 2_500,
      feeCents: ticketCount * 300,
      totalCents: ticketCount * 2_800,
      checkoutContextJson: "{}",
      paymentReference: "organizer-pagination-benchmark-payment",
      stripeMode: "test",
      status: "paid",
      paymentStatus: "paid",
      reservationExpiresAt: Date.now(),
      createdAt: now,
      updatedAt: now,
      paidAt: now,
    })
    for (let sequence = 1; sequence <= ticketCount; sequence += 1) {
      await ctx.db.insert("ticketIssued", {
        orderId,
        sequence,
        code: `BENCHMARK-${sequence.toString().padStart(5, "0")}`,
        eventKey,
        eventTitle: "Organizer pagination benchmark",
        eventStartsAt: now,
        eventDoorsAt: "2099-01-01T17:00:00.000Z",
        venue: "Benchmark hall",
        city: "Berlin",
        address: "Benchmark street 1",
        tierKey: "standard",
        tierName: "Standard",
        priceCents: 2_500,
        feeCents: 300,
        participantName: `Participant ${sequence}`,
        issuedAt: now,
      })
    }
    return userId
  })
  return { eventKey, token: await createToken(organizerId, authSecret) }
}

async function readAllPages(
  t: ReturnType<typeof convexTest>,
  fixture: { readonly eventKey: string; readonly token: string },
) {
  const tickets = []
  let cursor: string | null = null
  while (true) {
    const result = await t.query(api.organizer.organizerEventTicketListQuery, {
      eventKey: fixture.eventKey,
      token: fixture.token,
      paginationOpts: { numItems: pageSize, cursor },
    })
    if (!result.success) throw new Error(result.errorMessage)
    tickets.push(...result.data.page)
    if (result.data.isDone) return tickets
    cursor = result.data.continueCursor
  }
}

async function measure(label: string, repeats: number, invoke: () => Promise<unknown>) {
  const durations: number[] = []
  let output: unknown
  for (let index = 0; index < repeats; index += 1) {
    const startedAt = performance.now()
    output = await invoke()
    durations.push(performance.now() - startedAt)
  }
  return {
    label,
    repeats,
    recordCount: recordCountRead(output),
    payloadBytes: new TextEncoder().encode(JSON.stringify(output) ?? "null").byteLength,
    durationMs: {
      min: Math.min(...durations),
      max: Math.max(...durations),
      mean: durations.reduce((sum, value) => sum + value, 0) / durations.length,
    },
  }
}

function recordCountRead(value: unknown): number {
  if (Array.isArray(value)) return value.length
  if (typeof value !== "object" || value === null || !("success" in value) || value.success !== true) return 0
  if (!("data" in value) || typeof value.data !== "object" || value.data === null || !("page" in value.data)) return 0
  return Array.isArray(value.data.page) ? value.data.page.length : 0
}
